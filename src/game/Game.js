import { Ball } from './Ball.js';
import { Input } from './Input.js';
import { LevelManager } from './LevelManager.js';
import { Particles } from './Particles.js';
import { SaveSystem } from './SaveSystem.js';
import { UI } from './UI.js';
import { AudioSystem } from './AudioSystem.js';
import { PowerUp, POWERUP_TYPES } from './PowerUp.js';
import { vibrate } from './Haptics.js';
import { circleRectCollision, reflect, wallCollide } from './Physics.js';
import { clamp, dot, normalize } from './MathUtil.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = 1080;
    this.H = 1920;
    this.arena = { x: 50, y: 160, w: 980, h: 1560 };
    this.save = new SaveSystem();
    this.audio = new AudioSystem(this.save);
    this.levelManager = new LevelManager();
    this.ball = new Ball(540, 960);
    this.balls = [this.ball];
    this.powerUps = [];
    this.damageBoostTimer = 0;
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
    this.ball.setBaseRadius(built.level.grid.ballRadius);
    this.ball.reset(built.ballStart.x, built.ballStart.y);
    this.balls = [this.ball];
    this.powerUps = [];
    this.damageBoostTimer = 0;
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

  debugSpawnPowerUp(type) {
    if (this.state !== 'playing') return;
    this.powerUps.push(new PowerUp(this.ball.x + 34, this.ball.y - 34, type, this.currentLevel.grid.size));
  }

  findGrabbableBall(x, y) {
    let best = null;
    let bestDist = Infinity;
    for (const ball of this.balls) {
      const dist = Math.hypot(ball.x - x, ball.y - y);
      if (dist < bestDist && dist <= Math.max(210, ball.radius + 135)) {
        best = ball;
        bestDist = dist;
      }
    }
    return best;
  }

  applyFlick(drag) {
    this.applyFling(drag);
  }

  onGrabStart() {
    this.audio.ensure();
    this.audio.play('flick', 0.35);
  }

  applyGrabControl(dt) {
    const drag = this.input.drag;
    if (!drag?.grabbing) return;
    const b = drag.ball ?? this.ball;
    const dx = drag.current.x - b.x;
    const dy = drag.current.y - b.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return;
    const dir = normalize(dx, dy);
    const pull = clamp(dist * 13, 0, 1050);
    const dragDamp = clamp((b.vx * dir.x + b.vy * dir.y) * -0.16, -260, 260);
    b.addImpulse(dir.x * (pull + dragDamp) * dt, dir.y * (pull + dragDamp) * dt);
  }

  applyFling(drag) {
    if (this.flickCharges < 1) return;
    const ball = drag.ball ?? this.ball;
    this.audio.ensure();
    this.flickCharges -= 1;
    this.flicks += 1;
    ball.addImpulse(drag.dir.x * drag.force, drag.dir.y * drag.force);
    this.audio.play(drag.label === 'perfect' ? 'perfect' : drag.label === 'boost' ? 'boost' : 'flick', drag.force / 900);
    if (drag.label === 'perfect') {
      this.ui.toast('PERFECT PUSH', 'perfect');
      this.particles.shockwave(ball.x, ball.y, '#ffd84e', 1.25);
      this.shake += 9;
      this.save.data.totalPerfectPushes += 1;
      this.save.save();
      vibrate(this.save, 28);
    } else if (drag.label === 'boost') {
      this.ui.toast('MOMENTUM BOOST');
      this.particles.shockwave(ball.x, ball.y, '#54e5ff', 0.8);
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
    this.damageBoostTimer = Math.max(0, this.damageBoostTimer - dt);
    this.updatePowerUps(dt);
    const maxBallSpeed = Math.max(...this.balls.map((ball) => ball.speed), this.ball.speed);
    const steps = Math.max(1, Math.ceil(maxBallSpeed / 480));
    for (let i = 0; i < steps; i++) {
      const stepDt = dt / steps;
      this.applyGrabControl(stepDt);
      for (const ball of this.balls) this.physicsStep(ball, stepDt);
    }
    for (const ball of this.balls) ball.pushTrail();
    this.balls = this.balls.filter((ball) => ball.isPrimary || ball.life > 0);
    this.particles.update(dt, this.save.data.settings.reducedEffects);
    if (this.bricks.filter((b) => b.alive && b.required).length === 0) this.completeLevel();
  }

  physicsStep(ball, dt) {
    ball.integrate(dt);
    wallCollide(ball, this.arena);
    for (const brick of this.bricks) {
      if (!brick.alive) continue;
      const hit = circleRectCollision(ball, brick);
      if (!hit) continue;
      const impactSpeed = Math.abs(dot(ball.vx, ball.vy, hit.nx, hit.ny));
      if (ball.pierceTimer > 0 && brick.type !== 'bumper') {
        this.handleBrickHit(brick, Math.max(impactSpeed, 980), ball);
        ball.addImpulse(hit.nx * -18, hit.ny * -18);
        continue;
      }
      ball.x += hit.nx * (hit.depth + 0.5);
      ball.y += hit.ny * (hit.depth + 0.5);
      reflect(ball, hit.nx, hit.ny, brick.stats.bounce);
      if (brick.type === 'bumper') ball.addImpulse(hit.nx * 210, hit.ny * 210);
      this.handleBrickHit(brick, impactSpeed, ball);
      break;
    }
  }

  handleBrickHit(brick, impactSpeed, ball = this.ball) {
    this.combo += 1;
    this.comboTimer = 2.2;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const speedFactor = impactSpeed / 700;
    let damage = Math.pow(Math.max(0.15, speedFactor), 1.35) * 18;
    damage *= 1 + Math.min(0.75, this.combo * 0.025);
    if (this.damageBoostTimer > 0) damage *= 1.8;
    if (ball.pierceTimer > 0) damage *= 1.55;
    damage = clamp(damage, 2, 160);
    const broke = brick.damage(damage);
    const hard = impactSpeed > 850;
    this.flickCharges = Math.min(3, this.flickCharges + (hard ? 0.12 : 0.04) + Math.min(0.12, this.combo * 0.005));
    this.particles.add(brick.x, brick.y, hard ? 9 : 4, brick.stats.color, hard ? 360 : 170, hard ? 4 : 3);
    if (hard) {
      this.particles.shockwave(brick.x, brick.y, '#eaf8ff', Math.min(1.4, impactSpeed / 1000));
      if (this.save.data.settings.shake) this.shake += ball.pierceTimer > 0 ? Math.min(2.4, impactSpeed / 650) : Math.min(12, impactSpeed / 130);
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
    if (!chain) this.maybeDropPowerUp(brick);
    if (brick.type === 'bomb') this.explodeBomb(brick);
  }

  maybeDropPowerUp(brick) {
    if (brick.type === 'bumper' || brick.type === 'core') return;
    const chance = brick.type === 'metal' || brick.type === 'bomb' ? 0.22 : 0.12;
    if (Math.random() > chance) return;
    const pool = ['multiball', 'giant', 'charge', 'damage'];
    const type = pool[Math.floor(Math.random() * pool.length)];
    this.powerUps.push(new PowerUp(brick.x, brick.y, type, brick.size));
  }

  updatePowerUps(dt) {
    for (const powerUp of this.powerUps) {
      powerUp.update(dt);
      for (const ball of this.balls) {
        if (Math.hypot(ball.x - powerUp.x, ball.y - powerUp.y) <= ball.radius + powerUp.radius) {
          this.activatePowerUp(powerUp.type, ball);
          powerUp.life = 0;
          break;
        }
      }
    }
    this.powerUps = this.powerUps.filter((powerUp) => powerUp.life > 0);
  }

  activatePowerUp(type, sourceBall) {
    const stats = POWERUP_TYPES[type];
    this.ui.toast(stats.label, type === 'giant' ? 'perfect' : '');
    this.particles.shockwave(sourceBall.x, sourceBall.y, stats.color, type === 'giant' ? 1.15 : 1);
    this.audio.play(type === 'giant' ? 'perfect' : 'boost', 0.9);
    vibrate(this.save, type === 'giant' ? 30 : 14);

    if (type === 'multiball') {
      const count = Math.min(2, 6 - this.balls.length);
      for (let i = 0; i < count; i++) {
        const angle = Math.atan2(sourceBall.vy, sourceBall.vx) + (i === 0 ? -0.75 : 0.75);
        this.balls.push(sourceBall.clone(angle, 780));
      }
    } else if (type === 'giant') {
      for (const ball of this.balls) ball.pierceTimer = Math.max(ball.pierceTimer, 5.5);
    } else if (type === 'charge') {
      this.flickCharges = Math.min(3, this.flickCharges + 1.35);
    } else if (type === 'damage') {
      this.damageBoostTimer = Math.max(this.damageBoostTimer, 7);
    }
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
    this.drawPowerUps(ctx);
    for (const ball of this.balls) this.drawBall(ctx, ball);
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

  drawBall(ctx, ball = this.ball) {
    const b = ball;
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
    ctx.shadowColor = b.pierceTimer > 0 ? '#ffd84e' : speed > 1200 ? '#ffe477' : '#5deaff';
    const grad = ctx.createRadialGradient(-5, -6, 2, 0, 0, b.radius * 1.7);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, b.pierceTimer > 0 ? '#ffe477' : '#88f3ff');
    grad.addColorStop(1, b.pierceTimer > 0 ? '#ff7a3d' : '#235cff');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, b.radius * (1 + stretch), b.radius * (1 - stretch * .35), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawPowerUps(ctx) {
    for (const p of this.powerUps) {
      const stats = p.stats;
      const pulse = 1 + Math.sin(p.pulse) * 0.12;
      const r = p.radius * pulse;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.shadowBlur = 22;
      ctx.shadowColor = stats.color;
      ctx.fillStyle = stats.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(-r, -r, r * 2, r * 2, 8);
      ctx.fill();
      ctx.stroke();
      ctx.rotate(-p.spin);
      ctx.fillStyle = '#071025';
      ctx.font = 'bold 20px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stats.symbol, 0, 1);
      ctx.restore();
    }
  }

  drawDrag(ctx) {
    const drag = this.input.drag;
    if (!drag) return;
    const b = drag.ball ?? this.ball;
    const color = drag.label === 'perfect' ? '#ffd84e' : drag.label === 'boost' ? '#55e8ff' : '#ffffff';
    const tension = clamp(Math.hypot(drag.current.x - b.x, drag.current.y - b.y) / 220, 0.18, 1);
    ctx.save();
    ctx.globalAlpha = 0.2 + tension * 0.35;
    ctx.strokeStyle = color;
    ctx.lineWidth = 5 + tension * 8;
    ctx.lineCap = 'round';
    ctx.setLineDash([18, 16]);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(drag.current.x, drag.current.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(drag.current.x, drag.current.y, 18 + tension * 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (!drag.dir || drag.force <= 0) return;
    const len = clamp(drag.force * 0.18, 28, 230);
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
