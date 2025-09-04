import { useEffect, useState } from 'react';
import { Heart, Sparkles, TrendingUp, Coins } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
      setTimeout(() => {
        onComplete();
      }, 500); // Extra time for exit animation
    }, 3000); // Show splash for 3 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ 
        background: 'linear-gradient(135deg, #5B2C87 0%, #7C3AED 50%, #8B5CF6 100%)'
      }}
    >
      <div className="flex flex-col items-center justify-center space-y-6 px-4 relative w-full max-w-md">
        {/* Background Animated Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating Coins */}
          <Coins className="absolute top-16 left-6 text-yellow-400/20 w-6 h-6 sm:w-8 sm:h-8 animate-float" />
          <Coins className="absolute top-24 right-8 text-yellow-400/15 w-4 h-4 sm:w-6 sm:h-6 animate-float animation-delay-1000" />
          <Coins className="absolute bottom-32 left-12 text-yellow-400/10 w-8 h-8 sm:w-10 sm:h-10 animate-float animation-delay-2000" />
          
          {/* Trending Up Icons */}
          <TrendingUp className="absolute top-32 right-6 text-green-400/20 w-6 h-6 sm:w-8 sm:h-8 animate-float animation-delay-500" />
          <TrendingUp className="absolute bottom-24 right-16 text-green-400/15 w-4 h-4 sm:w-6 sm:h-6 animate-float animation-delay-1500" />
          
          {/* Sparkles */}
          <Sparkles className="absolute top-48 left-4 text-white/20 w-4 h-4 sm:w-6 sm:h-6 animate-float animation-delay-300" />
          <Sparkles className="absolute bottom-40 right-4 text-white/15 w-6 h-6 sm:w-8 sm:h-8 animate-float animation-delay-1200" />
          
          {/* Hearts */}
          <Heart className="absolute top-64 right-8 text-pink-400/20 w-4 h-4 sm:w-6 sm:h-6 animate-float animation-delay-800" />
          <Heart className="absolute bottom-48 left-8 text-pink-400/15 w-3 h-3 sm:w-5 sm:h-5 animate-float animation-delay-1800" />
        </div>

        {/* Main Content Container */}
        <div className={`transform transition-all duration-1000 ${
          isAnimating 
            ? 'scale-100 rotate-0 opacity-100' 
            : 'scale-110 rotate-3 opacity-0'
        }`}>
          {/* Splash Image with Perfect Responsiveness */}
          <div className="relative mb-8 flex justify-center">
            {/* Containing Circle with perfect sizing for all devices */}
            <div className="relative w-32 h-32 xs:w-36 xs:h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 rounded-full border-2 border-white/30 flex items-center justify-center overflow-hidden bg-white/5 backdrop-blur-sm">
              {/* Decorative Ring */}
              <div className="absolute inset-0 border-2 border-white/20 rounded-full animate-spin" style={{ animationDuration: '20s' }}></div>
              
              {/* Mascote Finaudy */}
              <div className="relative z-10 w-full h-full flex items-center justify-center p-2">
                <img 
                  src="/lovable-uploads/532424b4-6bb4-41c1-8660-1230ffb65a8e.png" 
                  alt="Finaudy Mascot"
                  className="w-24 h-24 xs:w-28 xs:h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-44 lg:h-44 object-contain drop-shadow-2xl animate-pulse"
                  style={{ 
                    filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3))',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Brand Name with Perfect Typography */}
        <div className={`text-center transform transition-all duration-1000 delay-500 ${
          isAnimating 
            ? 'translate-y-0 opacity-100' 
            : 'translate-y-4 opacity-0'
        }`}>
          <h1 className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-3 tracking-wider relative">
            <span className="relative z-10">Finaudy</span>
            {/* Text Shadow Effect */}
            <span className="absolute inset-0 text-white/30 blur-sm">Finaudy</span>
          </h1>
          <div className="w-20 sm:w-24 h-1 bg-yellow-400 mx-auto mb-4 rounded-full"></div>
          <p className="text-base sm:text-lg md:text-xl text-white/90 font-medium tracking-wide px-4">
            Seu assistente financeiro inteligente
          </p>
        </div>

        {/* Elegant Loading Animation */}
        <div className={`transform transition-all duration-1000 delay-1000 ${
          isAnimating 
            ? 'translate-y-0 opacity-100' 
            : 'translate-y-4 opacity-0'
        }`}>
          <div className="flex items-center justify-center space-x-2 sm:space-x-3">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full animate-bounce"></div>
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-400 rounded-full animate-bounce animation-delay-200"></div>
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full animate-bounce animation-delay-400"></div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SplashScreen;