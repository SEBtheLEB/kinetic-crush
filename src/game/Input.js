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
    const p = this.toWorld(e);
    const b = this.game.ball;
    if (length(p.x - b.x, p.y - b.y) > 118) return;
    this.pointerId = e.pointerId;
    this.canvas.setPointerCapture?.(e.pointerId);
    this.drag = { start: p, current: p, startTime: performance.now(), alignment: 0, force: 0, label: '', dir: { x: 0, y: 0 } };
  }

  move(e) {
    if (!this.drag || e.pointerId !== this.pointerId) return;
    this.drag.current = this.toWorld(e);
    this.updateDrag();
  }

  up(e) {
    if (!this.drag || e.pointerId !== this.pointerId) return;
    this.updateDrag();
    const d = this.drag;
    this.drag = null;
    this.pointerId = null;
    if (d.force < 130) return;
    this.game.applyFlick(d);
  }

  updateDrag() {
    const d = this.drag;
    const vx = d.current.x - d.start.x;
    const vy = d.current.y - d.start.y;
    const dist = length(vx, vy);
    const elapsed = Math.max(40, performance.now() - d.startTime);
    const dir = normalize(vx, vy);
    const ballDir = normalize(this.game.ball.vx, this.game.ball.vy);
    const ballSpeed = this.game.ball.speed;
    const alignment = ballSpeed > this.game.ball.minUsefulSpeed ? dot(ballDir.x, ballDir.y, dir.x, dir.y) : 0;
    const swipeSpeed = dist / elapsed;
    let force = clamp(dist * 5.6 + swipeSpeed * 1050, 0, 1120);
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
  }
}
