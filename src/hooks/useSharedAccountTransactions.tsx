import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAccountContext } from './useAccountContext';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category_id: string;
  type: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  notes: string;
  payment_method: string;
  receipt_url: string;
  audio_url: string;
}

export const useSharedAccountTransactions = () => {
  const { currentAccount } = useAccountContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentAccount) {
      loadTransactions();
    }
  }, [currentAccount]);

  // Real-time subscription para transações
  useEffect(() => {
    if (!currentAccount) return;

    console.log('🔄 CREATING SHARED TRANSACTIONS SUBSCRIPTION for account:', currentAccount.id);

    const subscription = supabase
      .channel(`shared-transactions-changes-${currentAccount.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${currentAccount.id}`,
        },
        (payload) => {
          console.log('📊 SHARED TRANSACTIONS REALTIME UPDATE:', payload.eventType, payload);
          loadTransactions();
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 CLEANING UP SHARED TRANSACTIONS SUBSCRIPTION for account:', currentAccount.id);
      subscription.unsubscribe();
    };
  }, [currentAccount?.id]);

  const loadTransactions = async () => {
    if (!currentAccount) return;

    try {
      setIsLoading(true);
      
      let query = supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      // Load transactions for the selected account
      if (currentAccount.type === 'personal') {
        query = query.eq('user_id', currentAccount.id);
      } else {
        // For shared accounts, load the owner's transactions
        query = query.eq('user_id', currentAccount.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    if (!currentAccount) return;

    try {
      const newTransaction = {
        ...transaction,
        user_id: currentAccount.id
      };

      const { error } = await supabase
        .from('transactions')
        .insert([newTransaction]);

      if (error) throw error;

      await loadTransactions();
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  return {
    transactions,
    isLoading,
    addTransaction,
    loadTransactions
  };
};