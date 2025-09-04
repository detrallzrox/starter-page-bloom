/**
 * Central service for managing all types of notifications
 * Handles the coordination between in-app notifications and push notifications
 */

import { supabase } from '@/integrations/supabase/client';

interface InAppNotificationData {
  title: string;
  message: string;
  type: string;
  referenceId?: string;
  referenceType?: string;
  navigationData?: any;
}

interface PushNotificationData {
  title: string;
  body: string;
  data?: any;
  platform?: 'android' | 'ios' | 'web';
  target_token?: string; // Token específico do dispositivo atual
}

export class NotificationService {
  /**
   * Obtém o token FCM do dispositivo atual
   */
  static async getCurrentDeviceToken(): Promise<string | null> {
    try {
      // 1. Tentar obter do localStorage (mais confiável)
      const storedToken = localStorage.getItem('current_fcm_token');
      if (storedToken) {
        console.log('📱 Token FCM obtido do localStorage:', storedToken.substring(0, 20) + '...');
        return storedToken;
      }

      // 2. Tentar solicitar novo token via interface Android
      if (window.Android && typeof window.Android.getFCMToken === 'function') {
        console.log('📱 Solicitando token FCM atual via Android...');
        
        return new Promise((resolve) => {
          // Callback temporário para capturar o token
          const originalCallback = window.onFCMTokenReceived;
          
          window.onFCMTokenReceived = (token: string) => {
            console.log('🔑 Token FCM atual recebido:', token.substring(0, 20) + '...');
            localStorage.setItem('current_fcm_token', token); // Armazenar para próxima vez
            
            // Restaurar callback original
            window.onFCMTokenReceived = originalCallback;
            
            resolve(token);
          };
          
          window.Android.getFCMToken();
          
          // Timeout de 3 segundos
          setTimeout(() => {
            window.onFCMTokenReceived = originalCallback;
            resolve(null);
          }, 3000);
        });
      }

      console.warn('⚠️ Não foi possível obter token FCM do dispositivo atual');
      return null;
    } catch (error) {
      console.error('❌ Erro ao obter token FCM atual:', error);
      return null;
    }
  }

  /**
   * Creates an in-app notification only (appears in notification center)
   */
  static async createInAppNotification(
    userId: string,
    notificationData: InAppNotificationData
  ) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type,
          reference_id: notificationData.referenceId,
          reference_type: notificationData.referenceType,
          navigation_data: notificationData.navigationData,
        });

      if (error) {
        console.error('Error creating in-app notification:', error);
        throw error;
      }

      console.log('✅ In-app notification created successfully');
    } catch (error) {
      console.error('Failed to create in-app notification:', error);
      throw error;
    }
  }

  /**
   * Sends a push notification only (appears on device even when app is closed)
   */
  static async sendPushNotification(
    userId: string,
    notificationData: PushNotificationData
  ) {
    try {
      // Obter token do dispositivo atual se não foi especificado
      let targetToken = notificationData.target_token;
      
      if (!targetToken) {
        console.log('🎯 Obtendo token FCM do dispositivo atual...');
        targetToken = await this.getCurrentDeviceToken();
        
        if (!targetToken) {
          console.warn('⚠️ Token FCM do dispositivo atual não disponível - usando fallback');
        }
      }

      const requestBody: any = {
        user_id: userId,
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data,
      };

      // Incluir token específico se disponível
      if (targetToken) {
        requestBody.target_token = targetToken;
        console.log('🎯 Enviando notificação para dispositivo específico:', targetToken.substring(0, 20) + '...');
      } else {
        console.log('⚠️ Enviando sem token específico - usará token mais recente do usuário');
      }

      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: requestBody
      });

      if (error) {
        console.error('Error sending push notification:', error);
        throw error;
      }

      console.log('✅ Push notification sent successfully');
    } catch (error) {
      console.error('Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * Creates both in-app and push notifications
   * Use this for important notifications that should appear both ways
   */
  static async createHybridNotification(
    userId: string,
    inAppData: InAppNotificationData,
    pushData?: PushNotificationData
  ) {
    try {
      // Create in-app notification
      await this.createInAppNotification(userId, inAppData);

      // Send push notification if data provided
      if (pushData) {
        await this.sendPushNotification(userId, pushData);
      }

      console.log('✅ Hybrid notification created successfully');
    } catch (error) {
      console.error('Failed to create hybrid notification:', error);
      throw error;
    }
  }

  /**
   * Recommended method for most notifications
   * Creates in-app notification and optionally sends push notification
   */
  static async notify(
    userId: string,
    title: string,
    message: string,
    options: {
      type?: string;
      sendPush?: boolean;
      referenceId?: string;
      referenceType?: string;
      navigationData?: any;
      pushData?: any;
    } = {}
  ) {
    const {
      type = 'info',
      sendPush = false,
      referenceId,
      referenceType,
      navigationData,
      pushData
    } = options;

    try {
      // Always create in-app notification
      await this.createInAppNotification(userId, {
        title,
        message,
        type,
        referenceId,
        referenceType,
        navigationData
      });

      // Optionally send push notification
      if (sendPush) {
        await this.sendPushNotification(userId, {
          title,
          body: message,
          data: pushData
        });
      }

      console.log(`✅ Notification created for user ${userId} (push: ${sendPush})`);
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Triggers budget check for a specific transaction
   */
  static async checkBudgetExceeded(
    userId: string,
    categoryId: string,
    transactionId: string
  ) {
    try {
      console.log('🔍 CALLING check-budget-exceeded function with:', { userId, categoryId, transactionId });
      
      const { data, error } = await supabase.functions.invoke('check-budget-exceeded', {
        body: {
          userId,
          categoryId,
          transactionId
        }
      });

      if (error) {
        console.error('❌ Error checking budget notifications:', error);
        throw error;
      }

      console.log('✅ Budget check completed successfully. Response:', data);
    } catch (error) {
      console.error('❌ Failed to check budget notifications:', error);
      throw error;
    }
  }
}

export default NotificationService;