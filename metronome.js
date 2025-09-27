class Metronome {
  constructor() {
    this.audioContext = null;
    this.isEnabled = true;
    this.volume = 0.3;
    this.downbeatFreq = 800; // Higher pitch for beat 1
    this.beatFreq = 400; // Lower pitch for other beats
    this.clickDuration = 0.05; // 50ms click duration
  }

  async init() {
    if (this.audioContext) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Resume context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  playClick(isDownbeat = false) {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      const frequency = isDownbeat ? this.downbeatFreq : this.beatFreq;
      const currentTime = this.audioContext.currentTime;

      // Create oscillator for the click sound
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Configure the sound
      oscillator.frequency.setValueAtTime(frequency, currentTime);
      oscillator.type = 'sine';

      // Create click envelope (quick attack, quick decay)
      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume, currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + this.clickDuration);

      // Start and stop the oscillator
      oscillator.start(currentTime);
      oscillator.stop(currentTime + this.clickDuration);

      // Clean up
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
    } catch (error) {
      console.warn('Error playing metronome click:', error);
    }
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  destroy() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Create singleton instance
export const metronome = new Metronome();