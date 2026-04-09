# Gorilla Wars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a faithful browser-based clone of the classic QBasic "Gorillas" game with modern QoL features.

**Architecture:** ES modules with no build step. Pure logic modules (constants, settings, buildings, physics, AI) are testable via Node.js `node:test`. Browser modules (renderer, audio, sprites, input) verified manually. A central game loop in `main.js` orchestrates a state machine, calling into single-responsibility modules.

**Tech Stack:** HTML5 Canvas, vanilla JavaScript (ES modules, JSDoc), Web Audio API, `node:test` for unit tests.

**Spec:** `docs/superpowers/specs/2026-04-09-gorilla-wars-design.md`

**Parallelization:** Tasks 3–8 depend only on Task 2 and can execute in parallel. Tasks 10+ are sequential.

---

## File Structure

All paths relative to repo root (`dos_games/`).

```
gorilla-wars/
  index.html               -- canvas, loads main.js as module
  package.json             -- { "type": "module" } for Node.js test compat
  serve.sh                 -- python3 -m http.server 8080
  css/
    style.css              -- canvas centering, body bg, pixelated rendering
  js/
    constants.js           -- all numeric/color/preset constants
    settings.js            -- localStorage CRUD, gravity presets, defaults
    buildings.js           -- city generation, heightmap init, crater carving
    physics.js             -- Euler simulation, collision detection
    input.js               -- keyboard events, angle/velocity field management
    sprites.js             -- programmatic gorilla sprite generation + frame access
    audio.js               -- Web Audio synthesis for all sounds
    renderer.js            -- all canvas drawing (scene, gameplay, HUD, menus)
    ai.js                  -- coarse-to-fine simulation search
    main.js                -- game loop, state machine, module orchestration
  assets/                  -- (gorilla-sprite.png generated in Task 6)
  tests/
    constants.test.js
    settings.test.js
    buildings.test.js
    physics.test.js
    ai.test.js
```

Each `.js` module has one responsibility and imports at most 2–3 others. Pure logic modules import only `constants.js`. Browser modules are not unit-tested.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `gorilla-wars/index.html`
- Create: `gorilla-wars/css/style.css`
- Create: `gorilla-wars/package.json`
- Create: `gorilla-wars/serve.sh`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p gorilla-wars/css gorilla-wars/js gorilla-wars/assets gorilla-wars/tests
```

- [ ] **Step 2: Write index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gorilla Wars</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <canvas id="game" width="640" height="400"></canvas>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Write style.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #000;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  overflow: hidden;
}

canvas#game {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  width: min(100vw, calc(100vh * 640 / 400));
  height: min(100vh, calc(100vw * 400 / 640));
}
```

- [ ] **Step 4: Write package.json**

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.js",
    "serve": "python3 -m http.server 8080"
  }
}
```

- [ ] **Step 5: Write serve.sh**

```bash
#!/usr/bin/env bash
cd "$(dirname "$0")" && python3 -m http.server 8080
```

```bash
chmod +x gorilla-wars/serve.sh
```

- [ ] **Step 6: Commit**

```bash
git add gorilla-wars/
git commit -m "feat: scaffold gorilla-wars project structure"
```

---

### Task 2: Constants Module

**Files:**
- Create: `gorilla-wars/js/constants.js`
- Create: `gorilla-wars/tests/constants.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd gorilla-wars && node --test tests/constants.test.js`
Expected: FAIL — `constants.js` does not exist.

- [ ] **Step 3: Write constants.js**

```javascript
// gorilla-wars/js/constants.js

// Canvas
export const CANVAS_WIDTH = 640;
export const CANVAS_HEIGHT = 400;

// Physics timing
export const DT = 1 / 60;

// Physics tuning — converts displayed values to px/s or px/s²
export const VELOCITY_SCALE = 2.5;
export const GRAVITY_SCALE = 50.0;
export const WIND_SCALE = 4.0;

// Buildings
export const BUILDING_COUNT_MIN = 11;
export const BUILDING_COUNT_MAX = 12;
export const BUILDING_MIN_WIDTH = 52;
export const BUILDING_MAX_WIDTH = 62;
export const BUILDING_MIN_HEIGHT = 120;
export const BUILDING_MAX_HEIGHT = 230;

// Windows
export const WINDOW_WIDTH = 8;
export const WINDOW_HEIGHT = 10;
export const WINDOW_GUTTER = 4;

// Gorilla
export const GORILLA_FRAME_SIZE = 32;
export const GORILLA_COLLISION_WIDTH = 24;
export const GORILLA_COLLISION_HEIGHT = 28;
export const GORILLA_PLACEMENT_RANGE = 4;

// Banana
export const BANANA_RADIUS = 4;

// Explosions
export const EXPLOSION_BUILDING_RADIUS = 15;
export const EXPLOSION_GORILLA_RADIUS = 55;

// Wind
export const WIND_MIN = -15;
export const WIND_MAX = 15;

// Colors
export const SKY_DAY_COLOR = '#0000AA';
export const SKY_NIGHT_COLOR = '#000033';
export const WINDOW_LIT_COLOR = '#FFFF55';
export const WINDOW_UNLIT_COLOR = '#555555';
export const BANANA_COLOR = '#FFFF00';
export const BANANA_TIP_COLOR = '#AA5500';

export const EGA_BUILDING_COLORS = [
  '#AA0000', '#0000AA', '#00AA00', '#00AAAA',
  '#AA00AA', '#AA5500', '#AAAAAA', '#5555FF',
];

// Gravity presets
export const GRAVITY_PRESETS = [
  { name: 'Mercury', gravity: 3.7 },
  { name: 'Venus', gravity: 8.87 },
  { name: 'Earth', gravity: 9.8 },
  { name: 'Moon', gravity: 1.62 },
  { name: 'Mars', gravity: 3.72 },
  { name: 'Jupiter', gravity: 24.79 },
  { name: 'Saturn', gravity: 10.44 },
  { name: 'Uranus', gravity: 8.87 },
  { name: 'Neptune', gravity: 11.15 },
  { name: 'Pluto', gravity: 0.62 },
  { name: 'Titan', gravity: 1.35 },
  { name: 'Europa', gravity: 1.31 },
  { name: 'Io', gravity: 1.80 },
];

export const DEFAULT_GRAVITY_PRESET = 'Earth';
export const CUSTOM_GRAVITY_MIN = 0.1;

// AI difficulty
export const AI_DIFFICULTY = {
  easy: { angleError: 15, velocityError: 0.20 },
  medium: { angleError: 8, velocityError: 0.10 },
  hard: { angleError: 3, velocityError: 0.05 },
};

