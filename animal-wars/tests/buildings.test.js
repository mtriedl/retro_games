import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateCity, initHeightmap, carveExplosion } from '../js/buildings.js';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  BUILDING_MIN_WIDTH, BUILDING_MAX_WIDTH,
  BUILDING_MIN_HEIGHT, BUILDING_MAX_HEIGHT,
  GORILLA_PLACEMENT_RANGE,
} from '../js/constants.js';

describe('generateCity', () => {
  it('generates 11 or 12 buildings', () => {
    const { buildings } = generateCity(false);
    assert.ok(buildings.length >= 11 && buildings.length <= 12);
  });

  it('buildings span canvas width with gaps', () => {
    const { buildings } = generateCity(false);
    assert.equal(buildings[0].x, 0);
    const last = buildings[buildings.length - 1];
    assert.ok(last.x + last.width <= CANVAS_WIDTH, 'last building should not exceed canvas');
    assert.ok(last.x + last.width >= CANVAS_WIDTH - 30, 'buildings should cover most of canvas');
  });

  it('building widths are within spec range', () => {
    const { buildings } = generateCity(false);
    for (const b of buildings) {
      assert.ok(b.width >= BUILDING_MIN_WIDTH, `width ${b.width} < ${BUILDING_MIN_WIDTH}`);
      assert.ok(b.width <= BUILDING_MAX_WIDTH, `width ${b.width} > ${BUILDING_MAX_WIDTH}`);
    }
  });

  it('building heights are within spec range', () => {
    const { buildings } = generateCity(false);
    for (const b of buildings) {
      assert.ok(b.height >= BUILDING_MIN_HEIGHT);
      assert.ok(b.height <= BUILDING_MAX_HEIGHT);
    }
  });

  it('places gorillas in correct ranges', () => {
    const { gorillas, buildings } = generateCity(false);
    assert.ok(gorillas[0].buildingIndex < GORILLA_PLACEMENT_RANGE);
    assert.ok(gorillas[1].buildingIndex >= buildings.length - GORILLA_PLACEMENT_RANGE);
  });

  it('building colors exclude sky color for day', () => {
    const { buildings } = generateCity(false); // day: sky = #0000AA
    for (const b of buildings) {
      assert.notEqual(b.color, '#0000AA');
    }
  });

  it('each building has windows array', () => {
    const { buildings } = generateCity(false);
    for (const b of buildings) {
      assert.ok(Array.isArray(b.windows));
      assert.ok(b.windows.length > 0);
    }
  });
});

describe('initHeightmap', () => {
  it('returns array of 640 values', () => {
    const { buildings } = generateCity(false);
    const hm = initHeightmap(buildings);
    assert.equal(hm.length, CANVAS_WIDTH);
  });

  it('heightmap values match building tops', () => {
    const { buildings } = generateCity(false);
    const hm = initHeightmap(buildings);
    for (const b of buildings) {
      for (let x = b.x; x < b.x + b.width; x++) {
        assert.equal(hm[x], b.y, `column ${x} should be ${b.y}`);
      }
    }
  });
});

describe('carveExplosion', () => {
  it('increases heightmap Y values in crater area', () => {
    const { buildings } = generateCity(false);
    const hm = initHeightmap(buildings);
    const cx = buildings[5].x + buildings[5].width / 2;
    const cy = buildings[5].y;
    const before = hm[Math.floor(cx)];
    carveExplosion(hm, cx, cy, 15);
    assert.ok(hm[Math.floor(cx)] > before, 'crater should push surface down');
  });

  it('does not modify columns outside blast radius', () => {
    const { buildings } = generateCity(false);
    const hm = initHeightmap(buildings);
    const cx = buildings[5].x + buildings[5].width / 2;
    const cy = buildings[5].y;
    const farX = Math.min(CANVAS_WIDTH - 1, Math.floor(cx) + 50);
    const before = hm[farX];
    carveExplosion(hm, cx, cy, 15);
    assert.equal(hm[farX], before);
  });

  it('clamps to canvas bounds', () => {
    const hm = new Float64Array(CANVAS_WIDTH).fill(300);
    carveExplosion(hm, 2, 300, 15); // near left edge
    assert.ok(hm[0] >= 300); // should not throw
    carveExplosion(hm, 638, 300, 15); // near right edge
    assert.ok(hm[639] >= 300);
  });
});
