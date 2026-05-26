export const POWERUP_TYPES = {
  multiball: { label: 'MULTI BALL', color: '#56e8ff', symbol: 'x3' },
  giant: { label: 'CRUSH MODE', color: '#ffd84e', symbol: 'G' },
  charge: { label: 'CHARGE UP', color: '#69ff94', symbol: '+' },
  damage: { label: 'POWER HIT', color: '#ff7bd5', symbol: '2x' }
};

export class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.vx = (Math.random() - 0.5) * 90;
    this.vy = -120 - Math.random() * 80;
    this.radius = 22;
    this.life = 11;
    this.spin = Math.random() * Math.PI * 2;
    this.pulse = Math.random() * Math.PI * 2;
  }

  get stats() {
    return POWERUP_TYPES[this.type] ?? POWERUP_TYPES.charge;
  }

  update(dt, arena) {
    this.life -= dt;
    this.pulse += dt * 5.5;
    this.spin += dt * 2.4;
    this.vy += 230 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x - this.radius < arena.x) {
      this.x = arena.x + this.radius;
      this.vx = Math.abs(this.vx) * 0.75;
    } else if (this.x + this.radius > arena.x + arena.w) {
      this.x = arena.x + arena.w - this.radius;
      this.vx = -Math.abs(this.vx) * 0.75;
    }

    if (this.y + this.radius > arena.y + arena.h) {
      this.y = arena.y + arena.h - this.radius;
      this.vy = -Math.abs(this.vy) * 0.42;
      this.vx *= 0.82;
    }
  }
}
