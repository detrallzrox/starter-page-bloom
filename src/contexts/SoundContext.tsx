import React, { createContext, useContext, useState, useEffect } from 'react';

interface SoundSettings {
  soundEnabled: boolean;
  newIncomeSound: boolean;
  newCategorySound: boolean;
  newExpenseSound: boolean;
  newCardPurchaseSound: boolean;
  newReminderSound: boolean;
  newSubscriptionSound: boolean;
  newBudgetSound: boolean;
  newInvestmentSound: boolean;
  sharedAccountInviteSound: boolean;
  errorSound: boolean;
  cameraSound: boolean;
  microphoneSound: boolean;
}

interface CustomSounds {
  newIncomeSound?: string;
  newCategorySound?: string;
  newExpenseSound?: string;
  newCardPurchaseSound?: string;
  newReminderSound?: string;
  newSubscriptionSound?: string;
  newBudgetSound?: string;
  newInvestmentSound?: string;
  sharedAccountInviteSound?: string;
  errorSound?: string;
  cameraSound?: string;
  microphoneSound?: string;
}

interface SoundContextType {
  settings: SoundSettings;
  customSounds: CustomSounds;
  updateSetting: (key: keyof SoundSettings, value: boolean) => void;
  setCustomSound: (soundType: keyof CustomSounds, audioFile: File | null) => Promise<void>;
  playSound: (soundType: keyof Omit<SoundSettings, 'soundEnabled'>) => void;
  resetToDefault: (soundType: keyof CustomSounds) => void;
}

const defaultSettings: SoundSettings = {
  soundEnabled: true,
  newIncomeSound: true,
  newCategorySound: true,
  newExpenseSound: true,
  newCardPurchaseSound: true,
  newReminderSound: true,
  newSubscriptionSound: true,
  newBudgetSound: true,
  newInvestmentSound: true,
  sharedAccountInviteSound: true,
  errorSound: true,
  cameraSound: true,
  microphoneSound: true,
};

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const useSoundSettings = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSoundSettings must be used within a SoundProvider');
  }
  return context;
};

