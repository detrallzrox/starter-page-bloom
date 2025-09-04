import { useAccountContext } from './useAccountContext';
import { useSubscription } from './useSubscription';

/**
 * Hook que retorna o status premium baseado na conta atual selecionada
 * Se estiver em uma conta compartilhada premium, retorna true
 * Se estiver na própria conta, usa o status do useSubscription
 */
export const useCurrentAccountPremium = () => {
  const { currentAccount } = useAccountContext();
  const { isPremium: userIsPremium, inTrial: userInTrial, subscribed, createCheckout, isVip: userIsVip, subscriptionTier: userSubscriptionTier, ...rest } = useSubscription();

  // Se tem uma conta atual e ela tem status premium definido, usa esse status
  if (currentAccount?.isPremium !== undefined) {
    return {
      isPremium: currentAccount.isPremium,
      inTrial: false, // Contas compartilhadas não têm trial, ou são premium ou não
      subscribed: currentAccount.isPremium,
      isVip: currentAccount.isVip || userIsVip, // Use VIP da conta compartilhada se disponível
      subscriptionTier: currentAccount.isVip ? 'vip' : (currentAccount.isPremium ? 'premium' : userSubscriptionTier),
      createCheckout,
      ...rest
    };
  }

  // Caso contrário, usa o status do próprio usuário
  return {
    isPremium: userIsPremium,
    inTrial: userInTrial,
    subscribed,
    isVip: userIsVip,
    subscriptionTier: userSubscriptionTier,
    createCheckout,
    ...rest
  };
};