import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useAccountContext } from '@/hooks/useAccountContext';
import { supabase } from '@/integrations/supabase/client';
import { addMonths, format, isBefore, startOfMonth, endOfMonth } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface DateRange {
  from?: Date;
  to?: Date;
}

interface Subscription {
  id: string;
  name: string;
  amount: number;
  renewal_day: number;
  category: string;
  last_charged?: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'semiannually' | 'annually';
}

export const useOverdueSubscriptions = (dateRange?: DateRange) => {
  const { user } = useAuth();
  const { currentAccount } = useAccountContext();
  const queryClient = useQueryClient();
  const [paidSubscriptionsThisMonth, setPaidSubscriptionsThisMonth] = useState<string[]>([]);

  const { data: subscriptions = [], isLoading, refetch } = useQuery({
    queryKey: ['subscriptions', currentAccount?.id],
    queryFn: async () => {
      const userId = currentAccount?.id || user?.id;
      if (!userId) return [];

      console.log('🔄 LOADING SUBSCRIPTIONS for user:', userId);
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('renewal_day');
      
      if (error) {
        console.error('LoadSubscriptions error:', error);
        throw error;
      }
      
      console.log('✅ SUBSCRIPTIONS LOADED:', data?.length || 0);
      return data || [];
    },
    enabled: !!(user?.id || currentAccount?.id),
  });

  // Load paid subscriptions this month
  const loadPaidSubscriptionsThisMonth = async () => {
    try {
      const userId = currentAccount?.id || user?.id;
      if (!userId) return;

      const startOfCurrentMonth = startOfMonth(new Date());
      const endOfCurrentMonth = endOfMonth(new Date());

      const { data: transactions } = await supabase
        .from('transactions')
        .select('description, date')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('date', format(startOfCurrentMonth, 'yyyy-MM-dd'))
        .lte('date', format(endOfCurrentMonth, 'yyyy-MM-dd'))
        .like('description', 'Pagamento - %');

      const paidSubscriptionNames = transactions?.map(t => 
        t.description.replace('Pagamento - ', '')
      ) || [];

      const paidIds = subscriptions
        .filter(sub => paidSubscriptionNames.includes(sub.name))
        .map(sub => sub.id);

      setPaidSubscriptionsThisMonth(paidIds);
    } catch (error) {
      console.error('Erro ao carregar assinaturas pagas este mês:', error);
    }
  };

  useEffect(() => {
    if (subscriptions.length > 0) {
      loadPaidSubscriptionsThisMonth();
    }
  }, [subscriptions, currentAccount?.id]);

  // Real-time subscription para atualizações instantâneas
  useEffect(() => {
    const userId = currentAccount?.id || user?.id;
    if (!userId) return;

    console.log('🔄 CREATING SUBSCRIPTIONS SUBSCRIPTION for user:', userId);

    const subscription = supabase
      .channel(`subscriptions-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('📦 SUBSCRIPTIONS REALTIME UPDATE:', payload.eventType, payload);
          queryClient.invalidateQueries({ queryKey: ['subscriptions', userId] });
          queryClient.refetchQueries({ queryKey: ['subscriptions', userId] });
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 CLEANING UP SUBSCRIPTIONS SUBSCRIPTION for user:', userId);
      subscription.unsubscribe();
    };
  }, [currentAccount?.id, user?.id, queryClient]);

  const getCurrentMonthRenewalDate = (renewal_day: number) => {
    const today = toZonedTime(new Date(), 'America/Sao_Paulo');
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    return new Date(currentYear, currentMonth, renewal_day);
  };

  const getNextRenewalDate = (renewal_day: number, frequency: 'daily' | 'weekly' | 'monthly' | 'semiannually' | 'annually' = 'monthly', lastPaymentDate?: string) => {
    const today = toZonedTime(new Date(), 'America/Sao_Paulo');
    
    console.log('🗓️ CALCULATING NEXT RENEWAL DATE:', { renewal_day, frequency, lastPaymentDate, today: today.toISOString() });
    
    // Se há uma data de última cobrança, SEMPRE usar ela como base para o cálculo
    // Isso significa que a última cobrança já foi paga e precisamos calcular a próxima
    if (lastPaymentDate) {
      const baseDate = new Date(lastPaymentDate);
      console.log('📅 Using last CHARGED date as base (already paid):', baseDate.toISOString());
      
      let nextDate = new Date(baseDate);
      
      if (frequency === 'daily') {
        nextDate.setDate(baseDate.getDate() + 1);
        console.log('📅 DAILY: Next renewal 1 day after last charge:', nextDate.toISOString());
      } else if (frequency === 'weekly') {
        nextDate.setDate(baseDate.getDate() + 7);
        console.log('📅 WEEKLY: Next renewal 7 days after last charge:', nextDate.toISOString());
      } else if (frequency === 'monthly') {
        nextDate.setMonth(baseDate.getMonth() + 1);
        nextDate.setDate(baseDate.getDate());
        console.log('📅 MONTHLY: Next renewal 1 month after last charge:', nextDate.toISOString());
      } else if (frequency === 'semiannually') {
        nextDate.setMonth(baseDate.getMonth() + 6);
        nextDate.setDate(baseDate.getDate());
        console.log('📅 SEMIANNUALLY: Next renewal 6 months after last charge:', nextDate.toISOString());
      } else if (frequency === 'annually') {
        nextDate.setFullYear(baseDate.getFullYear() + 1);
        nextDate.setMonth(baseDate.getMonth());
        nextDate.setDate(baseDate.getDate());
        console.log('📅 ANNUALLY: Next renewal 1 year after last charge:', nextDate.toISOString());
      }
      
      return nextDate;
    }
    
    // Para assinaturas sem data de última cobrança, calcular baseado no renewal_day
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let nextDate: Date;

    if (frequency === 'monthly') {
      // Se o dia de renovação já passou este mês, usar o próximo mês
      if (currentDay >= renewal_day) {
        const nextMonth = currentMonth + 1;
        if (nextMonth > 11) {
          nextDate = new Date(currentYear + 1, 0, renewal_day);
        } else {
          nextDate = new Date(currentYear, nextMonth, renewal_day);
        }
      } else {
        // Se o dia de renovação ainda não chegou este mês, usar este mês
        nextDate = new Date(currentYear, currentMonth, renewal_day);
      }
      console.log('📅 FALLBACK MONTHLY: Next renewal calculated for day', renewal_day, ':', nextDate.toISOString());
    } else if (frequency === 'daily') {
      nextDate = new Date(today);
      nextDate.setDate(today.getDate() + 1);
      console.log('📅 FALLBACK DAILY: Next renewal tomorrow:', nextDate.toISOString());
    } else if (frequency === 'weekly') {
      nextDate = new Date(today);
      nextDate.setDate(today.getDate() + 7);
      console.log('📅 FALLBACK WEEKLY: Next renewal in 7 days:', nextDate.toISOString());
    } else if (frequency === 'semiannually') {
      // Se o dia de renovação já passou este mês, usar 6 meses a partir de agora
      if (currentDay >= renewal_day) {
        const nextMonth = currentMonth + 6;
        const targetYear = nextMonth > 11 ? currentYear + 1 : currentYear;
        const targetMonth = nextMonth > 11 ? nextMonth - 12 : nextMonth;
        nextDate = new Date(targetYear, targetMonth, renewal_day);
      } else {
        // Se o dia ainda não chegou, usar este mês + 6 meses
        const nextMonth = currentMonth + 6;
        const targetYear = nextMonth > 11 ? currentYear + 1 : currentYear;
        const targetMonth = nextMonth > 11 ? nextMonth - 12 : nextMonth;
        nextDate = new Date(targetYear, targetMonth, renewal_day);
      }
      console.log('📅 FALLBACK SEMIANNUALLY: Next renewal calculated:', nextDate.toISOString());
    } else if (frequency === 'annually') {
      // Se o dia de renovação já passou este mês, usar o próximo ano
      if (currentDay >= renewal_day) {
        nextDate = new Date(currentYear + 1, currentMonth, renewal_day);
      } else {
        // Se o dia ainda não chegou, usar este ano
        nextDate = new Date(currentYear, currentMonth, renewal_day);
      }
      console.log('📅 FALLBACK ANNUALLY: Next renewal calculated:', nextDate.toISOString());
    } else {
      // Default para monthly
      nextDate = new Date(currentYear, currentMonth, renewal_day);
    }

    return nextDate;
  };

  const isSubscriptionOverdue = (subscription: Subscription) => {
    const today = toZonedTime(new Date(), 'America/Sao_Paulo');
    const isPaidThisMonth = paidSubscriptionsThisMonth.includes(subscription.id);
    
    // Se já foi paga este mês, não está atrasada
    if (isPaidThisMonth) return false;
    
    // Calcular a próxima data de renovação baseada na data da última cobrança e frequência
    const nextRenewalDate = getNextRenewalDate(subscription.renewal_day, subscription.frequency || 'monthly', subscription.last_charged);
    
    // A assinatura está em atraso se a data de próxima renovação já passou (considerando até o final do dia)
    const nextRenewalEndOfDay = new Date(nextRenewalDate);
    nextRenewalEndOfDay.setHours(23, 59, 59, 999);
    
    const isOverdue = today > nextRenewalEndOfDay;
    
    console.log('🔍 SUBSCRIPTION OVERDUE CHECK:', {
      name: subscription.name,
      renewalDay: subscription.renewal_day,
      nextRenewalDate: nextRenewalDate.toISOString(),
      today: today.toISOString(),
      isOverdue,
      isPaidThisMonth
    });
    
    return isOverdue;
  };

  // Calcular saldo devedor de assinaturas atrasadas baseado no filtro de data
  const overdueSubscriptionsBalance = useMemo(() => {
    let totalOverdue = 0;

    subscriptions.forEach(subscription => {
      // Só incluir no saldo devedor se a assinatura estiver realmente atrasada
      if (isSubscriptionOverdue(subscription as Subscription)) {
        // Para filtros de data específicos, verificar se a assinatura está no período
        if (dateRange?.from && dateRange?.to) {
          const today = toZonedTime(new Date(), 'America/Sao_Paulo');
          const todayStr = format(today, 'yyyy-MM-dd');
          const rangeFromStr = format(dateRange.from!, 'yyyy-MM-dd');
          const rangeToStr = format(dateRange.to!, 'yyyy-MM-dd');
          
          // Para filtro "hoje", incluir todas as assinaturas atrasadas até hoje
          if (rangeFromStr === todayStr && rangeToStr === todayStr) {
            const nextRenewalDate = getNextRenewalDate(subscription.renewal_day, (subscription.frequency as 'daily' | 'weekly' | 'monthly' | 'semiannually' | 'annually') || 'monthly', subscription.last_charged);
            const renewalDateStr = format(nextRenewalDate, 'yyyy-MM-dd');
            
            // Incluir se a data de renovação já passou (está atrasada)
            if (renewalDateStr <= todayStr) {
              totalOverdue += subscription.amount;
            }
          } else {
            // Para outros filtros, usar a lógica anterior
            const currentMonthRenewalDate = getCurrentMonthRenewalDate(subscription.renewal_day);
            const renewalDateStr = format(currentMonthRenewalDate, 'yyyy-MM-dd');
            
            if (renewalDateStr >= rangeFromStr && renewalDateStr <= rangeToStr) {
              totalOverdue += subscription.amount;
            }
          }
        } else {
          // Para filtro "Tempo Integral", incluir todas as assinaturas atrasadas
          totalOverdue += subscription.amount;
        }
      }
    });
    
    return totalOverdue;
  }, [subscriptions, paidSubscriptionsThisMonth, dateRange]);

  // Contar assinaturas atrasadas
  const overdueSubscriptionsCount = useMemo(() => {
    let overdueCount = 0;

    subscriptions.forEach(subscription => {
      // Só contar se a assinatura estiver realmente atrasada
      if (isSubscriptionOverdue(subscription as Subscription)) {
        // Para filtros de data específicos, verificar se a assinatura está no período
        if (dateRange?.from && dateRange?.to) {
          const today = toZonedTime(new Date(), 'America/Sao_Paulo');
          const todayStr = format(today, 'yyyy-MM-dd');
          const rangeFromStr = format(dateRange.from!, 'yyyy-MM-dd');
          const rangeToStr = format(dateRange.to!, 'yyyy-MM-dd');
          
          // Para filtro "hoje", incluir todas as assinaturas atrasadas até hoje
          if (rangeFromStr === todayStr && rangeToStr === todayStr) {
            const nextRenewalDate = getNextRenewalDate(subscription.renewal_day, (subscription.frequency as 'daily' | 'weekly' | 'monthly' | 'semiannually' | 'annually') || 'monthly', subscription.last_charged);
            const renewalDateStr = format(nextRenewalDate, 'yyyy-MM-dd');
            
            // Incluir se a data de renovação já passou (está atrasada)
            if (renewalDateStr <= todayStr) {
              overdueCount++;
            }
          } else {
            // Para outros filtros, usar a lógica anterior
            const currentMonthRenewalDate = getCurrentMonthRenewalDate(subscription.renewal_day);
            const renewalDateStr = format(currentMonthRenewalDate, 'yyyy-MM-dd');
            
            if (renewalDateStr >= rangeFromStr && renewalDateStr <= rangeToStr) {
              overdueCount++;
            }
          }
        } else {
          // Para filtro "Tempo Integral", incluir todas as assinaturas atrasadas
          overdueCount++;
        }
      }
    });

    return overdueCount;
  }, [subscriptions, paidSubscriptionsThisMonth, dateRange]);

  // Obter lista de assinaturas realmente atrasadas no período
  const overdueSubscriptionsList = useMemo(() => {
    const overdueList: typeof subscriptions = [];

    subscriptions.forEach(subscription => {
      // Só incluir se a assinatura estiver realmente atrasada
      if (isSubscriptionOverdue(subscription as Subscription)) {
        // Para filtros de data específicos, verificar se a assinatura está no período
        if (dateRange?.from && dateRange?.to) {
          const today = toZonedTime(new Date(), 'America/Sao_Paulo');
          const todayStr = format(today, 'yyyy-MM-dd');
          const rangeFromStr = format(dateRange.from!, 'yyyy-MM-dd');
          const rangeToStr = format(dateRange.to!, 'yyyy-MM-dd');
          
          // Para filtro "hoje", usar a mesma lógica do contador
          if (rangeFromStr === todayStr && rangeToStr === todayStr) {
            const nextRenewalDate = getNextRenewalDate(subscription.renewal_day, (subscription.frequency as 'daily' | 'weekly' | 'monthly' | 'semiannually' | 'annually') || 'monthly', subscription.last_charged);
            const renewalDateStr = format(nextRenewalDate, 'yyyy-MM-dd');
            
            // Incluir se a data de renovação já passou (está atrasada)
            if (renewalDateStr <= todayStr) {
              overdueList.push(subscription);
            }
          } else {
            // Para outros filtros, usar a lógica anterior
            const currentMonthRenewalDate = getCurrentMonthRenewalDate(subscription.renewal_day);
            const renewalDateStr = format(currentMonthRenewalDate, 'yyyy-MM-dd');
            
            if (renewalDateStr >= rangeFromStr && renewalDateStr <= rangeToStr) {
              overdueList.push(subscription);
            }
          }
        } else {
          // Para filtro "Tempo Integral", incluir todas as assinaturas atrasadas
          overdueList.push(subscription);
        }
      }
    });

    return overdueList;
  }, [subscriptions, paidSubscriptionsThisMonth, dateRange]);

  const refetchWithLogs = async () => {
    console.log('🔄 MANUAL REFETCH SUBSCRIPTIONS requested');
    await loadPaidSubscriptionsThisMonth();
    return await refetch();
  };

  return {
    subscriptions,
    isLoading,
    overdueSubscriptionsBalance,
    overdueSubscriptionsCount,
    overdueSubscriptionsList,
    refetch: refetchWithLogs
  };
};