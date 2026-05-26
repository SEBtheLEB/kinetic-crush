import { LEVELS } from '../data/levels.js';
import { Brick } from './Brick.js';

function rand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class LevelManager {
  constructor() {
    this.levels = LEVELS;
  }

  build(index, arena) {
    const level = this.levels[index];
    const r = rand(level.seed);
    const tier = level.tier ?? Math.floor(index / 15);
    const tierLevel = level.tierLevel ?? index % 15;
    const density = Math.min(0.28, tier * 0.035 + tierLevel * 0.006);
    const { cols, rows, size, gap } = level.grid;
    const pitch = size + gap;
    const startX = arena.x + (arena.w - (cols - 1) * pitch) / 2;
    const startY = arena.y + (arena.h - (rows - 1) * pitch) / 2;
    const bricks = [];
    const centerC = (cols - 1) / 2;
    const centerR = (rows - 1) / 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const dx = Math.abs(col - centerC);
        const dy = Math.abs(row - centerR);
        const ring = Math.max(dx, dy);
        const nearCenter = dx < 1.55 + tier * 0.04 && dy < 2.05 + tier * 0.03;
        const outer = col < 1 || col > cols - 2 || row < 1 || row > rows - 2;
        const ringLine = Math.abs(ring - (2.8 + (index % 3) * 0.45 + tier * 0.25)) < 0.42 || Math.abs(ring - (4.25 + (index % 2) * 0.45 + tier * 0.35)) < 0.42;
        const broken = (row + col + index) % (4 + (index % 2)) === 0 && !outer;
        const dense = index >= 6 && ring > 2.6 && (row + col + tier) % 3 !== 0 && r() < 0.42 + density;
        const filler = r() < density && ring > 2.4;
        const shouldPlace = !nearCenter && (outer || (ringLine && !broken) || dense || filler || (index >= 8 && r() > 0.68 && ring > 3.1));
        if (!shouldPlace) continue;

        let type = 'basic';
        const roll = r();
        if ((index + 1) % 10 === 0 && dx < 1 && dy < 1) type = 'core';
        else if (index >= 3 && roll < Math.min(0.18, 0.055 + tier * 0.012)) type = 'bomb';
        else if (index >= 5 && roll < Math.min(0.32, 0.13 + tier * 0.026)) type = 'metal';
        else if (roll < Math.min(0.32, 0.22 + tier * 0.012)) type = 'stone';
        else if (index >= 4 && roll > Math.max(0.88, 0.95 - tier * 0.01)) type = 'bumper';

        bricks.push(new Brick(startX + col * pitch, startY + row * pitch, size, type, null, 1 + tier * 0.18 + tierLevel * 0.018));
      }
    }

    return { level, bricks, ballStart: level.ballStart };
  }
}
