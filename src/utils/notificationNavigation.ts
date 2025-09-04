// import { PushNotificationSchema } from '@capacitor/push-notifications';
import { NavigateFunction } from 'react-router-dom';

// Tipo simplificado para substituir PushNotificationSchema
interface PushNotificationSchema {
  data?: Record<string, any>;
}

// Interface para os dados da notificação da web
interface NotificationData {
  type: string;
  category_id?: string;
  [key: string]: any;
}

/**
 * Utilitário para navegação em NOTIFICAÇÕES WEB.
 * Usa window.location.href para redirecionamento.
 */
export const handleNotificationClick = (notificationData: NotificationData) => {
  const { type, ...data } = notificationData;
  
  switch (type) {
    case 'sharing_invite':
    case 'sharing_accepted':
      window.location.href = '/#sharing';
      break;
      
    case 'bill_reminder':
    case 'reminder':
      window.location.href = '/#reminders';
      break;
      
    case 'subscription':
      window.location.href = '/#subscriptions';
      break;
      
    case 'budget_exceeded':
      if (data.category_id) {
        window.location.href = `/#budgets?category=${data.category_id}`;
      } else {
        window.location.href = '/#budgets';
      }
      break;
      
    case 'transaction':
      window.location.href = '/';
      break;
      
    case 'installment':
      window.location.href = '/#installments';
      break;
      
    default:
      window.location.href = '/';
      break;
  }
};


/**
 * Utilitário para navegação em NOTIFICAÇÕES PUSH (MOBILE).
 * Usa o `navigate` do React Router para uma navegação fluida no app.
 */
export const handleNotificationNavigation = (
  notification: PushNotificationSchema,
  navigate: NavigateFunction
) => {
  const type = notification.data?.type as string;
  const data = notification.data || {};

  if (!type) {
    navigate('/notifications');
    return;
  }

  switch (type) {
    case 'sharing_invite':
    case 'sharing_accepted':
      navigate('/sharing');
      break;

    case 'bill_reminder':
    case 'reminder':
      navigate('/reminders');
      break;

    case 'subscription':
    case 'overdue_subscription':
      navigate('/subscriptions');
      break;

    case 'budget_exceeded':
      if (data.category_id) {
        navigate(`/budgets?category=${data.category_id}`);
      } else {
        navigate('/budgets');
      }
      break;

    case 'transaction':
      navigate('/');
      break;

    case 'installment':
    case 'overdue_installment':
      navigate('/installments');
      break;

    default:
      navigate('/notifications');
      break;
  }
};
