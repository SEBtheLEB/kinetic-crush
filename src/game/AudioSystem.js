export class AudioSystem {
  constructor(save) {
    this.save = save;
    this.ctx = null;
  }

  ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  play(name, intensity = 1) {
    const volume = this.save.data.settings.sfx;
    if (!volume) return;
    this.ensure();
    const table = {
      flick: [220, 0.07, 'sine'],
      boost: [520, 0.12, 'triangle'],
      perfect: [820, 0.18, 'triangle'],
      softHit: [150, 0.05, 'square'],
      hardHit: [90, 0.11, 'sawtooth'],
      break: [440, 0.12, 'square'],
      bomb: [55, 0.28, 'sawtooth'],
      bumper: [720, 0.1, 'sine'],
      complete: [660, 0.28, 'triangle'],
      ui: [360, 0.06, 'sine']
    };
    const [freq, dur, type] = table[name] ?? table.ui;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq * (0.9 + intensity * 0.18), this.ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.12 * intensity), this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + dur + 0.02);
  }
}
