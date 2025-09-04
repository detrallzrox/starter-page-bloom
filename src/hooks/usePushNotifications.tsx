import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAccountContext } from './useAccountContext';

export interface PushNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data?: any;
  platform: 'android' | 'ios' | 'web';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at?: string;
  delivered_at?: string;
  push_token?: string;
  created_at: string;
  updated_at: string;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const { currentAccount } = useAccountContext();
  const queryClient = useQueryClient();

  const { data: pushNotifications = [], isLoading } = useQuery({
    queryKey: ['push-notifications', currentAccount?.id],
    queryFn: async () => {
      if (!user || !currentAccount) return [];
      
      const { data, error } = await supabase
        .from('push_notifications')
        .select('*')
        .eq('user_id', currentAccount.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as PushNotification[];
    },
    enabled: !!user && !!currentAccount,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, delivered_at }: { 
      id: string; 
      status: 'sent' | 'delivered' | 'failed';
      delivered_at?: string;
    }) => {
      const updateData: any = { status };
      
      if (status === 'sent') {
        updateData.sent_at = new Date().toISOString();
      }
      
      if (delivered_at) {
        updateData.delivered_at = delivered_at;
      }

      const { error } = await supabase
        .from('push_notifications')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-notifications', currentAccount?.id] });
    },
  });

  const createPushNotification = async (
    title: string,
    body: string,
    platform: 'android' | 'ios' | 'web',
    notificationData?: any,
    pushToken?: string
  ) => {
    if (!user || !currentAccount) return null;

    const { data: insertedData, error } = await supabase
      .from('push_notifications')
      .insert({
        user_id: currentAccount.id,
        title,
        body,
        platform,
        data: notificationData,
        push_token: pushToken,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['push-notifications', currentAccount.id] });
    return insertedData as PushNotification;
  };

  return {
    pushNotifications,
    isLoading,
    createPushNotification,
    updateStatus: updateStatusMutation.mutate,
  };
};