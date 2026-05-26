export const LEVELS = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: [
    'First Crush', 'Harder Lines', 'Momentum School', 'Bomb Lessons', 'Bumper Room',
    'Metal Works', 'Dense Orbit', 'Inner Rings', 'Chain Reactor', 'Core Collapse'
  ][i],
  lesson: [
    'Grab the ball, drag, then release.',
    'Fast impacts deal more damage.',
    'Push with movement for boosts.',
    'Bomb bricks damage neighbors.',
    'Bumpers launch heavy combos.',
    'Metal needs serious speed.',
    'Build speed through dense layers.',
    'Read the gaps and rebound.',
    'Set off bomb chains.',
    'Break the core brick.'
  ][i],
  grid: { cols: 8, rows: 12, size: 116, gap: 12 },
  ballStart: { x: 540, y: 960 },
  stars: { time: [95 - i * 4, 70 - i * 3], combo: [6 + i, 12 + i * 2], efficiency: [34 + i * 2, 24 + i] },
  seed: 1249 + i * 97
}));
