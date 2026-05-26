import { clamp } from './MathUtil.js';

export class Particles {
  constructor() {
    this.items = [];
    this.max = 360;
  }

  add(x, y, count, color, speed = 220, size = 4) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.9);
      this.items.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color, size: size * (0.6 + Math.random()) });
    }
    if (this.items.length > this.max) this.items.splice(0, this.items.length - this.max);
  }

  shockwave(x, y, color = '#7eefff', power = 1) {
    this.items.push({ x, y, vx: 0, vy: 0, life: 1, color, size: 34 * power, ring: true });
  }

  update(dt, reduced) {
    for (const p of this.items) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.93, dt * 60);
      p.vy *= Math.pow(0.93, dt * 60);
      p.life -= (reduced ? 1.7 : 1) * dt * (p.ring ? 1.8 : 1.35);
    }
    this.items = this.items.filter((p) => p.life > 0);
  }

  draw(ctx) {
    for (const p of this.items) {
      ctx.save();
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.strokeStyle = p.color;
      ctx.fillStyle = p.color;
      if (p.ring) {
        ctx.lineWidth = 5 * p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.8 - p.life), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