// Game states
export const STATE = {
  TITLE_SCREEN: 'TITLE_SCREEN',
  ROUND_START: 'ROUND_START',
  PLAYER_INPUT: 'PLAYER_INPUT',
  PROJECTILE_FLIGHT: 'PROJECTILE_FLIGHT',
  IMPACT: 'IMPACT',
  ROUND_END: 'ROUND_END',
  GAME_OVER: 'GAME_OVER',
  PAUSED: 'PAUSED',
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd gorilla-wars && node --test tests/constants.test.js`
Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add gorilla-wars/js/constants.js gorilla-wars/tests/constants.test.js
git commit -m "feat: add constants module with all game constants"
```

---

### Task 3: Settings Module

**Files:**
- Create: `gorilla-wars/js/settings.js`
- Create: `gorilla-wars/tests/settings.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// gorilla-wars/tests/settings.test.js
import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

// Mock localStorage for Node.js
globalThis.localStorage = {
  _data: {},
  getItem(key) { return this._data[key] ?? null; },
  setItem(key, value) { this._data[key] = String(value); },
  removeItem(key) { delete this._data[key]; },
  clear() { this._data = {}; },
};

const { DEFAULT_SETTINGS, loadSettings, saveSettings, getGravityValue } = await import('../js/settings.js');

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('DEFAULT_SETTINGS has correct defaults', () => {
    assert.equal(DEFAULT_SETTINGS.rounds, 3);
    assert.equal(DEFAULT_SETTINGS.gravityPreset, 'Earth');
    assert.equal(DEFAULT_SETTINGS.customGravity, 9.8);
    assert.equal(DEFAULT_SETTINGS.player2Mode, 'human');
    assert.equal(DEFAULT_SETTINGS.shotTrail, true);
    assert.equal(DEFAULT_SETTINGS.aimPreview, false);
    assert.equal(DEFAULT_SETTINGS.volume, 0.5);
  });

  it('loadSettings returns defaults when localStorage is empty', () => {
    const s = loadSettings();
    assert.deepEqual(s, DEFAULT_SETTINGS);
  });

  it('saveSettings persists and loadSettings retrieves', () => {
    const custom = { ...DEFAULT_SETTINGS, rounds: 10, volume: 0.8 };
    saveSettings(custom);
    const loaded = loadSettings();
    assert.equal(loaded.rounds, 10);
    assert.equal(loaded.volume, 0.8);
  });

  it('getGravityValue returns preset value for named presets', () => {
    const s = { ...DEFAULT_SETTINGS, gravityPreset: 'Moon' };
    assert.equal(getGravityValue(s), 1.62);
  });

  it('getGravityValue returns custom value for Custom preset', () => {
    const s = { ...DEFAULT_SETTINGS, gravityPreset: 'Custom', customGravity: 5.5 };
    assert.equal(getGravityValue(s), 5.5);
  });

  it('getGravityValue clamps custom gravity to minimum 0.1', () => {
    const s = { ...DEFAULT_SETTINGS, gravityPreset: 'Custom', customGravity: 0.0 };
    assert.equal(getGravityValue(s), 0.1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd gorilla-wars && node --test tests/settings.test.js`
Expected: FAIL — `settings.js` does not exist.

- [ ] **Step 3: Write settings.js**

```javascript
// gorilla-wars/js/settings.js
import { GRAVITY_PRESETS, DEFAULT_GRAVITY_PRESET, CUSTOM_GRAVITY_MIN } from './constants.js';

const STORAGE_KEY = 'gorilla-wars-settings';

export const DEFAULT_SETTINGS = {
  rounds: 3,
  gravityPreset: DEFAULT_GRAVITY_PRESET,
  customGravity: 9.8,
  player2Mode: 'human',
  shotTrail: true,
  aimPreview: false,
  volume: 0.5,
};

/** @returns {typeof DEFAULT_SETTINGS} */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** @param {typeof DEFAULT_SETTINGS} settings */
export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** @param {typeof DEFAULT_SETTINGS} settings @returns {number} gravity in m/s² */
export function getGravityValue(settings) {
  if (settings.gravityPreset === 'Custom') {
    return Math.max(CUSTOM_GRAVITY_MIN, settings.customGravity);
  }
  const preset = GRAVITY_PRESETS.find(p => p.name === settings.gravityPreset);
  return preset ? preset.gravity : 9.8;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd gorilla-wars && node --test tests/settings.test.js`
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add gorilla-wars/js/settings.js gorilla-wars/tests/settings.test.js
git commit -m "feat: add settings module with localStorage persistence"
```

---

### Task 4: Buildings + Terrain Heightmap

**Files:**
- Create: `gorilla-wars/js/buildings.js`
- Create: `gorilla-wars/tests/buildings.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// gorilla-wars/tests/buildings.test.js
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

  it('buildings span full canvas width edge-to-edge', () => {
    const { buildings } = generateCity(false);
    assert.equal(buildings[0].x, 0);
    const last = buildings[buildings.length - 1];
    assert.equal(last.x + last.width, CANVAS_WIDTH);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd gorilla-wars && node --test tests/buildings.test.js`
Expected: FAIL — `buildings.js` does not exist.

- [ ] **Step 3: Write buildings.js**

```javascript
// gorilla-wars/js/buildings.js
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  BUILDING_COUNT_MIN, BUILDING_COUNT_MAX,
  BUILDING_MIN_WIDTH, BUILDING_MAX_WIDTH,
  BUILDING_MIN_HEIGHT, BUILDING_MAX_HEIGHT,
  WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_GUTTER,
  GORILLA_PLACEMENT_RANGE, GORILLA_FRAME_SIZE,
  EGA_BUILDING_COLORS, SKY_DAY_COLOR, SKY_NIGHT_COLOR,
} from './constants.js';

/**
 * @typedef {{ x: number, y: number, width: number, height: number, color: string, windows: {x: number, y: number, lit: boolean}[] }} Building
 * @typedef {{ x: number, y: number, buildingIndex: number }} GorillaPlacement
 */

/**
 * @param {boolean} isNight
 * @returns {{ buildings: Building[], gorillas: GorillaPlacement[] }}
 */
export function generateCity(isNight) {
  const count = BUILDING_COUNT_MIN + Math.floor(Math.random() * (BUILDING_COUNT_MAX - BUILDING_COUNT_MIN + 1));
  const widths = distributeWidths(count);

  const skyColor = isNight ? SKY_NIGHT_COLOR : SKY_DAY_COLOR;
  const validColors = EGA_BUILDING_COLORS.filter(c => c !== skyColor);

  const buildings = [];
  let x = 0;
  for (let i = 0; i < count; i++) {
    const width = widths[i];
    const height = BUILDING_MIN_HEIGHT + Math.floor(Math.random() * (BUILDING_MAX_HEIGHT - BUILDING_MIN_HEIGHT + 1));
    const y = CANVAS_HEIGHT - height;
    const color = validColors[Math.floor(Math.random() * validColors.length)];
    const windows = generateWindows(x, y, width, height);
    buildings.push({ x, y, width, height, color, windows });
    x += width;
  }

  // Place gorillas
  const p1Idx = Math.floor(Math.random() * GORILLA_PLACEMENT_RANGE);
  const p2Idx = count - 1 - Math.floor(Math.random() * GORILLA_PLACEMENT_RANGE);
  const gorillas = [
    placeGorilla(buildings[p1Idx], p1Idx),
    placeGorilla(buildings[p2Idx], p2Idx),
  ];

  return { buildings, gorillas };
}

/** @param {number} count @returns {number[]} */
function distributeWidths(count) {
  const widths = new Array(count).fill(BUILDING_MIN_WIDTH);
  let remaining = CANVAS_WIDTH - BUILDING_MIN_WIDTH * count;
  const maxExtra = BUILDING_MAX_WIDTH - BUILDING_MIN_WIDTH;

  // Shuffle indices for random distribution
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  let idx = 0;
  while (remaining > 0) {
    const i = indices[idx % count];
    if (widths[i] < BUILDING_MAX_WIDTH) {
      widths[i]++;
      remaining--;
    }
    idx++;
  }
  return widths;
}

function generateWindows(bx, by, bw, bh) {
  const cols = Math.floor((bw - WINDOW_GUTTER) / (WINDOW_WIDTH + WINDOW_GUTTER));
  const rows = Math.floor((bh - WINDOW_GUTTER) / (WINDOW_HEIGHT + WINDOW_GUTTER));
  const totalWindowW = cols * (WINDOW_WIDTH + WINDOW_GUTTER) - WINDOW_GUTTER;
  const startX = bx + Math.floor((bw - totalWindowW) / 2);
  const windows = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      windows.push({
        x: startX + c * (WINDOW_WIDTH + WINDOW_GUTTER),
        y: by + WINDOW_GUTTER + r * (WINDOW_HEIGHT + WINDOW_GUTTER),
        lit: Math.random() < 0.5,
      });
    }
  }
  return windows;
}

function placeGorilla(building, buildingIndex) {
  return {
    x: building.x + Math.floor(building.width / 2),
    y: building.y, // anchor bottom-center; gorilla drawn above this point
    buildingIndex,
  };
}

/** @param {Building[]} buildings @returns {Float64Array} */
export function initHeightmap(buildings) {
  const hm = new Float64Array(CANVAS_WIDTH);
  hm.fill(CANVAS_HEIGHT); // default: no solid above screen bottom
  for (const b of buildings) {
    for (let x = b.x; x < b.x + b.width; x++) {
      hm[x] = b.y;
    }
  }
  return hm;
}

/**
 * Carve a circular crater centered at (cx, cy) with given radius.
 * Increases heightmap Y values (pushes surface downward).
 * @param {Float64Array} heightmap
 */
