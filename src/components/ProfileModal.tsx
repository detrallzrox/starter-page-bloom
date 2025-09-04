import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentAccountPremium } from "@/hooks/useCurrentAccountPremium";
import { useAccountContext } from "@/hooks/useAccountContext";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, HelpCircle, MessageSquare, Key, Crown, ExternalLink, Users, Camera, X } from "lucide-react";
import { SharedAccountModal } from "./SharedAccountModal";
import { AvatarSelector } from "./AvatarSelector";
import { SubscriptionModal } from "./SubscriptionModal";

// Detecção do ambiente Android
// @ts-ignore
const isAndroidApp = !!window.Android;

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const { user, signOut } = useAuth();
  const { isPremium, isVip, subscribed, createCheckout } = useCurrentAccountPremium();
  const { currentAccount } = useAccountContext();
  const { toast } = useToast();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [supportData, setSupportData] = useState({
    subject: "",
    message: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSharedAccount, setShowSharedAccount] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [userAvatar, setUserAvatar] = useState(user?.user_metadata?.avatar || 'pig');

  // Sincronizar o avatar quando o user for atualizado
  useEffect(() => {
    if (user?.user_metadata?.avatar) {
      setUserAvatar(user.user_metadata.avatar);
    }
  }, [user?.user_metadata?.avatar]);

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
      
      setCurrentPassword("");
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
    if (!supportData.subject || !supportData.message) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha assunto e mensagem",
        variant: "destructive",
      });
      return;
    }

    setIsSendingSupport(true);

    try {
      const { error } = await supabase.functions.invoke('send-support-email', {
        body: {
          userEmail: user?.email,
          userName: user?.user_metadata?.full_name || user?.email,
          subject: supportData.subject,
          message: supportData.message,
        }
      });

      if (error) throw error;

      toast({
        title: "Mensagem enviada!",
        description: "Nossa equipe entrará em contato em breve",
      });
      
      setSupportData({ subject: "", message: "" });
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

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      
      if (error) throw error;

      if (!data?.url) {
        throw new Error("URL do portal não retornada");
      }

      // Open Stripe customer portal in new tab
      window.open(data.url, '_blank');
    } catch (error: any) {
      console.error('Customer portal error:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível abrir o portal de assinatura",
        variant: "destructive",
      });
    }
  };

  const handleAvatarChange = (avatarId: string) => {
    setUserAvatar(avatarId);
  };

  const getAvatarEmoji = (avatarId: string) => {
    const avatarMap: { [key: string]: string } = {
      // Animais Domésticos e Fazenda
      'pig': '🐷', 'cat': '🐱', 'dog': '🐶', 'chicken': '🐥', 'cow': '🐄', 'sheep': '🐑',
      'rabbit': '🐰', 'horse': '🐴', 'duck': '🦆', 'goat': '🐐',
      
      // Animais Selvagens
      'lion': '🦁', 'tiger': '🐯', 'elephant': '🐘', 'giraffe': '🦒', 'zebra': '🦓',
      'bear': '🐻', 'fox': '🦊', 'wolf': '🐺', 'panda': '🐼', 'koala': '🐨',
      'gorilla': '🦍', 'rhino': '🦏', 'hippo': '🦛',
      
      // Aves
      'owl': '🦉', 'penguin': '🐧', 'eagle': '🦅', 'parrot': '🦜', 'flamingo': '🦩',
      'peacock': '🦚', 'swan': '🦢', 'turkey': '🦃',
      
      // Animais Aquáticos
      'frog': '🐸', 'turtle': '🐢', 'fish': '🐟', 'dolphin': '🐬', 'whale': '🐳',
      'shark': '🦈', 'octopus': '🐙', 'crab': '🦀', 'lobster': '🦞', 'shrimp': '🦐',
      
      // Insetos e Pequenos Animais
      'butterfly': '🦋', 'bee': '🐝', 'ladybug': '🐞', 'spider': '🕷️', 'snail': '🐌',
      'ant': '🐜', 'cricket': '🦗',
      
      // Pessoas e Diversidade
      'man': '👨', 'woman': '👩', 'boy': '👦', 'girl': '👧', 'baby': '👶',
      'grandpa': '👴', 'grandma': '👵', 'princess': '👸', 'prince': '🤴',
      
      // Profissões
      'doctor': '👨‍⚕️', 'teacher': '👨‍🏫', 'chef': '👨‍🍳', 'artist': '👨‍🎨', 'scientist': '👨‍🔬',
      'pilot': '👨‍✈️', 'firefighter': '👨‍🚒', 'police': '👮', 'mechanic': '👨‍🔧', 'farmer': '👨‍🌾',
      'singer': '👨‍🎤', 'dancer': '🕺', 'judge': '👨‍⚖️', 'detective': '🕵️', 'construction': '👷',
      'guard': '💂',
      
      // Comidas Doces
      'cake': '🎂', 'donut': '🍩', 'cookie': '🍪', 'candy': '🍬', 'lollipop': '🍭',
      'chocolate': '🍫', 'icecream': '🍦', 'cupcake': '🧁', 'honey': '🍯',
      
      // Comidas Salgadas
      'pizza': '🍕', 'burger': '🍔', 'hotdog': '🌭', 'fries': '🍟', 'taco': '🌮',
      'sandwich': '🥪', 'pretzel': '🥨', 'popcorn': '🍿',
      
      // Frutas
      'apple': '🍎', 'banana': '🍌', 'strawberry': '🍓', 'orange': '🍊', 'grape': '🍇',
      'watermelon': '🍉', 'pineapple': '🍍', 'cherry': '🍒', 'peach': '🍑', 'coconut': '🥥',
      'avocado': '🥑', 'lemon': '🍋',
      
      // Bebidas
      'coffee': '☕', 'tea': '🍵', 'juice': '🧃', 'milk': '🥛', 'cocktail': '🍹',
      'beer': '🍺', 'wine': '🍷',
      
      // Esportes e Atividades
      'soccer': '⚽', 'basketball': '🏀', 'tennis': '🎾', 'volleyball': '🏐', 'baseball': '⚾',
      'football': '🏈', 'rugby': '🏉', 'golf': '⛳', 'bowling': '🎳', 'pingpong': '🏓',
      'badminton': '🏸', 'hockey': '🏒', 'swimming': '🏊', 'surfing': '🏄', 'skiing': '⛷️',
      'cycling': '🚴', 'running': '🏃', 'boxing': '🥊', 'weightlifting': '🏋️',
      
      // Natureza - Celestial
      'sun': '☀️', 'moon': '🌙', 'star': '⭐', 'comet': '☄️', 'earth': '🌍', 'saturn': '🪐',
      
      // Natureza - Plantas
      'flower': '🌸', 'rose': '🌹', 'tulip': '🌷', 'sunflower': '🌻', 'tree': '🌳',
      'cactus': '🌵', 'mushroom': '🍄', 'clover': '🍀',
      
      // Natureza - Paisagens
      'mountain': '🏔️', 'volcano': '🌋', 'beach': '🏖️', 'desert': '🏜️', 'rainbow': '🌈',
      'ocean': '🌊', 'cloud': '☁️', 'lightning': '⚡', 'tornado': '🌪️', 'snowflake': '❄️',
      
      // Transporte
      'car': '🚗', 'truck': '🚚', 'bus': '🚌', 'taxi': '🚕', 'motorcycle': '🏍️',
      'bicycle': '🚲', 'scooter': '🛴', 'train': '🚆', 'metro': '🚇', 'plane': '✈️',
      'helicopter': '🚁', 'ship': '🚢', 'boat': '⛵', 'submarine': '🚤', 'rocket': '🚀',
      
      // Tecnologia e Objetos
      'computer': '💻', 'phone': '📱', 'camera': '📷', 'headphones': '🎧', 'microphone': '🎤',
      'television': '📺', 'radio': '📻', 'gamepad': '🎮', 'joystick': '🕹️', 'battery': '🔋',
      'lightbulb': '💡', 'flashlight': '🔦',
      
      // Instrumentos Musicais
      'guitar': '🎸', 'piano': '🎹', 'drums': '🥁', 'trumpet': '🎺', 'violin': '🎻',
      'saxophone': '🎷', 'music': '🎵',
      
      // Símbolos e Emoções
      'heart': '❤️', 'diamond': '💎', 'crown': '👑', 'gem': '💍', 'trophy': '🏆',
      'medal': '🏅', 'gift': '🎁', 'balloon': '🎈', 'party': '🎉', 'fireworks': '🎆',
      'confetti': '🎊', 'magic': '✨', 'fire': '🔥', 'bomb': '💣',
      
      // Livros e Educação
      'book': '📚', 'notebook': '📓', 'pencil': '✏️', 'pen': '🖊️', 'graduate': '🎓',
      'school': '🏫', 'backpack': '🎒',
      
      // Fantasia e Diversão
      'unicorn': '🦄', 'dragon': '🐉', 'fairy': '🧚', 'wizard': '🧙', 'genie': '🧞',
      'vampire': '🧛', 'zombie': '🧟', 'ghost': '👻', 'robot': '🤖', 'alien': '👽',
      'monster': '👹', 'demon': '👺', 'ogre': '👹', 'troll': '🧌',
      
      // Profissões Especiais
      'superhero': '🦸', 'villain': '🦹', 'ninja': '🥷', 'pirate': '🏴‍☠️', 'cowboy': '🤠',
      'knight': '⚔️', 'samurai': '🗾',
      
      // Tempo e Clima
      'thermometer': '🌡️', 'umbrella': '☂️', 'snowman': '☃️', 'hourglass': '⏳', 'clock': '🕐',
      'watch': '⌚', 'calendar': '📅'
    };
    return avatarMap[avatarId] || '🐷';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Perfil do Usuário</DialogTitle>
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
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                Informações da Conta
                {subscribed && <Crown className="h-4 w-4 text-primary" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar Section */}
              <div className="flex items-center justify-center">
                <div className="relative group">
                  <Avatar className="w-20 h-20 border-4 border-primary/20">
                    <AvatarFallback className="text-4xl bg-primary/10">
                      {getAvatarEmoji(userAvatar)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => setShowAvatarSelector(true)}
                    className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:scale-110 transition-transform duration-200"
                  >
                    <Camera className="h-3 w-3" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-center">
                <p className="text-sm"><strong>Email:</strong> {user?.email}</p>
                <p className="text-sm">
                  <strong>Nome:</strong> {user?.user_metadata?.full_name || 'Não informado'}
                </p>
                <p className="text-sm">
                  <strong>Plano:</strong> {subscribed ? 'Premium' : isPremium ? 'Trial' : 'Gratuito'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Gerenciar Assinatura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => setShowSubscriptionModal(true)}
                className="w-full"
              >
                <Crown className="mr-2 h-4 w-4" />
                Visualizar Planos
              </Button>
              
              {/* Só mostra o botão de gerenciar (Stripe) se não estiver no app Android e for assinante */}
              {!isAndroidApp && subscribed && (
                <Button
                  onClick={openCustomerPortal}
                  variant="outline"
                  className="w-full"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Gerenciar Assinatura (Web)
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Logout */}
          <Button onClick={signOut} variant="destructive" className="w-full">
            Sair da Conta
          </Button>
        </div>

        <SharedAccountModal 
          isOpen={showSharedAccount} 
          onClose={() => setShowSharedAccount(false)} 
        />
        
        <AvatarSelector
          isOpen={showAvatarSelector}
          onClose={() => setShowAvatarSelector(false)}
          onAvatarSelected={handleAvatarChange}
        />
        
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
        />
      </DialogContent>
    </Dialog>
  );
};