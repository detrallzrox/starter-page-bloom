import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentAccountPremium } from '@/hooks/useCurrentAccountPremium';
import { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { SubscriptionModal } from './SubscriptionModal';

interface PremiumOverlayProps {
  isBlocked: boolean;
  className?: string;
  children: React.ReactNode;
  onlyIcon?: boolean;
  replaceContent?: boolean;
  customIcon?: LucideIcon;
}

export const PremiumOverlay = ({ isBlocked, className, children, onlyIcon = false, replaceContent = false, customIcon }: PremiumOverlayProps) => {
  const { createCheckout } = useCurrentAccountPremium();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const IconComponent = customIcon || Crown;

  if (!isBlocked) {
    return <>{children}</>;
  }

  return (
    <>
      <div className={cn("relative", className)}>
        {children}
        {replaceContent ? (
          <button
            onClick={() => setShowSubscriptionModal(true)}
            className="absolute inset-0 bg-gray-900/90 backdrop-blur-[2px] rounded-lg flex items-center justify-center z-10 hover:bg-gray-800/90 transition-colors"
          >
            <IconComponent className="h-4 w-4 text-yellow-500" />
          </button>
        ) : onlyIcon ? (
          <button
            onClick={() => setShowSubscriptionModal(true)}
            className="absolute top-1 right-1 z-10 bg-gray-900/90 hover:bg-gray-800/90 p-1 rounded-full transition-colors"
          >
            <IconComponent className="h-3 w-3 text-yellow-500" />
          </button>
        ) : (
          <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-[2px] rounded-lg flex items-center justify-center z-10">
            <div className="text-center space-y-2 px-4 py-4">
              <IconComponent className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 mx-auto" />
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="text-xs sm:text-sm text-white hover:text-yellow-500 font-medium transition-colors"
              >
                Adquirir Premium
              </button>
            </div>
          </div>
        )}
      </div>
      
      <SubscriptionModal 
        isOpen={showSubscriptionModal} 
        onClose={() => setShowSubscriptionModal(false)} 
      />
    </>
  );
};