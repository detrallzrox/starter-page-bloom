import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toZonedTime } from 'date-fns-tz';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { supabase } from '@/integrations/supabase/client';

interface Account {
  id: string;
  name: string;
  type: 'personal' | 'shared';
  is_owner: boolean;
  isPremium?: boolean;
  isVip?: boolean;
}

interface AccountContextType {
  currentAccount: Account | null;
  availableAccounts: Account[];
  switchAccount: (accountId: string) => void;
  isLoading: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const useAccountContext = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccountContext must be used within an AccountProvider');
  }
  return context;
};

export const AccountProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { isPremium, inTrial } = useSubscription();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Função para salvar conta selecionada no Supabase (via profiles)
  const saveSelectedAccount = async (accountId: string) => {
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ last_selected_account_id: accountId })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Erro ao salvar conta selecionada:', error);
        // Fallback para localStorage se Supabase falhar
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(`selectedAccount_${user.id}`, accountId);
        }
      }
    }
  };

  // Função para recuperar conta selecionada do Supabase
  const getSelectedAccount = async (): Promise<string | null> => {
    if (user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('last_selected_account_id')
          .eq('user_id', user.id)
          .single();
        
        if (error || !data || !data.last_selected_account_id) {
          // Fallback para localStorage
          if (typeof window !== 'undefined' && window.localStorage) {
            return localStorage.getItem(`selectedAccount_${user.id}`);
          }
          return null;
        }
        
        return data.last_selected_account_id;
      } catch (error) {
        console.error('Erro ao recuperar conta selecionada:', error);
        // Fallback para localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          return localStorage.getItem(`selectedAccount_${user.id}`);
        }
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    if (user && (isPremium !== undefined && inTrial !== undefined)) {
      loadAccounts();
    } else if (!user) {
      setCurrentAccount(null);
      setAvailableAccounts([]);
      setIsLoading(false);
    }
  }, [user, isPremium, inTrial]);

  // Real-time subscription para mudanças no perfil (saldo, etc)
  useEffect(() => {
    if (!user) return;

    console.log('🔄 CREATING PROFILE SUBSCRIPTION for user:', user.id);

    const subscription = supabase
      .channel(`profile-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('👤 PROFILE REALTIME UPDATE:', payload.eventType, payload);
          // Recarregar contas quando o perfil mudar
          loadAccounts();
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 CLEANING UP PROFILE SUBSCRIPTION for user:', user.id);
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const loadAccounts = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Load user's personal account
      const personalAccount: Account = {
        id: user.id,
        name: 'Sua Conta',
        type: 'personal',
        is_owner: true,
        isPremium: isPremium
      };

      // Load shared accounts where user is invited
      const { data: sharedAccounts, error } = await supabase
        .from('shared_accounts')
        .select('owner_id, invited_email, shared_with_id')
        .eq('shared_with_id', user.id)
        .eq('status', 'accepted');

      if (error) {
        console.error('Error fetching shared accounts:', error);
      }

      console.log('Shared accounts found:', sharedAccounts);

      const accounts: Account[] = [];
      const sharedAccountsWithPremium: Account[] = [];
      
      if (sharedAccounts && sharedAccounts.length > 0) {
        // For each shared account, get the owner's profile and subscription status
        for (const sharedAccount of sharedAccounts) {
          console.log('Processing shared account with owner:', sharedAccount.owner_id);
          
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', sharedAccount.owner_id)
            .single();

          // Check if owner has premium/VIP status
          const { data: ownerSubscriber, error: subscriberError } = await supabase
            .from('subscribers')
            .select('subscribed, trial_end, subscription_tier, is_vip')
            .eq('user_id', sharedAccount.owner_id)
            .maybeSingle();

          console.log('Owner subscriber query:', { 
            ownerId: sharedAccount.owner_id, 
            data: ownerSubscriber, 
            error: subscriberError 
          });

          const now = toZonedTime(new Date(), 'America/Sao_Paulo');
          const trialEnd = ownerSubscriber?.trial_end ? toZonedTime(new Date(ownerSubscriber.trial_end), 'America/Sao_Paulo') : null;
          const ownerInTrial = ownerSubscriber && trialEnd && now < trialEnd && !ownerSubscriber.subscribed;
          const ownerIsVip = ownerSubscriber?.is_vip === true;
          const ownerIsPremium = ownerSubscriber?.subscribed === true || ownerSubscriber?.subscription_tier === 'premium' || ownerIsVip;
          
          console.log('Owner status:', { ownerIsPremium, ownerInTrial, ownerIsVip, subscribed: ownerSubscriber?.subscribed, tier: ownerSubscriber?.subscription_tier });
          
          const sharedAccountObj: Account = {
            id: sharedAccount.owner_id,
            name: ownerProfile?.full_name || sharedAccount.invited_email || 'Conta Compartilhada',
            type: 'shared',
            is_owner: false,
            isPremium: ownerIsPremium || ownerInTrial,
            isVip: ownerIsVip
          };

          // Aceitar QUALQUER conta compartilhada, independente do status premium
          sharedAccountsWithPremium.push(sharedAccountObj);
          console.log('Added shared account:', sharedAccountObj);
        }
      }

      // Implementar lógica de acesso baseada nas regras:
      // Trial expirado → sem acesso à conta pessoal
      // Trial expirado + conta compartilhada com premium → acesso apenas à conta compartilhada  
      // Premium ativo → acesso total
      // Trial ativo + conta compartilhada com premium → acesso apenas à conta compartilhada
      // Contas trial não podem compartilhar com outras contas trial

      console.log('Final account logic:', { 
        isPremium, 
        inTrial, 
        personalAccount: personalAccount.name,
        sharedAccountsCount: sharedAccountsWithPremium.length 
      });

      // Definir contas disponíveis baseado no status
      if (isPremium) {
        // Premium ativo → acesso total
        accounts.push(personalAccount);
        accounts.push(...sharedAccountsWithPremium);
      } else if (inTrial) {
        // Trial ativo → sempre tem acesso à sua conta + contas compartilhadas
        accounts.push(personalAccount);
        accounts.push(...sharedAccountsWithPremium);
      } else {
        // Trial expirado
        if (sharedAccountsWithPremium.length > 0) {
          // Trial expirado + conta compartilhada → acesso às duas contas
          accounts.push(personalAccount); // Conta pessoal (limitada)
          accounts.push(...sharedAccountsWithPremium);
        } else {
          // Trial expirado → só conta pessoal (limitada)
          accounts.push(personalAccount);
        }
      }

      // Tentar recuperar a conta selecionada anteriormente
      const savedAccountId = await getSelectedAccount();
      let accountToSelect: Account | null = null;

      if (savedAccountId) {
        // Verificar se a conta salva ainda está disponível
        accountToSelect = accounts.find(acc => acc.id === savedAccountId) || null;
        console.log('Trying to restore saved account:', savedAccountId, 'Found:', !!accountToSelect);
      }

      // Se não tem conta salva ou a conta salva não está mais disponível, usar lógica padrão
      if (!accountToSelect) {
        if (isPremium) {
          accountToSelect = personalAccount;
        } else if (inTrial) {
          accountToSelect = sharedAccountsWithPremium.length > 0 ? sharedAccountsWithPremium[0] : personalAccount;
        } else {
          accountToSelect = sharedAccountsWithPremium.length > 0 ? sharedAccountsWithPremium[0] : personalAccount;
        }
      }

      setCurrentAccount(accountToSelect);

      console.log('Final accounts array:', accounts);
      setAvailableAccounts(accounts);
      
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchAccount = (accountId: string) => {
    const account = availableAccounts.find(acc => acc.id === accountId);
    if (account) {
      setCurrentAccount(account);
      saveSelectedAccount(accountId); // Salvar a seleção no Supabase
      console.log('Account switched and saved:', accountId, account.name);
    }
  };

  return (
    <AccountContext.Provider value={{
      currentAccount,
      availableAccounts,
      switchAccount,
      isLoading
    }}>
      {children}
    </AccountContext.Provider>
  );
};
