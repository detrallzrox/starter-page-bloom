import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

// Declaração global para o AdSense
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdBannerProps {
  refreshInterval?: number; // em segundos
}

export const AdBanner = ({ refreshInterval = 45 }: AdBannerProps) => {
  const [key, setKey] = useState(0);
  const isMobile = useIsMobile();

  // Carregar script do Google AdSense
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2190697931830147';
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Atualizar banner a cada intervalo especificado
  useEffect(() => {
    const interval = setInterval(() => {
      setKey(prev => prev + 1);
      // Reexecutar AdSense quando o banner for atualizado
      if (window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Inicializar AdSense após o componente montar
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [key]);

  return (
    <div className="w-full bg-muted/30 border-t">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex flex-col items-center justify-center space-y-1 sm:space-y-2">
          {/* Texto de identificação do anúncio */}
          <p className="text-[10px] sm:text-xs text-muted-foreground">Publicidade</p>
          
          {/* Container do banner AdSense - Responsivo */}
          <div 
            key={key}
            className="w-full flex items-center justify-center"
            style={{ 
              // Responsivo: 320x50 em mobile, 728x90 em desktop
              height: isMobile ? '50px' : '90px',
              maxWidth: isMobile ? '320px' : '728px',
              minHeight: isMobile ? '50px' : '90px'
            }}
          >
            {/* Banner do Google AdSense */}
            <ins 
              className="adsbygoogle"
              style={{ 
                display: 'block',
                width: isMobile ? '320px' : '728px',
                height: isMobile ? '50px' : '90px'
              }}
              data-ad-client="ca-pub-2190697931830147"
              data-ad-slot="7879919975"
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
          
          {/* Texto informativo para contas gratuitas */}
          <p className="text-[10px] sm:text-xs text-muted-foreground text-center max-w-sm">
            Anúncios ajudam a manter o app gratuito.{' '}
            <span className="hidden sm:inline">
              <br />
              Faça upgrade para Premium para removê-los.
            </span>
            <span className="sm:hidden">
              Upgrade Premium para removê-los.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};