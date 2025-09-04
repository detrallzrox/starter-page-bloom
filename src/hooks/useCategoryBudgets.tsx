import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAccountContext } from './useAccountContext';
import { useEffect } from 'react';

export interface CategoryBudget {
  id: string;
  user_id: string;
  category_id: string;
  budget_amount: number;
  period_start: string;
  period_end: string;
  period_type: string;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

export const useCategoryBudgets = () => {
  const { user } = useAuth();
  const { currentAccount } = useAccountContext();
  const queryClient = useQueryClient();

  const { data: categoryBudgets = [], isLoading, refetch } = useQuery({
    queryKey: ['category-budgets', currentAccount?.id],
    queryFn: async () => {
      const userId = currentAccount?.id || user?.id;
      if (!userId) return [];

      console.log('🔄 LOADING CATEGORY BUDGETS for user:', userId);
      
      const { data, error } = await supabase
        .from('category_budgets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('LoadCategoryBudgets error:', error);
        throw error;
      }
      
      console.log('✅ CATEGORY BUDGETS LOADED:', data?.length || 0);
      return data as CategoryBudget[];
    },
    enabled: !!(user?.id || currentAccount?.id),
  });

  // Real-time subscription para atualizações instantâneas
  useEffect(() => {
    const userId = currentAccount?.id || user?.id;
    if (!userId) return;

    console.log('🔄 CREATING CATEGORY BUDGETS SUBSCRIPTION for user:', userId);

    const subscription = supabase
      .channel(`category-budgets-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'category_budgets',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('💰 CATEGORY BUDGETS REALTIME UPDATE:', payload.eventType, payload);
          queryClient.invalidateQueries({ queryKey: ['category-budgets', userId] });
          queryClient.refetchQueries({ queryKey: ['category-budgets', userId] });
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 CLEANING UP CATEGORY BUDGETS SUBSCRIPTION for user:', userId);
      subscription.unsubscribe();
    };
  }, [currentAccount?.id, user?.id, queryClient]);

  const addCategoryBudgetMutation = useMutation({
    mutationFn: async (budgetData: Omit<CategoryBudget, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      const userId = currentAccount?.id || user?.id;
      if (!userId) throw new Error('User not authenticated or account not selected');

      const { data, error } = await supabase
        .from('category_budgets')
        .upsert({
          user_id: userId,
          ...budgetData,
        }, {
          onConflict: 'user_id,category_id,period_start,period_end'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-budgets', currentAccount?.id] });
    },
  });

  const updateCategoryBudgetMutation = useMutation({
    mutationFn: async ({ id, ...budgetData }: Partial<CategoryBudget> & { id: string }) => {
      const userId = currentAccount?.id || user?.id;
      if (!userId) throw new Error('User not authenticated or account not selected');

      const { data, error } = await supabase
        .from('category_budgets')
        .update(budgetData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-budgets', currentAccount?.id] });
    },
  });

  const deleteCategoryBudgetMutation = useMutation({
    mutationFn: async (id: string) => {
      const userId = currentAccount?.id || user?.id;
      if (!userId) throw new Error('User not authenticated or account not selected');

      const { error } = await supabase
        .from('category_budgets')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-budgets', currentAccount?.id] });
    },
  });

  return {
    categoryBudgets,
    isLoading,
    refetch,
    addCategoryBudget: addCategoryBudgetMutation.mutate,
    updateCategoryBudget: updateCategoryBudgetMutation.mutate,
    deleteCategoryBudget: deleteCategoryBudgetMutation.mutate,
    isAddingBudget: addCategoryBudgetMutation.isPending,
    isUpdatingBudget: updateCategoryBudgetMutation.isPending,
    isDeletingBudget: deleteCategoryBudgetMutation.isPending,
  };
};