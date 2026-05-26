import { clamp } from './MathUtil.js';

const TYPE_STATS = {
  basic: { color: '#22d4e8', health: 48, bounce: 0.9, damageScale: 1, required: true, symbol: '' },
  stone: { color: '#9ba7ba', health: 82, bounce: 0.84, damageScale: 1, required: true, symbol: '◆' },
  metal: { color: '#d6dde8', health: 126, bounce: 0.78, damageScale: 0.62, required: true, symbol: 'M' },
  bomb: { color: '#ff5757', health: 56, bounce: 0.9, damageScale: 1, required: true, symbol: '!' },
  bumper: { color: '#ffd34f', health: 9999, bounce: 1.28, damageScale: 0, required: false, symbol: 'B' },
  core: { color: '#c66cff', health: 360, bounce: 0.86, damageScale: 0.78, required: true, symbol: 'C' }
};

export class Brick {
  constructor(x, y, size, type = 'basic', required = null, healthBoost = 1) {
    const stats = TYPE_STATS[type] ?? TYPE_STATS.basic;
    this.x = x;
    this.y = y;
    this.size = size;
    this.type = type;
    this.maxHealth = Math.round(stats.health * healthBoost);
    this.health = this.maxHealth;
    this.required = required ?? stats.required;
    this.alive = true;
    this.flash = 0;
    this.shake = 0;
    this.hitAngle = 0;
  }

  get stats() {
    return TYPE_STATS[this.type] ?? TYPE_STATS.basic;
  }

  damage(amount) {
    if (!this.alive || this.type === 'bumper') return false;
    this.health -= amount * this.stats.damageScale;
    this.flash = 1;
    this.shake = 1;
    this.hitAngle = Math.random() * Math.PI * 2;
    if (this.health <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  get healthRatio() {
    return clamp(this.health / this.maxHealth, 0, 1);
  }
}

export { TYPE_STATS };
