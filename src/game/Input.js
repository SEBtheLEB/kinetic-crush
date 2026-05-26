import { clamp, dot, length, normalize } from './MathUtil.js';

export class Input {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.drag = null;
    this.pointerId = null;
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('keydown', (e) => this.key(e));
  }

  toWorld(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * this.game.W,
      y: ((e.clientY - rect.top) / rect.height) * this.game.H
    };
  }

  down(e) {
    if (this.game.state !== 'playing' || this.game.flickCharges < 1) return;
    e.preventDefault();
    const p = this.toWorld(e);
    const b = this.game.ball;
    if (length(p.x - b.x, p.y - b.y) > 260) return;
    this.pointerId = e.pointerId;
    this.canvas.setPointerCapture?.(e.pointerId);
    const now = performance.now();
    this.drag = {
      start: p,
      current: p,
      previous: p,
      startTime: now,
      lastTime: now,
      alignment: 0,
      force: 0,
      label: '',
      dir: { x: 0, y: 0 },
      pointerVelocity: { x: 0, y: 0 },
      dist: 0,
      grabbing: true
    };
    this.game.onGrabStart();
  }

  move(e) {
    if (!this.drag || e.pointerId !== this.pointerId) return;
    e.preventDefault();
    const now = performance.now();
    const next = this.toWorld(e);
    const dt = Math.max(16, now - this.drag.lastTime) / 1000;
    this.drag.pointerVelocity = {
      x: (next.x - this.drag.current.x) / dt,
      y: (next.y - this.drag.current.y) / dt
    };
    this.drag.previous = this.drag.current;
    this.drag.lastTime = now;
    this.drag.current = next;
    this.updateDrag();
  }

  up(e) {
    if (!this.drag || e.pointerId !== this.pointerId) return;
    e.preventDefault();
    this.updateDrag();
    const d = this.drag;
    this.drag = null;
    this.pointerId = null;
    if (d.force < 130) return;
    this.game.applyFling(d);
  }

  updateDrag() {
    const d = this.drag;
    const handSpeed = length(d.pointerVelocity.x, d.pointerVelocity.y);
    const travelX = d.current.x - d.start.x;
    const travelY = d.current.y - d.start.y;
    const releaseX = Math.abs(d.pointerVelocity.x) + Math.abs(d.pointerVelocity.y) > 40 ? d.pointerVelocity.x : travelX;
    const releaseY = Math.abs(d.pointerVelocity.x) + Math.abs(d.pointerVelocity.y) > 40 ? d.pointerVelocity.y : travelY;
    const dist = length(travelX, travelY);
    const elapsed = Math.max(40, performance.now() - d.startTime);
    const dir = normalize(releaseX, releaseY);
    const ballDir = normalize(this.game.ball.vx, this.game.ball.vy);
    const ballSpeed = this.game.ball.speed;
    const alignment = ballSpeed > this.game.ball.minUsefulSpeed ? dot(ballDir.x, ballDir.y, dir.x, dir.y) : 0;
    const swipeSpeed = dist / elapsed;
    let force = clamp(dist * 3.4 + swipeSpeed * 780 + handSpeed * 0.34, 0, 1280);
    if (alignment > 0) force *= 1 + alignment * 0.75;
    if (alignment > 0.85) force *= 1.18;
    d.force = force;
    d.alignment = alignment;
    d.dir = dir;
    d.dist = dist;
    d.label = alignment > 0.85 ? 'perfect' : alignment > 0.45 ? 'boost' : '';
  }

  key(e) {
    if (e.key.toLowerCase() === 'r') this.game.restartLevel();
    if (e.key.toLowerCase() === 'n') this.game.nextLevel();
    if (e.key.toLowerCase() === 'p') this.game.togglePause();
    if (e.key.toLowerCase() === 'd') this.game.toggleDebug();
    if (e.key === '1') this.game.debugSpawnPowerUp('multiball');
    if (e.key === '2') this.game.debugSpawnPowerUp('giant');
    if (e.key === '3') this.game.debugSpawnPowerUp('charge');
    if (e.key === '4') this.game.debugSpawnPowerUp('damage');
  }
}
