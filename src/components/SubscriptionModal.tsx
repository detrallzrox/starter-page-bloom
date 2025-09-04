import { useState } from 'react';
import { Crown, Zap, Check, X, Star, Sparkles, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrentAccountPremium } from '@/hooks/useCurrentAccountPremium';
import { cn } from '@/lib/utils';
import { useGooglePlayPurchase } from '@/hooks/useGooglePlayPurchase';

// Detecção do ambiente Android
// @ts-ignore
const isAndroidApp = !!window.Android;

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionModal = ({ isOpen, onClose }: SubscriptionModalProps) => {
  const { createCheckout, createVipCheckout, isPremium, isVip, subscriptionTier } = useCurrentAccountPremium();
  const { startPurchase, isProcessing } = useGooglePlayPurchase();
  const [isLoadingStripe, setIsLoadingStripe] = useState<'premium' | 'vip' | null>(null);

  const handleSubscribe = async (plan: 'premium' | 'vip') => {
    if (isAndroidApp) {
      // Fluxo para Android via Google Play
      startPurchase(plan);
    } else {
      // Fluxo para Web via Stripe
      setIsLoadingStripe(plan);
      try {
        if (plan === 'premium') {
          await createCheckout();
        } else {
          await createVipCheckout();
        }
        // A função createCheckout já redireciona, então não precisamos fazer mais nada aqui.
      } catch (error) {
        console.error("Falha ao criar checkout do Stripe:", error);
      } finally {
        setIsLoadingStripe(null);
      }
    }
  };

  const premiumFeatures = [
    "⭐ TODOS os recursos do gratuito",
    "📷 Adicionar compras automaticamente por foto inteligente",
    "🎤 Comandos de voz inteligentes ilimitados",
    "💸 Adicionar receita por aúdio",
    "🧾 Adicionar despesas por aúdio",
    "📈 Adicionar investimentos por aúdio",
    "💳 Adicionar compras no cartão por aúdio",
    "🎵 Envie sons personalizados",
    "📤 Download de recibos / nota fiscal",
    "📤 Exportação de dados ilimitados"
  ];

  const vipFeatures = [
    "⭐ TODOS os recursos do gratuito",
    "⭐ TODOS os recursos Premium", 
    "👥 Compartilhamento de conta",
    "🔥 Acesso prioritário a novos recursos"
  ];

  const freeFeatures = [
    "🚀 Transações ilimitadas",
    "📊 Relatórios avançados", 
    "💼 Categorias personalizadas",
    "📱 Acesso via aplicativo e web",
    "📷 3 envios de compras automaticas por foto inteligente",
    "🎤 3 envios de comandos de voz inteligente",
    "📤 3 Utilizações de Exportação de dados",
    "💸 Adicionar receita, despesa e investimento manualmente",
    "💳 Adicionar compras no cartão manualmente",
    "🔔 Adicionar lembretes",
    "📈 Análise de gastos detalhada",
    "🎯 Adicionar orçamentos",
    "📝 Adicionar assinaturas"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-modal-bg border-0 w-[95vw] sm:w-full mx-auto p-4 sm:p-6">
        <DialogHeader className="text-center pb-4 sm:pb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent text-center">
                🚀 Transforme Sua Vida Financeira Hoje!
              </DialogTitle>
              <p className="text-muted-foreground text-base sm:text-lg mt-2 text-center px-2 sm:px-0">
                Escolha o plano perfeito e comece a economizar mais ainda este mês
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-muted rounded-full self-start ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

{isAndroidApp ? (
          // Interface para App Android - Google Play Store (agora com layout completo)
          <div className="flex flex-col gap-4 sm:gap-6 items-stretch">
            {/* Plano Gratuito */}
            <div className="relative bg-gradient-card rounded-xl p-4 sm:p-6 border border-border flex flex-col h-full">
              <div className="text-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-muted-foreground">Gratuito</h3>
                <div className="mt-2 sm:mt-4">
                  <span className="text-2xl sm:text-3xl font-bold text-muted-foreground">R$ 0</span>
                  <span className="text-sm sm:text-base text-muted-foreground">/mês</span>
                </div>
              </div>
              <div className="space-y-3 mb-6 flex-grow">
                <p className="text-sm font-medium text-muted-foreground mb-3">O que você tem hoje:</p>
                {freeFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
              {!isPremium && !isVip && (
                <div className="text-center">
                  <Badge variant="secondary" className="mb-4">Plano Atual</Badge>
                </div>
              )}
            </div>

            {/* Plano Premium */}
            <div className="relative bg-gradient-card rounded-xl p-4 sm:p-6 border-2 border-primary shadow-primary flex flex-col h-full">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-primary text-primary-foreground"><Crown className="h-3 w-3 mr-1" />MAIS POPULAR</Badge>
              </div>
              <div className="text-center mb-4 sm:mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-primary">Premium</h3>
                 <div className="mt-2 sm:mt-4">
                    <span className="text-3xl sm:text-4xl font-bold text-primary">R$ 19,90</span>
                    <span className="text-sm sm:text-base text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2"><s className="text-red-500">R$ 38,80</s> • Economize 50% por tempo limitado!</p>
              </div>
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 flex-grow">
                <p className="text-sm font-medium text-primary mb-3">Tudo que você precisa:</p>
                {premiumFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              {isPremium && subscriptionTier === 'premium' && !isVip ? (
                <div className="text-center"><Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">Plano Atual</Badge></div>
              ) : !isPremium ? (
                <Button
                  className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold py-2 sm:py-3 shadow-primary text-sm sm:text-base"
                  onClick={() => handleSubscribe('premium')}
                  disabled={isProcessing}
                >
                  {isProcessing ? (<><Zap className="h-4 w-4 mr-2 animate-spin" /> Processando...</>) : (<><Crown className="h-4 w-4 mr-2" /> QUERO SER PREMIUM</>)}
                </Button>
              ) : null}
               <p className="text-xs text-center text-muted-foreground mt-3">👑 Pagamento seguro via Google Play</p>
            </div>

            {/* Plano VIP */}
            <div className="relative bg-gradient-card rounded-xl p-4 sm:p-6 border-2 border-purple-500 shadow-primary flex flex-col h-full">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-purple-600 text-white"><Sparkles className="h-3 w-3 mr-1" />EXCLUSIVO VIP</Badge>
              </div>
              <div className="text-center mb-4 sm:mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-purple-600">VIP Elite</h3>
                 <div className="mt-2 sm:mt-4">
                    <span className="text-3xl sm:text-4xl font-bold text-purple-600">R$ 29,90</span>
                    <span className="text-sm sm:text-base text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2"><s className="text-red-500">R$ 59,80</s> • Economize 50% por tempo limitado!</p>
              </div>
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 flex-grow">
                <p className="text-sm font-medium text-purple-600 mb-3">Máximo desempenho:</p>
                {vipFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              {isVip ? (
                <div className="text-center"><Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-300">Plano Atual</Badge></div>
              ) : (
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 sm:py-3 shadow-lg shadow-purple-600/30 text-sm sm:text-base"
                  onClick={() => handleSubscribe('vip')}
                  disabled={isProcessing}
                >
                  {isProcessing ? (<><Sparkles className="h-4 w-4 mr-2 animate-spin" /> Processando...</>) : (<><Star className="h-4 w-4 mr-2" /> QUERO SER VIP ELITE</>)}
                </Button>
              )}
               <p className="text-xs text-center text-muted-foreground mt-3">⭐ Pagamento seguro via Google Play</p>
            </div>
          </div>
        ) : (
          // Interface para Site - Stripe
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-stretch">
            {/* Plano Gratuito */}
            <div className="relative bg-card/50 rounded-xl p-4 sm:p-6 border border-border flex flex-col h-full w-full lg:w-1/3">
              <div className="text-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-muted-foreground">Gratuito</h3>
                <div className="mt-2 sm:mt-4">
                  <span className="text-2xl sm:text-3xl font-bold text-muted-foreground">R$ 0</span>
                  <span className="text-sm sm:text-base text-muted-foreground">/mês</span>
                </div>
              </div>
              
              <div className="space-y-3 mb-6 flex-grow">
                <p className="text-sm font-medium text-muted-foreground mb-3">O que você tem hoje:</p>
                {freeFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              {!isPremium && !isVip && (
                <div className="text-center">
                  <Badge variant="secondary" className="mb-4">Plano Atual</Badge>
                </div>
              )}
            </div>

            {/* Plano Premium */}
            <div className="relative bg-gradient-card rounded-xl p-4 sm:p-6 border-2 border-primary shadow-primary flex flex-col h-full w-full lg:w-1/3">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-primary text-primary-foreground">
                  <Crown className="h-3 w-3 mr-1" />
                  MAIS POPULAR
                </Badge>
              </div>
              
              <div className="text-center mb-4 sm:mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-primary">Premium</h3>
                 <div className="mt-2 sm:mt-4">
                    <span className="text-3xl sm:text-4xl font-bold text-primary">R$ 19,90</span>
                    <span className="text-sm sm:text-base text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    <s className="text-red-500">R$ 38,80</s> • Economize 50% por tempo limitado!
                  </p>
              </div>
              
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 flex-grow">
                <p className="text-sm font-medium text-primary mb-3">Tudo que você precisa:</p>
                {premiumFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {isPremium && subscriptionTier === 'premium' && !isVip && (
                <div className="text-center mb-4">
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">Plano Atual</Badge>
                </div>
              )}

              {!isPremium && (
                <Button
                  className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold py-2 sm:py-3 shadow-primary text-sm sm:text-base"
                  onClick={() => handleSubscribe('premium')}
                  disabled={isLoadingStripe === 'premium'}
                >
                  {isLoadingStripe === 'premium' ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Crown className="h-4 w-4 mr-2" />
                      QUERO SER PREMIUM
                    </>
                  )}
                </Button>
              )}
              
               <p className="text-xs text-center text-muted-foreground mt-3">
                 👑 Status PREMIUM • 🔒 Pagamento 100% seguro
               </p>
            </div>

            {/* Plano VIP */}
            <div className="relative bg-gradient-card rounded-xl p-4 sm:p-6 border-2 border-purple-500 shadow-primary flex flex-col h-full w-full lg:w-1/3">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-purple-600 text-white">
                  <Sparkles className="h-3 w-3 mr-1" />
                  EXCLUSIVO VIP
                </Badge>
              </div>
              
              <div className="text-center mb-4 sm:mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-purple-600">VIP Elite</h3>
                 <div className="mt-2 sm:mt-4">
                    <span className="text-3xl sm:text-4xl font-bold text-purple-600">R$ 29,90</span>
                    <span className="text-sm sm:text-base text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    <s className="text-red-500">R$ 59,80</s> • Economize 50% por tempo limitado!
                  </p>
              </div>
              
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 flex-grow">
                <p className="text-sm font-medium text-purple-600 mb-3">Máximo desempenho:</p>
                {vipFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {isVip && (
                <div className="text-center mb-4">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-300">Plano Atual</Badge>
                </div>
              )}

              {!isVip && (
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 sm:py-3 shadow-lg shadow-purple-600/30 text-sm sm:text-base"
                  onClick={() => handleSubscribe('vip')}
                  disabled={isLoadingStripe === 'vip'}
                >
                  {isLoadingStripe === 'vip' ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4 mr-2" />
                      QUERO SER VIP ELITE
                    </>
                  )}
                </Button>
              )}
              
               <p className="text-xs text-center text-muted-foreground mt-3">
                  ⭐ Status VIP • ⭐ Ideal para casais e empresas
                </p>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
};