export function carveExplosion(heightmap, cx, cy, radius) {
  const left = Math.max(0, Math.floor(cx - radius));
  const right = Math.min(CANVAS_WIDTH - 1, Math.ceil(cx + radius));
  for (let x = left; x <= right; x++) {
    const dx = x - cx;
    const rSq = radius * radius - dx * dx;
    if (rSq < 0) continue;
    const craterBottom = Math.ceil(cy + Math.sqrt(rSq));
    if (heightmap[x] < craterBottom) {
      heightmap[x] = craterBottom;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd gorilla-wars && node --test tests/buildings.test.js`
Expected: All 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add gorilla-wars/js/buildings.js gorilla-wars/tests/buildings.test.js
git commit -m "feat: add buildings module with city generation and heightmap"
```

---

### Task 5: Physics Engine

**Files:**
- Create: `gorilla-wars/js/physics.js`
- Create: `gorilla-wars/tests/physics.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// gorilla-wars/tests/physics.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createProjectile, stepSimulation, checkCollisions } from '../js/physics.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, DT, VELOCITY_SCALE, GRAVITY_SCALE, WIND_SCALE, BANANA_RADIUS } from '../js/constants.js';

describe('createProjectile', () => {
  it('converts player 1 local angle to world launch vector', () => {
    // P1 local 45° = world 45°, velocity 100
    const p = createProjectile(100, 200, 45, 100, 0);
    const speed = 100 * VELOCITY_SCALE;
    const rad = 45 * Math.PI / 180;
    assert.ok(Math.abs(p.vx - speed * Math.cos(rad)) < 0.01);
    assert.ok(Math.abs(p.vy - (-speed * Math.sin(rad))) < 0.01);
  });

  it('converts player 2 local angle to world launch vector (mirrored)', () => {
    // P2 local 45° = world 135°
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
    const p = createProjectile(320, 100, 0, 100, 0); // horizontal shot
    const gravitySim = 9.8 * GRAVITY_SCALE;
    stepSimulation(p, gravitySim, 0, DT);
    assert.ok(p.vy > 0, 'vy should increase (downward) from gravity');
    assert.ok(p.y > 100, 'y should increase (move down) from gravity');
  });

  it('applies wind as horizontal acceleration', () => {
    const p = createProjectile(320, 100, 90, 100, 0); // straight up
    const gravitySim = 9.8 * GRAVITY_SCALE;
    const windSim = 10 * WIND_SCALE; // positive wind = rightward
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
    const gorillas = [{ x: 200, y: 250, visible: true }]; // anchor bottom-center
    const result = checkCollisions(
      { x: 200, y: 230, radius: BANANA_RADIUS }, // inside 24x28 box centered on (200, 250-14)
      new Float64Array(CANVAS_WIDTH).fill(CANVAS_HEIGHT),
      gorillas, null
    );
    assert.equal(result.type, 'gorilla');
    assert.equal(result.gorillaIndex, 0);
  });

  it('returns building hit when banana reaches heightmap', () => {
    const hm = new Float64Array(CANVAS_WIDTH).fill(300);
    const result = checkCollisions(
      { x: 320, y: 297, radius: BANANA_RADIUS }, // 297 + 4 >= 300
      hm, [], null
    );
    assert.equal(result.type, 'building');
  });

  it('skips terrain/gorilla checks when out of x-range', () => {
    const hm = new Float64Array(CANVAS_WIDTH).fill(0); // everything solid
    const result = checkCollisions(
      { x: -1, y: 200, radius: BANANA_RADIUS },
      hm, [], null
    );
    assert.equal(result.type, 'miss'); // not 'building'
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
    // Banana at gorilla feet — both gorilla and terrain could match
    const result = checkCollisions(
      { x: 200, y: 247, radius: BANANA_RADIUS }, // 247+4=251 >= 250 (terrain) AND inside gorilla box
      hm, gorillas, null
    );
    assert.equal(result.type, 'gorilla');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd gorilla-wars && node --test tests/physics.test.js`
Expected: FAIL — `physics.js` does not exist.

- [ ] **Step 3: Write physics.js**

```javascript
// gorilla-wars/js/physics.js
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, VELOCITY_SCALE,
  GORILLA_COLLISION_WIDTH, GORILLA_COLLISION_HEIGHT,
  BANANA_RADIUS,
} from './constants.js';

/**
 * @typedef {{ x: number, y: number, vx: number, vy: number, prevX: number, prevY: number, rotation: number, active: boolean }} Projectile
 */

/**
 * Create a projectile from local-space input.
 * @param {number} startX
 * @param {number} startY
 * @param {number} localAngle 0-90 degrees (0=toward opponent, 90=up)
 * @param {number} displayedVelocity 1-200
 * @param {number} playerIndex 0 or 1
 * @returns {Projectile}
 */
export function createProjectile(startX, startY, localAngle, displayedVelocity, playerIndex) {
  // Convert local angle to world angle in radians
  const worldAngleDeg = playerIndex === 0 ? localAngle : 180 - localAngle;
  const worldAngleRad = worldAngleDeg * Math.PI / 180;

  const speed = displayedVelocity * VELOCITY_SCALE; // px/s
  const vx = speed * Math.cos(worldAngleRad);
  const vy = -speed * Math.sin(worldAngleRad); // canvas Y-down

  return {
    x: startX, y: startY,
    vx, vy,
    prevX: startX, prevY: startY,
    rotation: 0,
    active: true,
  };
}

/**
 * Advance projectile one fixed timestep using Euler integration.
 * @param {Projectile} p
 * @param {number} gravitySim px/s²
 * @param {number} windSim px/s²
 * @param {number} dt seconds
 */
export function stepSimulation(p, gravitySim, windSim, dt) {
  p.prevX = p.x;
  p.prevY = p.y;

  p.x += p.vx * dt + 0.5 * windSim * dt * dt;
  p.y += p.vy * dt + 0.5 * gravitySim * dt * dt;
  p.vx += windSim * dt;
  p.vy += gravitySim * dt;

  p.rotation += 5 * dt; // visual spin
}

/**
 * @typedef {{ type: 'none'|'miss'|'tracker'|'building'|'gorilla'|'sunmoon', x: number, y: number, gorillaIndex?: number }} CollisionResult
 */

/**
 * Check collisions for current banana position.
 * Order: screen bounds → gorilla → terrain → sun/moon
 * @param {{ x: number, y: number, radius: number }} banana
 * @param {Float64Array} heightmap
 * @param {{ x: number, y: number, visible: boolean }[]} gorillas
 * @param {{ x: number, y: number, radius: number }|null} celestialBounds
 * @returns {CollisionResult}
 */
export function checkCollisions(banana, heightmap, gorillas, celestialBounds) {
  const { x, y, radius } = banana;
  const col = Math.floor(x);

  // 1. Screen bounds
  if (x < 0 || x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT) {
    return { type: 'miss', x, y };
  }
  if (y < -radius) {
    return { type: 'tracker', x, y };
  }

  // Only check terrain/gorilla if within x-range
  if (col >= 0 && col < CANVAS_WIDTH) {
    // 2. Gorilla hitboxes (circle-vs-AABB, checked before terrain)
    for (let i = 0; i < gorillas.length; i++) {
      const g = gorillas[i];
      if (!g.visible) continue;
      // Gorilla collision box: 24x28, bottom-center at (g.x, g.y)
      const boxLeft = g.x - GORILLA_COLLISION_WIDTH / 2;
      const boxRight = g.x + GORILLA_COLLISION_WIDTH / 2;
      const boxTop = g.y - GORILLA_COLLISION_HEIGHT;
      const boxBottom = g.y;
      if (circleVsAABB(x, y, radius, boxLeft, boxTop, boxRight, boxBottom)) {
        return { type: 'gorilla', x, y, gorillaIndex: i };
      }
    }

    // 3. Terrain heightmap
    if (y + radius >= heightmap[col]) {
      return { type: 'building', x, y };
    }
  }

  // 4. Sun/Moon (cosmetic)
  if (celestialBounds) {
    const dx = x - celestialBounds.x;
    const dy = y - celestialBounds.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < radius + celestialBounds.radius) {
      return { type: 'sunmoon', x, y };
    }
  }

  return { type: 'none', x, y };
}

/** Circle-vs-AABB intersection test */
function circleVsAABB(cx, cy, cr, left, top, right, bottom) {
  const closestX = Math.max(left, Math.min(cx, right));
  const closestY = Math.max(top, Math.min(cy, bottom));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) <= (cr * cr);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd gorilla-wars && node --test tests/physics.test.js`
Expected: All 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add gorilla-wars/js/physics.js gorilla-wars/tests/physics.test.js
git commit -m "feat: add physics engine with Euler simulation and collision detection"
```

---

### Task 6: Sprites Module

**Files:**
- Create: `gorilla-wars/js/sprites.js`

This module generates gorilla sprite frames programmatically using OffscreenCanvas. No external PNG required during development.

- [ ] **Step 1: Write sprites.js**

```javascript
// gorilla-wars/js/sprites.js
import { GORILLA_FRAME_SIZE } from './constants.js';

const S = GORILLA_FRAME_SIZE; // 32

/**
 * Generate all gorilla sprite frames programmatically.
 * Returns array of ImageBitmap (or canvas) for each frame.
 * Frame 0: Idle, Frame 1: Throw-left, Frame 2: Throw-right, Frame 3: Victory
 * @returns {Promise<HTMLCanvasElement[]>}
 */
export async function createGorillaSprites() {
  return [
    drawGorillaIdle(),
    drawGorillaThrowLeft(),
    drawGorillaThrowRight(),
    drawGorillaVictory(),
  ];
}

function createFrame() {
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  return c;
}

/** Draw a blocky pixel-art gorilla body (shared base) */
function drawBody(ctx) {
  ctx.fillStyle = '#8B4513'; // brown gorilla

  // Head (flat top, brow ridge) — rows 4-10, cols 10-21
  ctx.fillRect(10, 4, 12, 3);  // flat head top
  ctx.fillRect(9, 7, 14, 3);   // brow ridge (wider)

  // Face details (eyes, gap = transparent)
  ctx.fillStyle = '#000000';
  ctx.clearRect(12, 7, 2, 2);  // left eye (transparent)
  ctx.clearRect(18, 7, 2, 2);  // right eye (transparent)

  ctx.fillStyle = '#8B4513';
  // Chest/torso — rows 10-18, cols 8-23
  ctx.fillRect(8, 10, 16, 4);  // broad shoulders
  ctx.fillRect(10, 14, 12, 5); // torso

  // V-chest detail (transparent)
  ctx.clearRect(14, 11, 1, 3);
  ctx.clearRect(17, 11, 1, 3);
  ctx.clearRect(15, 13, 2, 1);

  // Legs — rows 19-27, cols 10-14 and 18-22
  ctx.fillRect(10, 19, 5, 9);  // left leg
  ctx.fillRect(17, 19, 5, 9);  // right leg
  // Leg gap is transparent (between legs)
}

function drawGorillaIdle() {
  const c = createFrame();
  const ctx = c.getContext('2d');
  drawBody(ctx);

  // Arms at sides — rows 11-19
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(4, 11, 4, 8);   // left arm
  ctx.fillRect(24, 11, 4, 8);  // right arm

  return c;
}

function drawGorillaThrowLeft() {
  const c = createFrame();
  const ctx = c.getContext('2d');
  drawBody(ctx);

  // Left arm raised overhead
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(6, 1, 4, 10);   // left arm up
  ctx.fillRect(24, 11, 4, 8);  // right arm at side

  return c;
}

function drawGorillaThrowRight() {
  const c = createFrame();
  const ctx = c.getContext('2d');
  drawBody(ctx);

  // Right arm raised overhead
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(4, 11, 4, 8);   // left arm at side
  ctx.fillRect(22, 1, 4, 10);  // right arm up

  return c;
}

function drawGorillaVictory() {
  const c = createFrame();
  const ctx = c.getContext('2d');
  drawBody(ctx);

  // Both arms raised
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(6, 1, 4, 10);   // left arm up
  ctx.fillRect(22, 1, 4, 10);  // right arm up

  return c;
}
```

- [ ] **Step 2: Commit**

```bash
git add gorilla-wars/js/sprites.js
git commit -m "feat: add sprites module with programmatic gorilla generation"
```

---

### Task 7: Input Handler

**Files:**
- Create: `gorilla-wars/js/input.js`

- [ ] **Step 1: Write input.js**

```javascript
// gorilla-wars/js/input.js

/**
 * @typedef {{ field: 'angle'|'velocity'|'done', value: string, confirmed: boolean }} InputState
 */

export function createInputHandler() {
  /** @type {InputState} */
  const state = {
    field: 'angle',
    value: '',
    confirmed: false,
  };

  /** @type {Set<string>} */
  const keysDown = new Set();

  /** @type {((key: string) => void)|null} */
  let onKeyCallback = null;

  function handleKeyDown(e) {
    keysDown.add(e.key);
    if (onKeyCallback) onKeyCallback(e.key);
  }

  function handleKeyUp(e) {
    keysDown.delete(e.key);
  }

  function attach(canvas) {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  }

  function detach() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  }

  /**
   * Process a key press during PLAYER_INPUT state.
   * @param {string} key
   * @returns {{ type: 'none'|'angle_confirmed'|'fire', angle?: number, velocity?: number }}
   */
  function processInputKey(key) {
    if (state.field === 'done') return { type: 'none' };

    // Digit keys
    if (key >= '0' && key <= '9') {
      state.value += key;
      return { type: 'none' };
    }

    // Backspace
    if (key === 'Backspace') {
      state.value = state.value.slice(0, -1);
      return { type: 'none' };
    }

    // Enter/Return
    if (key === 'Enter') {
      if (state.value === '') return { type: 'none' };

      const parsed = parseInt(state.value, 10);
      if (isNaN(parsed)) return { type: 'none' };

      if (state.field === 'angle') {
        const angle = Math.max(0, Math.min(90, parsed));
        state.field = 'velocity';
        state.value = '';
        return { type: 'angle_confirmed', angle };
      }

      if (state.field === 'velocity') {
        const velocity = Math.max(1, Math.min(200, parsed));
        state.field = 'done';
        state.value = '';
        return { type: 'fire', velocity };
      }
    }

    return { type: 'none' };
  }

  function resetInput() {
    state.field = 'angle';
    state.value = '';
    state.confirmed = false;
  }

  function isKeyDown(key) {
    return keysDown.has(key);
  }

  return {
    state,
    attach,
    detach,
    processInputKey,
    resetInput,
    isKeyDown,
    set onKey(cb) { onKeyCallback = cb; },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add gorilla-wars/js/input.js
git commit -m "feat: add input handler with angle/velocity entry"
```

---

### Task 8: Audio Engine

**Files:**
- Create: `gorilla-wars/js/audio.js`

- [ ] **Step 1: Write audio.js**

```javascript
// gorilla-wars/js/audio.js

export function createAudioEngine() {
  /** @type {AudioContext|null} */
  let ctx = null;
  let masterGain = null;
  let compressor = null;
  let unlocked = false;
  let muted = false;
  let volume = 0.5;

  function ensureContext() {
    if (!ctx) {
      ctx = new AudioContext();
      compressor = ctx.createDynamicsCompressor();
      masterGain = ctx.createGain();
      masterGain.gain.value = volume;
      compressor.connect(masterGain);
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function unlock() {
    ensureContext();
    unlocked = true;
  }

  function setVolume(v) {
    volume = v;
    if (masterGain) masterGain.gain.value = muted ? 0 : v;
  }

  function setMuted(m) {
    muted = m;
    if (masterGain) masterGain.gain.value = m ? 0 : volume;
  }

  function osc(type, freq, duration, startTime) {
    const c = ensureContext();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0.3;
    g.gain.linearRampToValueAtTime(0, startTime + duration);
    o.connect(g);
    g.connect(compressor);
    o.start(startTime);
    o.stop(startTime + duration);
  }

  function noise(duration, startTime, lpFreq) {
    const c = ensureContext();
    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lpFreq || 4000;
    const g = c.createGain();
    g.gain.value = 0.3;
    g.gain.linearRampToValueAtTime(0, startTime + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(compressor);
    src.start(startTime);
  }

  function sweep(type, startFreq, endFreq, duration) {
    const c = ensureContext();
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(startFreq, t);
    o.frequency.linearRampToValueAtTime(endFreq, t + duration);
    g.gain.value = 0.3;
    g.gain.linearRampToValueAtTime(0, t + duration);
    o.connect(g);
    g.connect(compressor);
    o.start(t);
    o.stop(t + duration);
  }

  return {
    unlock,
    setVolume,
    setMuted,
    get muted() { return muted; },

    playLaunch() {
      sweep('sine', 300, 900, 0.3);
      sweep('triangle', 450, 1200, 0.25);
    },

    playBuildingHit() {
      const c = ensureContext();
      const t = c.currentTime;
      noise(0.15, t, 3000);    // crack
      noise(0.4, t + 0.05, 500); // crumble
      sweep('sine', 90, 25, 0.3); // thud
      sweep('triangle', 250, 100, 0.2); // resonance
    },

    playGorillaHit() {
      const c = ensureContext();
      const t = c.currentTime;
      noise(0.5, t, 2000);      // wide burst
      sweep('sawtooth', 60, 20, 0.6); // rumble
      sweep('square', 200, 40, 0.4);  // crack
    },

    playVictory() {
      const c = ensureContext();
      const t = c.currentTime;
      const notes = [523, 587, 659, 784, 1047]; // C5-D5-E5-G5-C6
      notes.forEach((freq, i) => {
        osc('square', freq, 0.15, t + i * 0.12);
        osc('triangle', freq, 0.15, t + i * 0.12);
      });
    },

    playRoundStart() {
      const c = ensureContext();
      const t = c.currentTime;
      const notes = [392, 523, 659, 784]; // G4-C5-E5-G5
      notes.forEach((freq, i) => osc('square', freq, 0.12, t + i * 0.1));
      noise(0.4, t, 2000); // drum roll
    },

    playSunMoonSurprise() {
      const c = ensureContext();
      const t = c.currentTime;
      const freqs = [150, 600, 200, 500, 150];
      freqs.forEach((freq, i) => osc('sine', freq, 0.08, t + i * 0.06));
    },

    playMenuSelect() {
      const c = ensureContext();
      const t = c.currentTime;
      osc('square', 800, 0.05, t);
      osc('square', 1000, 0.05, t + 0.05);
    },

    playMiss() {
      sweep('sine', 600, 100, 0.5);
    },

    playKeystroke() {
      const c = ensureContext();
      noise(0.03, c.currentTime, 8000);
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add gorilla-wars/js/audio.js
git commit -m "feat: add audio engine with Web Audio synthesized sounds"
```

---

### Task 9: Renderer

**Files:**
- Create: `gorilla-wars/js/renderer.js`

This is the largest module — all canvas drawing. Built incrementally across steps.

- [ ] **Step 1: Write renderer scaffolding + sky + sun/moon**

```javascript
// gorilla-wars/js/renderer.js
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  SKY_DAY_COLOR, SKY_NIGHT_COLOR,
  WINDOW_LIT_COLOR, WINDOW_UNLIT_COLOR,
  BANANA_COLOR, BANANA_TIP_COLOR, BANANA_RADIUS,
  GORILLA_FRAME_SIZE, GORILLA_COLLISION_WIDTH, GORILLA_COLLISION_HEIGHT,
} from './constants.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} gameState
 */
export function createRenderer(ctx) {
  const sunMoonY = 35;
  const sunMoonX = CANVAS_WIDTH / 2;
  const sunRadius = 18;

  return {
    /** Get celestial body bounds for collision checking */
    getCelestialBounds() {
      return { x: sunMoonX, y: sunMoonY, radius: sunRadius };
    },

    drawSky(isNight) {
      ctx.fillStyle = isNight ? SKY_NIGHT_COLOR : SKY_DAY_COLOR;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (isNight) {
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 60; i++) {
          const sx = (i * 97 + 13) % CANVAS_WIDTH; // deterministic scatter
          const sy = (i * 53 + 7) % (CANVAS_HEIGHT / 2);
          ctx.fillRect(sx, sy, 1, 1);
        }
      }
    },

    drawSunMoon(isNight, surprised) {
      const cx = sunMoonX;
      const cy = sunMoonY;

      if (!isNight) {
        // Sun: circle + rays
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        ctx.arc(cx, cy, sunRadius, 0, Math.PI * 2);
        ctx.fill();

        // Rays
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * (sunRadius + 2), cy + Math.sin(angle) * (sunRadius + 2));
          ctx.lineTo(cx + Math.cos(angle) * (sunRadius + 8), cy + Math.sin(angle) * (sunRadius + 8));
          ctx.stroke();
        }
      } else {
        // Moon: full circle
        ctx.fillStyle = '#CCCCCC';
        ctx.beginPath();
        ctx.arc(cx, cy, sunRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Face
      ctx.fillStyle = '#000000';
      if (surprised) {
        // Wide eyes
        ctx.beginPath(); ctx.arc(cx - 5, cy - 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 5, cy - 3, 3, 0, Math.PI * 2); ctx.fill();
        // Open mouth
        ctx.beginPath(); ctx.arc(cx, cy + 5, 4, 0, Math.PI * 2); ctx.fill();
      } else {
        // Dot eyes
        ctx.fillRect(cx - 6, cy - 4, 3, 3);
        ctx.fillRect(cx + 3, cy - 4, 3, 3);
        // Smile
        ctx.beginPath();
        ctx.arc(cx, cy + 2, 6, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
      }
    },

    drawBuildings(buildings) {
      for (const b of buildings) {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.width, b.height);

        for (const w of b.windows) {
          ctx.fillStyle = w.lit ? WINDOW_LIT_COLOR : WINDOW_UNLIT_COLOR;
          ctx.fillRect(w.x, w.y, 8, 10);
        }
      }
    },

    drawBuildingsFromHeightmap(buildings, heightmap) {
      // Draw buildings then apply heightmap mask for craters
      // Simpler approach: draw columns from heightmap down
      for (const b of buildings) {
        for (let x = b.x; x < b.x + b.width; x++) {
          const top = heightmap[x];
          if (top < CANVAS_HEIGHT) {
            ctx.fillStyle = b.color;
            ctx.fillRect(x, top, 1, CANVAS_HEIGHT - top);
          }
        }
        // Draw windows that are still visible (above heightmap)
        for (const w of b.windows) {
          if (w.y + 10 > heightmap[w.x] && w.y >= heightmap[w.x]) continue; // cratered away
          if (w.y < heightmap[w.x]) {
            ctx.fillStyle = w.lit ? WINDOW_LIT_COLOR : WINDOW_UNLIT_COLOR;
            ctx.fillRect(w.x, w.y, 8, 10);
          }
        }
      }
    },

    drawGorilla(gorilla, spriteFrames, frame) {
      if (!gorilla.visible) return;
      const sprite = spriteFrames[frame];
      if (!sprite) return;
      // Anchor: bottom-center of 32x32 frame
      const drawX = gorilla.x - GORILLA_FRAME_SIZE / 2;
      const drawY = gorilla.y - GORILLA_FRAME_SIZE;
      ctx.drawImage(sprite, drawX, drawY, GORILLA_FRAME_SIZE, GORILLA_FRAME_SIZE);
    },

    drawBanana(banana, alpha) {
      if (!banana.active) return;
      // Interpolate position for smooth rendering
      const rx = banana.prevX + (banana.x - banana.prevX) * alpha;
      const ry = banana.prevY + (banana.y - banana.prevY) * alpha;

      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(banana.rotation);

      // Crescent banana shape
      ctx.fillStyle = BANANA_COLOR;
      ctx.beginPath();
      ctx.arc(0, 0, BANANA_RADIUS, 0.3, Math.PI - 0.3);
      ctx.arc(0, -1, BANANA_RADIUS - 1.5, Math.PI - 0.3, 0.3, true);
      ctx.fill();

      // Tips
      ctx.fillStyle = BANANA_TIP_COLOR;
      ctx.fillRect(-BANANA_RADIUS + 1, -1, 2, 2);
      ctx.fillRect(BANANA_RADIUS - 3, -1, 2, 2);

      ctx.restore();
    },

    drawExplosion(explosion) {
      // Expanding circle
      ctx.fillStyle = `rgba(255, 200, 50, ${1 - explosion.progress})`;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius * explosion.progress, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright core
      ctx.fillStyle = `rgba(255, 255, 200, ${0.8 - explosion.progress * 0.8})`;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius * explosion.progress * 0.5, 0, Math.PI * 2);
      ctx.fill();
    },

    drawParticles(particles) {
      for (const p of particles) {
        ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.alpha})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    },

    drawWindIndicator(wind) {
      const cx = CANVAS_WIDTH / 2;
      const y = 8;
      const maxArrows = 5;
      const arrowCount = Math.min(maxArrows, Math.ceil(Math.abs(wind) / 3));
      const dir = wind > 0 ? 1 : -1;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';

      let arrow = '';
      for (let i = 0; i < arrowCount; i++) {
        arrow += dir > 0 ? '>' : '<';
      }
      if (wind === 0) arrow = '-';
      ctx.fillText(arrow, cx, y + 4);
    },

    drawHUD(activePlayer, inputField, inputValue, lastInputs, scores, blinkOn) {
      ctx.font = '10px monospace';

      // Player labels
      for (let p = 0; p < 2; p++) {
        const x = p === 0 ? 8 : CANVAS_WIDTH - 100;
        const isActive = p === activePlayer;

        ctx.fillStyle = isActive ? '#FFFFFF' : '#888888';
        ctx.textAlign = 'left';
        ctx.fillText(`Player ${p + 1}`, x, 14);

        // Angle
        const angleLabel = 'Angle: ';
        let angleVal = '';
        if (isActive && inputField === 'angle') {
          angleVal = inputValue + (blinkOn ? '_' : ' ');
        } else if (lastInputs[p].angle !== null) {
          angleVal = String(lastInputs[p].angle);
          if (!isActive) ctx.fillStyle = '#555555';
        }
        ctx.fillText(angleLabel + angleVal, x, 28);

        // Velocity
        ctx.fillStyle = isActive ? '#FFFFFF' : '#888888';
        const velLabel = 'Vel:   ';
        let velVal = '';
        if (isActive && inputField === 'velocity') {
          velVal = inputValue + (blinkOn ? '_' : ' ');
        } else if (lastInputs[p].velocity !== null) {
          velVal = String(lastInputs[p].velocity);
          if (!isActive) ctx.fillStyle = '#555555';
        }
        ctx.fillText(velLabel + velVal, x, 42);
      }

      // Score
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${scores[0]}>${scores[0] + scores[1]}<${scores[1]}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 8);
    },

    drawBananaTracker(bananaX) {
      ctx.fillStyle = '#FFFF00';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      const x = Math.max(20, Math.min(CANVAS_WIDTH - 20, bananaX));
      ctx.fillText('\u25B2 BANANA', x, 10);
    },

    drawShotTrail(trail, alpha) {
      if (trail.length < 2) return;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.2 * alpha})`;
      for (let i = 0; i < trail.length; i += 3) {
        ctx.fillRect(trail[i].x, trail[i].y, 1, 1);
      }
    },

    drawAimPreview(gorilla, localAngle, playerIndex) {
      if (localAngle === null) return;
      const worldAngleDeg = playerIndex === 0 ? localAngle : 180 - localAngle;
      const rad = worldAngleDeg * Math.PI / 180;
      const len = 40;
      const ex = gorilla.x + Math.cos(rad) * len;
      const ey = gorilla.y - GORILLA_FRAME_SIZE / 2 - Math.sin(rad) * len;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(gorilla.x, gorilla.y - GORILLA_FRAME_SIZE / 2);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
    },

    drawTitleScreen(selectedIndex) {
      ctx.fillStyle = SKY_DAY_COLOR;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#FFFF00';
      ctx.font = '32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GORILLA WARS', CANVAS_WIDTH / 2, 120);

      const items = ['New Game', 'Settings', 'Fullscreen'];
      ctx.font = '14px monospace';
      items.forEach((item, i) => {
        ctx.fillStyle = i === selectedIndex ? '#FFFFFF' : '#888888';
        const prefix = i === selectedIndex ? '> ' : '  ';
        ctx.fillText(prefix + item, CANVAS_WIDTH / 2, 200 + i * 30);
      });
    },

    drawPauseMenu(selectedIndex) {
      // Dim overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', CANVAS_WIDTH / 2, 130);

      const items = ['Resume', 'Restart Round', 'Settings', 'Quit to Title'];
      ctx.font = '14px monospace';
      items.forEach((item, i) => {
        ctx.fillStyle = i === selectedIndex ? '#FFFFFF' : '#888888';
        const prefix = i === selectedIndex ? '> ' : '  ';
        ctx.fillText(prefix + item, CANVAS_WIDTH / 2, 180 + i * 28);
      });
    },

    drawSettingsMenu(settings, selectedIndex, editingCustom, customValue) {
      ctx.fillStyle = SKY_NIGHT_COLOR;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SETTINGS', CANVAS_WIDTH / 2, 60);

      const items = [
        `Rounds: < ${settings.rounds} >`,
        `Gravity: < ${settings.gravityPreset} (${settings.gravityPreset === 'Custom' ? settings.customGravity : ''}) >`,
        settings.gravityPreset === 'Custom' ? `Custom Gravity: ${editingCustom ? customValue + '_' : settings.customGravity}` : null,
        `Player 2: < ${settings.player2Mode} >`,
        `Shot Trail: < ${settings.shotTrail ? 'ON' : 'OFF'} >`,
        `Aim Preview: < ${settings.aimPreview ? 'ON' : 'OFF'} >`,
        `Volume: ${'='.repeat(Math.round(settings.volume * 10))}${'·'.repeat(10 - Math.round(settings.volume * 10))} ${Math.round(settings.volume * 100)}%`,
        'Back',
      ].filter(Boolean);

      ctx.font = '12px monospace';
      items.forEach((item, i) => {
        ctx.fillStyle = i === selectedIndex ? '#FFFFFF' : '#888888';
        const prefix = i === selectedIndex ? '> ' : '  ';
        ctx.fillText(prefix + item, CANVAS_WIDTH / 2, 110 + i * 24);
      });
    },

    drawRoundEnd(winner, scores) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#FFFF00';
      ctx.font = '18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Player ${winner + 1} scores!`, CANVAS_WIDTH / 2, 180);
      ctx.fillText(`${scores[0]} - ${scores[1]}`, CANVAS_WIDTH / 2, 210);
    },

    drawGameOver(scores) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#FFFF00';
      ctx.font = '24px monospace';
      ctx.textAlign = 'center';

      let text;
      if (scores[0] > scores[1]) text = 'Player 1 Wins!';
      else if (scores[1] > scores[0]) text = 'Player 2 Wins!';
      else text = 'Tie Game!';

      ctx.fillText(text, CANVAS_WIDTH / 2, 160);
      ctx.font = '16px monospace';
      ctx.fillText(`${scores[0]} - ${scores[1]}`, CANVAS_WIDTH / 2, 195);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px monospace';
      ctx.fillText('Press Enter to continue', CANVAS_WIDTH / 2, 240);
    },

    drawBuildingRise(buildings, progress) {
      // Buildings rise from bottom during ROUND_START animation
      for (const b of buildings) {
        const visibleHeight = b.height * progress;
        const drawY = CANVAS_HEIGHT - visibleHeight;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, drawY, b.width, visibleHeight);
      }
    },
  };
}
```

- [ ] **Step 2: Start the dev server and visually verify sky, sun, and building rendering**

Run: `cd gorilla-wars && bash serve.sh`
Open browser to `http://localhost:8080`. At this point main.js doesn't exist yet, so the page will be blank. This step is a checkpoint — visual testing happens after Task 10.

