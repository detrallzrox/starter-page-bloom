import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccountContext } from "@/hooks/useAccountContext";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useInstallments } from "@/hooks/useInstallments";
import { useOverdueSubscriptions } from "@/hooks/useOverdueSubscriptions";
import { useBalanceUpdater } from "@/hooks/useBalanceUpdater";
import { useMobilePushNotifications } from "@/hooks/useMobilePushNotifications";
import { Header } from "@/components/Header";
import { FinancialCard } from "@/components/FinancialCard";
import { QuickActions } from "@/components/QuickActions";
import { RecentTransactions } from "@/components/RecentTransactions";
import { TransactionDetailsModal } from "@/components/TransactionDetailsModal";
import { InteractiveChart } from "@/components/InteractiveChart";
import { DateFilter } from "@/components/DateFilter";
import { AdBanner } from "@/components/AdBanner";
import { usePermissions } from "@/hooks/usePermissions";
import { SharedAccountModal } from "@/components/SharedAccountModal";
import { useModal } from "@/contexts/ModalContext";


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useCurrentAccountPremium } from "@/hooks/useCurrentAccountPremium";
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PieChart,
  Edit3,
  Lock,
  CreditCard
} from "lucide-react";

const Index = () => {
  const { user } = useAuth();
  const { currentAccount } = useAccountContext();
  const { isSharedAccountOpen, closeSharedAccount } = useModal();
  const { transactions, categories, isLoading, addTransaction } = useTransactions();
  const { isPremium, inTrial } = useCurrentAccountPremium();
  const { filterType, dateRange, handleFilterChange, filterTransactions } = useDateFilter();
  const { debtBalance: installmentsDebtBalance, pendingInstallmentsCount, groupedInstallmentPurchases, refetch: refetchInstallments } = useInstallments(dateRange);
  const { overdueSubscriptionsBalance, overdueSubscriptionsCount, overdueSubscriptionsList } = useOverdueSubscriptions(dateRange);
  
  // Initialize mobile push notifications
  useMobilePushNotifications();
  
  // Debug logs para verificar os números
  console.log('📊 SALDO DEVEDOR DEBUG:', {
    filterType,
    dateRange,
    pendingInstallmentsCount,
    overdueSubscriptionsCount,
    installmentsDebtBalance,
    overdueSubscriptionsBalance
  });
  
  // Combinar saldo devedor de parcelas e assinaturas atrasadas
  const totalDebtBalance = installmentsDebtBalance + overdueSubscriptionsBalance;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { triggerMultiLayerUpdate } = useBalanceUpdater();
  
  // Auto-request permissions on app load
  usePermissions();
  
  const [currentBalance, setCurrentBalance] = useState(0);
  const [investmentBalance, setInvestmentBalance] = useState(0);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  
  // Modal states
  const [expensesModalOpen, setExpensesModalOpen] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [investmentsModalOpen, setInvestmentsModalOpen] = useState(false);
  const [debtModalOpen, setDebtModalOpen] = useState(false);

  // Filtrar transações baseado no filtro selecionado
  const filteredTransactions = useMemo(() => {
    return filterTransactions(transactions);
  }, [transactions, filterTransactions]);

  const financialData = useMemo(() => {
    // Gastos do período filtrado
    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Receitas do período filtrado
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    // Investimentos do período filtrado
    const totalInvestments = filteredTransactions
      .filter(t => t.type === 'savings')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalExpenses,
      totalIncome,
      totalInvestments,
      // Use the actual balance from database (updated by trigger)
      calculatedBalance: currentBalance,
      transactionCount: filteredTransactions.length
    };
  }, [filteredTransactions, currentBalance]);

  // Função para gerar dados de categoria por tipo
  const generateCategoryData = (transactionType: 'expense' | 'income' | 'savings') => {
    const categoryMap = new Map();
    
    filteredTransactions
      .filter(t => t.type === transactionType)
      .forEach(transaction => {
        const categoryName = transaction.categories?.name || 'Outros';
        const categoryColor = transaction.categories?.color || 'hsl(var(--primary))';
        
        if (categoryMap.has(categoryName)) {
          categoryMap.get(categoryName).value += transaction.amount;
        } else {
          categoryMap.set(categoryName, {
            name: categoryName,
            value: transaction.amount,
            color: categoryColor
          });
        }
      });

    return Array.from(categoryMap.values());
  };

  // Memoizar dados de categoria para evitar recálculos desnecessários
  const chartData = useMemo(() => generateCategoryData('expense'), [filteredTransactions]);
  const expenseCategoryData = useMemo(() => generateCategoryData('expense'), [filteredTransactions]);
  const incomeCategoryData = useMemo(() => generateCategoryData('income'), [filteredTransactions]);
  const investmentCategoryData = useMemo(() => generateCategoryData('savings'), [filteredTransactions]);

  const monthlyChartData = useMemo(() => {
    const monthlyMap = new Map();
    
    // Processar transações filtradas
    filteredTransactions.forEach(transaction => {
      const date = toZonedTime(new Date(transaction.date + 'T12:00:00'), 'America/Sao_Paulo');
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = format(date, 'MMM yyyy', { locale: ptBR });
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { 
          month: monthName, 
          monthKey,
          expenses: 0, 
          income: 0,
          periodRevenue: 0,
          investedBalance: 0,
          debtBalance: 0
        });
      }
      
      const monthData = monthlyMap.get(monthKey);
      if (transaction.type === 'expense') {
        monthData.expenses += transaction.amount;
      } else if (transaction.type === 'income') {
        monthData.income += transaction.amount;
        monthData.periodRevenue += transaction.amount;
      } else if (transaction.type === 'savings') {
        monthData.investedBalance += transaction.amount;
      }
    });

    // Se não há transações no período mas há filtro ativo, criar entrada para o período filtrado
    if (monthlyMap.size === 0 && filterType !== 'all' && dateRange.from && dateRange.to) {
      const startDate = toZonedTime(dateRange.from, 'America/Sao_Paulo');
      const endDate = toZonedTime(dateRange.to, 'America/Sao_Paulo');
      
      // Gerar meses no intervalo do filtro
      let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const lastDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      
      while (currentDate <= lastDate) {
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const monthName = format(currentDate, 'MMM yyyy', { locale: ptBR });
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { 
            month: monthName, 
            monthKey,
            expenses: 0, 
            income: 0,
            periodRevenue: 0,
            investedBalance: 0,
            debtBalance: 0
          });
        }
        
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    // Adicionar saldo devedor a todos os meses (distribuído proportionalmente se há múltiplos meses)
    if (monthlyMap.size > 0 && totalDebtBalance > 0) {
      const debtPerMonth = totalDebtBalance / monthlyMap.size;
      monthlyMap.forEach((data) => {
        data.debtBalance = debtPerMonth;
      });
    }

    // Ordenar cronologicamente pelos monthKey (YYYY-MM)
    return Array.from(monthlyMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredTransactions, totalDebtBalance, dateRange, filterType]);


  // Memoizar handlers para evitar re-renderizações de componentes filhos
  const handleBalanceEdit = useCallback(() => {
    setIsEditingBalance(true);
  }, []);
  
  const handleBalanceSave = useCallback(async () => {
    try {
      await supabase
        .from('profiles')
        .update({ 
          current_balance: currentBalance
        })
        .eq('user_id', currentAccount?.id);

      setIsEditingBalance(false);
      
      toast({
        title: "Saldo atualizado!",
        description: "Seu saldo atual foi salvo",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o saldo atual",
        variant: "destructive",
      });
    }
  }, [currentBalance, currentAccount?.id, toast]);

  // Handler removido - agora está memoizado acima



  // Load user profile data - FIXED: separate subscription from profile loading
  useEffect(() => {
    const loadProfile = async () => {
      if (!user || !currentAccount) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('current_balance, investment_balance')
        .eq('user_id', currentAccount.id)
        .single();

      if (data && !error) {
        // Load balances from database (automatically updated by triggers)
        const savedBalance = (data as any).current_balance ?? 0;
        const savedInvestmentBalance = (data as any).investment_balance ?? 0;
        setCurrentBalance(savedBalance);
        setInvestmentBalance(savedInvestmentBalance);
      }
    };

    loadProfile();
  }, [user, currentAccount]);

  // Function to force balance update - ENHANCED VERSION
  const forceBalanceUpdate = async () => {
    if (!user || !currentAccount) return;
    
    console.log('🔄 FORCING BALANCE UPDATE for account:', currentAccount.id);
    
    try {
      // First, try to force recalculation by refetching from database
      console.log('🔄 Fetching fresh balance data from database...');
      
      // Then fetch the updated data
      const { data, error } = await supabase
        .from('profiles')
        .select('current_balance, investment_balance')
        .eq('user_id', currentAccount.id)
        .single();

      if (data && !error) {
        const newCurrentBalance = Number(data.current_balance) || 0;
        const newInvestmentBalance = Number(data.investment_balance) || 0;
        
        console.log('💰 FORCED BALANCE UPDATE RESULT:', {
          old_current: currentBalance,
          new_current: newCurrentBalance,
          old_investment: investmentBalance,
          new_investment: newInvestmentBalance,
          changes: {
            current_diff: newCurrentBalance - currentBalance,
            investment_diff: newInvestmentBalance - investmentBalance
          }
        });
        
        setCurrentBalance(newCurrentBalance);
        setInvestmentBalance(newInvestmentBalance);
        
        // Also invalidate all related queries to ensure UI consistency
        queryClient.invalidateQueries({ queryKey: ['transactions', currentAccount.id] });
        queryClient.invalidateQueries({ queryKey: ['installments', currentAccount.id] });
        
        return { success: true, data };
      } else {
        console.error('❌ Error fetching updated balance:', error);
        return { success: false, error };
      }
    } catch (error) {
      console.error('❌ Error in forceBalanceUpdate:', error);
      return { success: false, error };
    }
  };

  // SEPARATE useEffect for subscription to prevent recreation on every currentAccount change
  useEffect(() => {
    if (!user || !currentAccount) return;

    console.log('🔄 CREATING REALTIME SUBSCRIPTIONS for account:', currentAccount.id);
    
    // Profile subscription (for balance updates)
    const profileSubscription = supabase
      .channel(`profile_changes_${currentAccount.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${currentAccount.id}`
        },
        async (payload) => {
          console.log('🔔 PROFILE UPDATE DETECTED:', payload);
          const newProfile = payload.new as any;
          const oldProfile = payload.old as any;
          
          console.log('💰 BALANCE CHANGE DETAILED:', {
            old_current_balance: oldProfile?.current_balance,
            new_current_balance: newProfile?.current_balance,
            old_investment_balance: oldProfile?.investment_balance,
            new_investment_balance: newProfile?.investment_balance,
            current_difference: (newProfile?.current_balance ?? 0) - (oldProfile?.current_balance ?? 0),
            investment_difference: (newProfile?.investment_balance ?? 0) - (oldProfile?.investment_balance ?? 0),
            timestamp: new Date().toISOString()
          });
          
          if (newProfile && newProfile.user_id === currentAccount.id) {
            console.log('✅ UPDATING BALANCE FOR CURRENT ACCOUNT');
            console.log('🔄 Setting currentBalance to:', newProfile.current_balance);
            console.log('🔄 Setting investmentBalance to:', newProfile.investment_balance);
            
            // Forçar atualização imediata do estado 
            setCurrentBalance(Number(newProfile.current_balance) || 0);
            setInvestmentBalance(Number(newProfile.investment_balance) || 0);
            console.log('✅ BALANCE STATE UPDATED SUCCESSFULLY');
            
            // Invalidar TODAS as queries relacionadas para garantir sincronia completa
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['transactions'] }),
              queryClient.invalidateQueries({ queryKey: ['installments'] }),
              queryClient.invalidateQueries({ queryKey: ['notifications'] }),
              queryClient.refetchQueries({ queryKey: ['transactions', currentAccount.id] })
            ]);
            
            // Múltiplas tentativas de atualização para garantir consistência
            setTimeout(async () => {
              console.log('🔄 FIRST RETRY: Forcing balance update after realtime trigger...');
              await forceBalanceUpdate();
            }, 300);
            
            setTimeout(async () => {
              console.log('🔄 SECOND RETRY: Final balance consistency check...');
              await forceBalanceUpdate();
            }, 800);
          }
        }
      )
      
    // Bill reminders subscription
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bill_reminders',
        filter: `user_id=eq.${currentAccount.id}`
      },
      (payload) => {
        console.log('📄 BILL REMINDER UPDATE:', payload.eventType);
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['transactions', currentAccount.id] });
      }
    )
    
    // Subscriptions table subscription
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'subscriptions',
        filter: `user_id=eq.${currentAccount.id}`
      },
      (payload) => {
        console.log('🔄 SUBSCRIPTION UPDATE:', payload.eventType);
        // Invalidate queries to refresh data  
        queryClient.invalidateQueries({ queryKey: ['transactions', currentAccount.id] });
      }
    )
    
    .subscribe();

    // Listener para eventos personalizados de atualização de saldo
    const handleBalanceUpdate = async () => {
      console.log('🎯 Custom balance update event received');
      await forceBalanceUpdate();
    };

    window.addEventListener('balance-updated', handleBalanceUpdate);

    return () => {
      console.log('🧹 CLEANING UP ALL SUBSCRIPTIONS for account:', currentAccount.id);
      supabase.removeChannel(profileSubscription);
      window.removeEventListener('balance-updated', handleBalanceUpdate);
    };
  }, [currentAccount?.id, queryClient]); // Only depend on currentAccount.id, not the whole object

  // Get filtered transactions by type for modals
  const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
  const incomeTransactions = filteredTransactions.filter(t => t.type === 'income');
  const investmentTransactions = filteredTransactions.filter(t => t.type === 'savings');

  // Generate period description for modal titles
  const getPeriodDescription = () => {
    if (filterType === 'today') return 'Hoje';
    if (filterType === 'week') return 'Esta semana';
    if (filterType === 'month') return 'Este mês';
    if (filterType === 'year') return 'Este ano';
    if (filterType === 'custom' && dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`;
    }
    return 'Período selecionado';
  };

  // Usuários gratuitos têm acesso normal ao app - sem bloqueio

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      
      <main className="container mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-6 space-y-4 sm:space-y-6">
        {/* Filtro de Data */}
        <section className="mb-4 sm:mb-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Filtrar por Período</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <DateFilter 
                onFilterChange={handleFilterChange}
                currentFilter={filterType}
                currentRange={dateRange}
              />
            </CardContent>
          </Card>
        </section>

        {/* Resumo Financeiro */}
        <section className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 items-stretch">
          <Card 
            className="bg-gradient-card hover:shadow-md transition-all duration-300 cursor-pointer group min-w-0"
            onClick={() => !isEditingBalance && handleBalanceEdit()}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate pr-2 flex-1">
                Saldo Atual
              </CardTitle>
              <div className="flex items-center space-x-1 flex-shrink-0">
                <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 sm:h-6 sm:w-6 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBalanceEdit();
                  }}
                >
                  <Edit3 className="h-2 w-2 sm:h-3 sm:w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {isEditingBalance ? (
                <div className="space-y-3">
                  <input
                    type="number"
                    step="0.01"
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(Number(e.target.value))}
                    className="font-bold bg-transparent border-b border-primary w-full focus:outline-none leading-none whitespace-nowrap overflow-hidden text-ellipsis min-w-0 max-w-full"
                    style={{
                      fontSize: `clamp(0.75rem, ${Math.max(0.75, 2.5 - (currentBalance.toString().length * 0.08))}rem, 2rem)`
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBalanceSave();
                      }}
                      className="h-7 px-3 text-xs"
                    >
                      OK
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingBalance(false);
                      }}
                      className="h-7 px-3 text-xs"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="font-bold leading-none whitespace-nowrap overflow-hidden text-ellipsis text-primary min-w-0 max-w-full"
                     style={{
                       fontSize: `clamp(0.75rem, ${Math.max(0.75, 2.5 - (financialData.calculatedBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).length * 0.08))}rem, 2rem)`
                     }}>
                  {financialData.calculatedBalance.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </div>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words overflow-wrap-anywhere leading-relaxed">
                Quanto você tem no banco - Clique para editar
              </p>
            </CardContent>
          </Card>
          
          <Card 
            className="bg-gradient-card hover:shadow-md transition-all duration-300 cursor-pointer min-w-0"
            onClick={() => setExpensesModalOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate pr-2 flex-1">
                Despesas do Período
              </CardTitle>
              <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="font-bold leading-none whitespace-nowrap overflow-hidden text-ellipsis text-destructive min-w-0 max-w-full"
                   style={{
                     fontSize: `clamp(0.75rem, ${Math.max(0.75, 2.5 - (financialData.totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).length * 0.08))}rem, 2rem)`
                   }}>
                {financialData.totalExpenses.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words overflow-wrap-anywhere leading-relaxed">
                {filteredTransactions.filter(t => t.type === 'expense').length} transações
              </p>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-card hover:shadow-md transition-all duration-300 cursor-pointer min-w-0"
            onClick={() => setIncomeModalOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate pr-2 flex-1">
                Receitas do Período
              </CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-success flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="font-bold leading-none whitespace-nowrap overflow-hidden text-ellipsis text-success min-w-0 max-w-full"
                   style={{
                     fontSize: `clamp(0.75rem, ${Math.max(0.75, 2.5 - (financialData.totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).length * 0.08))}rem, 2rem)`
                   }}>
                {financialData.totalIncome.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words overflow-wrap-anywhere leading-relaxed">
                {filteredTransactions.filter(t => t.type === 'income').length} transações
              </p>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-card hover:shadow-md transition-all duration-300 cursor-pointer min-w-0"
            onClick={() => setInvestmentsModalOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate pr-2 flex-1">
                Saldo Investido
              </CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="font-bold leading-none whitespace-nowrap overflow-hidden text-ellipsis text-blue-500 min-w-0 max-w-full"
                   style={{
                     fontSize: `clamp(0.75rem, ${Math.max(0.75, 2.5 - (financialData.totalInvestments.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).length * 0.08))}rem, 2rem)`
                   }}>
                {financialData.totalInvestments.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words overflow-wrap-anywhere leading-relaxed">
                {filteredTransactions.filter(t => t.type === 'savings').length} transações
              </p>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-card hover:shadow-md transition-all duration-300 cursor-pointer min-w-0"
            onClick={() => setDebtModalOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate pr-2 flex-1">
                Saldo Devedor
              </CardTitle>
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-warning flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="font-bold leading-none whitespace-nowrap overflow-hidden text-ellipsis text-warning min-w-0 max-w-full"
                   style={{
                     fontSize: `clamp(0.75rem, ${Math.max(0.75, 2.5 - (totalDebtBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).length * 0.08))}rem, 2rem)`
                   }}>
                {totalDebtBalance.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1 space-y-0.5 break-words overflow-wrap-anywhere leading-relaxed">
                <div>{pendingInstallmentsCount} parcelas pendentes</div>
                {overdueSubscriptionsCount > 0 && (
                  <div>{overdueSubscriptionsCount} assinaturas atrasadas</div>
                )}
              </div>
            </CardContent>
          </Card>
           
        </section>

        {/* Ações Rápidas */}
        <section>
          <QuickActions 
            filteredTransactions={filteredTransactions}
            dateRange={dateRange}
            filterType={filterType}
            chartData={chartData}
            monthlyData={monthlyChartData}
            currentBalance={currentBalance}
            investmentBalance={investmentBalance}
            debtBalance={totalDebtBalance}
          />
        </section>

        {/* Dashboard Principal */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Gráfico Interativo */}
          <div className="lg:col-span-2">
            <InteractiveChart 
              categoryData={chartData} 
              monthlyData={monthlyChartData}
              expenseCategoryData={expenseCategoryData}
              incomeCategoryData={incomeCategoryData}
              investmentCategoryData={investmentCategoryData}
              filteredTransactions={filteredTransactions}
            />
          </div>

          {/* Transações Recentes */}
          <div className="space-y-4">
            <RecentTransactions filteredTransactions={filteredTransactions} />
          </div>
        </section>

      </main>

      {/* Banner de Anúncios - apenas para contas gratuitas */}
      {!isPremium && <AdBanner refreshInterval={45} />}

      {/* Transaction Details Modals */}
      <TransactionDetailsModal
        isOpen={expensesModalOpen}
        onClose={() => setExpensesModalOpen(false)}
        type="expenses"
        title="Despesas do Período"
        transactions={expenseTransactions}
        totalAmount={financialData.totalExpenses}
        periodDescription={getPeriodDescription()}
      />

      <TransactionDetailsModal
        isOpen={incomeModalOpen}
        onClose={() => setIncomeModalOpen(false)}
        type="income"
        title="Receitas do Período"
        transactions={incomeTransactions}
        totalAmount={financialData.totalIncome}
        periodDescription={getPeriodDescription()}
      />

      <TransactionDetailsModal
        isOpen={investmentsModalOpen}
        onClose={() => setInvestmentsModalOpen(false)}
        type="investments"
        title="Saldo Investido"
        transactions={investmentTransactions}
        totalAmount={financialData.totalInvestments}
        periodDescription={getPeriodDescription()}
      />

      <TransactionDetailsModal
        isOpen={debtModalOpen}
        onClose={() => setDebtModalOpen(false)}
        type="debt"
        title="Saldo Devedor"
        transactions={[]}
        installmentPurchases={groupedInstallmentPurchases}
        overdueSubscriptions={overdueSubscriptionsList}
        totalAmount={totalDebtBalance}
        periodDescription={getPeriodDescription()}
      />

      {/* Global Shared Account Modal */}
      <SharedAccountModal 
        isOpen={isSharedAccountOpen} 
        onClose={closeSharedAccount} 
      />
    </div>
  );
};

export default Index;
