export const POWERUP_TYPES = {
  multiball: { label: 'MULTI BALL', color: '#56e8ff', symbol: 'x3' },
  giant: { label: 'CRUSH MODE', color: '#ffd84e', symbol: 'G' },
  charge: { label: 'CHARGE UP', color: '#69ff94', symbol: '+' },
  damage: { label: 'POWER HIT', color: '#ff7bd5', symbol: '2x' }
};

export class PowerUp {
  constructor(x, y, type, size = 96) {
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
    this.type = type;
    this.size = size;
    this.radius = size * 0.5;
    this.life = 13;
    this.spin = Math.random() * Math.PI * 2;
    this.pulse = Math.random() * Math.PI * 2;
  }

  get stats() {
    return POWERUP_TYPES[this.type] ?? POWERUP_TYPES.charge;
  }

  update(dt) {
    this.life -= dt;
    this.pulse += dt * 5.5;
    this.spin += dt * 0.55;
    this.x = this.homeX + Math.sin(this.pulse * 0.7) * 5;
    this.y = this.homeY + Math.sin(this.pulse) * 12;
  }
}