- [ ] **Step 3: Commit**

```bash
git add gorilla-wars/js/renderer.js
git commit -m "feat: add renderer with all canvas drawing functions"
```

---

### Task 10: Game Loop + State Machine

**Files:**
- Create: `gorilla-wars/js/main.js`

This is the orchestration module — ties all other modules together via a state machine and fixed-step game loop.

- [ ] **Step 1: Write main.js**

```javascript
// gorilla-wars/js/main.js
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, DT, STATE,
  VELOCITY_SCALE, GRAVITY_SCALE, WIND_SCALE,
  WIND_MIN, WIND_MAX,
  EXPLOSION_BUILDING_RADIUS, EXPLOSION_GORILLA_RADIUS,
  GORILLA_FRAME_SIZE, BANANA_RADIUS,
} from './constants.js';
import { loadSettings, saveSettings, getGravityValue } from './settings.js';
import { generateCity, initHeightmap, carveExplosion } from './buildings.js';
import { createProjectile, stepSimulation, checkCollisions } from './physics.js';
import { createInputHandler } from './input.js';
import { createGorillaSprites } from './sprites.js';
import { createAudioEngine } from './audio.js';
import { createRenderer } from './renderer.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// --- Module instances ---
const renderer = createRenderer(ctx);
const input = createInputHandler();
const audio = createAudioEngine();
let spriteFrames = [];
let settings = loadSettings();

// --- Game state ---
const game = {
  state: STATE.TITLE_SCREEN,
  previousState: null,
  round: 0,
  totalRounds: settings.rounds,
  scores: [0, 0],
  startingPlayer: 0,
  activePlayer: 0,
  wind: 0,
  isNight: false,
  buildings: [],
  heightmap: new Float64Array(CANVAS_WIDTH),
  gorillas: [
    { x: 0, y: 0, buildingIndex: 0, visible: true, frame: 0 },
    { x: 0, y: 0, buildingIndex: 0, visible: true, frame: 0 },
  ],
  banana: { x: 0, y: 0, vx: 0, vy: 0, prevX: 0, prevY: 0, rotation: 0, active: false },
  inputField: 'angle',
  inputValue: '',
  confirmedAngle: null,
  lastInputs: [{ angle: null, velocity: null }, { angle: null, velocity: null }],
  explosions: [],
  particles: [],
  shotTrail: [],
  previousTrail: [],
  trailAlpha: 1,
  celestialSurprised: false,
  celestialTimer: 0,
  menuIndex: 0,
  settingsIndex: 0,
  buildingAnimProgress: 0,
  roundEndTimer: 0,
  roundEndWinner: -1,
  aiThinkTimer: 0,
  blinkTimer: 0,
  blinkOn: true,
};

// --- Init ---
async function init() {
  spriteFrames = await createGorillaSprites();
  input.attach(canvas);

  // Unlock audio on first interaction
  const unlockAudio = () => {
    audio.unlock();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('keydown', unlockAudio);

  // Key handler
  input.onKey = (key) => handleKey(key);

  // Mouse handler for menus
  canvas.addEventListener('click', handleClick);

  // Start loop
  requestAnimationFrame(gameLoop);
}

// --- Game loop (fixed-step accumulator) ---
let lastTime = 0;
let accumulator = 0;
const MAX_FRAME_TIME = 0.25;

function gameLoop(currentTime) {
  requestAnimationFrame(gameLoop);

  if (lastTime === 0) { lastTime = currentTime; return; }

  const frameTime = Math.min((currentTime - lastTime) / 1000, MAX_FRAME_TIME);
  lastTime = currentTime;
  accumulator += frameTime;

  while (accumulator >= DT) {
    update(DT);
    accumulator -= DT;
  }

  const alpha = accumulator / DT;
  render(alpha);
}

// --- Update (per fixed timestep) ---
function update(dt) {
  game.blinkTimer += dt;
  if (game.blinkTimer >= 0.5) {
    game.blinkTimer -= 0.5;
    game.blinkOn = !game.blinkOn;
  }

  if (game.celestialSurprised) {
    game.celestialTimer -= dt;
    if (game.celestialTimer <= 0) game.celestialSurprised = false;
  }

  switch (game.state) {
    case STATE.ROUND_START:
      game.buildingAnimProgress += dt * 2; // 0.5s animation
      if (game.buildingAnimProgress >= 1) {
        game.buildingAnimProgress = 1;
        game.state = STATE.PLAYER_INPUT;
        resetInput();
        audio.playRoundStart();
      }
      break;

    case STATE.PLAYER_INPUT:
      handleAITurn(dt);
      break;

    case STATE.PROJECTILE_FLIGHT:
      updateProjectile(dt);
      break;

    case STATE.IMPACT:
      updateExplosions(dt);
      break;

    case STATE.ROUND_END:
      game.roundEndTimer -= dt;
      if (game.roundEndTimer <= 0) {
        game.round++;
        if (game.round >= game.totalRounds) {
          game.state = STATE.GAME_OVER;
        } else {
          startRound();
        }
      }
      break;
  }

  // Update particles
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.vy += 300 * dt; // particle gravity
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.alpha -= dt * 1.5;
    if (p.alpha <= 0) game.particles.splice(i, 1);
  }

  // Fade previous shot trail
  if (game.trailAlpha > 0 && game.state !== STATE.PROJECTILE_FLIGHT) {
    game.trailAlpha -= dt * 0.5;
    if (game.trailAlpha < 0) game.trailAlpha = 0;
  }
}

function updateProjectile(dt) {
  const gravitySim = getGravityValue(settings) * GRAVITY_SCALE;
  const windSim = game.wind * WIND_SCALE;

  stepSimulation(game.banana, gravitySim, windSim, dt);

  // Record trail
  game.shotTrail.push({ x: game.banana.x, y: game.banana.y });

  // Check collisions
  const result = checkCollisions(
    { x: game.banana.x, y: game.banana.y, radius: BANANA_RADIUS },
    game.heightmap,
    game.gorillas,
    renderer.getCelestialBounds()
  );

  switch (result.type) {
    case 'miss':
      game.banana.active = false;
      audio.playMiss();
      game.previousTrail = [...game.shotTrail];
      game.trailAlpha = 1;
      game.shotTrail = [];
      game.activePlayer = 1 - game.activePlayer;
      game.state = STATE.PLAYER_INPUT;
      resetInput();
      break;

    case 'building':
      game.banana.active = false;
      audio.playBuildingHit();
      spawnExplosion(result.x, result.y, EXPLOSION_BUILDING_RADIUS);
      carveExplosion(game.heightmap, result.x, result.y, EXPLOSION_BUILDING_RADIUS);
      game.previousTrail = [...game.shotTrail];
      game.trailAlpha = 1;
      game.shotTrail = [];
      game.state = STATE.IMPACT;
      break;

    case 'gorilla':
      game.banana.active = false;
      audio.playGorillaHit();
      game.gorillas[result.gorillaIndex].visible = false;
      spawnExplosion(result.x, result.y, EXPLOSION_GORILLA_RADIUS);
      carveExplosion(game.heightmap, result.x, result.y, EXPLOSION_GORILLA_RADIUS);
      game.previousTrail = [...game.shotTrail];
      game.trailAlpha = 1;
      game.shotTrail = [];
      game.roundEndWinner = game.activePlayer;
      game.state = STATE.IMPACT;
      break;

    case 'sunmoon':
      if (!game.celestialSurprised) {
        game.celestialSurprised = true;
        game.celestialTimer = 1.0;
        audio.playSunMoonSurprise();
      }
      break;

    case 'tracker':
      // Banana above viewport — continue simulation
      break;
  }
}

function updateExplosions(dt) {
  let allDone = true;
  for (const e of game.explosions) {
    e.progress += dt * 3; // ~0.33s explosion
    if (e.progress < 1) allDone = false;
  }

  if (allDone) {
    game.explosions = [];
    if (game.roundEndWinner >= 0) {
      // Gorilla hit — end round
      game.scores[game.roundEndWinner]++;
      audio.playVictory();
      // Show victory animation
      const winnerGorilla = game.gorillas[game.roundEndWinner];
      winnerGorilla.frame = 3; // victory
      game.roundEndTimer = 2.0;
      game.state = STATE.ROUND_END;
    } else {
      // Building hit — back to other player's input
      game.activePlayer = 1 - game.activePlayer;
      game.state = STATE.PLAYER_INPUT;
      resetInput();
    }
  }
}

function spawnExplosion(x, y, radius) {
  game.explosions.push({ x, y, radius, progress: 0 });

  // Spawn debris particles
  const count = radius > 30 ? 20 : 10;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 150;
    game.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 100,
      r: 180 + Math.floor(Math.random() * 75),
      g: 100 + Math.floor(Math.random() * 100),
      b: 50,
      alpha: 1,
      size: 2 + Math.random() * 3,
    });
  }
}

// --- Input handling ---
function handleKey(key) {
  switch (game.state) {
    case STATE.TITLE_SCREEN:
      handleMenuKey(key, ['new_game', 'settings', 'fullscreen'], game, 'menuIndex', handleTitleAction);
      break;

    case STATE.PLAYER_INPUT:
      if (key === 'Escape') { enterPause(); break; }
      if (isAITurn()) break;
      handlePlayerInputKey(key);
      break;

    case STATE.PROJECTILE_FLIGHT:
      if (key === 'Escape') enterPause();
      break;

    case STATE.PAUSED:
      handleMenuKey(key, ['resume', 'restart', 'settings', 'quit'], game, 'menuIndex', handlePauseAction);
      break;

    case STATE.GAME_OVER:
      if (key === 'Enter') {
        game.state = STATE.TITLE_SCREEN;
        game.menuIndex = 0;
      }
      break;

    // Settings menu handled separately (left/right to change values)
    case STATE.TITLE_SCREEN:
      break;
  }
}

function handleMenuKey(key, items, stateObj, indexKey, actionFn) {
  if (key === 'ArrowUp') {
    stateObj[indexKey] = (stateObj[indexKey] - 1 + items.length) % items.length;
    audio.playMenuSelect();
  } else if (key === 'ArrowDown') {
    stateObj[indexKey] = (stateObj[indexKey] + 1) % items.length;
    audio.playMenuSelect();
  } else if (key === 'Enter') {
    actionFn(items[stateObj[indexKey]]);
  }
}

function handleTitleAction(action) {
  switch (action) {
    case 'new_game':
      startNewGame();
      break;
    case 'settings':
      game.state = STATE.TITLE_SCREEN; // TODO: settings screen in Task 11
      break;
    case 'fullscreen':
      canvas.requestFullscreen?.();
      break;
  }
}

function handlePauseAction(action) {
  switch (action) {
    case 'resume':
      game.state = game.previousState;
      break;
    case 'restart':
      startRound();
      break;
    case 'settings':
      // TODO: settings from pause in Task 11
      break;
    case 'quit':
      game.state = STATE.TITLE_SCREEN;
      game.menuIndex = 0;
      break;
  }
}

function handlePlayerInputKey(key) {
  const result = input.processInputKey(key);
  if (key >= '0' && key <= '9') audio.playKeystroke();
  if (key === 'Backspace') audio.playKeystroke();

  if (result.type === 'angle_confirmed') {
    game.confirmedAngle = result.angle;
    game.lastInputs[game.activePlayer].angle = result.angle;
    game.inputField = 'velocity';
    game.inputValue = '';
  } else if (result.type === 'fire') {
    game.lastInputs[game.activePlayer].velocity = result.velocity;
    fireBanana(game.confirmedAngle, result.velocity);
  }

  game.inputField = input.state.field;
  game.inputValue = input.state.value;
}

function handleClick(e) {
  // Convert click coords to canvas space
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;
  const cx = (e.clientX - rect.left) * scaleX;
  const cy = (e.clientY - rect.top) * scaleY;

  // Menu item click detection
  if (game.state === STATE.TITLE_SCREEN) {
    const items = ['new_game', 'settings', 'fullscreen'];
    for (let i = 0; i < items.length; i++) {
      const itemY = 200 + i * 30;
      if (cy >= itemY - 12 && cy <= itemY + 4 && cx >= CANVAS_WIDTH / 2 - 80 && cx <= CANVAS_WIDTH / 2 + 80) {
        game.menuIndex = i;
        handleTitleAction(items[i]);
        break;
      }
    }
  } else if (game.state === STATE.PAUSED) {
    const items = ['resume', 'restart', 'settings', 'quit'];
    for (let i = 0; i < items.length; i++) {
      const itemY = 180 + i * 28;
      if (cy >= itemY - 12 && cy <= itemY + 4 && cx >= CANVAS_WIDTH / 2 - 80 && cx <= CANVAS_WIDTH / 2 + 80) {
        game.menuIndex = i;
        handlePauseAction(items[i]);
        break;
      }
    }
  }
}

// --- Game flow ---
function startNewGame() {
  settings = loadSettings();
  game.totalRounds = settings.rounds;
  game.round = 0;
  game.scores = [0, 0];
  game.startingPlayer = 0;
  game.activePlayer = 0;
  audio.setVolume(settings.volume);
  startRound();
}

function startRound() {
  game.isNight = Math.random() < 0.5;
  game.wind = WIND_MIN + Math.random() * (WIND_MAX - WIND_MIN);
  game.wind = Math.round(game.wind * 10) / 10;

  const { buildings, gorillas } = generateCity(game.isNight);
  game.buildings = buildings;
  game.heightmap = initHeightmap(buildings);

  game.gorillas[0] = { ...gorillas[0], visible: true, frame: 0 };
  game.gorillas[1] = { ...gorillas[1], visible: true, frame: 0 };

  game.banana.active = false;
  game.explosions = [];
  game.particles = [];
  game.shotTrail = [];
  game.previousTrail = [];
  game.trailAlpha = 0;
  game.celestialSurprised = false;
  game.roundEndWinner = -1;

  game.activePlayer = game.startingPlayer;
  game.startingPlayer = 1 - game.startingPlayer; // alternate next round

  game.buildingAnimProgress = 0;
  game.state = STATE.ROUND_START;
}

function fireBanana(angle, velocity) {
  const g = game.gorillas[game.activePlayer];
  const startY = g.y - GORILLA_FRAME_SIZE / 2; // launch from gorilla center
  game.banana = {
    ...createProjectile(g.x, startY, angle, velocity, game.activePlayer),
    rotation: 0,
    active: true,
  };

  // Throw animation: P1 throws right (frame 2), P2 throws left (frame 1)
  game.gorillas[game.activePlayer].frame = game.activePlayer === 0 ? 2 : 1;

  game.shotTrail = [];
  audio.playLaunch();
  game.state = STATE.PROJECTILE_FLIGHT;
}

function enterPause() {
  game.previousState = game.state;
  game.state = STATE.PAUSED;
  game.menuIndex = 0;
}

function resetInput() {
  input.resetInput();
  game.inputField = 'angle';
  game.inputValue = '';
  game.confirmedAngle = null;
  // Reset gorilla frame to idle
  game.gorillas[game.activePlayer].frame = 0;
}

function isAITurn() {
  return game.activePlayer === 1 && settings.player2Mode !== 'human';
}

function handleAITurn(dt) {
  if (!isAITurn()) return;
  // AI delay handled in Task 13
}

// --- Render ---
function render(alpha) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  switch (game.state) {
    case STATE.TITLE_SCREEN:
      renderer.drawTitleScreen(game.menuIndex);
      break;

    case STATE.ROUND_START:
      renderer.drawSky(game.isNight);
      renderer.drawSunMoon(game.isNight, game.celestialSurprised);
      renderer.drawBuildingRise(game.buildings, game.buildingAnimProgress);
      break;

    case STATE.PLAYER_INPUT:
    case STATE.PROJECTILE_FLIGHT:
    case STATE.IMPACT:
    case STATE.ROUND_END:
      drawGameScene(alpha);
      if (game.state === STATE.ROUND_END) {
        renderer.drawRoundEnd(game.roundEndWinner, game.scores);
      }
      break;

    case STATE.GAME_OVER:
      drawGameScene(alpha);
      renderer.drawGameOver(game.scores);
      break;

    case STATE.PAUSED:
      drawGameScene(alpha);
      renderer.drawPauseMenu(game.menuIndex);
      break;
  }
}

function drawGameScene(alpha) {
  renderer.drawSky(game.isNight);
  renderer.drawSunMoon(game.isNight, game.celestialSurprised);
  renderer.drawWindIndicator(game.wind);
  renderer.drawBuildingsFromHeightmap(game.buildings, game.heightmap);

  for (let i = 0; i < 2; i++) {
    renderer.drawGorilla(game.gorillas[i], spriteFrames, game.gorillas[i].frame);
  }

  // Shot trail (previous)
  if (game.trailAlpha > 0 && settings.shotTrail) {
    renderer.drawShotTrail(game.previousTrail, game.trailAlpha);
  }

  // Aim preview
  if (game.state === STATE.PLAYER_INPUT && settings.aimPreview && game.confirmedAngle !== null) {
    renderer.drawAimPreview(game.gorillas[game.activePlayer], game.confirmedAngle, game.activePlayer);
  }

  renderer.drawBanana(game.banana, alpha);

  // Banana tracker when above viewport
  if (game.banana.active && game.banana.y < 0) {
    renderer.drawBananaTracker(game.banana.x);
  }

  for (const e of game.explosions) renderer.drawExplosion(e);
  renderer.drawParticles(game.particles);

  renderer.drawHUD(
    game.activePlayer, game.inputField, game.inputValue,
    game.lastInputs, game.scores, game.blinkOn
  );
}

// --- Boot ---
init();
```

