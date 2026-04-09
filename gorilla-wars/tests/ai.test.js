import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { calculateAIShot } from '../js/ai.js';
import { GRAVITY_SCALE, WIND_SCALE, CANVAS_WIDTH, CANVAS_HEIGHT } from '../js/constants.js';

describe('calculateAIShot', () => {
  const heightmap = new Float64Array(CANVAS_WIDTH).fill(CANVAS_HEIGHT);
  for (let x = 50; x < 110; x++) heightmap[x] = 250;
  for (let x = 530; x < 590; x++) heightmap[x] = 250;

  const aiGorilla = { x: 560, y: 250 };
  const targetGorilla = { x: 80, y: 250 };
  const gravitySim = 9.8 * GRAVITY_SCALE;

  it('returns angle and velocity in valid ranges', () => {
    const shot = calculateAIShot(targetGorilla, aiGorilla, 0, gravitySim, heightmap, 'hard', null);
    assert.ok(shot.angle >= 0 && shot.angle <= 90, `angle ${shot.angle} out of range`);
    assert.ok(shot.velocity >= 1 && shot.velocity <= 200, `velocity ${shot.velocity} out of range`);
  });

  it('produces different results for different difficulties', () => {
    const hardShots = [];
    const easyShots = [];
    for (let i = 0; i < 20; i++) {
      hardShots.push(calculateAIShot(targetGorilla, aiGorilla, 0, gravitySim, heightmap, 'hard', null));
      easyShots.push(calculateAIShot(targetGorilla, aiGorilla, 0, gravitySim, heightmap, 'easy', null));
    }
    const hardAngleVar = variance(hardShots.map(s => s.angle));
    const easyAngleVar = variance(easyShots.map(s => s.angle));
    assert.ok(easyAngleVar > hardAngleVar, 'easy should have more angle variance than hard');
  });

  it('accounts for wind', () => {
    const noWind = calculateAIShot(targetGorilla, aiGorilla, 0, gravitySim, heightmap, 'hard', null);
    const withWind = calculateAIShot(targetGorilla, aiGorilla, 10, gravitySim, heightmap, 'hard', null);
    assert.ok(noWind.angle !== withWind.angle || noWind.velocity !== withWind.velocity,
      'wind should change the AI shot');
  });
});

function variance(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}
