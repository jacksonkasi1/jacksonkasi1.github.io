export class AudioManager {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.ctx = null;
    this.master = null;
    this.music = null;
    this.lion = false;
    this.beatTimer = 0;
    this.started = false;
  }

  ensureStarted() {
    if (!this.enabled) return;
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.42;
      this.master.connect(this.ctx.destination);
      this.music = this.ctx.createGain();
      this.music.gain.value = 0.22;
      this.music.connect(this.master);
      this.createDrone();
    }
    this.ctx.resume?.();
    this.started = true;
  }

  createDrone() {
    const now = this.ctx.currentTime;
    const pad = this.ctx.createOscillator();
    const padGain = this.ctx.createGain();
    pad.type = 'sine';
    pad.frequency.setValueAtTime(55, now);
    padGain.gain.value = 0.055;
    pad.connect(padGain).connect(this.music);
    pad.start();

    const shimmer = this.ctx.createOscillator();
    const shimmerGain = this.ctx.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.value = 220;
    shimmerGain.gain.value = 0.012;
    shimmer.connect(shimmerGain).connect(this.music);
    shimmer.start();
    this.padGain = padGain;
    this.shimmerGain = shimmerGain;
  }

  update(dt, running) {
    if (!this.ctx || !this.enabled || !running) return;
    this.beatTimer -= dt;
    if (this.beatTimer <= 0) {
      this.beatTimer = this.lion ? 0.22 : 0.32;
      this.percussion(this.lion ? 1 : 0.62);
    }
  }

  percussion(intensity) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.lion ? 92 : 70, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16 * intensity, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
    osc.connect(gain).connect(this.music);
    osc.start(now); osc.stop(now + 0.19);
  }

  tone(frequency, duration = 0.12, volume = 0.1, type = 'sine', glide = null) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (glide) osc.frequency.exponentialRampToValueAtTime(glide, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.master);
    osc.start(now); osc.stop(now + duration + 0.03);
  }

  noise(duration = 0.2, volume = 0.08) {
    if (!this.ctx || !this.enabled) return;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain).connect(this.master);
    source.start();
  }

  play(name) {
    if (!this.enabled) return;
    this.ensureStarted();
    const sounds = {
      shard: () => this.tone(760, 0.1, 0.08, 'sine', 1140),
      sigil: () => { this.tone(330, 0.34, 0.12, 'triangle', 880); this.tone(660, 0.28, 0.07); },
      jump: () => this.tone(230, 0.13, 0.08, 'triangle', 420),
      slide: () => this.noise(0.18, 0.045),
      lane: () => this.tone(150, 0.055, 0.035, 'sine', 220),
      slam: () => { this.tone(95, 0.25, 0.18, 'sine', 42); this.noise(0.14, 0.1); },
      shield: () => this.tone(420, 0.35, 0.11, 'sine', 920),
      breakShield: () => { this.tone(520, 0.18, 0.11, 'sawtooth', 110); this.noise(0.22, 0.08); },
      magnet: () => this.tone(280, 0.4, 0.09, 'triangle', 560),
      multiplier: () => this.tone(520, 0.25, 0.1, 'square', 780),
      crash: () => { this.tone(120, 0.35, 0.2, 'sawtooth', 38); this.noise(0.35, 0.18); },
      smash: () => { this.tone(82, 0.24, 0.2, 'square', 44); this.noise(0.2, 0.13); },
      transform: () => { this.tone(110, 0.8, 0.14, 'sawtooth', 440); this.tone(220, 0.9, 0.1, 'triangle', 880); },
      roar: () => { this.noise(0.8, 0.18); this.tone(75, 0.8, 0.22, 'sawtooth', 42); },
      ui: () => this.tone(420, 0.07, 0.05)
    };
    sounds[name]?.();
  }

  setLion(active) {
    this.lion = active;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.padGain?.gain.setTargetAtTime(active ? 0.09 : 0.055, now, 0.2);
    this.shimmerGain?.gain.setTargetAtTime(active ? 0.028 : 0.012, now, 0.2);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.master) this.master.gain.setTargetAtTime(enabled ? 0.42 : 0.0001, this.ctx.currentTime, 0.03);
    if (enabled) this.ensureStarted();
  }

  setPaused(paused) {
    if (!this.ctx || !this.enabled) return;
    this.music.gain.setTargetAtTime(paused ? 0.035 : 0.22, this.ctx.currentTime, 0.12);
  }
}
