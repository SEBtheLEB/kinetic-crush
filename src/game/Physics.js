import { clamp, dot } from './MathUtil.js';

export function circleRectCollision(ball, brick) {
  const half = brick.size / 2;
  const left = brick.x - half;
  const right = brick.x + half;
  const top = brick.y - half;
  const bottom = brick.y + half;
  const closestX = clamp(ball.x, left, right);
  const closestY = clamp(ball.y, top, bottom);
  let dx = ball.x - closestX;
  let dy = ball.y - closestY;
  let distSq = dx * dx + dy * dy;

  if (distSq > ball.radius * ball.radius) return null;

  if (distSq < 0.0001) {
    const leftPen = Math.abs(ball.x - left);
    const rightPen = Math.abs(right - ball.x);
    const topPen = Math.abs(ball.y - top);
    const bottomPen = Math.abs(bottom - ball.y);
    const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
    if (minPen === leftPen) return { nx: -1, ny: 0, depth: ball.radius + leftPen };
    if (minPen === rightPen) return { nx: 1, ny: 0, depth: ball.radius + rightPen };
    if (minPen === topPen) return { nx: 0, ny: -1, depth: ball.radius + topPen };
    return { nx: 0, ny: 1, depth: ball.radius + bottomPen };
  }

  const dist = Math.sqrt(distSq);
  return { nx: dx / dist, ny: dy / dist, depth: ball.radius - dist };
}

export function reflect(ball, nx, ny, bounce) {
  const d = dot(ball.vx, ball.vy, nx, ny);
  if (d >= 0) return;
  ball.vx = (ball.vx - 2 * d * nx) * bounce;
  ball.vy = (ball.vy - 2 * d * ny) * bounce;
}

export function wallCollide(ball, arena) {
  if (ball.x - ball.radius < arena.x) {
    ball.x = arena.x + ball.radius;
    ball.vx = Math.abs(ball.vx) * ball.wallBounce;
  } else if (ball.x + ball.radius > arena.x + arena.w) {
    ball.x = arena.x + arena.w - ball.radius;
    ball.vx = -Math.abs(ball.vx) * ball.wallBounce;
  }
  if (ball.y - ball.radius < arena.y) {
    ball.y = arena.y + ball.radius;
    ball.vy = Math.abs(ball.vy) * ball.wallBounce;
  } else if (ball.y + ball.radius > arena.y + arena.h) {
    ball.y = arena.y + arena.h - ball.radius;
    ball.vy = -Math.abs(ball.vy) * ball.wallBounce;
  }
}
