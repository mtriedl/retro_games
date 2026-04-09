// gorilla-wars/tests/constants.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import * as C from '../js/constants.js';

describe('constants', () => {
  it('exports canvas dimensions', () => {
    assert.equal(C.CANVAS_WIDTH, 640);
    assert.equal(C.CANVAS_HEIGHT, 400);
  });

  it('exports physics tuning constants as positive numbers', () => {
    assert.ok(C.DT > 0);
    assert.ok(C.VELOCITY_SCALE > 0);
    assert.ok(C.GRAVITY_SCALE > 0);
    assert.ok(C.WIND_SCALE > 0);
  });

  it('exports building parameters within spec ranges', () => {
    assert.ok(C.BUILDING_MIN_WIDTH >= 52);
    assert.ok(C.BUILDING_MAX_WIDTH <= 62);
    assert.ok(C.BUILDING_MIN_HEIGHT >= 120);
    assert.ok(C.BUILDING_MAX_HEIGHT <= 230);
  });

  it('exports gorilla collision dimensions', () => {
    assert.equal(C.GORILLA_FRAME_SIZE, 32);
    assert.equal(C.GORILLA_COLLISION_WIDTH, 24);
    assert.equal(C.GORILLA_COLLISION_HEIGHT, 28);
  });

  it('exports banana radius', () => {
    assert.equal(C.BANANA_RADIUS, 4);
  });

  it('exports 13 gravity presets with Earth as default', () => {
    assert.equal(C.GRAVITY_PRESETS.length, 13);
    const earth = C.GRAVITY_PRESETS.find(p => p.name === 'Earth');
    assert.ok(earth);
    assert.equal(earth.gravity, 9.8);
    assert.equal(C.DEFAULT_GRAVITY_PRESET, 'Earth');
  });

  it('exports all game states', () => {
    const expected = ['TITLE_SCREEN', 'ROUND_START', 'PLAYER_INPUT',
      'PROJECTILE_FLIGHT', 'IMPACT', 'ROUND_END', 'GAME_OVER', 'PAUSED'];
    for (const s of expected) {
      assert.ok(C.STATE[s], `missing state: ${s}`);
    }
  });

  it('exports EGA building colors excluding sky conflicts', () => {
    assert.ok(C.EGA_BUILDING_COLORS.length >= 8);
    assert.ok(C.EGA_BUILDING_COLORS.includes('#AA0000'));
  });

  it('exports AI difficulty parameters', () => {
    assert.equal(C.AI_DIFFICULTY.easy.angleError, 15);
    assert.equal(C.AI_DIFFICULTY.easy.velocityError, 0.20);
    assert.equal(C.AI_DIFFICULTY.hard.angleError, 3);
    assert.equal(C.AI_DIFFICULTY.hard.velocityError, 0.05);
  });
});
