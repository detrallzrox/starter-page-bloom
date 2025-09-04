// Utility for playing sound effects
export const playSound = (frequency: number, duration: number, type: 'sine' | 'square' | 'triangle' = 'sine') => {
  if (typeof window === 'undefined') return;
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (error) {
    console.warn('Could not play sound effect:', error);
  }
};

export const soundEffects = {
  success: () => playSound(800, 200, 'sine'),
  click: () => playSound(1000, 100, 'sine'),
  error: () => playSound(400, 300, 'square'),
  camera: () => playSound(1200, 150, 'triangle'),
  microphone: () => playSound(600, 250, 'sine'),
};