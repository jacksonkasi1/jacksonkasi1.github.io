import assert from 'node:assert/strict';
import { HANDCRAFTED_SEQUENCE, TRACK_CHUNKS } from '../src/game/TrackManager.js';
import { RunnerController } from '../src/game/RunnerController.js';

assert.equal(TRACK_CHUNKS.length, 12, 'exactly twelve reusable chunk archetypes are required');
assert.equal(new Set(TRACK_CHUNKS.map((chunk) => chunk.id)).size, 12, 'chunk ids must be unique');
assert.equal(HANDCRAFTED_SEQUENCE.filter((item) => item.type === 'sigil').length, 3, 'first playable sequence needs three lion sigils');
assert.ok(HANDCRAFTED_SEQUENCE.some((item) => item.type === 'shield'), 'first playable sequence needs a shield');
assert.ok(HANDCRAFTED_SEQUENCE.some((item) => item.type === 'gate' && item.destructible), 'first playable sequence needs a destructible gate');
assert.ok(TRACK_CHUNKS.every((chunk) => chunk.length >= 50 && typeof chunk.build === 'function'), 'all chunks need safe length and a builder');

const runner = new RunnerController();
runner.handle('up', false);
let jumped = false;
for (let i = 0; i < 120; i += 1) {
  const event = runner.update(1 / 60, false);
  jumped ||= Boolean(event.jumped);
}
assert.ok(jumped, 'buffered jump must trigger');
assert.equal(runner.grounded, true, 'runner should land deterministically');
runner.handle('left', false);
for (let i = 0; i < 40; i += 1) runner.update(1 / 60, false);
assert.ok(Math.abs(runner.lane + 1) < 0.02, 'lane switching must settle cleanly');

console.log('Eclipse Beast Run validation passed.');
