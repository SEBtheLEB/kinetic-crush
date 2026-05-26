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
        const nearCenter = dx < 2.25 && dy < 2.8;
        const outer = col < 2 || col > cols - 3 || row < 2 || row > rows - 3;
        const ringLine = Math.abs(ring - (3.7 + (index % 3) * 0.55)) < 0.45 || Math.abs(ring - (5.8 + (index % 2) * 0.55)) < 0.45;
        const broken = (row + col + index) % (5 + (index % 2)) === 0 && !outer;
        const dense = index >= 6 && ring > 3.2 && (row + col) % 3 !== 0;
        const shouldPlace = !nearCenter && (outer || (ringLine && !broken) || dense || (index >= 8 && r() > 0.64 && ring > 3.5));
        if (!shouldPlace) continue;

        let type = 'basic';
        const roll = r();
        if (index >= 9 && dx < 1 && dy < 1) type = 'core';
        else if (index >= 3 && roll < 0.06 + index * 0.008) type = 'bomb';
        else if (index >= 5 && roll < 0.14 + index * 0.01) type = 'metal';
        else if (roll < 0.24) type = 'stone';
        else if (index >= 4 && roll > 0.94) type = 'bumper';

        bricks.push(new Brick(startX + col * pitch, startY + row * pitch, size, type, null, 1 + index * 0.06));
      }
    }

    return { level, bricks, ballStart: level.ballStart };
  }
}
