export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const length = (x, y) => Math.hypot(x, y);
export const normalize = (x, y) => {
  const mag = Math.hypot(x, y);
  return mag > 0.0001 ? { x: x / mag, y: y / mag } : { x: 0, y: 0 };
};
export const dot = (ax, ay, bx, by) => ax * bx + ay * by;
