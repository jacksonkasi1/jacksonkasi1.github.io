const KEY = 'eclipse-beast-run-save-v1';

const DEFAULTS = {
  bestScore: 0,
  bestDistance: 0,
  totalShards: 0,
  sound: true,
  haptics: true,
  selectedSkin: 'eclipse',
  unlockedSkins: ['eclipse']
};

export class SaveManager {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.data = { ...DEFAULTS };
    this.load();
  }

  load() {
    try {
      const saved = JSON.parse(this.storage?.getItem(KEY) || 'null');
      if (saved && typeof saved === 'object') this.data = { ...DEFAULTS, ...saved };
    } catch {
      this.data = { ...DEFAULTS };
    }
    return this.data;
  }

  commit() {
    try { this.storage?.setItem(KEY, JSON.stringify(this.data)); } catch { /* private mode */ }
  }

  recordRun({ score, distance, shards }) {
    const newHigh = score > this.data.bestScore;
    this.data.bestScore = Math.max(this.data.bestScore, Math.floor(score));
    this.data.bestDistance = Math.max(this.data.bestDistance, Math.floor(distance));
    this.data.totalShards += shards;
    this.commit();
    return newHigh;
  }

  setSetting(name, value) {
    this.data[name] = value;
    this.commit();
  }
}
