// Procedural Web Audio API sound generator for Haunted Escape Room Atmosphere

class AudioManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private ambientGain: GainNode | null = null;
  private isAmbiencePlaying: boolean = false;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Eerie Low Ambient Room Tone
  startAmbience() {
    if (this.isAmbiencePlaying || !this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Sub-bass drone oscillator
      const drone = ctx.createOscillator();
      drone.type = 'sawtooth';
      drone.frequency.setValueAtTime(55, ctx.currentTime); // 55Hz (A1)

      // Lowpass filter for deep dark resonance
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, ctx.currentTime);
      filter.Q.setValueAtTime(3.5, ctx.currentTime);

      this.ambientGain = ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      this.ambientGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 3.0);

      drone.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(ctx.destination);

      drone.start();
      this.isAmbiencePlaying = true;
    } catch {}
  }

  stopAmbience() {
    if (this.ambientGain && this.ctx) {
      try {
        this.ambientGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5);
      } catch {}
    }
    this.isAmbiencePlaying = false;
  }

  // Footstep on aged wooden floorboards (occasional creepy creak)
  playFootstep() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110 + Math.random() * 30, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.09);

      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);

      // 25% chance of floorboard creak
      if (Math.random() < 0.28) {
        this.playCreak();
      }
    } catch {}
  }

  // Floorboard wood creak
  playCreak() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      const baseFreq = 260 + Math.random() * 80;
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(baseFreq + 60, ctx.currentTime + 0.07);
      osc.frequency.linearRampToValueAtTime(baseFreq - 40, ctx.currentTime + 0.16);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);
      filter.Q.setValueAtTime(5, ctx.currentTime);

      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {}
  }

  // Jump sound
  playJump() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(290, ctx.currentTime + 0.16);

      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {}
  }

  // Landing thud
  playLand() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.14);

      gain.gain.setValueAtTime(0.16, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch {}
  }

  // Tactical flashlight click switch
  playFlashlightClick() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {}
  }

  // Lamp electrical flicker spark
  playFlickerZap() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, ctx.currentTime); // 60Hz mains hum
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.02);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  }

  // Scene loaded suspense chime
  playSceneReady() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Eerie minor suspense chord: D minor (D3, F3, A3, D4)
      const freqs = [146.83, 174.61, 220.0, 293.66];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.12);

        gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + i * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.12 + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 1.3);
      });
    } catch {}
  }

  playClick() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }

  // Clue investigation panel open chime
  playInvestigateOpen() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const freqs = [329.63, 440.0, 523.25];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.06 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.48);
      });
    } catch {}
  }

  // Magical puzzle solved fanfare
  playPuzzleSolved() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [293.66, 369.99, 440.0, 587.33, 739.99];
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const startT = ctx.currentTime + i * 0.085;
        osc.frequency.setValueAtTime(f, startT);
        gain.gain.setValueAtTime(0.001, startT);
        gain.gain.linearRampToValueAtTime(0.09, startT + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, startT + 0.9);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startT);
        osc.stop(startT + 0.95);
      });
    } catch {}
  }

  // Verification or code entry failure buzz
  playPuzzleFail() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      [155, 130].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        const startT = ctx.currentTime + idx * 0.14;
        osc.frequency.setValueAtTime(f, startT);
        gain.gain.setValueAtTime(0.06, startT);
        gain.gain.exponentialRampToValueAtTime(0.0001, startT + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startT);
        osc.stop(startT + 0.18);
      });
    } catch {}
  }

  // Keypad button press tone
  playKeypadBeep(digit?: string) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const num = Number(digit) || 5;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520 + num * 38, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.065);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    } catch {}
  }

  // Heavy door lock release and grand escape fanfare
  playDoorUnlock() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Mechanical bolt clunk
      const clunk = ctx.createOscillator();
      const clunkGain = ctx.createGain();
      clunk.type = 'square';
      clunk.frequency.setValueAtTime(95, ctx.currentTime);
      clunk.frequency.exponentialRampToValueAtTime(42, ctx.currentTime + 0.22);
      clunkGain.gain.setValueAtTime(0.14, ctx.currentTime);
      clunkGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
      clunk.connect(clunkGain);
      clunkGain.connect(ctx.destination);
      clunk.start();
      clunk.stop(ctx.currentTime + 0.25);

      // Grand major chord swell
      const chord = [261.63, 329.63, 392.0, 523.25, 659.25];
      chord.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const t = ctx.currentTime + 0.22 + idx * 0.06;
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 1.85);
      });
    } catch {}
  }
}

export const soundManager = new AudioManager();

