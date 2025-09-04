/**
 * Utilitário para forçar atualização do token FCM
 * Use quando suspeitar que o token atual está incorreto
 */

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export class ForceTokenRefresh {
  /**
   * Remove token atual do localStorage e força nova solicitação
   */
  static clearCurrentToken() {
    localStorage.removeItem('current_fcm_token');
    console.log('🧹 Token FCM local removido - será solicitado novo token');
  }

  /**
   * Remove TODOS os tokens do usuário da base de dados
   */
  static async clearAllUserTokens(userId: string) {
    try {
      console.log('🗑️ Removendo todos os tokens FCM do usuário:', userId);
      
      const { error } = await supabase
        .from('fcm_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Erro ao remover tokens:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Todos os tokens removidos da base de dados');
      return { success: true };
    } catch (error) {
      console.error('❌ Falha ao remover tokens:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Força nova solicitação de token via interface Android
   */
  static requestNewToken(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!window.Android || typeof window.Android.getFCMToken !== 'function') {
        console.error('❌ Interface Android não disponível');
        resolve(null);
        return;
      }

      console.log('📱 Solicitando NOVO token FCM via Android...');

      // Callback temporário para capturar novo token
      const originalCallback = window.onFCMTokenReceived;
      
      window.onFCMTokenReceived = (token: string) => {
        console.log('🔑 NOVO token FCM recebido:', token.substring(0, 20) + '...');
        
        // Armazenar novo token
        localStorage.setItem('current_fcm_token', token);
        
        // Restaurar callback original
        window.onFCMTokenReceived = originalCallback;
        
        resolve(token);
      };

      // Solicitar token
      window.Android.getFCMToken();

      // Timeout de 5 segundos
      setTimeout(() => {
        window.onFCMTokenReceived = originalCallback;
        resolve(null);
      }, 5000);
    });
  }

  /**
   * Processo completo de renovação de token
   */
  static async fullTokenRefresh(userId: string) {
    console.log('🔄 Iniciando processo completo de renovação de token...');

    try {
      // 1. Limpar token local
      this.clearCurrentToken();

      // 2. Remover todos os tokens da base
      await this.clearAllUserTokens(userId);

      // 3. Solicitar novo token
      const newToken = await this.requestNewToken();

      if (!newToken) {
        console.error('❌ Falha ao obter novo token');
        return { success: false, error: 'Novo token não recebido' };
      }

      // 4. Salvar novo token na base
      const { error } = await supabase
        .from('fcm_tokens')
        .insert({
          user_id: userId,
          token: newToken,
          platform: 'android'
        });

      if (error) {
        console.error('❌ Erro ao salvar novo token:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Renovação de token concluída com sucesso!');
      console.log('🎯 Novo token:', newToken.substring(0, 20) + '...');

      return { 
        success: true, 
        newToken: newToken.substring(0, 20) + '...',
        message: 'Token renovado com sucesso'
      };

    } catch (error) {
      console.error('❌ Erro durante renovação:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Testa notificação com token atual
   */
  static async testCurrentToken(userId: string) {
    const currentToken = localStorage.getItem('current_fcm_token');
    
    if (!currentToken) {
      return { success: false, error: 'Nenhum token atual encontrado' };
    }

    console.log('🧪 Testando token atual:', currentToken.substring(0, 20) + '...');

    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: userId,
          title: '🔧 Teste de Token',
          body: 'Testando se este é o dispositivo correto',
          target_token: currentToken,
          data: {
            type: 'token_test',
            timestamp: Date.now().toString()
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data, message: 'Teste enviado' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Adicionar ao objeto global para debug
declare global {
  interface Window {
    ForceTokenRefresh: typeof ForceTokenRefresh;
  }
}

if (typeof window !== 'undefined') {
  window.ForceTokenRefresh = ForceTokenRefresh;
}

export default ForceTokenRefresh;