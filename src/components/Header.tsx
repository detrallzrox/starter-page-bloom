import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, User, Crown, LogOut, Settings, ArrowLeftRight, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccountContext } from "@/hooks/useAccountContext";
import { useCurrentAccountPremium } from "@/hooks/useCurrentAccountPremium";
import { ConfigModal } from "@/components/ConfigModal";
import { ProfileModal } from "@/components/ProfileModal";
import { SharedAccountModal } from "@/components/SharedAccountModal";
import { NotificationCenter } from "@/components/NotificationCenter";
import finaudyLogo from "@/assets/finaudy-logo.png";

export const Header = () => {
  const { user, signOut } = useAuth();
  const { currentAccount, availableAccounts, switchAccount } = useAccountContext();
  const { isVip, subscriptionTier } = useCurrentAccountPremium();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSharedAccountOpen, setIsSharedAccountOpen] = useState(false);
  
  
  // Sempre mostrar se tem mais de uma conta OU se tem contas compartilhadas
  const hasMultipleAccounts = availableAccounts.length > 1;
  const hasSharedAccounts = availableAccounts.some(acc => acc.type === 'shared');

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

  const userAvatar = user?.user_metadata?.avatar || 'pig';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-14 sm:pt-0">
      <div className="container flex h-16 sm:h-18 md:h-20 items-center justify-between px-2 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <img 
            src={finaudyLogo} 
            alt="Finaudy" 
            className="h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg flex-shrink-0 object-contain"
            style={{ 
              minWidth: '28px', 
              minHeight: '28px',
              maxWidth: '40px', 
              maxHeight: '40px',
              display: 'block'
            }}
            onError={(e) => {
              console.warn('Logo failed to load, using fallback');
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="block">
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-brand-purple leading-tight">
              Finaudy
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-0.5 leading-tight">
              Controle Financeiro Inteligente
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
          {isVip ? (
            <div className="inline-flex items-center justify-center px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-full bg-gradient-to-r from-purple-600 via-purple-500 to-purple-700 text-white font-semibold text-[10px] sm:text-xs md:text-sm shadow-lg shadow-purple-500/30 border border-purple-400/20 min-w-fit whitespace-nowrap">
              ⭐
              VIP
            </div>
          ) : currentAccount?.isPremium ? (
            <div className="inline-flex items-center justify-center px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-full bg-gradient-to-r from-green-500 via-green-400 to-green-600 text-white font-semibold text-[10px] sm:text-xs md:text-sm shadow-lg shadow-green-500/30 border border-green-300/20">
              <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 mr-1 sm:mr-1.5 text-green-100" />
              Premium
            </div>
          ) : (
            <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/20 text-[10px] sm:text-xs md:text-sm px-2 py-1 sm:px-3 sm:py-1.5">
              Gratuita
            </Badge>
          )}
          
          <NotificationCenter />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 p-0">
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-primary/20">
                  <AvatarFallback className="text-lg sm:text-xl bg-primary/10">
                    {getAvatarEmoji(userAvatar)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.user_metadata?.full_name || 'Usuário'}
                </p>
                {currentAccount && (
                  <p className="text-xs text-primary">
                    Conta atual: {currentAccount.name}
                  </p>
                )}
              </div>
              
              {(hasMultipleAccounts || hasSharedAccounts) && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1">
                    <p className="text-xs text-muted-foreground mb-1">Contas disponíveis:</p>
                    {availableAccounts.map((account) => (
                      <DropdownMenuItem 
                        key={account.id}
                        onClick={() => switchAccount(account.id)}
                        className={`text-xs ${currentAccount?.id === account.id ? 'bg-primary/10 text-primary' : ''}`}
                      >
                        <ArrowLeftRight className="mr-2 h-3 w-3" />
                        <div className="flex flex-col">
                          <span>{account.type === 'personal' ? 'Sua Conta' : account.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {account.type === 'shared' ? '(Conta Compartilhada)' : '(Conta Pessoal)'}
                            {currentAccount?.id === account.id && ' - Atual'}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsConfigOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <SharedAccountModal isOpen={isSharedAccountOpen} onClose={() => setIsSharedAccountOpen(false)} />
    </header>
  );
};