- [ ] **Step 2: Start dev server and verify title screen renders**

Run: `cd gorilla-wars && bash serve.sh`
Open `http://localhost:8080`. Expected: blue screen with "GORILLA WARS" title, three menu items. Arrow keys change selection highlight.

- [ ] **Step 3: Verify "New Game" starts a round**

Click "New Game" or press Enter. Expected: buildings draw-in animation plays, then gorillas appear on buildings with HUD showing player inputs.

- [ ] **Step 4: Verify typing angle/velocity fires a banana**

Type `45`, press Enter. Type `100`, press Enter. Expected: banana launches, arcs across screen with rotation. Collides with building or exits screen.

- [ ] **Step 5: Verify round scoring and game flow**

Play through a round — hit a gorilla. Expected: large explosion, score updates, round-end display, then new round starts.

- [ ] **Step 6: Verify pause menu**

During gameplay, press Escape. Expected: game pauses, dim overlay with menu. "Resume" resumes, "Quit to Title" returns to title.

- [ ] **Step 7: Commit**

```bash
git add gorilla-wars/js/main.js
git commit -m "feat: add game loop, state machine, and full gameplay integration"
```

---

### Task 11: Settings Menu

**Files:**
- Modify: `gorilla-wars/js/main.js`

Wire up the settings screen (rendering already exists in renderer.js). Add settings state handling, left/right value cycling, and custom gravity input.

