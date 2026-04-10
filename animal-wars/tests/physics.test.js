import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createProjectile, stepSimulation, checkCollisions } from '../js/physics.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, DT, VELOCITY_SCALE, GRAVITY_SCALE, WIND_SCALE, BANANA_RADIUS } from '../js/constants.js';

describe('createProjectile', () => {
  it('converts player 1 local angle to world launch vector', () => {
    const p = createProjectile(100, 200, 45, 100, 0);
    const speed = 100 * VELOCITY_SCALE;
    const rad = 45 * Math.PI / 180;
    assert.ok(Math.abs(p.vx - speed * Math.cos(rad)) < 0.01);
    assert.ok(Math.abs(p.vy - (-speed * Math.sin(rad))) < 0.01);
  });

  it('converts player 2 local angle to world launch vector (mirrored)', () => {
    const p = createProjectile(500, 200, 45, 100, 1);
    const speed = 100 * VELOCITY_SCALE;
    const worldRad = 135 * Math.PI / 180;
    assert.ok(Math.abs(p.vx - speed * Math.cos(worldRad)) < 0.01);
    assert.ok(Math.abs(p.vy - (-speed * Math.sin(worldRad))) < 0.01);
  });

  it('sets initial position and stores previous position', () => {
    const p = createProjectile(100, 200, 45, 100, 0);
    assert.equal(p.x, 100);
    assert.equal(p.y, 200);
    assert.equal(p.prevX, 100);
    assert.equal(p.prevY, 200);
  });
});

describe('stepSimulation', () => {
  it('applies gravity (banana moves down over time)', () => {
    const p = createProjectile(320, 100, 0, 100, 0);
    const gravitySim = 9.8 * GRAVITY_SCALE;
    stepSimulation(p, gravitySim, 0, DT);
    assert.ok(p.vy > 0, 'vy should increase (downward) from gravity');
    assert.ok(p.y > 100, 'y should increase (move down) from gravity');
  });

  it('applies wind as horizontal acceleration', () => {
    const p = createProjectile(320, 100, 90, 100, 0);
    const gravitySim = 9.8 * GRAVITY_SCALE;
    const windSim = 10 * WIND_SCALE;
    stepSimulation(p, gravitySim, windSim, DT);
    assert.ok(p.vx > 0, 'vx should increase from positive wind');
  });

  it('stores previous position before update', () => {
    const p = createProjectile(100, 200, 45, 100, 0);
    stepSimulation(p, 9.8 * GRAVITY_SCALE, 0, DT);
    assert.equal(p.prevX, 100);
    assert.equal(p.prevY, 200);
  });
});

describe('checkCollisions', () => {
  it('returns miss when banana exits left', () => {
    const result = checkCollisions(
      { x: -5, y: 200, radius: BANANA_RADIUS },
      new Float64Array(CANVAS_WIDTH).fill(CANVAS_HEIGHT),
      [], null
    );
    assert.equal(result.type, 'miss');
  });

  it('returns miss when banana exits bottom', () => {
    const result = checkCollisions(
      { x: 320, y: CANVAS_HEIGHT + 5, radius: BANANA_RADIUS },
      new Float64Array(CANVAS_WIDTH).fill(CANVAS_HEIGHT),
      [], null
    );
    assert.equal(result.type, 'miss');
  });

  it('returns tracker when banana exits top', () => {
    const result = checkCollisions(
      { x: 320, y: -10, radius: BANANA_RADIUS },
      new Float64Array(CANVAS_WIDTH).fill(300),
      [], null
    );
    assert.equal(result.type, 'tracker');
  });

  it('returns gorilla hit with circle-vs-AABB', () => {
    const gorillas = [{ x: 200, y: 250, visible: true }];
    const result = checkCollisions(
      { x: 200, y: 230, radius: BANANA_RADIUS },
      new Float64Array(CANVAS_WIDTH).fill(CANVAS_HEIGHT),
      gorillas, null
    );
    assert.equal(result.type, 'gorilla');
    assert.equal(result.gorillaIndex, 0);
  });

  it('returns building hit when banana reaches heightmap', () => {
    const hm = new Float64Array(CANVAS_WIDTH).fill(300);
    const result = checkCollisions(
      { x: 320, y: 297, radius: BANANA_RADIUS },
      hm, [], null
    );
    assert.equal(result.type, 'building');
  });

  it('skips terrain/gorilla checks when out of x-range', () => {
    const hm = new Float64Array(CANVAS_WIDTH).fill(0);
    const result = checkCollisions(
      { x: -1, y: 200, radius: BANANA_RADIUS },
      hm, [], null
    );
    assert.equal(result.type, 'miss');
  });

  it('returns sunmoon when banana intersects celestial bounds', () => {
    const sunBounds = { x: 300, y: 30, radius: 20 };
    const result = checkCollisions(
      { x: 310, y: 35, radius: BANANA_RADIUS },
      new Float64Array(CANVAS_WIDTH).fill(CANVAS_HEIGHT),
      [], sunBounds
    );
    assert.equal(result.type, 'sunmoon');
  });

  it('checks gorilla before terrain (priority)', () => {
    const hm = new Float64Array(CANVAS_WIDTH).fill(250);
    const gorillas = [{ x: 200, y: 250, visible: true }];
    const result = checkCollisions(
      { x: 200, y: 247, radius: BANANA_RADIUS },
      hm, gorillas, null
    );
    assert.equal(result.type, 'gorilla');
  });
});
