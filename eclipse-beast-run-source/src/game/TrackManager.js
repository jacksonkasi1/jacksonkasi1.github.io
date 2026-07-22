const lane = (index) => Math.max(-1, Math.min(1, index));

const coinLine = (start, laneIndex, count = 6, spacing = 4, height = 0) =>
  Array.from({ length: count }, (_, i) => ({ type: 'shard', worldZ: start + i * spacing, lane: lane(laneIndex), height }));

const zigzag = (start, count = 12) =>
  Array.from({ length: count }, (_, i) => ({ type: 'shard', worldZ: start + i * 3.6, lane: [-1, 0, 1, 0][i % 4], height: i % 3 === 1 ? 1.4 : 0 }));

export const HANDCRAFTED_SEQUENCE = [
  ...coinLine(12, 0, 8, 3.2),
  { type: 'rock', worldZ: 42, lane: 0 },
  ...coinLine(48, -1, 7, 3.2),
  { type: 'log', worldZ: 75, lane: -1 },
  ...coinLine(80, 0, 7, 3.3, 1.5),
  { type: 'shield', worldZ: 108, lane: 0 },
  { type: 'sigil', worldZ: 134, lane: -1 },
  ...coinLine(140, -1, 5, 3.2),
  { type: 'lowBranch', worldZ: 163, lane: -1 },
  ...coinLine(170, 0, 5, 3.2),
  { type: 'gap', worldZ: 192, lane: 0, allLanes: true },
  { type: 'sigil', worldZ: 224, lane: 1 },
  ...coinLine(230, 1, 6, 3.2),
  { type: 'movingPillar', worldZ: 258, lane: 0, phase: 0 },
  ...zigzag(268, 11),
  { type: 'magnet', worldZ: 314, lane: -1 },
  ...coinLine(320, 0, 8, 2.8),
  { type: 'sigil', worldZ: 346, lane: 0 },
  { type: 'gate', worldZ: 382, lane: 0, destructible: true },
  ...coinLine(390, 0, 10, 2.7),
  { type: 'crate', worldZ: 424, lane: -1, destructible: true },
  { type: 'crate', worldZ: 432, lane: 1, destructible: true },
  { type: 'multiplier', worldZ: 448, lane: 0 },
  { type: 'rotatingTrap', worldZ: 480, lane: 0 },
  ...coinLine(490, 1, 8, 3.1),
  { type: 'ruinWall', worldZ: 526, lane: 1, destructible: true },
  ...zigzag(536, 15),
  { type: 'lowBranch', worldZ: 598, lane: 0 },
  { type: 'rock', worldZ: 606, lane: -1 },
  { type: 'rock', worldZ: 606, lane: 1 },
  ...coinLine(616, 0, 10, 3)
];

export const TRACK_CHUNKS = [
  { id: 'straight-jungle', length: 56, difficulty: 1, build: (z) => [...coinLine(z + 8, 0, 11, 4)] },
  { id: 'broken-bridge', length: 62, difficulty: 2, build: (z) => [{ type: 'gap', worldZ: z + 27, lane: 0, allLanes: true }, ...coinLine(z + 20, 0, 7, 3, 1.7)] },
  { id: 'fallen-tree', length: 58, difficulty: 1, build: (z) => [{ type: 'log', worldZ: z + 25, lane: -1 }, ...coinLine(z + 7, 0, 11, 4)] },
  { id: 'rock-blocker', length: 58, difficulty: 2, build: (z) => [{ type: 'rock', worldZ: z + 25, lane: 0 }, ...coinLine(z + 10, 1, 10, 3.8)] },
  { id: 'low-branch', length: 56, difficulty: 2, build: (z) => [{ type: 'lowBranch', worldZ: z + 27, lane: 0 }, ...coinLine(z + 8, 0, 10, 4)] },
  { id: 'moving-stone', length: 66, difficulty: 3, build: (z) => [{ type: 'movingPillar', worldZ: z + 30, lane: 0, phase: Math.random() * 6 }, ...zigzag(z + 9, 12)] },
  { id: 'ancient-gate', length: 60, difficulty: 2, build: (z) => [{ type: 'gate', worldZ: z + 30, lane: Math.random() > 0.5 ? -1 : 1, destructible: true }, ...coinLine(z + 8, 0, 11, 4)] },
  { id: 'narrow-ruin-bridge', length: 60, difficulty: 3, build: (z) => [{ type: 'rock', worldZ: z + 25, lane: -1 }, { type: 'rock', worldZ: z + 25, lane: 1 }, ...coinLine(z + 8, 0, 11, 4)] },
  { id: 'waterfall-crossing', length: 64, difficulty: 2, environment: 'waterfall', build: (z) => [{ type: 'log', worldZ: z + 29, lane: 0 }, ...coinLine(z + 10, 0, 10, 4, 1.3)] },
  { id: 'glowing-cave', length: 68, difficulty: 3, environment: 'cave', build: (z) => [{ type: 'lowBranch', worldZ: z + 28, lane: -1 }, { type: 'rock', worldZ: z + 43, lane: 1 }, ...zigzag(z + 8, 14)] },
  { id: 'split-path', length: 62, difficulty: 2, build: (z) => [...coinLine(z + 8, -1, 12, 4), ...coinLine(z + 8, 1, 12, 4)] },
  { id: 'lion-destruction', length: 72, difficulty: 3, build: (z) => [{ type: 'crate', worldZ: z + 24, lane: -1, destructible: true }, { type: 'gate', worldZ: z + 39, lane: 0, destructible: true }, { type: 'ruinWall', worldZ: z + 54, lane: 1, destructible: true }, ...coinLine(z + 7, 0, 15, 4)] }
];

export class TrackManager {
  constructor() {
    this.entities = [];
    this.nextChunkZ = 650;
    this.chunkIndex = 0;
  }

  reset() {
    this.entities = HANDCRAFTED_SEQUENCE.map((item, index) => ({ ...item, id: `intro-${index}`, active: true, hit: false }));
    this.nextChunkZ = 660;
    this.chunkIndex = 0;
  }

  update(distance, elapsed) {
    while (this.nextChunkZ < distance + 720) this.spawnChunk(elapsed);
    for (const entity of this.entities) {
      if (entity.type === 'movingPillar') entity.dynamicLane = Math.sin(elapsed * 1.8 + (entity.phase || 0));
    }
    if (this.entities.length > 480) this.entities = this.entities.filter((e) => e.active && e.worldZ > distance - 25);
  }

  spawnChunk(elapsed) {
    const maxDifficulty = elapsed < 30 ? 2 : elapsed < 60 ? 3 : 4;
    const eligible = TRACK_CHUNKS.filter((chunk) => chunk.difficulty <= maxDifficulty);
    const chunk = eligible[(this.chunkIndex * 5 + Math.floor(Math.random() * eligible.length)) % eligible.length];
    const start = this.nextChunkZ;
    const entities = chunk.build(start).map((item, index) => ({ ...item, id: `${chunk.id}-${start}-${index}`, active: true, hit: false }));
    this.entities.push(...entities);
    this.nextChunkZ += chunk.length;
    this.chunkIndex += 1;
  }

  nearby(distance, range = 130) {
    return this.entities.filter((entity) => entity.active && entity.worldZ > distance - 8 && entity.worldZ < distance + range);
  }

  collisionCandidates(distance, range = 2.2) {
    return this.entities.filter((entity) => entity.active && !entity.hit && Math.abs(entity.worldZ - distance) < range);
  }
}
