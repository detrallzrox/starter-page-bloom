import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AccountProvider } from "@/hooks/useAccountContext";
import { SoundProvider } from "@/contexts/SoundContext";
import { ModalProvider } from "@/contexts/ModalContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useWebPushNotifications } from "@/hooks/useWebPushNotifications";
import { useRealTimeNotifications } from "@/hooks/useRealTimeNotifications";
import { useCurrentAccountPremium } from "@/hooks/useCurrentAccountPremium";
import { useFCM } from "@/hooks/useFCM";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useNotificationClickListener } from "@/hooks/useNotificationClickListener";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import SplashScreen from "@/components/SplashScreen";
import { useEffect, useState } from "react";

const queryClient = new QueryClient();

// Para um aplicativo embarcado, MemoryRouter é a solução mais estável.
const Router = MemoryRouter;

const PushNotificationWrapper = ({ children }: { children: React.ReactNode }) => {
  usePushNotifications();
  useRealTimeNotifications();
  
  // Ativa o listener de cliques em notificações que aguarda chamadas do código nativo
  useNotificationClickListener();

  // Initialize Google Auth para configurar callbacks se necessário
  const { isAndroidWebView } = useGoogleAuth();
  
  if (isAndroidWebView()) {
    console.log("📱 Plataforma nativa detectada, inicializando FCM...");
    useFCM();
  } else {
    console.log("🌐 Plataforma web detectada, inicializando Web Push...");
    useWebPushNotifications();
  }
  
  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return user ? <PushNotificationWrapper>{children}</PushNotificationWrapper> : <Navigate to="/auth" replace />;
};

const SmartPublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const { isPremium, inTrial, isLoading: subscriptionLoading } = useCurrentAccountPremium();
  
  if (isLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  const hasActiveAccess = user && (isPremium || inTrial);
  return hasActiveAccess ? <Navigate to="/" replace /> : children;
};

// Componente interno que lida com a lógica de rotas e splash screen
const AppRoutes = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const handleBackButton = (event: PopStateEvent) => {
      console.log('Navegação com botão voltar detectada');
    };

    window.addEventListener('popstate', handleBackButton);
    
    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, []);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <Routes>
      <Route path="/" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/auth" element={
        <SmartPublicRoute>
          <Auth />
        </SmartPublicRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AccountProvider>
          <SoundProvider>
            <ModalProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Router>
                  <AppRoutes />
                </Router>
              </TooltipProvider>
            </ModalProvider>
          </SoundProvider>
        </AccountProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
