
// Audio Themes Configuration
const THEMES: Record<string, { tempo: number, rootFreq: number, bassPattern: string, drumPattern: string }> = {
  neon_drift: {
    tempo: 128,
    rootFreq: 73.42, // D2
    bassPattern: 'rolling',
    drumPattern: 'standard'
  },
  cyber_chase: {
    tempo: 145,
    rootFreq: 82.41, // E2
    bassPattern: 'arpeggio',
    drumPattern: 'driving'
  },
  void_echoes: {
    tempo: 100,
    rootFreq: 65.41, // C2
    bassPattern: 'sustained',
    drumPattern: 'sparse'
  }
};

export class AudioManager {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  isMuted: boolean = false;
  initialized: boolean = false;

  // Sequencer State
  isPlaying: boolean = false;
  currentThemeId: string = 'neon_drift';
  tempo: number = 128;
  lookahead: number = 25.0; // ms to sleep
  scheduleAheadTime: number = 0.1; // s to look ahead
  nextNoteTime: number = 0.0;
  current16thNote: number = 0;
  timerID: number | null = null;
  
  activeNodes: AudioScheduledSourceNode[] = [];

  constructor() {
    // Singleton instance
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.3; // Master Volume
      this.initialized = true;
    } catch (e) {
      console.error("Web Audio API not supported", e);
    }
  }

  setTheme(id: string) {
    if (THEMES[id]) {
        this.currentThemeId = id;
        // Update tempo immediately if playing
        this.tempo = THEMES[id].tempo;
    }
  }

  toggleMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      // Smooth fade to avoid clicks
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.3, this.ctx.currentTime, 0.1);
    }
  }

  // --- SFX METHODS ---

  playJump() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
    
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playSlide() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.linearRampToValueAtTime(100, t + 0.2);
    
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.2);
    
    osc.start(t);
    osc.stop(t + 0.2);
  }

  playCoin() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.setValueAtTime(2400, t + 0.05); 
    
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playPowerup() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.1);
    osc.frequency.linearRampToValueAtTime(1760, t + 0.3);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.4);
    
    osc.start(t);
    osc.stop(t + 0.4);
  }

  playShieldBreak() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.3);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playCrash() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.4);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    
    noise.start(t);
  }

  // --- BGM SEQUENCER ---

  startBgm() {
    if (this.isPlaying || !this.ctx) return;
    this.isPlaying = true;
    this.current16thNote = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    
    // Ensure tempo matches current theme on start
    const theme = THEMES[this.currentThemeId];
    if (theme) this.tempo = theme.tempo;
    
    this.scheduler();
  }

  stopBgm() {
    this.isPlaying = false;
    if (this.timerID) {
        window.clearTimeout(this.timerID);
        this.timerID = null;
    }
    // Stop all active BGM nodes
    this.activeNodes.forEach(node => {
        try { node.stop(); } catch(e) {}
    });
    this.activeNodes = [];
  }

  scheduler() {
    if (!this.isPlaying || !this.ctx) return;
    
    // Schedule notes that need to play before the next interval
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
        this.scheduleNote(this.current16thNote, this.nextNoteTime);
        this.nextNote();
    }
    
    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // Advance by a 16th note
    this.current16thNote++;
    if (this.current16thNote === 16) {
        this.current16thNote = 0;
    }
  }

  scheduleNote(beatNumber: number, time: number) {
      if (!this.ctx) return;
      const theme = THEMES[this.currentThemeId] || THEMES['neon_drift'];

      // --- DRUMS ---
      if (theme.drumPattern === 'standard') {
          // KICK: Beats 0, 4, 8, 12
          if (beatNumber % 4 === 0) this.triggerKick(time);
          // SNARE: Beats 4, 12
          if (beatNumber === 4 || beatNumber === 12) this.triggerSnare(time);
          // HIHAT: 8th notes
          if (beatNumber % 2 === 0) this.triggerHihat(time, beatNumber % 4 === 2);
      } 
      else if (theme.drumPattern === 'driving') {
          // Faster, double kicks
          if (beatNumber % 4 === 0 || beatNumber === 14) this.triggerKick(time);
          if (beatNumber === 4 || beatNumber === 12) this.triggerSnare(time);
          if (beatNumber % 2 === 0) this.triggerHihat(time, true);
      }
      else if (theme.drumPattern === 'sparse') {
          // Slow, heavy
          if (beatNumber === 0 || beatNumber === 10) this.triggerKick(time);
          if (beatNumber === 8) this.triggerSnare(time);
          if (beatNumber % 4 === 0) this.triggerHihat(time, false);
      }

      // --- BASS ---
      if (theme.bassPattern === 'rolling') {
          const rootFreq = theme.rootFreq;
          let freq = rootFreq;
          // Progression: Root -> +3 semitones -> +5 semitones -> Root
          if (beatNumber >= 4 && beatNumber < 8) freq = rootFreq * 1.189; // +3 semitones
          else if (beatNumber >= 8 && beatNumber < 12) freq = rootFreq * 1.334; // +5 semitones
          
          if (beatNumber !== 1 && beatNumber !== 9) {
              this.triggerBass(time, freq, 'sawtooth');
          }
      }
      else if (theme.bassPattern === 'arpeggio') {
          const rootFreq = theme.rootFreq;
          let freq = rootFreq;
          // Octave jumping
          if (beatNumber % 2 === 1) freq *= 2; 
          
          if (beatNumber >= 8) freq *= 1.189; // Change chord halfway
          
          this.triggerBass(time, freq, 'square'); // More aggressive synth
      }
      else if (theme.bassPattern === 'sustained') {
          // Play long notes on 0 and 8
          if (beatNumber === 0) this.triggerBass(time, theme.rootFreq, 'sine', 1.5);
          if (beatNumber === 8) this.triggerBass(time, theme.rootFreq * 0.75, 'sine', 1.5); // Drop down
      }
      
      // --- LEAD / ATMOSPHERE ---
      // Random atmospheric sounds
      if (beatNumber === 0 && Math.random() > 0.6) {
          this.triggerPluck(time, theme.rootFreq * 4);
      }
  }

  triggerKick(time: number) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      
      osc.start(time);
      osc.stop(time + 0.5);
      this.activeNodes.push(osc);
  }

  triggerSnare(time: number) {
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 0.2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0; i<bufferSize; i++) data[i] = Math.random() * 2 - 1;
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000, time);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      
      noise.start(time);
      this.activeNodes.push(noise);
  }

  triggerHihat(time: number, accent: boolean) {
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0; i<bufferSize; i++) data[i] = Math.random() * 2 - 1;
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(5000, time);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(accent ? 0.2 : 0.1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      
      noise.start(time);
      this.activeNodes.push(noise);
  }

  triggerBass(time: number, freq: number, type: OscillatorType = 'sawtooth', duration: number = 0.3) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      
      // Filter Envelope for "Pluck" sound
      filter.type = 'lowpass';
      filter.Q.value = 5;
      filter.frequency.setValueAtTime(freq * 8, time);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.5, time + (duration * 0.6));
      
      // Amp Envelope
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(time);
      osc.stop(time + duration);
      this.activeNodes.push(osc);
  }
  
  triggerPluck(time: number, freq: number) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      
      gain.gain.setValueAtTime(0.1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(time);
      osc.stop(time + 0.5);
      this.activeNodes.push(osc);
  }
}

export const audioManager = new AudioManager();
