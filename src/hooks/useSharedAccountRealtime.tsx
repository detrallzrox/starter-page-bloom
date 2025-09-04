import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SharedAccount {
  id: string;
  owner_id: string;
  shared_with_id: string;
  status: string;
  shared_with_email?: string;
  owner_email?: string;
  invited_email?: string;
}

export const useSharedAccountRealtime = () => {
  const [sharedAccounts, setSharedAccounts] = useState<SharedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const loadSharedAccounts = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Buscar contas compartilhadas
      const { data: sharedData, error: sharedError } = await supabase
        .from('shared_accounts')
        .select('*')
        .or(`owner_id.eq.${user.id},shared_with_id.eq.${user.id}`);

      if (sharedError) {
        console.error('Erro ao buscar contas compartilhadas:', sharedError);
        return;
      }

      // Buscar emails dos usuários para cada conta compartilhada
      const accountsWithEmails = await Promise.all(
        (sharedData || []).map(async (account) => {
          let ownerEmail = '';
          let sharedEmail = '';

          // Para pending_registration, sempre temos o invited_email
          if (account.status === 'pending_registration' && account.invited_email) {
            if (account.owner_id === user.id) {
              ownerEmail = user.email || '';
              sharedEmail = account.invited_email;
            } else {
              ownerEmail = account.invited_email;
              sharedEmail = user.email || '';
            }
          } else if (account.shared_with_id) {
            // Para outros status, buscar informações dos usuários
            try {
              // Buscar email do owner através da auth
              if (account.owner_id === user.id) {
                ownerEmail = user.email || 'Você';
              } else {
                const { data: ownerProfile } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('user_id', account.owner_id)
                  .single();
                ownerEmail = ownerProfile?.full_name || 'Proprietário';
              }

              // Buscar email do shared user
              if (account.shared_with_id === user.id) {
                sharedEmail = user.email || 'Você';
              } else {
                const { data: sharedProfile } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('user_id', account.shared_with_id)
                  .single();
                sharedEmail = sharedProfile?.full_name || 'Usuário convidado';
              }
            } catch (error) {
              console.error('Erro ao buscar informações dos usuários:', error);
              ownerEmail = account.owner_id === user.id ? 'Você' : 'Proprietário';
              sharedEmail = account.shared_with_id === user.id ? 'Você' : 'Usuário convidado';
            }
          }

          return {
            ...account,
            owner_email: ownerEmail,
            shared_with_email: sharedEmail
          };
        })
      );

      setSharedAccounts(accountsWithEmails);
    } catch (error) {
      console.error('Erro ao carregar contas compartilhadas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Load initial data
    loadSharedAccounts();

    // Set up real-time subscription
    const channel = supabase
      .channel('shared-accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_accounts',
          filter: `owner_id=eq.${user.id}`
        },
        () => {
          console.log('Real-time update detected for owned shares');
          loadSharedAccounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_accounts',
          filter: `shared_with_id=eq.${user.id}`
        },
        () => {
          console.log('Real-time update detected for shared with user');
          loadSharedAccounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    sharedAccounts,
    isLoading,
    refreshAccounts: loadSharedAccounts
  };
};