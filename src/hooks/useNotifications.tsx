// Legacy hook for backward compatibility - redirects to useInAppNotifications
import { useInAppNotifications } from './useInAppNotifications';

export interface Notification {
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

/**
 * @deprecated Use useInAppNotifications for in-app notifications or usePushNotifications for push notifications
 */
export const useNotifications = () => {
  console.warn('useNotifications is deprecated. Use useInAppNotifications for in-app notifications or usePushNotifications for push notifications');
  
  const {
    inAppNotifications: notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    addInAppNotification: addNotification
  } = useInAppNotifications();

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    addNotification,
  };
};