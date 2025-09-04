import { useState, useEffect, useCallback } from 'react';

type PermissionName = 'camera' | 'microphone' | 'notifications';
type PermissionState = 'granted' | 'denied' | 'prompt';

// Mapa para armazenar as funções de resolução das Promises de permissão
const permissionPromiseResolvers = new Map<PermissionName, (granted: boolean) => void>();

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<Record<PermissionName, PermissionState>>({
    camera: 'prompt',
    microphone: 'prompt',
    notifications: 'prompt',
  });

  const isAndroid = typeof window !== 'undefined' && !!window.Android;

  useEffect(() => {
    // Define a função de callback que o código nativo do Android chamará
    window.onPermissionResult = (permissionName: PermissionName, granted: boolean) => {
      const newState: PermissionState = granted ? 'granted' : 'denied';
      setPermissions(prev => ({ ...prev, [permissionName]: newState }));

      // Resolve a Promise pendente para esta permissão
      if (permissionPromiseResolvers.has(permissionName)) {
        const resolve = permissionPromiseResolvers.get(permissionName);
        resolve?.(granted);
        permissionPromiseResolvers.delete(permissionName);
      }
    };

    // Limpa a função de callback quando o componente é desmontado
    return () => {
      window.onPermissionResult = () => {};
    };
  }, []);

  const requestPermission = useCallback(async (name: PermissionName): Promise<boolean> => {
    if (isAndroid) {
      // Lógica para Android usando a ponte nativa
      return new Promise((resolve) => {
        // Armazena a função de resolução para ser chamada quando o Android responder
        permissionPromiseResolvers.set(name, resolve);

        if (name === 'microphone' && window.Android?.requestMicrophonePermission) {
          console.log("📱 Solicitando permissão do microfone via ponte nativa...");
          window.Android.requestMicrophonePermission();
        } else if (name === 'notifications' && window.Android?.requestNotificationPermission) {
          console.log("📱 Solicitando permissão de notificação via ponte nativa...");
          window.Android.requestNotificationPermission();
        } else {
          console.error(`Método nativo para permissão '${name}' não encontrado.`);
          resolve(false);
        }
      });
    }

    // Lógica para Web
    try {
      let newState: PermissionState = 'denied';
      if (name === 'camera' || name === 'microphone') {
        // Verificar se o navegador suporta getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('getUserMedia não é suportado neste navegador');
          setPermissions(prev => ({ ...prev, [name]: 'denied' }));
          return false;
        }
        
        const constraints = name === 'microphone' ? { audio: true } : { video: true };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        stream.getTracks().forEach(track => track.stop());
        newState = 'granted';
      } else if (name === 'notifications') {
        if (!('Notification' in window)) {
          console.error('Notificações não são suportadas neste navegador');
          setPermissions(prev => ({ ...prev, [name]: 'denied' }));
          return false;
        }
        const result = await Notification.requestPermission();
        newState = result === 'default' ? 'prompt' : result;
      }
      setPermissions(prev => ({ ...prev, [name]: newState }));
      return newState === 'granted';
    } catch (error) {
      console.error(`Erro ao solicitar a permissão ${name} na web:`, error);
      setPermissions(prev => ({ ...prev, [name]: 'denied' }));
      return false;
    }
  }, [isAndroid]);

  return { permissions, requestPermission };
};
