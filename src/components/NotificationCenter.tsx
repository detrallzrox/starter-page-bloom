import { useState, useEffect } from "react";
import { Bell, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInAppNotifications } from "@/hooks/useInAppNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useModal } from "@/contexts/ModalContext";

export const NotificationCenter = () => {
  const { inAppNotifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useInAppNotifications();
  const { createPushNotification } = usePushNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const { openSharedAccount } = useModal();

  // Configurar Web Push Notifications e listener para notificações push
  useEffect(() => {
    const setupPushNotifications = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          // Registrar service worker se ainda não estiver registrado
          let registration = await navigator.serviceWorker.getRegistration('/');
          if (!registration) {
            registration = await navigator.serviceWorker.register('/sw.js');
          }

          // Solicitar permissão para notificações
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            console.log('✅ Permissão para notificações concedida');
          }
        } catch (error) {
          console.error('❌ Erro ao configurar push notifications:', error);
        }
      }
    };

    // Listener para mensagens de push notifications recebidas
    const handlePushMessage = (event: MessageEvent) => {
      if (event.data?.type === 'push_notification') {
        const { title, body, data } = event.data.payload;
        
        // Criar notificação local através do hook para evitar duplicatas
        setTimeout(() => {
          if (Notification.permission === 'granted' && document.hidden) {
            new Notification(title, {
              body: body,
              icon: '/favicon.ico',
              tag: `notification_${Date.now()}` // Evita duplicatas
            });
          }
        }, 100);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handlePushMessage);
    setupPushNotifications();

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handlePushMessage);
    };
  }, []);

  // Notificações são tratadas pelo useRealTimeNotifications hook

  const handleNotificationClick = async (notification: any) => {
    // Marcar como lida
    markAsRead(notification.id);
    
    // Verificar se deve navegar (não navegar para transações excluídas)
    if (notification.navigation_data?.deleted === true) {
      setIsOpen(false);
      return;
    }

    // Fechar o popover
    setIsOpen(false);

    // Aguardar um pouco para garantir que o popover fechou
    await new Promise(resolve => setTimeout(resolve, 100));

    // Implementar navegação baseada no tipo de notificação usando eventos customizados
    if (notification.type === 'transaction') {
      // Scroll para as transações recentes
      setTimeout(() => {
        const element = document.getElementById('recent-transactions') || 
                      document.querySelector('[data-component="recent-transactions"]') ||
                      document.querySelector('[class*="transaction"]');
        
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          element.style.border = '2px solid hsl(var(--primary))';
          element.style.borderRadius = '8px';
          setTimeout(() => {
            element.style.border = '';
            element.style.borderRadius = '';
          }, 3000);
        }
      }, 100);
    } else if (notification.type === 'shared_account' || notification.type === 'sharing_invite') {
      // Usar contexto para abrir modal de conta compartilhada
      console.log('🔔 Opening shared account modal for notification:', notification);
      openSharedAccount();
    } else if (notification.type === 'reminder') {
      // Disparar evento para abrir modal de lembretes
      window.dispatchEvent(new CustomEvent('open-bill-reminders-modal'));
    } else if (notification.type === 'budget_exceeded') {
      // Disparar evento para abrir modal de orçamento
      window.dispatchEvent(new CustomEvent('open-category-budget-modal'));
    } else if (notification.type === 'subscription_overdue' || notification.type === 'subscription') {
      // Disparar evento para abrir modal de assinaturas
      window.dispatchEvent(new CustomEvent('open-subscriptions-modal'));
    } else if (notification.type === 'installment_overdue' || notification.type === 'installment') {
      // Disparar evento para abrir modal de cartão de crédito/parcelas
      window.dispatchEvent(new CustomEvent('open-installment-purchases-modal'));
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return '🔔';
      case 'transaction':
        return '💰';
      case 'subscription':
        return '🔄';
      case 'subscription_overdue':
        return '⚠️';
      case 'shared_account':
      case 'sharing_invite':
      case 'sharing_accepted':
        return '👥';
      case 'budget_exceeded':
        return '📊';
      case 'installment_overdue':
      case 'installment':
        return '💳';
      case 'welcome':
        return '👋';
      default:
        return '👥';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative hover:bg-accent"
          disabled={isLoading}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notificações</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsRead()}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Marcar todas como lidas
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {inAppNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {inAppNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 border-b last:border-b-0 cursor-pointer transition-colors",
                        !notification.read 
                          ? "bg-primary/5 hover:bg-primary/10" 
                          : "hover:bg-accent/50",
                        "group"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                        <div className="flex items-start gap-3">
                        <div className="text-xl flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={cn(
                              "text-sm font-medium truncate",
                              !notification.read && "font-semibold"
                            )}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 ml-2" />
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatTime(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};