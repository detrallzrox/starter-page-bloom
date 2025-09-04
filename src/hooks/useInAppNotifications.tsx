import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAccountContext } from './useAccountContext';
import { useEffect } from 'react';

export interface InAppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  reference_id?: string;
  reference_type?: string;
  navigation_data?: any;
}

export const useInAppNotifications = () => {
  const { user } = useAuth();
  const { currentAccount } = useAccountContext();
  const queryClient = useQueryClient();

  const { data: inAppNotifications = [], isLoading } = useQuery({
    queryKey: ['in-app-notifications', currentAccount?.id],
    queryFn: async () => {
      if (!user || !currentAccount) return [];
      
      console.log('🔔 LOADING IN-APP NOTIFICATIONS for user:', currentAccount.id);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentAccount.id)
        .neq('type', 'push_notification') // Exclude any remaining push notifications
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('❌ Error loading notifications:', error);
        throw error;
      }
      
      console.log('✅ IN-APP NOTIFICATIONS LOADED:', data?.length || 0, data);
      return data as InAppNotification[];
    },
    enabled: !!user && !!currentAccount,
  });

  // Add real-time subscription for notifications
  useEffect(() => {
    if (!user || !currentAccount) return;

    console.log('🔄 CREATING NOTIFICATIONS SUBSCRIPTION for user:', currentAccount.id);

    const subscription = supabase
      .channel(`notifications-changes-${currentAccount.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentAccount.id}`,
        },
        (payload) => {
          console.log('🔔 NOTIFICATIONS REALTIME UPDATE:', payload.eventType, payload);
          queryClient.invalidateQueries({ queryKey: ['in-app-notifications', currentAccount.id] });
          queryClient.refetchQueries({ queryKey: ['in-app-notifications', currentAccount.id] });
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 CLEANING UP NOTIFICATIONS SUBSCRIPTION for user:', currentAccount.id);
      subscription.unsubscribe();
    };
  }, [currentAccount?.id, user?.id, queryClient]);

  const unreadCount = inAppNotifications.filter(n => !n.read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user || !currentAccount) throw new Error('User not authenticated or account not selected');

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', currentAccount.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications', currentAccount?.id] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user || !currentAccount) throw new Error('User not authenticated or account not selected');

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', currentAccount.id)
        .eq('read', false)
        .neq('type', 'push_notification');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications', currentAccount?.id] });
    },
  });

  const addInAppNotification = async (
    title: string, 
    message: string, 
    type: string = 'info',
    referenceId?: string,
    referenceType?: string,
    navigationData?: any
  ) => {
    if (!user || !currentAccount) return;

    // Ensure we're not creating push_notification type in notifications table
    if (type === 'push_notification') {
      console.warn('Cannot create push_notification type in notifications table. Use push_notifications table instead.');
      return;
    }

    await supabase
      .from('notifications')
      .insert({
        user_id: currentAccount.id,
        title,
        message,
        type,
        reference_id: referenceId,
        reference_type: referenceType,
        navigation_data: navigationData,
      });

    queryClient.invalidateQueries({ queryKey: ['in-app-notifications', currentAccount.id] });
  };

  return {
    inAppNotifications,
    unreadCount,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    addInAppNotification,
  };
};