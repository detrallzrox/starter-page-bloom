import { supabase } from '@/integrations/supabase/client';

export class NotificationTestUtils {
  /**
   * Testa o envio de uma notificação push para o usuário atual
   */
  static async testPushNotification(userId: string, title = "Teste de Notificação", body = "Esta é uma notificação de teste do Finaudy!") {
    try {
      console.log('🧪 Iniciando teste de notificação push...', { userId, title, body });

      // Obter token do dispositivo atual
      const currentToken = localStorage.getItem('current_fcm_token');
      
      if (!currentToken) {
        console.warn('⚠️ Token FCM do dispositivo atual não encontrado no localStorage');
      } else {
        console.log('🎯 Usando token FCM do dispositivo atual:', currentToken.substring(0, 20) + '...');
      }

      const requestBody: any = {
        user_id: userId,
        title: title,
        body: body,
        data: {
          type: 'test',
          timestamp: Date.now().toString()
        }
      };

      // Incluir token específico se disponível
      if (currentToken) {
        requestBody.target_token = currentToken;
      }

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: requestBody
      });

      if (error) {
        console.error('❌ Erro no teste de notificação:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Teste de notificação enviado com sucesso:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Falha no teste de notificação:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verifica se o usuário tem tokens FCM registrados
   */
  static async checkUserTokens(userId: string) {
    try {
      console.log('🔍 Verificando tokens FCM do usuário:', userId);

      const { data: tokens, error } = await supabase
        .from('fcm_tokens')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Erro ao buscar tokens FCM:', error);
        return { success: false, error: error.message, tokens: [] };
      }

      console.log('📱 Tokens FCM encontrados:', tokens);
      return { success: true, tokens: tokens || [] };
    } catch (error) {
      console.error('❌ Falha ao verificar tokens:', error);
      return { success: false, error: error.message, tokens: [] };
    }
  }

  /**
   * Verifica o histórico de notificações push do usuário
   */
  static async checkNotificationHistory(userId: string, limit = 10) {
    try {
      console.log('📋 Verificando histórico de notificações:', userId);

      const { data: notifications, error } = await supabase
        .from('push_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Erro ao buscar histórico:', error);
        return { success: false, error: error.message, notifications: [] };
      }

      console.log('📨 Histórico de notificações:', notifications);
      return { success: true, notifications: notifications || [] };
    } catch (error) {
      console.error('❌ Falha ao verificar histórico:', error);
      return { success: false, error: error.message, notifications: [] };
    }
  }

  /**
   * Solicita token FCM via interface nativa
   */
  static requestFCMToken() {
    if (window.Android && typeof window.Android.getFCMToken === 'function') {
      console.log('📱 Solicitando token FCM via Android interface...');
      window.Android.getFCMToken();
      return true;
    } else {
      console.warn('⚠️ Interface Android FCM não disponível');
      return false;
    }
  }

  /**
   * Solicita permissões de notificação
   */
  static requestNotificationPermission() {
    if (window.Android && typeof window.Android.requestNotificationPermission === 'function') {
      console.log('🔐 Solicitando permissões de notificação...');
      window.Android.requestNotificationPermission();
      return true;
    } else {
      console.warn('⚠️ Interface Android de permissões não disponível');
      return false;
    }
  }

  /**
   * Diagnóstico completo do sistema de notificações
   */
  static async fullDiagnosis(userId: string) {
    console.log('🩺 Iniciando diagnóstico completo do sistema de notificações...');
    
    const results = {
      tokens: await this.checkUserTokens(userId),
      history: await this.checkNotificationHistory(userId, 5),
      androidInterface: {
        fcm: !!window.Android?.getFCMToken,
        notifications: !!window.Android?.requestNotificationPermission,
      },
      testNotification: { success: false, data: null, error: null } as any
    };

    // Testa uma notificação sempre (com token específico se disponível)
    results.testNotification = await this.testPushNotification(
      userId,
      "🩺 Teste de Diagnóstico",
      "Sistema de notificações funcionando corretamente!"
    );

    console.log('📊 Resultado do diagnóstico completo:', results);
    return results;
  }
}

// Adiciona utilitários globais para debug
declare global {
  interface Window {
    NotificationTestUtils: typeof NotificationTestUtils;
  }
}

if (typeof window !== 'undefined') {
  window.NotificationTestUtils = NotificationTestUtils;
}

export default NotificationTestUtils;