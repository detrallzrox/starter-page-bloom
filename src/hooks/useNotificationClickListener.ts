import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleNotificationNavigation } from '@/utils/notificationNavigation';

// Define a estrutura esperada dos dados da notificação vindos do código nativo
interface NativeNotificationData {
  data?: {
    [key: string]: any;
    type?: string;
  };
}

export const useNotificationClickListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    /**
     * Expõe uma função global no `window` que pode ser chamada pelo código nativo do Android.
     * Quando o usuário clica em uma notificação, o código nativo (Java/Kotlin) deve
     * chamar esta função, passando os dados da notificação como um objeto JSON.
     */
    window.onNotificationClicked = (notification: NativeNotificationData) => {
      console.log('🔔 Notificação clicada (recebida do código nativo):', JSON.stringify(notification));

      // A função `handleNotificationNavigation` espera um formato ligeiramente diferente,
      // então nós o adaptamos aqui.
      const adaptedNotification = {
        data: notification.data || {},
        // Adicione outros campos se necessário, ou deixe-os vazios se não forem usados.
        id: new Date().toISOString(), 
        title: '', 
        body: '',
      };

      // Garante que a navegação ocorra após a renderização inicial
      setTimeout(() => {
        handleNotificationNavigation(adaptedNotification, navigate);
      }, 300);
    };

    console.log("✅ Listener de clique de notificação (ponte nativa) pronto.");

    // Limpeza: remove a função global quando o componente é desmontado
    return () => {
      delete window.onNotificationClicked;
    };
  }, [navigate]);
};

// Estende a interface global `Window` para incluir nossa nova função
declare global {
  interface Window {
    onNotificationClicked?: (notification: NativeNotificationData) => void;
  }
}