import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAccountContext } from './useAccountContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useRealTimeNotifications = () => {
  const { user } = useAuth();
  const { currentAccount } = useAccountContext();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !currentAccount) return;

    console.log('🔔 Iniciando escuta de notificações em tempo real para conta:', currentAccount.id);

    // Escutar novas notificações em tempo real para a conta atual
    const channel = supabase
      .channel(`notifications-realtime-${currentAccount.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentAccount.id}`
        },
        (payload) => {
          console.log('🔔 Nova notificação recebida em tempo real:', payload);
          const notification = payload.new as any;
          
          // Invalidar cache para buscar notificações atualizadas
          queryClient.invalidateQueries({ queryKey: ['in-app-notifications', currentAccount.id] });
          
          // Exibir toast para a nova notificação
          toast.info(notification.title, {
            description: notification.message,
            duration: 5000,
          });

          // O bloco que criava a notificação nativa foi removido para evitar duplicidade.
          // A notificação PUSH enviada pelo backend (Firebase) é a única que deve aparecer
          // na barra de status do sistema. Este hook agora apenas atualiza a UI interna
          // (NotificationCenter) e exibe um toast.
        }
      )
      .subscribe((status) => {
        console.log('🔔 Status da subscription de notificações:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscrito com sucesso às notificações em tempo real');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erro no canal de notificações em tempo real');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Timeout na conexão de notificações em tempo real');
        }
      });

    return () => {
      console.log('🔕 Parando escuta de notificações em tempo real para conta:', currentAccount?.id);
      supabase.removeChannel(channel);
    };
  }, [user, currentAccount?.id, queryClient]);

  return {};
};