import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useAccountContext } from '@/hooks/useAccountContext';
import { supabase } from '@/integrations/supabase/client';
import { addMonths, format } from 'date-fns';

interface DateRange {
  from?: Date;
  to?: Date;
}

interface Installment {
  id: string;
  purchase_name: string;
  total_amount: number;
  installment_amount: number;
  total_installments: number;
  current_installment: number;
  first_payment_date: string;
  last_payment_date: string;
  is_paid: boolean;
  paid_at?: string;
  category_id?: string;
  notes?: string;
  receipt_url?: string;
}

export const useInstallments = (dateRange?: DateRange) => {
  const { user } = useAuth();
  const { currentAccount } = useAccountContext();
  const queryClient = useQueryClient();

  const { data: installments = [], isLoading, refetch } = useQuery({
    queryKey: ['installments', currentAccount?.id],
    queryFn: async () => {
      const userId = currentAccount?.id || user?.id;
      if (!userId) return [];

      console.log('🔄 LOADING INSTALLMENTS for user:', userId);
      
      const { data, error } = await supabase
        .from('installments')
        .select('*')
        .eq('user_id', userId)
        .order('first_payment_date', { ascending: false });
      
      if (error) {
        console.error('LoadInstallments error:', error);
        throw error;
      }
      
      console.log('✅ INSTALLMENTS LOADED:', data?.length || 0);
      return data || [];
    },
    enabled: !!(user?.id || currentAccount?.id),
  });

  // Real-time subscription para atualizações instantâneas
  useEffect(() => {
    const userId = currentAccount?.id || user?.id;
    if (!userId) return;

    console.log('🔄 CREATING INSTALLMENTS SUBSCRIPTION for user:', userId);

    const subscription = supabase
      .channel(`installments-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'installments',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('📦 INSTALLMENTS REALTIME UPDATE:', payload.eventType, payload);
          // Invalidar queries para forçar re-fetch imediato
          queryClient.invalidateQueries({ queryKey: ['installments', userId] });
          queryClient.refetchQueries({ queryKey: ['installments', userId] });
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 CLEANING UP INSTALLMENTS SUBSCRIPTION for user:', userId);
      subscription.unsubscribe();
    };
  }, [currentAccount?.id, user?.id, queryClient]);

  // Calcular saldo devedor (apenas parcelas)
  const installmentsDebtBalance = useMemo(() => {
    // Para filtro "Tempo Integral" (sem dateRange), somar todas as parcelas não pagas
    if (!dateRange?.from || !dateRange?.to) {
      return installments
        .filter(installment => !installment.is_paid)
        .reduce((total, installment) => total + installment.installment_amount, 0);
    }
    
    let totalDebt = 0;
    const rangeFromStr = format(dateRange.from!, 'yyyy-MM-dd');
    const rangeToStr = format(dateRange.to!, 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Se o filtro for "hoje", incluir apenas parcelas vencidas até hoje (inclusive)
    const isToday = rangeFromStr === today && rangeToStr === today;
    
    installments.forEach(installment => {
      // Só incluir parcelas não pagas
      if (installment.is_paid) return;
      
      // Cada registro representa uma parcela individual
      // Calcular a data de vencimento desta parcela específica usando o mesmo método do cartão
      const [year, month, day] = installment.first_payment_date.split('-').map(Number);
      const firstPaymentDate = new Date(year, month - 1, day);
      const paymentDate = addMonths(firstPaymentDate, installment.current_installment - 1);
      const paymentDateStr = format(paymentDate, 'yyyy-MM-dd');
      
      if (isToday) {
        // Para filtro "hoje": incluir apenas parcelas que venceram até hoje (inclusive)
        if (paymentDateStr <= today) {
          totalDebt += installment.installment_amount;
        }
      } else {
        // Para outros filtros: apenas parcelas dentro do período selecionado
        if (paymentDateStr >= rangeFromStr && paymentDateStr <= rangeToStr) {
          totalDebt += installment.installment_amount;
        }
      }
    });
    
    return totalDebt;
  }, [installments, dateRange]);

  // Contar parcelas pendentes
  const pendingInstallmentsCount = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return installments.filter(installment => !installment.is_paid).length;
    }
    
    let pendingCount = 0;
    const rangeFromStr = format(dateRange.from!, 'yyyy-MM-dd');
    const rangeToStr = format(dateRange.to!, 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Se o filtro for "hoje", incluir apenas parcelas vencidas até hoje (inclusive)
    const isToday = rangeFromStr === today && rangeToStr === today;
    
    installments.forEach(installment => {
      // Só incluir parcelas não pagas
      if (installment.is_paid) return;
      
      // Cada registro representa uma parcela individual
      // Calcular a data de vencimento desta parcela específica usando o mesmo método do cartão
      const [year, month, day] = installment.first_payment_date.split('-').map(Number);
      const firstPaymentDate = new Date(year, month - 1, day);
      const paymentDate = addMonths(firstPaymentDate, installment.current_installment - 1);
      const paymentDateStr = format(paymentDate, 'yyyy-MM-dd');
      
      if (isToday) {
        // Para filtro "hoje": incluir apenas parcelas que venceram até hoje (inclusive)
        if (paymentDateStr <= today) {
          pendingCount++;
        }
      } else {
        // Para outros filtros: apenas parcelas dentro do período selecionado
        if (paymentDateStr >= rangeFromStr && paymentDateStr <= rangeToStr) {
          pendingCount++;
        }
      }
    });
    
    return pendingCount;
  }, [installments, dateRange]);

  // Agrupar parcelas por compra para exibir no modal
  const groupedInstallmentPurchases = useMemo(() => {
    const grouped = new Map();
    
    installments.forEach(installment => {
      // Só incluir parcelas não pagas
      if (installment.is_paid) return;
      
      // Calcular a data de vencimento desta parcela específica usando o mesmo método do cartão
      const [year, month, day] = installment.first_payment_date.split('-').map(Number);
      const firstPaymentDate = new Date(year, month - 1, day);
      const paymentDate = addMonths(firstPaymentDate, installment.current_installment - 1);
      const paymentDateStr = format(paymentDate, 'yyyy-MM-dd');
      
      // Filtrar por período se especificado
      if (dateRange?.from && dateRange?.to) {
        const rangeFromStr = format(dateRange.from!, 'yyyy-MM-dd');
        const rangeToStr = format(dateRange.to!, 'yyyy-MM-dd');
        const today = format(new Date(), 'yyyy-MM-dd');
        const isToday = rangeFromStr === today && rangeToStr === today;
        
        if (isToday) {
          // Para filtro "hoje": incluir apenas parcelas que venceram até hoje (inclusive)
          if (paymentDateStr > today) return;
        } else {
          // Para outros filtros: apenas parcelas dentro do período selecionado
          if (paymentDateStr < rangeFromStr || paymentDateStr > rangeToStr) return;
        }
      }
      
      const key = `${installment.purchase_name}_${installment.first_payment_date}`;
      
      if (!grouped.has(key)) {
        // Calcular total de parcelas e já pagas para esta compra
        const relatedInstallments = installments.filter(i => 
          i.purchase_name === installment.purchase_name && 
          i.first_payment_date === installment.first_payment_date
        );
        
        const totalInstallments = relatedInstallments.length;
        const paidInstallments = relatedInstallments.filter(i => i.is_paid).length;
        const remainingAmount = relatedInstallments
          .filter(i => !i.is_paid)
          .reduce((sum, i) => sum + i.installment_amount, 0);
        
        // Encontrar próxima parcela a vencer usando EXATAMENTE o mesmo cálculo do cartão de crédito
        const upcomingInstallments = relatedInstallments
          .filter(i => !i.is_paid)
          .sort((a, b) => a.current_installment - b.current_installment);
        
        // Calcular next_due_date usando EXATAMENTE o mesmo código do cartão de crédito (linha 1376-1380)
        const nextDueDate = upcomingInstallments[0] ? (() => {
          const [year, month, day] = upcomingInstallments[0].first_payment_date.split('-').map(Number);
          const firstDate = new Date(year, month - 1, day);
          return format(addMonths(firstDate, upcomingInstallments[0].current_installment - 1), 'dd/MM/yyyy');
        })() : undefined;
        
        grouped.set(key, {
          id: key,
          purchase_name: installment.purchase_name,
          total_amount: installment.total_amount,
          total_installments: totalInstallments,
          paid_installments: paidInstallments,
          remaining_amount: remainingAmount,
          next_due_date: nextDueDate,
          purchase_date: installment.first_payment_date
        });
      }
    });
    
    return Array.from(grouped.values());
  }, [installments, dateRange]);

  const refetchWithLogs = async () => {
    console.log('🔄 MANUAL REFETCH INSTALLMENTS requested');
    return await refetch();
  };

  return {
    installments,
    isLoading,
    debtBalance: installmentsDebtBalance,
    pendingInstallmentsCount,
    groupedInstallmentPurchases,
    refetch: refetchWithLogs
  };
};