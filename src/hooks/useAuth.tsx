import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Função para obter fingerprint do dispositivo
const getDeviceFingerprint = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('device-fingerprint', 2, 2);
  const fingerprint = canvas.toDataURL();
  
  return btoa(
    fingerprint + 
    navigator.userAgent + 
    screen.width + 
    screen.height + 
    new Date().getTimezoneOffset()
  );
};

// Função para registrar dispositivo
const registerDevice = async () => {
  try {
    // Obter IP do usuário via API externa
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const { ip } = await ipResponse.json();
    
    await supabase.from('device_registrations').insert({
      ip_address: ip,
      device_fingerprint: getDeviceFingerprint(),
      user_id: null // Será preenchido depois do cadastro
    });
  } catch (error) {
    console.error('Erro ao registrar dispositivo:', error);
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.user_metadata);
        
        // Para eventos de USER_UPDATED, forçar atualização dos dados
        if (event === 'USER_UPDATED' && session?.user) {
          // Aguardar um pouco e buscar os dados atualizados
          setTimeout(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
          }, 100);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Processar convites pendentes após login bem-sucedido
        try {
          const { data, error: inviteError } = await supabase.functions.invoke('process-pending-invites');
          if (inviteError) {
            console.warn('Erro ao processar convites pendentes:', inviteError);
          } else if (data?.processedInvites > 0) {
            toast({
              title: "Convites processados!",
              description: `${data.processedInvites} convite(s) de conta compartilhada foram ativados.`,
            });
          }
        } catch (inviteError) {
          console.warn('Erro ao processar convites:', inviteError);
        }
        
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo ao Finaudy",
        });
      }
      
      return { error };
    } catch (error: any) {
      toast({
        title: "Erro inesperado",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    try {
      // Registrar dispositivo/IP para controle de limite
      await registerDevice();
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone: phone || '',
          }
        }
      });
      
      if (error) {
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Processar convites pendentes após cadastro bem-sucedido
        setTimeout(async () => {
          try {
            const { data, error: inviteError } = await supabase.functions.invoke('process-pending-invites');
            if (inviteError) {
              console.warn('Erro ao processar convites pendentes:', inviteError);
            } else if (data?.processedInvites > 0) {
              toast({
                title: "Convites processados!",
                description: `${data.processedInvites} convite(s) de conta compartilhada foram ativados.`,
              });
            }
          } catch (inviteError) {
            console.warn('Erro ao processar convites:', inviteError);
          }
        }, 2000); // Aguardar 2s para garantir que o usuário foi criado
        
        toast({
          title: "Cadastro realizado!",
          description: "Verifique seu email para confirmar a conta",
        });
      }
      
      return { error };
    } catch (error: any) {
      toast({
        title: "Erro inesperado",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
    } catch (error: any) {
      toast({
        title: "Erro no logout",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};