- [ ] **Step 1: Add settings state management to main.js**

Add a `SETTINGS` value to the state handling. Replace the TODO comments in `handleTitleAction` and `handlePauseAction`:

```javascript
// Add to the game state object:
// settingsFrom: null, // 'title' or 'pause' — where settings was opened from
// settingsItems: [], // computed based on gravity preset
// customGravityInput: '',

// In handleTitleAction, replace the 'settings' case:
case 'settings':
  game.settingsFrom = 'title';
  game.settingsIndex = 0;
  game.customGravityInput = String(settings.customGravity);
  game.previousState = game.state;
  game.state = 'SETTINGS';
  break;

// In handlePauseAction, replace the 'settings' case:
case 'settings':
  game.settingsFrom = 'pause';
  game.settingsIndex = 0;
  game.customGravityInput = String(settings.customGravity);
  game.previousState = game.state;
  game.state = 'SETTINGS';
  break;
```

- [ ] **Step 2: Add settings key handler**

Add a case for `'SETTINGS'` in `handleKey`:

```javascript
case 'SETTINGS':
  handleSettingsKey(key);
  break;
```

Add the handler function:

```javascript
function handleSettingsKey(key) {
  const roundOptions = [1, 3, 5, 10];
  const p2Options = ['human', 'ai_easy', 'ai_medium', 'ai_hard'];
  const gravityNames = [...GRAVITY_PRESETS.map(p => p.name), 'Custom'];
  const showCustom = settings.gravityPreset === 'Custom';
  const itemCount = showCustom ? 8 : 7; // rounds, gravity, [custom], p2, trail, aim, volume, back

  if (key === 'ArrowUp') {
    game.settingsIndex = (game.settingsIndex - 1 + itemCount) % itemCount;
    audio.playMenuSelect();
  } else if (key === 'ArrowDown') {
    game.settingsIndex = (game.settingsIndex + 1) % itemCount;
    audio.playMenuSelect();
  } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const dir = key === 'ArrowRight' ? 1 : -1;
    let idx = game.settingsIndex;
    // Adjust index for hidden custom gravity row
    if (!showCustom && idx >= 2) idx++; // skip the custom row slot

    switch (idx) {
      case 0: { // Rounds
        const ci = roundOptions.indexOf(settings.rounds);
        settings.rounds = roundOptions[(ci + dir + roundOptions.length) % roundOptions.length];
        break;
      }
      case 1: { // Gravity preset
        const ci = gravityNames.indexOf(settings.gravityPreset);
        settings.gravityPreset = gravityNames[(ci + dir + gravityNames.length) % gravityNames.length];
        break;
      }
      case 3: { // Player 2
        const ci = p2Options.indexOf(settings.player2Mode);
        settings.player2Mode = p2Options[(ci + dir + p2Options.length) % p2Options.length];
        break;
      }
      case 4: // Shot trail
        settings.shotTrail = !settings.shotTrail;
        break;
      case 5: // Aim preview
        settings.aimPreview = !settings.aimPreview;
        break;
      case 6: // Volume
        settings.volume = Math.max(0, Math.min(1, Math.round((settings.volume + dir * 0.1) * 10) / 10));
        audio.setVolume(settings.volume);
        break;
    }
    saveSettings(settings);
  } else if (key === 'Enter') {
    let idx = game.settingsIndex;
    if (!showCustom && idx >= 2) idx++;
    if (idx === 7 || (!showCustom && game.settingsIndex === itemCount - 1)) {
      // Back
      game.state = game.settingsFrom === 'pause' ? STATE.PAUSED : STATE.TITLE_SCREEN;
      game.menuIndex = 0;
    }
  } else if (key >= '0' && key <= '9' || key === '.' || key === 'Backspace') {
    // Custom gravity text input
    if (showCustom && game.settingsIndex === 2) {
      if (key === 'Backspace') {
        game.customGravityInput = game.customGravityInput.slice(0, -1);
      } else if (key === '.') {
        if (!game.customGravityInput.includes('.')) game.customGravityInput += '.';
      } else {
        // Allow up to 2 decimal places
        const parts = game.customGravityInput.split('.');
        if (!parts[1] || parts[1].length < 2) {
          game.customGravityInput += key;
        }
      }
      const val = parseFloat(game.customGravityInput);
      if (!isNaN(val) && val >= 0.1) {
        settings.customGravity = val;
        saveSettings(settings);
      }
    }
  }
}
```

