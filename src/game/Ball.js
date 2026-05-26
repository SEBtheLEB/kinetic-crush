import { clamp, length } from './MathUtil.js';

export class Ball {
  constructor(x, y) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 36;
    this.baseRadius = 36;
    this.friction = 0.992;
    this.wallBounce = 0.94;
    this.brickBounce = 0.9;
    this.maxSpeed = 2700;
    this.minUsefulSpeed = 80;
    this.trail = [];
    this.pierceTimer = 0;
    this.life = Infinity;
    this.isPrimary = true;
  }

  reset(x = this.startX, y = this.startY) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = this.baseRadius;
    this.pierceTimer = 0;
    this.life = Infinity;
    this.trail = [];
  }

  clone(angle, speed = 720) {
    const ball = new Ball(this.x, this.y);
    ball.baseRadius = this.baseRadius;
    ball.radius = this.radius;
    ball.vx = this.vx * 0.45 + Math.cos(angle) * speed;
    ball.vy = this.vy * 0.45 + Math.sin(angle) * speed;
    ball.life = 14;
    ball.isPrimary = false;
    return ball;
  }

  get speed() {
    return length(this.vx, this.vy);
  }

  addImpulse(ix, iy) {
    this.vx += ix;
    this.vy += iy;
    this.clampSpeed();
  }

  clampSpeed() {
    const speed = this.speed;
    if (speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed;
      this.vx *= scale;
      this.vy *= scale;
    }
  }

  integrate(dt) {
    if (Number.isFinite(this.life)) this.life -= dt;
    if (this.pierceTimer > 0) {
      this.pierceTimer = Math.max(0, this.pierceTimer - dt);
      this.radius = this.baseRadius * 2.25;
    } else {
      this.radius += (this.baseRadius - this.radius) * Math.min(1, dt * 8);
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const drag = Math.pow(this.friction, dt * 60);
    this.vx *= drag;
    this.vy *= drag;
    if (this.speed < 3) {
      this.vx = 0;
      this.vy = 0;
    }
    this.clampSpeed();
  }

  pushTrail() {
    this.trail.push({ x: this.x, y: this.y, speed: this.speed, life: 1 });
    if (this.trail.length > 22) this.trail.shift();
    for (const node of this.trail) node.life = clamp(node.life - 0.04, 0, 1);
  }
}
