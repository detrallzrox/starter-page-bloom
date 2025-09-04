import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';

// Define a estrutura da resposta da verificação
interface VerificationResult {
  success: boolean;
  tier?: 'premium' | 'vip';
  message?: string;
  error?: string;
}

// Estende a interface da Window para incluir nossa ponte de comunicação
declare global {
  interface Window {
    // O Android chamará esta função com o resultado da compra
    onGooglePlayPurchaseFinished?: (purchaseToken: string, productId: string) => void;
  }
}

export const useGooglePlayPurchase = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // 1. O Android chama esta função quando a compra é concluída (ou falha) na UI do Google Play
    window.onGooglePlayPurchaseFinished = async (purchaseToken, productId) => {
      if (!purchaseToken) {
        toast({ title: 'Compra cancelada', variant: 'default' });
        setIsProcessing(false);
        return;
      }

      toast({ title: 'Processando sua compra...', description: 'Verificando com o servidor. Isso pode levar um momento.' });

      try {
        // 2. Enviamos o token de compra para nossa função de backend para verificação segura
        const { data, error } = await supabase.functions.invoke('verify-google-play-purchase', {
          body: { purchaseToken, subscriptionId: productId },
        });

        if (error) {
          throw new Error(error.message);
        }

        const result = data as VerificationResult;

        if (result.success) {
          toast({
            title: '✅ Assinatura Ativada!',
            description: `Seu plano ${result.tier === 'vip' ? 'VIP' : 'Premium'} está ativo. Aproveite!`,
            variant: 'default',
          });
          // Invalida as queries para que a UI reflita o novo status de premium/vip
          await queryClient.invalidateQueries({ queryKey: ['currentAccountPremium'] });
        } else {
          throw new Error(result.error || 'Falha na verificação da compra.');
        }
      } catch (e: any) {
        toast({
          title: 'Erro na Verificação',
          description: e.message || 'Não foi possível verificar sua compra. Por favor, contate o suporte.',
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(false);
      }
    };

    return () => {
      // Limpa a função quando o componente é desmontado
      delete window.onGooglePlayPurchaseFinished;
    };
  }, [toast, queryClient]);

  // 3. A UI do React chama esta função para iniciar o processo
  const startPurchase = (planId: 'premium' | 'vip') => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Mapeia o plano para o ID do produto configurado no Google Play Console
    const productId = planId === 'premium' ? 'premium_monthly' : 'vip_monthly';
    
    if (window.Android?.launchPurchaseFlow) {
      console.log(`Iniciando fluxo de compra para o produto: ${productId}`);
      window.Android.launchPurchaseFlow(productId);
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar o processo de compra. A ponte com o app nativo não foi encontrada.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  return { startPurchase, isProcessing };
};