import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Armazena o token fora do ciclo de vida do componente para persistir entre renderizações
let pendingToken: string | null = null;

export const useFCM = () => {
  const { user } = useAuth();
  const [isTokenRequested, setIsTokenRequested] = useState(false);

  const saveTokenToSupabase = useCallback(async (token: string, userId: string) => {
    console.log('💾 Salvando token FCM no Supabase:', { userId, token });
    
    const { error } = await supabase
      .from('fcm_tokens')
      .upsert({ 
        user_id: userId, 
        token: token,
        platform: 'android'
      }, { onConflict: 'token' });

    if (error) {
      console.error("❌ Erro ao salvar token FCM no Supabase:", error);
    } else {
      console.log("✅ Token FCM salvo com sucesso no Supabase!");
      pendingToken = null; // Limpa o token pendente após o sucesso
    }
  }, []);

  useEffect(() => {
    // Define o callback global uma única vez
    window.onFCMTokenReceived = (token: string) => {
      console.log("🔑 Token FCM recebido do Android:", token);
      
      // SEMPRE armazenar o token atual no localStorage
      localStorage.setItem('current_fcm_token', token);
      console.log('💾 Token FCM armazenado no localStorage para uso imediato');
      
      if (user) {
        saveTokenToSupabase(token, user.id);
      } else {
        console.log("👤 Usuário ainda não autenticado. Armazenando token para mais tarde.");
        pendingToken = token;
      }
    };

    // Solicita o token apenas uma vez
    if (window.Android && typeof window.Android.getFCMToken === 'function' && !isTokenRequested) {
      console.log("📱 Solicitando token FCM via interface nativa Android...");
      window.Android.getFCMToken();
      setIsTokenRequested(true);
    }

    // Limpa o callback quando o componente principal for desmontado
    return () => {
      window.onFCMTokenReceived = undefined;
    };
  }, [isTokenRequested, saveTokenToSupabase, user]);

  useEffect(() => {
    // Verifica se há um token pendente quando o usuário se autentica
    if (user && pendingToken) {
      console.log("👤 Usuário autenticado. Salvando token pendente...");
      saveTokenToSupabase(pendingToken, user.id);
    }
  }, [user, saveTokenToSupabase]);

  // Função para obter o token atual (para uso em outros componentes)
  const getCurrentToken = useCallback(() => {
    return localStorage.getItem('current_fcm_token');
  }, []);

  return {
    getCurrentToken
  };
};
