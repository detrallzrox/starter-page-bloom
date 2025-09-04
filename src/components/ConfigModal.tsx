import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useSoundSettings } from "@/contexts/SoundContext";
import { useCurrentAccountPremium } from "@/hooks/useCurrentAccountPremium";
import { useAuth } from "@/hooks/useAuth";
import { useAccountContext } from "@/hooks/useAccountContext";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Key, Users, ChevronDown, ChevronUp, Star, Share2, Volume2, VolumeX, Upload, RotateCcw, Play, X } from "lucide-react";
import { SharedAccountModal } from "./SharedAccountModal";
import { RateAppModal } from "./RateAppModal";
import { PremiumOverlay } from "./PremiumOverlay";

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigModal = ({ isOpen, onClose }: ConfigModalProps) => {
  const { isPremium } = useCurrentAccountPremium();
  const { user } = useAuth();
  const { currentAccount } = useAccountContext();
  const { toast } = useToast();
  const { settings, customSounds, updateSetting, setCustomSound, playSound, resetToDefault } = useSoundSettings();
  
  const [newPassword, setNewPassword] = useState("");
  const [supportData, setSupportData] = useState({
    email: "",
    subject: "",
    message: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showSharedAccount, setShowSharedAccount] = useState(false);
  
  const [showRateApp, setShowRateApp] = useState(false);


  const handlePasswordChange = async () => {
    // Verificar se está tentando alterar senha de conta compartilhada
    if (currentAccount?.id !== user?.id) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode alterar a senha de uma conta compartilhada. Acesse sua própria conta para alterar sua senha.",
        variant: "destructive",
      });
      return;
    }

    if (!newPassword) {
      toast({
        title: "Erro",
        description: "Digite a nova senha",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso",
      });
      
      setNewPassword("");
      setShowPasswordChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSupportSubmit = async () => {
    if (!supportData.email || !supportData.subject || !supportData.message) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha email, assunto e mensagem",
        variant: "destructive",
      });
      return;
    }

    setIsSendingSupport(true);

    try {
      const { error } = await supabase.functions.invoke('send-support-email', {
        body: {
          userEmail: supportData.email,
          userName: user?.user_metadata?.full_name || supportData.email,
          subject: supportData.subject,
          message: supportData.message,
        }
      });

      if (error) throw error;

      toast({
        title: "Mensagem enviada!",
        description: "Nossa equipe entrará em contato em breve",
      });
      
      setSupportData({ email: "", subject: "", message: "" });
      setShowSupport(false);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsSendingSupport(false);
    }
  };

  const handleShareApp = async () => {
    const shareData = {
      title: 'Finaudy - Controle suas Finanças',
      text: 'Fácil, Rápido e de Maneira Inteligente! O Aplicativo inovador na área de finanças, que utiliza áudio e foto inteligente para facilitar a sua vida financeira!',
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        // Use native share API
        await navigator.share(shareData);
        toast({
          title: "Compartilhado!",
          description: "Obrigado por compartilhar o aplicativo!",
        });
      } else {
        // Fallback: copy to clipboard
        const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copiado!",
          description: "Link do aplicativo copiado para a área de transferência",
        });
      }
    } catch (error) {
      // If share fails or is cancelled, try clipboard as fallback
      try {
        const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copiado!",
          description: "Link do aplicativo copiado para a área de transferência",
        });
      } catch (clipboardError) {
        toast({
          title: "Erro",
          description: "Não foi possível compartilhar o aplicativo",
          variant: "destructive",
        });
      }
    }
  };

  const handleCustomSoundUpload = async (soundType: keyof typeof customSounds, file: File | null) => {
    if (!isPremium) {
      toast({
        title: "Funcionalidade Premium",
        description: "O upload de sons personalizados é exclusivo para contas Premium. Faça upgrade para acessar!",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await setCustomSound(soundType, file);
      toast({
        title: file ? "Som personalizado salvo!" : "Som resetado!",
        description: file ? "Seu som personalizado foi configurado" : "Voltando ao som padrão",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível configurar o som personalizado",
        variant: "destructive",
      });
    }
  };

  const SoundCustomizer = ({ 
    soundType, 
    title, 
    description, 
    isEnabled, 
    onToggle 
  }: {
    soundType: keyof typeof customSounds;
    title: string;
    description: string;
    isEnabled: boolean;
    onToggle: (checked: boolean) => void;
  }) => {
    const hasCustomSound = !!customSounds[soundType];
    
    return (
      <div className="space-y-3 p-3 border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">{title}</Label>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={onToggle}
          />
        </div>
        
        {isEnabled && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => playSound(soundType)}
              className="flex-1"
            >
              <Play className="w-3 h-3 mr-1" />
              Testar Som
            </Button>
            
            <PremiumOverlay isBlocked={!isPremium} replaceContent={true}>
              <div className="relative">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    handleCustomSoundUpload(soundType, file);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  id={`upload-${soundType}`}
                  disabled={!isPremium}
                />
                <Button
                  size="sm"
                  variant={hasCustomSound ? "default" : "outline"}
                  asChild
                  disabled={!isPremium}
                >
                  <label htmlFor={`upload-${soundType}`} className="cursor-pointer">
                    <Upload className="w-3 h-3 mr-1" />
                    {hasCustomSound ? "Trocar" : "Upload"}
                  </label>
                </Button>
              </div>
            </PremiumOverlay>
            
            {hasCustomSound && (
              <PremiumOverlay isBlocked={!isPremium} onlyIcon={true}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (!isPremium) return;
                    resetToDefault(soundType);
                    toast({
                      title: "Som resetado!",
                      description: "Voltando ao som padrão",
                    });
                  }}
                  disabled={!isPremium}
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </PremiumOverlay>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Configurações</DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-muted rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Welcome Message */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Configurações do Finaudy ⚙️</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Personalize suas preferências, configure funcionalidades avançadas e obtenha ajuda para usar o aplicativo.
              </p>
            </CardContent>
          </Card>


          {/* Sound Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center">
                {settings.soundEnabled ? <Volume2 className="mr-2 h-4 w-4" /> : <VolumeX className="mr-2 h-4 w-4" />}
                Configurações de Som
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  🔊 Personalize os sons do aplicativo de acordo com sua preferência.
                </p>
                
                {/* Master Sound Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="master-sound" className="text-sm font-medium">
                      Sons do Aplicativo
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Ativar ou desativar todos os sons
                    </p>
                  </div>
                  <Switch
                    id="master-sound"
                    checked={settings.soundEnabled}
                     onCheckedChange={(checked) => {
                       updateSetting('soundEnabled', checked);
                     }}
                  />
                </div>

                {/* Individual Sound Controls */}
                {settings.soundEnabled && (
                  <div className="space-y-3 pt-2 border-t">
                    <Label className="text-sm font-medium">Sons Individuais:</Label>
                    
                    <div className="space-y-3">
                       {/* Nova Receita */}
                       <SoundCustomizer
                         soundType="newIncomeSound"
                         title="Nova Receita"
                         description="Quando criar uma nova receita"
                         isEnabled={settings.newIncomeSound}
                         onToggle={(checked) => {
                           updateSetting('newIncomeSound', checked);
                           if (checked) playSound('newIncomeSound');
                         }}
                       />

                       {/* Nova Despesa */}
                       <SoundCustomizer
                         soundType="newExpenseSound"
                         title="Nova Despesa"
                         description="Quando criar uma nova despesa"
                         isEnabled={settings.newExpenseSound}
                         onToggle={(checked) => {
                           updateSetting('newExpenseSound', checked);
                           if (checked) playSound('newExpenseSound');
                         }}
                       />

                       {/* Investimento */}
                       <SoundCustomizer
                         soundType="newInvestmentSound"
                         title="Investimento"
                         description="Quando adicionar um novo investimento"
                         isEnabled={settings.newInvestmentSound}
                         onToggle={(checked) => {
                           updateSetting('newInvestmentSound', checked);
                           if (checked) playSound('newInvestmentSound');
                         }}
                       />

                       {/* Compra no Cartão */}
                       <SoundCustomizer
                         soundType="newCardPurchaseSound"
                         title="Compra no Cartão"
                         description="Quando criar uma nova compra no cartão"
                         isEnabled={settings.newCardPurchaseSound}
                         onToggle={(checked) => {
                           updateSetting('newCardPurchaseSound', checked);
                           if (checked) playSound('newCardPurchaseSound');
                         }}
                       />

                       {/* Nova Categoria */}
                       <SoundCustomizer
                         soundType="newCategorySound"
                         title="Nova Categoria"
                         description="Quando criar uma nova categoria"
                         isEnabled={settings.newCategorySound}
                         onToggle={(checked) => {
                           updateSetting('newCategorySound', checked);
                           if (checked) playSound('newCategorySound');
                         }}
                       />

                       {/* Foto */}
                       <SoundCustomizer
                         soundType="cameraSound"
                         title="Foto"
                         description="Ao tirar fotos para OCR"
                         isEnabled={settings.cameraSound}
                         onToggle={(checked) => {
                           updateSetting('cameraSound', checked);
                           if (checked) playSound('cameraSound');
                         }}
                       />

                       {/* Microfone */}
                       <SoundCustomizer
                         soundType="microphoneSound"
                         title="Microfone"
                         description="Ao usar reconhecimento de voz"
                         isEnabled={settings.microphoneSound}
                         onToggle={(checked) => {
                           updateSetting('microphoneSound', checked);
                           if (checked) playSound('microphoneSound');
                         }}
                       />

                       {/* Lembrete */}
                       <SoundCustomizer
                         soundType="newReminderSound"
                         title="Lembrete"
                         description="Quando criar um novo lembrete"
                         isEnabled={settings.newReminderSound}
                         onToggle={(checked) => {
                           updateSetting('newReminderSound', checked);
                           if (checked) playSound('newReminderSound');
                         }}
                       />

                       {/* Assinatura */}
                       <SoundCustomizer
                         soundType="newSubscriptionSound"
                         title="Assinatura"
                         description="Quando adicionar uma nova assinatura"
                         isEnabled={settings.newSubscriptionSound}
                         onToggle={(checked) => {
                           updateSetting('newSubscriptionSound', checked);
                           if (checked) playSound('newSubscriptionSound');
                         }}
                       />

                       {/* Orçamento */}
                       <SoundCustomizer
                         soundType="newBudgetSound"
                         title="Orçamento"
                         description="Quando adicionar um novo orçamento"
                         isEnabled={settings.newBudgetSound}
                         onToggle={(checked) => {
                           updateSetting('newBudgetSound', checked);
                           if (checked) playSound('newBudgetSound');
                         }}
                       />

                       {/* Erro */}
                       <SoundCustomizer
                         soundType="errorSound"
                         title="Erro"
                         description="Quando ocorre um erro ou problema"
                         isEnabled={settings.errorSound}
                         onToggle={(checked) => {
                           updateSetting('errorSound', checked);
                           if (checked) playSound('errorSound');
                         }}
                       />

                       {/* Convite de Conta (mantido para não quebrar funcionalidade) */}
                       <SoundCustomizer
                         soundType="sharedAccountInviteSound"
                         title="Convite de Conta"
                         description="Quando receber um convite de compartilhar conta"
                         isEnabled={settings.sharedAccountInviteSound}
                         onToggle={(checked) => {
                           updateSetting('sharedAccountInviteSound', checked);
                           if (checked) playSound('sharedAccountInviteSound');
                         }}
                       />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shared Account */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Conta Compartilhada</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setShowSharedAccount(true)} 
                variant="outline" 
                className="w-full"
              >
                <Users className="mr-2 h-4 w-4" />
                Gerenciar Conta Compartilhada
              </Button>
            </CardContent>
          </Card>

          {/* Support */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Suporte</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setShowSupport(!showSupport)} 
                variant="outline" 
                className="w-full"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Contatar Suporte
              </Button>
              
               {showSupport && (
                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="support-email">Seu Email</Label>
                    <Input
                      id="support-email"
                      type="email"
                      value={supportData.email}
                      onChange={(e) => setSupportData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-subject">Assunto</Label>
                    <Input
                      id="support-subject"
                      value={supportData.subject}
                      onChange={(e) => setSupportData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Descreva o problema ou dúvida"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-message">Mensagem</Label>
                    <Textarea
                      id="support-message"
                      value={supportData.message}
                      onChange={(e) => setSupportData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Descreva detalhadamente sua questão..."
                      rows={4}
                    />
                  </div>
                  <Button 
                    onClick={handleSupportSubmit} 
                    disabled={isSendingSupport}
                    className="w-full"
                  >
                    {isSendingSupport ? "Enviando..." : "Enviar Mensagem"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Segurança</CardTitle>
            </CardHeader>
            <CardContent>
              {currentAccount?.id !== user?.id ? (
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Alterar Senha
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Você não pode alterar a senha de uma conta compartilhada. Acesse sua própria conta para alterar sua senha.
                  </p>
                </div>
              ) : (
                <Button 
                  onClick={() => setShowPasswordChange(!showPasswordChange)} 
                  variant="outline" 
                  className="w-full"
                >
                  <Key className="mr-2 h-4 w-4" />
                  Alterar Senha
                </Button>
              )}
              
              {showPasswordChange && currentAccount?.id === user?.id && (
                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova Senha</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite a nova senha"
                    />
                  </div>
                  <Button 
                    onClick={handlePasswordChange} 
                    disabled={isChangingPassword}
                    className="w-full"
                  >
                    {isChangingPassword ? "Alterando..." : "Alterar Senha"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Share App */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Compartilhar para Amigos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  📲 Compartilhe o Finaudy com seus amigos e familiares! 
                  Ajude mais pessoas a organizarem suas finanças.
                </p>
                <Button 
                  onClick={handleShareApp}
                  variant="outline" 
                  className="w-full"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartilhar Aplicativo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rate App */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Avalie o Aplicativo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  🌟 O Aplicativo está te ajudando a organizar suas finanças? 
                  Sua avaliação nos motiva a continuar melhorando!
                </p>
                <Button 
                  onClick={() => setShowRateApp(true)}
                  variant="default" 
                  className="w-full bg-gradient-primary"
                >
                  <Star className="mr-2 h-4 w-4 fill-current" />
                  Avaliar Aplicativo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <SharedAccountModal 
          isOpen={showSharedAccount} 
          onClose={() => setShowSharedAccount(false)} 
        />
        
        <RateAppModal 
          isOpen={showRateApp} 
          onClose={() => setShowRateApp(false)} 
        />
      </DialogContent>
    </Dialog>
  );
};