- [ ] **Step 3: Add settings rendering to the render switch**

In the `render` function, add:

```javascript
case 'SETTINGS':
  renderer.drawSettingsMenu(settings, game.settingsIndex, settings.gravityPreset === 'Custom', game.customGravityInput);
  break;
```

- [ ] **Step 4: Verify settings screen works**

Start game, open Settings. Expected: can cycle rounds, gravity, player 2 mode with arrow keys. Volume changes audibly. Back returns to title. Custom gravity accepts decimal input.

- [ ] **Step 5: Commit**

```bash
git add gorilla-wars/js/main.js
git commit -m "feat: add settings menu with all options and persistence"
```

---

### Task 12: AI Opponent

**Files:**
- Create: `gorilla-wars/js/ai.js`
- Create: `gorilla-wars/tests/ai.test.js`
- Modify: `gorilla-wars/js/main.js` (wire AI into game loop)

- [ ] **Step 1: Write the failing test**

```javascript
// gorilla-wars/tests/ai.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { calculateAIShot } from '../js/ai.js';
import { GRAVITY_SCALE, WIND_SCALE, CANVAS_WIDTH, CANVAS_HEIGHT } from '../js/constants.js';

describe('calculateAIShot', () => {
  const heightmap = new Float64Array(CANVAS_WIDTH).fill(CANVAS_HEIGHT);
  // Two buildings at y=250
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
    // Run multiple times — hard should be more consistent
    const hardShots = [];
    const easyShots = [];
    for (let i = 0; i < 20; i++) {
      hardShots.push(calculateAIShot(targetGorilla, aiGorilla, 0, gravitySim, heightmap, 'hard', null));
      easyShots.push(calculateAIShot(targetGorilla, aiGorilla, 0, gravitySim, heightmap, 'easy', null));
    }
    // Easy should have more variance than hard
    const hardAngleVar = variance(hardShots.map(s => s.angle));
    const easyAngleVar = variance(easyShots.map(s => s.angle));
    assert.ok(easyAngleVar > hardAngleVar, 'easy should have more angle variance than hard');
  });

  it('accounts for wind', () => {
    const noWind = calculateAIShot(targetGorilla, aiGorilla, 0, gravitySim, heightmap, 'hard', null);
    const withWind = calculateAIShot(targetGorilla, aiGorilla, 10, gravitySim, heightmap, 'hard', null);
    // With strong rightward wind (helping P2 throw left), angle or velocity should differ
    assert.ok(noWind.angle !== withWind.angle || noWind.velocity !== withWind.velocity,
      'wind should change the AI shot');
  });
});

function variance(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd gorilla-wars && node --test tests/ai.test.js`
Expected: FAIL — `ai.js` does not exist.

- [ ] **Step 3: Write ai.js**

