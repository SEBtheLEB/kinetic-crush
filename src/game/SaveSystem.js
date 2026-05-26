const KEY = 'kineticCrushSaveV1';

const defaults = {
  saveVersion: 1,
  unlockedLevels: 1,
  stars: {},
  bestTimes: {},
  bestCombos: {},
  settings: { music: 0.35, sfx: 0.75, shake: true, vibration: true, reducedEffects: false },
  totalBricksBroken: 0,
  totalPerfectPushes: 0
};

export class SaveSystem {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      return raw?.saveVersion === 1 ? { ...structuredClone(defaults), ...raw, settings: { ...defaults.settings, ...raw.settings } } : structuredClone(defaults);
    } catch {
      return structuredClone(defaults);
    }
  }

  save() {
    localStorage.setItem(KEY, JSON.stringify(this.data));
  }

  reset() {
    this.data = structuredClone(defaults);
    this.save();
  }

  completeLevel(levelIndex, result) {
    const levelNo = levelIndex + 1;
    this.data.unlockedLevels = Math.max(this.data.unlockedLevels, Math.min(100, levelNo + 1));
    this.data.stars[levelNo] = Math.max(this.data.stars[levelNo] ?? 0, result.stars);
    this.data.bestTimes[levelNo] = Math.min(this.data.bestTimes[levelNo] ?? Infinity, result.time);
    this.data.bestCombos[levelNo] = Math.max(this.data.bestCombos[levelNo] ?? 0, result.maxCombo);
    this.data.totalBricksBroken += result.bricksBroken;
    this.save();
  }
}