export const SoundProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<SoundSettings>(defaultSettings);
  const [customSounds, setCustomSounds] = useState<CustomSounds>({});

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('soundSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error("Failed to parse soundSettings from localStorage", error);
    }

    try {
      const savedCustomSounds = localStorage.getItem('customSounds');
      if (savedCustomSounds) {
        setCustomSounds(JSON.parse(savedCustomSounds));
      }
    } catch (error) {
      console.error("Failed to parse customSounds from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('soundSettings', JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save soundSettings to localStorage", error);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('customSounds', JSON.stringify(customSounds));
    } catch (error) {
      console.error("Failed to save customSounds to localStorage", error);
    }
  }, [customSounds]);

  const updateSetting = (key: keyof SoundSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const playSound = (soundType: keyof Omit<SoundSettings, 'soundEnabled'>) => {
    if (!settings.soundEnabled || !settings[soundType]) return;
    
    if (typeof window === 'undefined') return;
    
    const customSoundData = customSounds[soundType];
    
    try {
      if (customSoundData) {
        const audio = new Audio(customSoundData);
        audio.volume = 0.3;
        audio.play().catch(() => {
          console.warn('Could not play custom sound');
        });
      } else {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Som de Nova Receita - acordes ascendentes alegres
        if (soundType === 'newIncomeSound') {
          const frequencies = [800, 1000, 1200];
          frequencies.forEach((freq, index) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.value = freq;
            osc.type = 'sine';
            
            const startTime = audioContext.currentTime + (index * 0.05);
            gain.gain.setValueAtTime(0.2, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            
            osc.start(startTime);
            osc.stop(startTime + 0.3);
          });
        } 
        // Som de Nova Despesa - tons descendentes (dinheiro saindo)
        else if (soundType === 'newExpenseSound') {
          const frequencies = [1000, 800, 600];
          frequencies.forEach((freq, index) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.value = freq;
            osc.type = 'sine';
            
            const startTime = audioContext.currentTime + (index * 0.08);
            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);
            
            osc.start(startTime);
            osc.stop(startTime + 0.25);
          });
        }
        // Som de Investimento - tons estáveis crescendo
        else if (soundType === 'newInvestmentSound') {
          const frequencies = [400, 600, 800, 1000];
          frequencies.forEach((freq, index) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.value = freq;
            osc.type = 'triangle';
            
            const startTime = audioContext.currentTime + (index * 0.1);
            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
            
            osc.start(startTime);
            osc.stop(startTime + 0.4);
          });
        }
        // Som de Compra no Cartão - beep duplo
        else if (soundType === 'newCardPurchaseSound') {
          [1200, 1200].forEach((freq, index) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.value = freq;
            osc.type = 'square';
            
            const startTime = audioContext.currentTime + (index * 0.15);
            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
            
            osc.start(startTime);
            osc.stop(startTime + 0.1);
          });
        }
        // Som de Nova Categoria - tom único claro
        else if (soundType === 'newCategorySound') {
          oscillator.frequency.value = 880;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.3);
        }
        // Som da Câmera - clique simulado
        else if (soundType === 'cameraSound') {
          oscillator.frequency.value = 1200;
          oscillator.type = 'triangle';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.15);
        }
        // Som do Microfone - tom suave crescente
        else if (soundType === 'microphoneSound') {
          oscillator.frequency.value = 600;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
          
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.25);
        }
        // Som de Lembrete - sequência de notificação
        else if (soundType === 'newReminderSound') {
          const frequencies = [523, 659, 784]; // C, E, G (acorde maior)
          frequencies.forEach((freq, index) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.value = freq;
            osc.type = 'sine';
            
            const startTime = audioContext.currentTime + (index * 0.1);
            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
            
            osc.start(startTime);
            osc.stop(startTime + 0.2);
          });
        }
        // Som de Assinatura - tons repetidos
        else if (soundType === 'newSubscriptionSound') {
          [700, 700, 900].forEach((freq, index) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.value = freq;
            osc.type = 'sine';
            
            const startTime = audioContext.currentTime + (index * 0.12);
            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
            
            osc.start(startTime);
            osc.stop(startTime + 0.2);
          });
        }
        // Som de Orçamento - tom firme e estável
        else if (soundType === 'newBudgetSound') {
          oscillator.frequency.value = 440; // Nota A
          oscillator.type = 'triangle';
          
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
          
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.4);
        }
        // Som de Convite de Conta - melodia amigável
        else if (soundType === 'sharedAccountInviteSound') {
          const frequencies = [659, 784, 880]; // E, G, A
          frequencies.forEach((freq, index) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.value = freq;
            osc.type = 'sine';
            
            const startTime = audioContext.currentTime + (index * 0.08);
            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            
            osc.start(startTime);
            osc.stop(startTime + 0.3);
          });
        }
        // Som de Erro - tom áspero descendente
        else if (soundType === 'errorSound') {
          oscillator.frequency.value = 200;
          oscillator.type = 'sawtooth';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
          
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.4);
        }
      }
    } catch (error) {
      console.warn('Could not play sound effect:', error);
    }
  };

  const setCustomSound = async (soundType: keyof CustomSounds, audioFile: File | null) => {
    if (!audioFile) {
      setCustomSounds(prev => {
        const updated = { ...prev };
        delete updated[soundType];
        return updated;
      });
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(audioFile);
      
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        
        if (audio.duration > 5) {
          reject(new Error('O arquivo de áudio deve ter no máximo 5 segundos de duração'));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          setCustomSounds(prev => ({
            ...prev,
            [soundType]: base64
          }));
          resolve();
        };
        reader.onerror = () => reject(new Error('Failed to read audio file'));
        reader.readAsDataURL(audioFile);
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Arquivo de áudio inválido'));
      };
      
      audio.src = url;
    });
  };

  const resetToDefault = (soundType: keyof CustomSounds) => {
    setCustomSounds(prev => {
      const updated = { ...prev };
      delete updated[soundType];
      return updated;
    });
  };

  return (
    <SoundContext.Provider value={{ 
      settings, 
      customSounds, 
      updateSetting, 
      setCustomSound, 
      playSound, 
      resetToDefault 
    }}>
      {children}
    </SoundContext.Provider>
  );
};
