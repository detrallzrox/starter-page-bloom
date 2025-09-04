import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, UserMinus, Check, X } from "lucide-react";
import { PremiumOverlay } from "./PremiumOverlay";
import { useCurrentAccountPremium } from "@/hooks/useCurrentAccountPremium";
import { useSharedAccountRealtime } from "@/hooks/useSharedAccountRealtime";

interface SharedAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SharedAccount {
  id: string;
  owner_id: string;
  shared_with_id: string;
  status: string;
  shared_with_email?: string;
  owner_email?: string;
}

export const SharedAccountModal = ({ isOpen, onClose }: SharedAccountModalProps) => {
  const { isPremium, isVip } = useCurrentAccountPremium();
  const [inviteEmail, setInviteEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { sharedAccounts, isLoading: realtimeLoading } = useSharedAccountRealtime();


  const handleInviteUser = async () => {
    if (!isVip) {
      toast({
        title: "Funcionalidade VIP",
        description: "O compartilhamento de conta é exclusivo para contas VIP. Faça upgrade para acessar!",
        variant: "destructive",
      });
      return;
    }
    
    if (!inviteEmail) {
      toast({
        title: "Email obrigatório",
        description: "Digite o email do usuário",
        variant: "destructive",
      });
      return;
    }

    if (inviteEmail === user?.email) {
      toast({
        title: "Email inválido",
        description: "Você não pode compartilhar com você mesmo",
        variant: "destructive",
      });
      return;
    }

    // CRÍTICO: Verificar se usuário está acessando conta compartilhada
    const isUsingSharedAccount = sharedAccounts.some(
      acc => acc.shared_with_id === user?.id && acc.status === 'accepted'
    );

    if (isUsingSharedAccount) {
      toast({
        title: "Acesso negado",
        description: "Você está usando uma conta compartilhada. Apenas o proprietário original pode enviar convites.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se já existe um compartilhamento
    const existingShare = sharedAccounts.find(
      acc => acc.shared_with_email === inviteEmail || acc.owner_email === inviteEmail
    );

    if (existingShare) {
      toast({
        title: "Compartilhamento já existe",
        description: "Este usuário já tem acesso à conta",
        variant: "destructive",
      });
      return;
    }

    // Verificar limite de 2 usuários (owner + 1 compartilhado)
    const myShares = sharedAccounts.filter(acc => acc.owner_id === user?.id);
    if (myShares.length >= 1) {
      toast({
        title: "Limite atingido",
        description: "Você pode compartilhar apenas com 1 pessoa",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Validar se o compartilhamento é permitido
      const { data: validationData, error: validationError } = await supabase.functions.invoke('validate-sharing', {
        body: {
          invited_email: inviteEmail
        }
      });

      if (validationError) {
        // Mensagem específica e clara sobre limitações de contas trial
        toast({
          title: "⚠️ Compartilhamento Indisponível",
          description: "Contas em período de teste não podem ser compartilhadas. Para usar o compartilhamento de conta, é necessário assinar o plano Premium.",
          variant: "destructive",
        });
        return;
      }

      // Obter nome do usuário atual
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user?.id)
        .single();

      // Chamar edge function para enviar convite
      const { data, error } = await supabase.functions.invoke('invite-shared-account', {
        body: {
          inviteEmail,
          ownerName: profile?.full_name || user?.email
        }
      });

      if (error) throw error;

      // Não enviar notificação push para quem envia - será enviada para quem recebe o convite via edge function

      toast({
        title: "Convite enviado!",
        description: data.message,
      });
      
      setInviteEmail("");
      // Real-time updates will handle reloading automatically
    } catch (error: any) {
      toast({
        title: "Erro ao enviar convite",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptShare = async (shareId: string) => {
    try {
      // Use edge function to handle accept with notifications
      const { data, error } = await supabase.functions.invoke('accept-shared-account', {
        body: { shareId }
      });

      if (error) throw error;

      toast({
        title: "Compartilhamento aceito!",
        description: "Agora você tem acesso aos dados compartilhados",
      });

      // Real-time updates will handle UI refresh automatically
    } catch (error: any) {
      toast({
        title: "Erro ao aceitar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('shared_accounts')
        .delete()
        .eq('id', shareId);

      if (error) throw error;

      toast({
        title: "Convite rejeitado",
        description: "O compartilhamento foi recusado",
      });

      // Real-time updates will handle refresh automatically
    } catch (error: any) {
      toast({
        title: "Erro ao rejeitar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      // Remove do banco primeiro
      const { error } = await supabase
        .from('shared_accounts')
        .delete()
        .eq('id', shareId);

      if (error) {
        console.error('Erro ao remover do banco:', error);
        throw error;
      }

      setInviteEmail("");

      toast({
        title: "Compartilhamento removido",
        description: "Usuário desconectado. Você pode convidar outro usuário.",
      });

      // Real-time updates will handle UI refresh automatically
      
    } catch (error: any) {
      console.error('Erro inesperado:', error);
      
      toast({
        title: "Erro ao remover",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Ativo</Badge>;
      case 'pending_registration':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">Aguardando cadastro</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pendente</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Conta Compartilhada
            </DialogTitle>
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
          {/* Convite para novo usuário */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Compartilhar Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Email do usuário</Label>
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="usuario@email.com"
                  type="email"
                />
              </div>
              <PremiumOverlay isBlocked={!isVip} replaceContent={true}>
                <Button 
                  onClick={handleInviteUser} 
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Enviando..." : "Enviar Convite"}
                </Button>
              </PremiumOverlay>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-purple-600">🔷 Funcionalidade VIP:</span> Você pode compartilhar sua conta com apenas 1 pessoa. 
                Ideal para gestão financeira em casal.
              </p>
            </CardContent>
          </Card>

          {/* Lista de compartilhamentos */}
          <div className="space-y-3">
            <h3 className="font-medium">Compartilhamentos</h3>
            
            {sharedAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum compartilhamento ativo
              </p>
            ) : (
              sharedAccounts.map(share => {
                const isOwner = share.owner_id === user?.id;
                const otherUserEmail = isOwner ? share.shared_with_email : share.owner_email;
                const isPending = share.status === 'pending';
                
                return (
                  <Card key={share.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">
                            {isOwner ? 'Compartilhado com:' : 'Compartilhado por:'}
                          </h4>
                          <p className="text-sm text-muted-foreground">{otherUserEmail}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(share.status)}
                          
                          {/* Ações para convites pendentes */}
                          {isPending && !isOwner && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptShare(share.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectShare(share.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          
                           {/* Ação para remover compartilhamento - sempre mostrar X */}
                           {(isOwner || share.status === 'accepted' || (isPending && isOwner)) && (
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => handleRemoveShare(share.id)}
                             >
                               <X className="h-3 w-3" />
                             </Button>
                           )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};