import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAccountContext } from './useAccountContext';
import { useBalanceUpdater } from './useBalanceUpdater';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useEffect } from 'react';
import { NotificationService } from '@/services/NotificationService';

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  description: string | null;
  type: 'expense' | 'income' | 'savings';
  date: string;
  payment_method: string | null;
  receipt_url: string | null;
  audio_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  };
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: 'expense' | 'income' | 'savings';
  user_id: string | null;
  is_default: boolean;
}

export const useTransactions = () => {
  const { user } = useAuth();
  const { currentAccount } = useAccountContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { triggerMultiLayerUpdate } = useBalanceUpdater();

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', currentAccount?.id],
    queryFn: async () => {
      if (!user || !currentAccount) return [];
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (
            id,
            name,
            icon,
            color
          )
        `)
        .eq('user_id', currentAccount.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user && !!currentAccount,
  });

  // Add subscription for transactions real-time updates
  useEffect(() => {
    if (!user || !currentAccount) return;

    console.log('🔄 CREATING TRANSACTIONS SUBSCRIPTION for account:', currentAccount.id);
    
    const transactionsSubscription = supabase
      .channel(`transactions_changes_${currentAccount.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${currentAccount.id}`
        },
        (payload) => {
          console.log('📊 TRANSACTIONS UPDATE DETECTED:', payload);
          // Invalidate and refetch queries to ensure data is updated immediately
          queryClient.invalidateQueries({ queryKey: ['transactions', currentAccount.id] });
          queryClient.refetchQueries({ queryKey: ['transactions', currentAccount.id] });
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 CLEANING UP TRANSACTIONS SUBSCRIPTION for account:', currentAccount.id);
      supabase.removeChannel(transactionsSubscription);
    };
  }, [currentAccount?.id, queryClient]);

  // Real-time subscription para mudanças nas categorias
  useEffect(() => {
    if (!user || !currentAccount) return;

    console.log('🔄 CREATING CATEGORIES SUBSCRIPTION for account:', currentAccount.id);

    const categoriesSubscription = supabase
      .channel(`categories_changes_${currentAccount.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories'
        },
        (payload) => {
          console.log('📁 CATEGORIES UPDATE DETECTED:', payload);
          queryClient.invalidateQueries({ queryKey: ['categories', currentAccount.id] });
          queryClient.refetchQueries({ queryKey: ['categories', currentAccount.id] });
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 CLEANING UP CATEGORIES SUBSCRIPTION for account:', currentAccount.id);
      supabase.removeChannel(categoriesSubscription);
    };
  }, [currentAccount?.id, queryClient]);

  const { data: categories = [], isLoading: categoriesLoading, refetch: refetchCategories } = useQuery({
    queryKey: ['categories', currentAccount?.id],
    queryFn: async () => {
      if (!user || !currentAccount) return [];
      
      console.log('Starting category fetch for account:', currentAccount.id);
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${currentAccount.id},is_default.eq.true`)
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }
      
      console.log('All categories loaded:', data);
      const savingsCategories = data?.filter(cat => cat.type === 'savings') || [];
      console.log('Savings categories found:', savingsCategories);
      return data as Category[];
    },
    enabled: !!user && !!currentAccount,
    staleTime: 0, // Force fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (transaction: {
      amount: number;
      description: string;
      category_id: string;
      type: 'expense' | 'income' | 'savings';
      payment_method?: string;
      notes?: string;
      receipt_url?: string;
      date?: string;
    }) => {
      console.log('🚀 ADD TRANSACTION MUTATION STARTED:', {
        amount: transaction.amount,
        description: transaction.description,
        type: transaction.type,
        user: user?.id,
        currentAccount: currentAccount?.id
      });

      if (!user || !currentAccount) throw new Error('User not authenticated or account not selected');

      console.log('📝 INSERTING TRANSACTION INTO DATABASE...');
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: currentAccount.id,
          amount: transaction.amount,
          description: transaction.description,
          category_id: transaction.category_id,
          type: transaction.type,
          payment_method: transaction.payment_method,
          notes: transaction.notes,
          receipt_url: transaction.receipt_url,
          date: transaction.date || format(toZonedTime(new Date(), 'America/Sao_Paulo'), 'yyyy-MM-dd'),
        })
        .select()
        .single();

      if (error) {
        console.error('❌ ERROR INSERTING TRANSACTION:', error);
        throw error;
      }

      console.log('✅ TRANSACTION INSERTED SUCCESSFULLY:', data);
      console.log('⚡ TRIGGER "update_investment_balance_trigger" SHOULD FIRE NOW...');

      // Add notification to the current account (not the logged user)
      console.log('🔔 CREATING NOTIFICATION FOR CURRENT ACCOUNT:', currentAccount?.id);
      await supabase
        .from('notifications')
        .insert({
          user_id: currentAccount?.id || user.id,
          title: 'Nova transação',
          message: `${transaction.type === 'expense' ? 'Gasto manual' : transaction.type === 'income' ? 'Receita manual' : 'Investimento manual'} de R$ ${transaction.amount} - ${transaction.description}`,
          type: 'transaction',
          reference_id: data.id,
          reference_type: 'transaction',
          navigation_data: { 
            transaction_id: data.id,
            deleted: false 
          }
        });

      console.log('✅ NOTIFICATION CREATED');
      return data;
    },
    onSuccess: async (data) => {
      console.log('🎉 ADD TRANSACTION SUCCESS CALLBACK TRIGGERED');
      console.log('📊 Transaction data returned:', data);
      
      // Verificar orçamento excedido se for uma despesa
      if (data.type === 'expense' && data.category_id) {
        try {
          console.log('🔍 CALLING checkBudgetExceeded:', {
            userId: data.user_id,
            categoryId: data.category_id,
            transactionId: data.id,
            amount: data.amount,
            type: data.type
          });
          
          await NotificationService.checkBudgetExceeded(
            data.user_id,
            data.category_id,
            data.id
          );
          console.log('✅ Budget check completed');
        } catch (error) {
          console.error('❌ Error checking budget:', error);
          // Não interromper o fluxo principal se a verificação de orçamento falhar
        }
      } else {
        console.log('⏭️ SKIPPING budget check:', {
          type: data.type,
          hasCategory: !!data.category_id,
          reason: data.type !== 'expense' ? 'not expense' : 'no category'
        });
      }
      
      // Usar o sistema de atualização multi-camada para garantir atualização completa
      await triggerMultiLayerUpdate('add_transaction');
      
      console.log('🍞 Showing success toast...');
      toast({
        title: "Transação adicionada!",
        description: "Sua transação foi registrada com sucesso",
      });
      
      console.log('✅ ADD TRANSACTION SUCCESS CALLBACK COMPLETED');
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar transação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, ...transaction }: {
      id: string;
      amount?: number;
      description?: string;
      category_id?: string;
      type?: 'expense' | 'income' | 'savings';
      payment_method?: string;
      notes?: string;
    }) => {
      if (!user || !currentAccount) throw new Error('User not authenticated or account not selected');

      const { data, error } = await supabase
        .from('transactions')
        .update(transaction)
        .eq('id', id)
        .eq('user_id', currentAccount.id)
        .select()
        .single();

      if (error) throw error;

      // Add notification to the current account
      await supabase
        .from('notifications')
        .insert({
          user_id: currentAccount.id,
          title: 'Transação atualizada',
          message: `Transação "${data.description}" foi modificada`,
          type: 'transaction',
          reference_id: data.id,
          reference_type: 'transaction',
          navigation_data: { 
            transaction_id: data.id,
            deleted: false 
          }
        });

      return data;
    },
    onSuccess: async (data) => {
      // Verificar orçamento excedido se for uma despesa
      if (data.type === 'expense' && data.category_id) {
        try {
          await NotificationService.checkBudgetExceeded(
            data.user_id,
            data.category_id,
            data.id
          );
          console.log('✅ Budget check completed after update');
        } catch (error) {
          console.error('❌ Error checking budget after update:', error);
          // Não interromper o fluxo principal se a verificação de orçamento falhar
        }
      }
      
      // Aguardar um pouco para o trigger do banco completar
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Invalidar todas as queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      await queryClient.invalidateQueries({ queryKey: ['installments'] });
      
      // Forçar re-fetch imediato
      await queryClient.refetchQueries({ queryKey: ['transactions', currentAccount?.id] });
      
      toast({
        title: "Transação atualizada!",
        description: "Sua transação foi atualizada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar transação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user || !currentAccount) throw new Error('User not authenticated or account not selected');

      // Get transaction details before deleting
      const { data: transaction } = await supabase
        .from('transactions')
        .select('description')
        .eq('id', id)
        .eq('user_id', currentAccount.id)
        .single();

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', currentAccount.id);

      if (error) throw error;

      // Add notification to the current account - mark as deleted to prevent navigation
      if (transaction) {
        await supabase
          .from('notifications')
          .insert({
            user_id: currentAccount.id,
            title: 'Transação excluída',
            message: `Transação "${transaction.description}" foi removida`,
            type: 'transaction',
            reference_id: id,
            reference_type: 'transaction',
            navigation_data: { 
              transaction_id: id,
              deleted: true  // Prevent navigation for deleted transactions
            }
          });
      }
    },
    onSuccess: async () => {
      // Aguardar um pouco para o trigger do banco completar
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Invalidar todas as queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      await queryClient.invalidateQueries({ queryKey: ['installments'] });
      
      // Forçar re-fetch imediato
      await queryClient.refetchQueries({ queryKey: ['transactions', currentAccount?.id] });
      
      toast({
        title: "Transação excluída!",
        description: "Sua transação foi removida com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir transação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    transactions,
    categories,
    isLoading: transactionsLoading || categoriesLoading,
    addTransaction: addTransactionMutation.mutate,
    updateTransaction: updateTransactionMutation.mutate,
    deleteTransaction: deleteTransactionMutation.mutate,
    isAddingTransaction: addTransactionMutation.isPending,
    refetchCategories,
  };
};