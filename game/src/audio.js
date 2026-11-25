// Warung Rush — sounds, synthesized live with WebAudio. No audio files:
// every effect is an oscillator or a filtered noise burst, so the game
// stays a handful of static files and plays offline.

export function createSfx() {
  const sfx = {
    ctx: null,
    muted: false,
    ensure() {
      if (!this.ctx) {
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { /* silent */ }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    tone(freq, dur, type, vol, slideTo) {
      if (this.muted) return;
      const ctx = this.ensure();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      gain.gain.setValueAtTime(vol || 0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    noise(dur, vol, filterFreq) {
      if (this.muted) return;
      const ctx = this.ensure();
      if (!ctx) return;
      const t = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = filterFreq || 3200;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(t);
    },
    pickup() { this.tone(520, 0.09, 'triangle', 0.1, 760); },
    chop() { this.noise(0.12, 0.14, 1800); this.tone(180, 0.08, 'square', 0.05); },
    sizzle() { this.noise(0.5, 0.07, 5200); },
    plate() { this.tone(660, 0.1, 'triangle', 0.1); this.tone(880, 0.12, 'triangle', 0.08); },
    ready() { this.tone(523, 0.12, 'sine', 0.12); setTimeout(() => this.tone(784, 0.16, 'sine', 0.12), 110); },
    serve() {
      this.tone(523, 0.1, 'triangle', 0.12);
      setTimeout(() => this.tone(659, 0.1, 'triangle', 0.12), 90);
      setTimeout(() => this.tone(784, 0.18, 'triangle', 0.12), 180);
    },
    nope() { this.tone(160, 0.14, 'square', 0.06, 110); },
    trash() { this.noise(0.18, 0.1, 900); },
    burn() { this.tone(220, 0.3, 'sawtooth', 0.07, 90); },
    miss() { this.tone(392, 0.2, 'sine', 0.1, 196); },
    over() {
      [440, 349, 293, 220].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'triangle', 0.11), i * 180));
    },
    dayEnd() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.16, 'triangle', 0.11), i * 130));
    },
    toggleMute() { this.muted = !this.muted; return this.muted; },
  };
  return sfx;
}
