import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

// Os tipos já estão definidos em src/types/native.d.ts
// Removendo declarações duplicadas

export interface GoogleAuthConfig {
  // Web configuration
  redirectTo?: string;
  // Native configuration  
  webClientId?: string;
}

export interface GoogleAuthResult {
  success: boolean;
  error?: string;
  user?: any;
}

export const useGoogleAuth = (config?: GoogleAuthConfig) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Detecta se está rodando em ambiente Android
  const isAndroidWebView = () => {
    return typeof window.Android !== 'undefined';
  };

  // Configuração das callbacks para comunicação com Android
  const setupAndroidCallbacks = () => {
    window.onGoogleSignInSuccess = async (idToken: string, accessToken?: string) => {
      try {
        setIsLoading(true);

        if (!idToken && !accessToken) {
          throw new Error('Nenhum token válido fornecido pelo Android');
        }

        // Usar ID Token para autenticação com Supabase
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });

        if (error) {
          let errorDescription = error.message;
          if (error.message.includes('Invalid token') || error.message.includes('403')) {
            errorDescription = "Token inválido. Verifique se o Web Client ID está correto no Android.";
          }

          toast({
            title: "Erro no login",
            description: errorDescription,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Login realizado!",
          description: "Bem-vindo ao Finaudy",
        });

        // Navegar para a página inicial após um pequeno delay
        setTimeout(() => navigate('/'), 100);
      } catch (error: any) {
        toast({
          title: "Erro inesperado",
          description: error.message || 'Erro desconhecido durante o login',
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    window.onGoogleSignInError = (errorMessage: string) => {
      setIsLoading(false);

      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('403') || errorMessage.includes('blocked')) {
        userFriendlyMessage = "Login bloqueado pelo Google. Verifique a configuração no Google Cloud Console.";
      }

      toast({
        title: "Erro no login",
        description: userFriendlyMessage,
        variant: "destructive",
      });
    };
  };

  // Login nativo para Android WebView
  const signInWithGoogleNative = async (): Promise<GoogleAuthResult> => {
    try {
      setIsLoading(true);

      if (isAndroidWebView() && (window.Android as any)?.signInWithGoogle) {
        setupAndroidCallbacks();
        (window.Android as any).signInWithGoogle();
        return { success: true };
      } else {
        const errorMessage = 'A função de login nativo não está disponível.';
        toast({
          title: "Erro de Configuração",
          description: errorMessage,
          variant: "destructive",
        });
        setIsLoading(false);
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: "Erro no Login Nativo",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  };

  // Login web OAuth
  const signInWithGoogleWeb = async (): Promise<GoogleAuthResult> => {
    // Bloquear OAuth web em Android
    if (isAndroidWebView()) {
      toast({
        title: "Erro no login",
        description: "OAuth web não funciona em Android. O sistema deveria ter usado login nativo.",
        variant: "destructive",
      });
      return { success: false, error: "OAuth web bloqueado em Android" };
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: config?.redirectTo || `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Erro inesperado",
        description: error.message || 'Erro durante o login web',
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Método principal que decide automaticamente qual estratégia usar
  const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
    if (isAndroidWebView()) {
      return await signInWithGoogleNative();
    } else {
      return await signInWithGoogleWeb();
    }
  };

  // Cleanup das callbacks
  const cleanup = () => {
    if (window.onGoogleSignInSuccess) {
      delete window.onGoogleSignInSuccess;
    }
    if (window.onGoogleSignInError) {
      delete window.onGoogleSignInError;
    }
  };

  return {
    signInWithGoogle,
    signInWithGoogleNative,
    signInWithGoogleWeb,
    isLoading,
    isAndroidWebView: isAndroidWebView,
    cleanup,
  };
};