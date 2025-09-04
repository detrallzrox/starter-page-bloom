import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAccountContext } from './useAccountContext';
import { useEffect } from 'react';

export interface BillReminder {
  id: string;
  user_id: string;
  reminder_name: string;
  comment: string;
  frequency: string;
  category: string;
  logo_type: string;
  is_recurring: boolean;
  recurring_enabled: boolean;
  notification_date?: string;
  next_notification_date?: string;
  reminder_time?: string;
  reminder_day?: number;
  created_at: string;
  updated_at: string;
}

export const useBillReminders = () => {
  const { user } = useAuth();
  const { currentAccount } = useAccountContext();
  const queryClient = useQueryClient();

  const { data: billReminders = [], isLoading, refetch } = useQuery({
    queryKey: ['bill-reminders', currentAccount?.id],
    queryFn: async () => {
      const userId = currentAccount?.id || user?.id;
      if (!userId) return [];

      console.log('🔄 LOADING BILL REMINDERS for user:', userId);
      
      const { data, error } = await supabase
        .from('bill_reminders')
        .select('*')
        .eq('user_id', userId)
        .order('reminder_name');
      
      if (error) {
        console.error('LoadBillReminders error:', error);
        throw error;
      }
      
      console.log('✅ BILL REMINDERS LOADED:', data?.length || 0);
      return data as BillReminder[];
    },
    enabled: !!(user?.id || currentAccount?.id),
  });

  // Real-time subscription para atualizações instantâneas
  useEffect(() => {
    const userId = currentAccount?.id || user?.id;
    if (!userId) return;

    console.log('🔄 CREATING BILL REMINDERS SUBSCRIPTION for user:', userId);

    const subscription = supabase
      .channel(`bill-reminders-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bill_reminders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('📋 BILL REMINDERS REALTIME UPDATE:', payload.eventType, payload);
          queryClient.invalidateQueries({ queryKey: ['bill-reminders', userId] });
          queryClient.refetchQueries({ queryKey: ['bill-reminders', userId] });
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 CLEANING UP BILL REMINDERS SUBSCRIPTION for user:', userId);
      subscription.unsubscribe();
    };
  }, [currentAccount?.id, user?.id, queryClient]);

  const addBillReminderMutation = useMutation({
    mutationFn: async (reminderData: Omit<BillReminder, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      const userId = currentAccount?.id || user?.id;
      if (!userId) throw new Error('User not authenticated or account not selected');

      const { data, error } = await supabase
        .from('bill_reminders')
        .insert({
          user_id: userId,
          ...reminderData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-reminders', currentAccount?.id] });
    },
  });

  const updateBillReminderMutation = useMutation({
    mutationFn: async ({ id, ...reminderData }: Partial<BillReminder> & { id: string }) => {
      const userId = currentAccount?.id || user?.id;
      if (!userId) throw new Error('User not authenticated or account not selected');

      const { data, error } = await supabase
        .from('bill_reminders')
        .update(reminderData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-reminders', currentAccount?.id] });
    },
  });

  const deleteBillReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      const userId = currentAccount?.id || user?.id;
      if (!userId) throw new Error('User not authenticated or account not selected');

      const { error } = await supabase
        .from('bill_reminders')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-reminders', currentAccount?.id] });
    },
  });

  return {
    billReminders,
    isLoading,
    refetch,
    addBillReminder: addBillReminderMutation.mutate,
    updateBillReminder: updateBillReminderMutation.mutate,
    deleteBillReminder: deleteBillReminderMutation.mutate,
    isAddingReminder: addBillReminderMutation.isPending,
    isUpdatingReminder: updateBillReminderMutation.isPending,
    isDeletingReminder: deleteBillReminderMutation.isPending,
  };
};