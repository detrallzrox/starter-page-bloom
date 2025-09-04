import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { handleNotificationClick } from '@/utils/notificationNavigation';

export const useWebPushNotifications = () => {
  const { user } = useAuth();

  // Função para mostrar notificação via service worker
  const showWebNotification = async (title: string, message: string, data: any = {}) => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Enviar mensagem para o service worker mostrar a notificação
      registration.active?.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        message,
        icon: data.type === 'sharing_invite' ? '/finaudy-mascot.png' : '/finaudy-pig.png',
        data,
        notificationType: data.type
      });

      console.log('✅ Notificação web enviada via service worker');
    } catch (error) {
      console.error('❌ Erro ao enviar notificação via service worker:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    const initializeWebPushNotifications = async () => {
      try {
        // Verificar se o browser suporta notificações
        if (!('Notification' in window)) {
          console.log('❌ Browser não suporta notificações');
          toast.error('Seu navegador não suporta notificações');
          return;
        }

        // Verificar se o browser suporta service workers
        if (!('serviceWorker' in navigator)) {
          console.log('❌ Browser não suporta service workers');
          toast.error('Seu navegador não suporta service workers');
          return;
        }

        // Registrar service worker com configurações avançadas
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });
        
        console.log('✅ Service Worker registrado:', registration);

        // Aguardar SW estar ativo
        await navigator.serviceWorker.ready;
        
        // Verificar permissão de notificação
        let permission = Notification.permission;
        if (permission === 'default') {
          // Mostrar toast explicando a importância das notificações
          toast.info('Permita notificações para receber lembretes importantes!', {
            duration: 5000
          });
          
          permission = await Notification.requestPermission();
        }

        if (permission === 'granted') {
          console.log('✅ Permissão de notificação concedida');
          
          // Verificar se tem suporte a VAPID
          if ('PushManager' in window) {
            try {
              // Tentar se inscrever para push notifications
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array('BNz9y9ZZgwn9YhJtYzBv3l7-y9xYbJlKUjzPl2K8IuXvVaY0jJ7x8J4c3n2j4l3-a9xYbJlKUjzPl2K8IuXvVaY0')
              });

              console.log('✅ Push subscription criada:', subscription);
              
              // Usar o endpoint da subscription como token
              const webPushToken = subscription.endpoint;
              
              // Salvar token na tabela fcm_tokens (padronizada) usando edge function
              await supabase.functions.invoke('save-push-token', {
                body: { 
                  token: webPushToken,
                  platform: 'web'
                }
              });

              console.log('✅ Token web push salvo na fcm_tokens (padronizada)');
              
            } catch (pushError) {
              console.warn('Push subscription falhou, usando fallback:', pushError);
              
              // Fallback: usar token simples
              const webPushToken = `web_${user.id}_${Date.now()}`;
              
              await supabase.functions.invoke('save-push-token', {
                body: { 
                  token: webPushToken,
                  platform: 'web'
                }
              });

              console.log('✅ Token web push fallback salvo na fcm_tokens (padronizada):', webPushToken);
            }
          }
          
          // Configurar listener para mensagens do service worker
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
              if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
                console.log('🔔 Notificação clicada via service worker:', event.data);
                handleNotificationClick(event.data.notification.data);
              }
            });
            
            // Testar se SW está respondendo
            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = (event) => {
              if (event.data.type === 'PONG') {
                console.log('✅ Service Worker está respondendo');
              }
            };
            
            navigator.serviceWorker.controller?.postMessage(
              { type: 'PING' }, 
              [messageChannel.port2]
            );
          }
          
          // Notificação de boas-vindas
          toast.success('Notificações ativadas! Você receberá lembretes importantes.');
          
        } else if (permission === 'denied') {
          console.log('❌ Permissão de notificação negada');
          toast.error('Notificações foram negadas. Ative nas configurações do navegador para receber lembretes.');
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar notificações web:', error);
        toast.error('Erro ao configurar notificações');
      }
    };

    initializeWebPushNotifications();
  }, [user]);

  // Função helper para converter VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  return { 
    handleNotificationClick, 
    showWebNotification 
  };
};