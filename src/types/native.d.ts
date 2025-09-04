// Este arquivo contém as definições de tipo para a ponte de comunicação
// entre o WebView (React) e o código nativo do Android.

// Interface que define os métodos expostos pelo Java no objeto `window.Android`
interface WebAppInterface {
  showToast: (toast: string) => void;
  getFCMToken: () => void;
  requestMicrophonePermission: () => void;
  startAudioRecording: () => void;
  stopAudioRecording: () => void;
  requestNotificationPermission: () => void;
  // Google Play Purchase methods
  launchPurchaseFlow: (productId: string) => void;
  // Google Auth methods
  signInWithGoogle: () => void;
  // File system methods
  openGallery: () => void;
  openFileChooser: (acceptType: string) => void;
}

// Estende a interface global `Window` para incluir nossos métodos e callbacks customizados
declare global {
  interface Window {
    Android?: WebAppInterface;
    AndroidBridge?: {
      signInWithGoogle: () => void;
    };
    // FCM and Permissions callbacks
    onFCMTokenReceived?: (token: string) => void;
    onPermissionResult?: (permissionName: 'camera' | 'microphone' | 'notifications', granted: boolean) => void;
    // Media callbacks
    onAudioRecordingComplete?: (base64Audio: string) => void;
    onImageCaptureComplete?: (imageDataUrl: string) => void;
    // Google Auth callbacks
    onGoogleSignInSuccess?: (idToken: string, accessToken?: string) => void;
    onGoogleSignInError?: (error: string) => void;
    // File selection callbacks
    onGalleryImageSelected?: (imageDataUrl: string) => void;
    onFileSelected?: (fileDataUrl: string, fileName: string, fileType: string) => void;
  }
}

// Exporta um tipo vazio para garantir que o TypeScript trate este arquivo como um módulo.
export {};
