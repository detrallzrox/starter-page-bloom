import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface SubscriptionStatus {
  isPremium: boolean;
  inTrial: boolean;
  subscribed: boolean;
  trialEnd?: string;
  subscriptionEnd?: string;
  isVip?: boolean;
  subscriptionTier?: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<SubscriptionStatus>({
    isPremium: false,
    inTrial: false,
    subscribed: false,
    isVip: false,
    subscriptionTier: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const checkSubscription = async () => {
    if (!user) {
      setStatus({
        isPremium: false,
        inTrial: false,
        subscribed: false,
        isVip: false,
        subscriptionTier: null,
      });
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;

      setStatus(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      // Default to free for new users
      setStatus({
        isPremium: false,
        inTrial: false,
        subscribed: false,
        isVip: false,
        subscriptionTier: null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createCheckout = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para assinar",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) throw error;

      // Open Stripe checkout in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Erro ao processar pagamento",
        description: "Tente novamente em alguns minutos",
        variant: "destructive",
      });
    }
  };

  const createVipCheckout = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para assinar",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-vip-checkout');
      
      if (error) throw error;

      // Open Stripe checkout in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error creating VIP checkout:', error);
      toast({
        title: "Erro ao processar pagamento VIP",
        description: "Tente novamente em alguns minutos",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [user]);

  // Real-time subscription para mudanças no status da assinatura
  useEffect(() => {
    if (!user) return;

    console.log('🔄 CREATING SUBSCRIPTION STATUS SUBSCRIPTION for user:', user.id);

    const subscription = supabase
      .channel(`subscription-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscribers',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('💳 SUBSCRIPTION STATUS REALTIME UPDATE:', payload.eventType, payload);
          checkSubscription();
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 CLEANING UP SUBSCRIPTION STATUS SUBSCRIPTION for user:', user.id);
      subscription.unsubscribe();
    };
  }, [user?.id]);

  return {
    ...status,
    isLoading,
    checkSubscription,
    createCheckout,
    createVipCheckout,
  };
};