const LESSONS = [
  'Grab any ball, drag, then release.',
  'Fast impacts deal more damage.',
  'Push with movement for boosts.',
  'Bomb bricks damage neighbors.',
  'Bumpers launch heavy combos.',
  'Metal needs serious speed.',
  'Build speed through dense layers.',
  'Read the gaps and rebound.',
  'Set off bomb chains.',
  'Break the core brick.'
];

const ZONES = [
  'First Crush', 'Harder Lines', 'Momentum School', 'Bomb Lessons', 'Bumper Room',
  'Metal Works', 'Dense Orbit', 'Inner Rings', 'Chain Reactor', 'Core Collapse'
];

const TIERS = [
  { cols: 9, rows: 14, size: 96, gap: 11, ballRadius: 36 },
  { cols: 10, rows: 15, size: 89, gap: 10, ballRadius: 34 },
  { cols: 11, rows: 16, size: 80, gap: 9, ballRadius: 32 },
  { cols: 12, rows: 18, size: 72, gap: 8, ballRadius: 30 },
  { cols: 13, rows: 19, size: 66, gap: 8, ballRadius: 28 },
  { cols: 14, rows: 21, size: 60, gap: 7, ballRadius: 26 },
  { cols: 15, rows: 22, size: 56, gap: 7, ballRadius: 24 }
];

export const LEVELS = Array.from({ length: 100 }, (_, i) => {
  const tier = Math.min(TIERS.length - 1, Math.floor(i / 15));
  const levelNo = i + 1;
  const tierLevel = i % 15;
  const grid = TIERS[tier];
  const zone = ZONES[i % ZONES.length];

  return {
    id: levelNo,
    name: levelNo <= 10 ? zone : `${zone} ${tier + 1}-${tierLevel + 1}`,
    lesson: LESSONS[Math.min(LESSONS.length - 1, i)],
    tier,
    tierLevel,
    grid,
    ballStart: { x: 540, y: 960 },
    stars: {
      time: [Math.max(45, 95 - tier * 5 - tierLevel), Math.max(32, 70 - tier * 4 - Math.floor(tierLevel * 0.8))],
      combo: [6 + tier * 2 + Math.floor(tierLevel / 4), 12 + tier * 3 + Math.floor(tierLevel / 3)],
      efficiency: [34 + tier * 4 + tierLevel, 24 + tier * 3 + Math.floor(tierLevel * 0.7)]
    },
    seed: 1249 + i * 97
  };
});
