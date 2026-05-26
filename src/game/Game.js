import { Ball } from './Ball.js';
import { Input } from './Input.js';
import { LevelManager } from './LevelManager.js';
import { Particles } from './Particles.js';
import { SaveSystem } from './SaveSystem.js';
import { UI } from './UI.js';
import { AudioSystem } from './AudioSystem.js';
import { vibrate } from './Haptics.js';
import { circleRectCollision, reflect, wallCollide } from './Physics.js';
import { clamp, dot, normalize } from './MathUtil.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = 1080;
    this.H = 1920;
    this.arena = { x: 60, y: 170, w: 960, h: 1540 };
    this.save = new SaveSystem();
    this.audio = new AudioSystem(this.save);
    this.levelManager = new LevelManager();
    this.ball = new Ball(540, 960);
    this.particles = new Particles();
    this.ui = new UI(this);
    this.input = new Input(canvas, this);
    this.state = 'menu';
    this.levelIndex = 0;
    this.bricks = [];
    this.flickCharges = 3;
    this.chargeRegen = 0.22;
    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.score = 0;
    this.flicks = 0;
    this.bricksBroken = 0;
    this.elapsed = 0;
    this.shake = 0;
    this.debug = false;
    this.lastTime = performance.now();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  start() {
    this.ui.showMenu();
    requestAnimationFrame((t) => this.loop(t));
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(this.canvas.width / this.W, 0, 0, this.canvas.height / this.H, 0, 0);
  }

  startLevel(index) {
    this.levelIndex = clamp(index, 0, this.levelManager.levels.length - 1);
    const built = this.levelManager.build(this.levelIndex, this.arena);
    this.currentLevel = built.level;
    this.bricks = built.bricks;
    this.requiredTotal = this.bricks.filter((b) => b.required).length;
    this.ball.reset(built.ballStart.x, built.ballStart.y);
    this.flickCharges = 3;
    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.elapsed = 0;
    this.flicks = 0;
    this.bricksBroken = 0;
    this.particles.items = [];
    this.state = 'playing';
    this.ui.screen('');
  }

  restartLevel() {
    this.startLevel(this.levelIndex);
  }

  nextLevel() {
    this.startLevel((this.levelIndex + 1) % this.levelManager.levels.length);
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.ui.showPause();
    } else if (this.state === 'paused') this.resume();
  }

  resume() {
    this.state = 'playing';
    this.ui.screen('');
  }

  toggleDebug() {
    this.debug = !this.debug;
  }

  applyFlick(drag) {
    if (this.flickCharges < 1) return;
    this.audio.ensure();
    this.flickCharges -= 1;
    this.flicks += 1;
    this.ball.addImpulse(drag.dir.x * drag.force, drag.dir.y * drag.force);
    this.audio.play(drag.label === 'perfect' ? 'perfect' : drag.label === 'boost' ? 'boost' : 'flick', drag.force / 900);
    if (drag.label === 'perfect') {
      this.ui.toast('PERFECT PUSH', 'perfect');
      this.particles.shockwave(this.ball.x, this.ball.y, '#ffd84e', 1.25);
      this.shake += 9;
      this.save.data.totalPerfectPushes += 1;
      this.save.save();
      vibrate(this.save, 28);
    } else if (drag.label === 'boost') {
      this.ui.toast('MOMENTUM BOOST');
      this.particles.shockwave(this.ball.x, this.ball.y, '#54e5ff', 0.8);
      vibrate(this.save, 12);
    }
  }

  loop(now) {
    const dt = Math.min(0.033, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (this.state === 'playing') this.update(dt);
    this.draw();
    this.ui.update();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.elapsed += dt;
    this.flickCharges = Math.min(3, this.flickCharges + this.chargeRegen * dt);
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;
    this.shake = Math.max(0, this.shake - 42 * dt);
    const steps = Math.max(1, Math.ceil(this.ball.speed / 480));
    for (let i = 0; i < steps; i++) this.physicsStep(dt / steps);
    this.ball.pushTrail();
    this.particles.update(dt, this.save.data.settings.reducedEffects);
    if (this.bricks.filter((b) => b.alive && b.required).length === 0) this.completeLevel();
  }

  physicsStep(dt) {
    this.ball.integrate(dt);
    wallCollide(this.ball, this.arena);
    for (const brick of this.bricks) {
      if (!brick.alive) continue;
      const hit = circleRectCollision(this.ball, brick);
      if (!hit) continue;
      this.ball.x += hit.nx * (hit.depth + 0.5);
      this.ball.y += hit.ny * (hit.depth + 0.5);
      const impactSpeed = Math.abs(dot(this.ball.vx, this.ball.vy, hit.nx, hit.ny));
      reflect(this.ball, hit.nx, hit.ny, brick.stats.bounce);
      if (brick.type === 'bumper') this.ball.addImpulse(hit.nx * 210, hit.ny * 210);
      this.handleBrickHit(brick, impactSpeed);
      break;
    }
  }

  handleBrickHit(brick, impactSpeed) {
    this.combo += 1;
    this.comboTimer = 2.2;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const speedFactor = impactSpeed / 700;
    let damage = Math.pow(Math.max(0.15, speedFactor), 1.35) * 18;
    damage *= 1 + Math.min(0.75, this.combo * 0.025);
    damage = clamp(damage, 2, 160);
    const broke = brick.damage(damage);
    const hard = impactSpeed > 850;
    this.flickCharges = Math.min(3, this.flickCharges + (hard ? 0.12 : 0.04) + Math.min(0.12, this.combo * 0.005));
    this.particles.add(brick.x, brick.y, hard ? 9 : 4, brick.stats.color, hard ? 360 : 170, hard ? 4 : 3);
    if (hard) {
      this.particles.shockwave(brick.x, brick.y, '#eaf8ff', Math.min(1.4, impactSpeed / 1000));
      if (this.save.data.settings.shake) this.shake += Math.min(12, impactSpeed / 130);
      vibrate(this.save, 18);
      this.audio.play('hardHit', impactSpeed / 900);
    } else {
      vibrate(this.save, 8);
      this.audio.play(brick.type === 'bumper' ? 'bumper' : 'softHit', 0.8);
    }
    if (broke) this.breakBrick(brick);
  }

  breakBrick(brick, chain = false) {
    this.bricksBroken += 1;
    this.flickCharges = Math.min(3, this.flickCharges + (chain ? 0.12 : 0.24));
    this.particles.add(brick.x, brick.y, this.save.data.settings.reducedEffects ? 10 : 22, brick.stats.color, 430, 5);
    this.audio.play(brick.type === 'bomb' ? 'bomb' : 'break', 1);
    if (brick.type === 'bomb') this.explodeBomb(brick);
  }

  explodeBomb(brick) {
    this.particles.shockwave(brick.x, brick.y, '#ff6868', 2.1);
    if (this.save.data.settings.shake) this.shake += 18;
    vibrate(this.save, [35, 20, 35]);
    for (const other of this.bricks) {
      if (!other.alive || other === brick || other.type === 'bumper') continue;
      const dist = Math.hypot(other.x - brick.x, other.y - brick.y);
      if (dist < 150) {
        const destroyed = other.damage(95 * (1 - dist / 170));
        this.particles.add(other.x, other.y, 6, other.stats.color, 260, 4);
        if (destroyed) this.breakBrick(other, true);
      }
    }
  }

  completeLevel() {
    this.state = 'complete';
    const level = this.currentLevel;
    let stars = 1;
    if (this.elapsed <= level.stars.time[0] || this.maxCombo >= level.stars.combo[0] || this.flicks <= level.stars.efficiency[0]) stars += 1;
    if (this.elapsed <= level.stars.time[1] || this.maxCombo >= level.stars.combo[1] || this.flicks <= level.stars.efficiency[1]) stars += 1;
    const result = { stars: clamp(stars, 1, 3), time: this.elapsed, maxCombo: this.maxCombo, flicks: this.flicks, bricksBroken: this.bricksBroken };
    this.save.completeLevel(this.levelIndex, result);
    this.audio.play('complete');
    vibrate(this.save, [45, 35, 45]);
    this.ui.showComplete(result);
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.canvas.width / this.W, 0, 0, this.canvas.height / this.H, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    const sx = this.save.data.settings.shake ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.save.data.settings.shake ? (Math.random() - 0.5) * this.shake : 0;
    ctx.save();
    ctx.translate(sx, sy);
    this.drawBackground(ctx);
    this.drawBricks(ctx);
    this.drawBall(ctx);
    this.drawDrag(ctx);
    this.particles.draw(ctx);
    if (this.debug) this.drawDebug(ctx);
    ctx.restore();
  }

  drawBackground(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, '#08112b');
    g.addColorStop(0.55, '#111747');
    g.addColorStop(1, '#070b1a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.strokeStyle = 'rgba(100,180,255,.08)';
    ctx.lineWidth = 1;
    for (let x = this.arena.x; x <= this.arena.x + this.arena.w; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, this.arena.y); ctx.lineTo(x, this.arena.y + this.arena.h); ctx.stroke();
    }
    for (let y = this.arena.y; y <= this.arena.y + this.arena.h; y += 48) {
      ctx.beginPath(); ctx.moveTo(this.arena.x, y); ctx.lineTo(this.arena.x + this.arena.w, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = 4;
    ctx.strokeRect(this.arena.x, this.arena.y, this.arena.w, this.arena.h);
  }

  drawBricks(ctx) {
    for (const b of this.bricks) {
      if (!b.alive) continue;
      b.flash *= 0.86;
      b.shake *= 0.82;
      const offset = Math.sin(b.hitAngle) * b.shake * 4;
      const x = b.x - b.size / 2 + offset;
      const y = b.y - b.size / 2 + Math.cos(b.hitAngle) * b.shake * 4;
      ctx.save();
      ctx.fillStyle = b.stats.color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y, b.size, b.size);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = b.flash > 0.1 ? '#ffffff' : 'rgba(0,0,0,.45)';
      ctx.lineWidth = b.flash > 0.1 ? 5 : 2;
      ctx.strokeRect(x + 1, y + 1, b.size - 2, b.size - 2);
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.fillRect(x, y + b.size * b.healthRatio, b.size, b.size * (1 - b.healthRatio));
      if (b.healthRatio < 0.72 && b.type !== 'bumper') {
        ctx.strokeStyle = 'rgba(5,10,20,.55)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + b.size * .22, y + b.size * .25);
        ctx.lineTo(x + b.size * .52, y + b.size * .55);
        ctx.lineTo(x + b.size * .36, y + b.size * .86);
        ctx.stroke();
      }
      if (b.stats.symbol) {
        ctx.fillStyle = 'rgba(5,8,18,.65)';
        ctx.font = 'bold 22px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.stats.symbol, b.x, b.y + 1);
      }
      ctx.restore();
    }
  }

  drawBall(ctx) {
    const b = this.ball;
    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i];
      if (t.speed < 240) continue;
      ctx.globalAlpha = (i / b.trail.length) * 0.35 * t.life;
      ctx.fillStyle = t.speed > 1100 ? '#ffe477' : '#66e8ff';
      ctx.beginPath();
      ctx.arc(t.x, t.y, b.radius * (0.4 + i / b.trail.length), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const speed = b.speed;
    const dir = normalize(b.vx, b.vy);
    const stretch = clamp(speed / 1800, 0, 0.55);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(dir.y, dir.x));
    ctx.shadowBlur = 18 + clamp(speed / 35, 0, 54);
    ctx.shadowColor = speed > 1200 ? '#ffe477' : '#5deaff';
    const grad = ctx.createRadialGradient(-5, -6, 2, 0, 0, b.radius * 1.7);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, '#88f3ff');
    grad.addColorStop(1, '#235cff');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, b.radius * (1 + stretch), b.radius * (1 - stretch * .35), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawDrag(ctx) {
    const drag = this.input.drag;
    if (!drag) return;
    if (!drag.dir || drag.force <= 0) return;
    const len = clamp(drag.force * 0.22, 35, 245);
    const b = this.ball;
    const color = drag.label === 'perfect' ? '#ffd84e' : drag.label === 'boost' ? '#55e8ff' : '#ffffff';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x + drag.dir.x * len, b.y + drag.dir.y * len);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(b.x + drag.dir.x * len, b.y + drag.dir.y * len, 13, 0, Math.PI * 2);
    ctx.fill();
  }

  drawDebug(ctx) {
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    for (const b of this.bricks) if (b.alive) ctx.strokeRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
  }
}
