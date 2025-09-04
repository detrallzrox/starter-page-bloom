import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { X } from "lucide-react";
import finaudyPig from "@/assets/finaudy-pig.png";

interface RateAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RateAppModal = ({ isOpen, onClose }: RateAppModalProps) => {
  const { toast } = useToast();

  const handleRateApp = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      // iOS App Store URL com 5 estrelas pré-selecionadas
      window.open('https://apps.apple.com/app/id[APP_ID]?action=write-review', '_blank');
    } else if (isAndroid) {
      // Google Play Store URL
      window.open('market://details?id=[PACKAGE_NAME]', '_blank');
    } else {
      // Fallback para web
      toast({
        title: "Obrigado pelo interesse!",
        description: "Para avaliar, acesse nossa página na loja de aplicativos do seu dispositivo",
      });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-auto bg-white dark:bg-gray-900 border-0 shadow-2xl">
        {/* Botão X no canto superior direito */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-muted rounded-full z-10"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className="text-center space-y-6 p-6">
          {/* Título */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Avalie o Aplicativo
          </h2>
          
          {/* Porquinho Finaudy */}
          <div className="flex justify-center animate-bounce">
            <img 
              src={finaudyPig} 
              alt="Finaudy Pig" 
              className="w-24 h-24 object-contain"
            />
          </div>
          
          {/* Mensagem motivacional */}
          <div className="space-y-2">
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              Estamos trabalhando todos os dias para melhorar cada vez mais o aplicativo e a sua avaliação nos motiva a continuar melhorando!
            </p>
            <p className="text-gray-900 dark:text-white font-semibold">
              Avalie-nos com cinco estrelas!
            </p>
          </div>
          
          {/* 5 Estrelas */}
          <div className="flex justify-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <div key={star} className="text-yellow-400 text-3xl animate-pulse">
                ⭐
              </div>
            ))}
          </div>
          
          {/* Botões */}
          <div className="space-y-3 pt-4">
            <Button 
              onClick={handleRateApp}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105"
            >
              5 ESTRELAS
            </Button>
            
            <Button 
              onClick={onClose}
              variant="ghost" 
              className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-semibold"
            >
              CANCELAR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};