```javascript
// gorilla-wars/js/ai.js
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, DT,
  VELOCITY_SCALE, WIND_SCALE, BANANA_RADIUS,
  GORILLA_COLLISION_WIDTH, GORILLA_COLLISION_HEIGHT,
  AI_DIFFICULTY,
} from './constants.js';

/**
 * Find best shot using coarse-to-fine simulation search.
 * @param {{ x: number, y: number }} target
 * @param {{ x: number, y: number }} aiGorilla
 * @param {number} displayedWind
 * @param {number} gravitySim px/s²
 * @param {Float64Array} heightmap
 * @param {'easy'|'medium'|'hard'} difficulty
 * @param {{ angle: number, velocity: number, missDirection: number }|null} lastShot
 * @returns {{ angle: number, velocity: number }}
 */
export function calculateAIShot(target, aiGorilla, displayedWind, gravitySim, heightmap, difficulty, lastShot) {
  const windSim = displayedWind * WIND_SCALE;

  // Coarse sweep: 5° steps, velocity steps of 10
  let bestAngle = 45;
  let bestVelocity = 100;
  let bestDist = Infinity;

  for (let angle = 5; angle <= 85; angle += 5) {
    for (let vel = 20; vel <= 200; vel += 10) {
      const dist = simulateShot(aiGorilla, angle, vel, 1, gravitySim, windSim, heightmap, target);
      if (dist < bestDist) {
        bestDist = dist;
        bestAngle = angle;
        bestVelocity = vel;
      }
    }
  }

  // Fine sweep: ±5° in 1° steps, ±10 velocity in 2 steps
  let fineAngle = bestAngle;
  let fineVel = bestVelocity;
  let fineDist = bestDist;

  for (let angle = bestAngle - 5; angle <= bestAngle + 5; angle++) {
    if (angle < 0 || angle > 90) continue;
    for (let vel = bestVelocity - 10; vel <= bestVelocity + 10; vel += 2) {
      if (vel < 1 || vel > 200) continue;
      const dist = simulateShot(aiGorilla, angle, vel, 1, gravitySim, windSim, heightmap, target);
      if (dist < fineDist) {
        fineDist = dist;
        fineAngle = angle;
        fineVel = vel;
      }
    }
  }

  // Apply error
  const diff = AI_DIFFICULTY[difficulty];
  const angleError = (Math.random() * 2 - 1) * diff.angleError;
  const velError = 1 + (Math.random() * 2 - 1) * diff.velocityError;

  // Nudge toward target after miss
  let nudgeAngle = 0;
  let nudgeVel = 0;
  if (lastShot && lastShot.missDirection !== 0) {
    nudgeAngle = lastShot.missDirection * 2; // small correction
    nudgeVel = lastShot.missDirection * 5;
  }

  const finalAngle = Math.max(0, Math.min(90, Math.round(fineAngle + angleError + nudgeAngle)));
  const finalVel = Math.max(1, Math.min(200, Math.round(fineVel * velError + nudgeVel)));

  return { angle: finalAngle, velocity: finalVel };
}

/**
 * Simulate a shot and return distance to target.
 * @returns {number} distance in pixels to target gorilla center
 */
function simulateShot(aiGorilla, localAngle, displayedVelocity, playerIndex, gravitySim, windSim, heightmap, target) {
  const worldAngleDeg = playerIndex === 0 ? localAngle : 180 - localAngle;
  const worldAngleRad = worldAngleDeg * Math.PI / 180;
  const speed = displayedVelocity * VELOCITY_SCALE;

  let x = aiGorilla.x;
  let y = aiGorilla.y - 16; // launch from gorilla center
  let vx = speed * Math.cos(worldAngleRad);
  let vy = -speed * Math.sin(worldAngleRad);

  const maxSteps = 600; // 10 seconds at 60fps
  for (let i = 0; i < maxSteps; i++) {
    x += vx * DT + 0.5 * windSim * DT * DT;
    y += vy * DT + 0.5 * gravitySim * DT * DT;
    vx += windSim * DT;
    vy += gravitySim * DT;

    // Out of bounds
    if (x < 0 || x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT) {
      return Math.sqrt((x - target.x) ** 2 + (y - target.y) ** 2);
    }

    const col = Math.floor(x);
    if (col >= 0 && col < CANVAS_WIDTH) {
      // Hit terrain
      if (y + BANANA_RADIUS >= heightmap[col]) {
        return Math.sqrt((x - target.x) ** 2 + (y - target.y) ** 2);
      }

      // Hit target gorilla
      const dx = Math.abs(x - target.x);
      const dy = Math.abs(y - (target.y - GORILLA_COLLISION_HEIGHT / 2));
      if (dx < GORILLA_COLLISION_WIDTH / 2 + BANANA_RADIUS &&
          dy < GORILLA_COLLISION_HEIGHT / 2 + BANANA_RADIUS) {
        return 0; // Direct hit
      }
    }
  }

  return Infinity; // Never landed
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd gorilla-wars && node --test tests/ai.test.js`
Expected: All 3 tests PASS.

- [ ] **Step 5: Wire AI into main.js**

Add to `main.js` imports:

```javascript
import { calculateAIShot } from './ai.js';
```

Replace the `handleAITurn` function:

```javascript
function handleAITurn(dt) {
  if (!isAITurn()) return;

  game.aiThinkTimer += dt;
  if (game.aiThinkTimer < 0.8) return; // simulated thinking delay

  const difficulty = settings.player2Mode.replace('ai_', '');
  const gravitySim = getGravityValue(settings) * GRAVITY_SCALE;
  const shot = calculateAIShot(
    game.gorillas[0], // target (P1)
    game.gorillas[1], // AI gorilla (P2)
    game.wind,
    gravitySim,
    game.heightmap,
    difficulty,
    game.aiLastShot || null
  );

  game.lastInputs[1].angle = shot.angle;
  game.lastInputs[1].velocity = shot.velocity;
  game.confirmedAngle = shot.angle;
  fireBanana(shot.angle, shot.velocity);

  // Track for miss adjustment
  game.aiLastShot = { angle: shot.angle, velocity: shot.velocity, missDirection: 0 };
  game.aiThinkTimer = 0;
}
```

Also add `aiLastShot: null` and `aiThinkTimer: 0` to the game state object, and reset `aiThinkTimer = 0` in `resetInput`.

- [ ] **Step 6: Verify AI plays against you**

Open settings, set Player 2 to "AI Hard". Start a new game. Expected: AI thinks briefly, then fires. Shots should be reasonably aimed at your gorilla.

- [ ] **Step 7: Commit**

```bash
git add gorilla-wars/js/ai.js gorilla-wars/tests/ai.test.js gorilla-wars/js/main.js
git commit -m "feat: add AI opponent with coarse-to-fine simulation search"
```

---

### Task 13: QoL Features + Polish

**Files:**
- Modify: `gorilla-wars/js/main.js`
- Modify: `gorilla-wars/js/renderer.js`

This task enables the remaining QoL features. Most rendering code already exists — this wires it into the game flow.

- [ ] **Step 1: Wire aim preview to update during angle input**

In `handlePlayerInputKey` in main.js, after the angle is confirmed, store it for the preview. Also show preview during angle typing (using the current typed value):

```javascript
// In handlePlayerInputKey, before the existing result handling:
if (game.inputField === 'angle' && game.inputValue !== '') {
  game.aimPreviewAngle = Math.max(0, Math.min(90, parseInt(game.inputValue, 10) || 0));
}
```

In `drawGameScene`, update the aim preview call to use `aimPreviewAngle` instead of `confirmedAngle`, and show it during angle entry too:

```javascript
if (game.state === STATE.PLAYER_INPUT && settings.aimPreview) {
  const previewAngle = game.inputField === 'angle' ? game.aimPreviewAngle : game.confirmedAngle;
  if (previewAngle !== null && previewAngle !== undefined) {
    renderer.drawAimPreview(game.gorillas[game.activePlayer], previewAngle, game.activePlayer);
  }
}
```

- [ ] **Step 2: Wire shot trail display**

The shot trail recording and previous trail display are already implemented in `updateProjectile` and `drawGameScene`. Verify the trail renders as faint dots by playing a round with Shot Trail ON in settings.

Expected: after a shot, a faint dotted trail of the banana's arc persists briefly, then fades.

- [ ] **Step 3: Wire banana tracker**

Already implemented in `drawGameScene` — when `banana.y < 0`, the tracker arrow shows. Verify by firing a shot at high angle/low gravity (switch to Moon gravity in settings).

Expected: when banana goes off-screen above, "▲ BANANA" tracks horizontally along the top edge.

- [ ] **Step 4: Wire fullscreen button**

The Fullscreen API call already exists in `handleTitleAction`. Verify it works by clicking "Fullscreen" on the title screen.

Expected: game enters fullscreen, fills screen while maintaining 640:400 aspect ratio, pixel-art stays crisp.

- [ ] **Step 5: Verify AI miss nudge tracking**

In `updateProjectile`, when the projectile misses, calculate miss direction for AI adjustment:

```javascript
// In the 'miss' case of updateProjectile, before switching player:
if (isAITurn() && game.aiLastShot) {
  const targetX = game.gorillas[0].x;
  game.aiLastShot.missDirection = game.banana.x < targetX ? -1 : 1;
}
```

- [ ] **Step 6: Commit**

```bash
git add gorilla-wars/js/main.js gorilla-wars/js/renderer.js
git commit -m "feat: wire QoL features — aim preview, shot trail, banana tracker, fullscreen"
```

---

### Task 14: Final Integration + Verification

**Files:**
- Modify: `gorilla-wars/js/main.js` (any remaining edge cases)

- [ ] **Step 1: Run all unit tests**

Run: `cd gorilla-wars && npm test`
Expected: All tests pass (constants, settings, buildings, physics, ai).

- [ ] **Step 2: Full playtest checklist**

Manually verify each spec requirement by playing the game:

- [ ] Title screen shows "GORILLA WARS", menu items navigable with arrows + Enter + mouse
- [ ] Settings: rounds, gravity, P2 mode, trail, preview, volume all changeable and persisted
- [ ] Round start: buildings draw-in animation, random day/night, random wind
- [ ] Gorillas placed on 1st–4th buildings from each edge
- [ ] Player input: digits + backspace only, Enter confirms angle then velocity, empty Enter ignored
- [ ] Angle clamped 0–90, velocity clamped 1–200
- [ ] Player 2 input appears on right side (mirrored HUD)
- [ ] Banana arcs with rotation, wind affects trajectory
- [ ] Building hit: small explosion, crater visible in building, sound plays
- [ ] Gorilla hit: large explosion, gorilla hidden, terrain cratered
- [ ] Scoring: 1 point for hit, round ends, alternating starter
- [ ] Match ends after configured rounds, shows winner/tie
- [ ] Pause: Escape pauses, Resume/Restart Round/Settings/Quit to Title all work
- [ ] AI: Easy is inaccurate, Hard is near-perfect, AI adjusts after misses
- [ ] QoL: shot trail visible, aim preview shows direction, banana tracker works above viewport
- [ ] Sun/moon surprised face on banana pass
- [ ] Wind indicator arrows scale with strength
- [ ] Score format: `P1>Total<P2` at bottom center
- [ ] Fullscreen via title screen button

- [ ] **Step 3: Fix any issues found in playtest**

Address any bugs or visual issues found during the checklist. Each fix should be a small, targeted change.

- [ ] **Step 4: Commit**

```bash
git add -A gorilla-wars/
git commit -m "feat: complete gorilla-wars game — full spec implementation"
```

---

## Self-Review Notes

**Spec coverage:** Every section of the spec maps to at least one task. Physics (terrain, simulation, collision, gravity presets) → Tasks 2, 4, 5. Visual design (sky, buildings, gorillas, banana, explosions, sun/moon, HUD) → Tasks 6, 9. Game flow (all states) → Task 10. AI → Task 12. Audio → Task 8. Settings → Tasks 3, 11. QoL → Task 13. Input → Task 7. Menus → Tasks 10, 11.

**Type consistency verified:** `Projectile` shape in physics.js matches usage in main.js. `Building` shape in buildings.js matches renderer.js drawing code. `GorillaPlacement` fields (`x`, `y`, `buildingIndex`) match game state gorilla objects. `CollisionResult` types match switch cases in main.js. AI function signature matches call site in main.js.

**No placeholders:** Every code step contains complete, runnable code. No TBDs, TODOs (except two clearly marked wire-up points in Task 10 that are completed in Task 11), or "similar to above" references.
