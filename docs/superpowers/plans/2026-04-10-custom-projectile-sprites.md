# Custom Projectile Sprites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a settings-menu-selectable projectile system with 16x16 sprites, scaling the existing procedural banana to match.

**Architecture:** Update `BANANA_RADIUS` from 4 to 8 so collision matches the 16x16 visual size. Rename `drawBanana` to `drawProjectile` with an optional sprite parameter. Add a `projectile` setting that cycles through `PROJECTILE_OPTIONS`. For now only "Banana" (procedural) is available; future projectiles just need a PNG and a name added to the options array.

**Tech Stack:** Vanilla JS, Canvas 2D, Node.js test runner

**Spec:** `docs/superpowers/specs/2026-04-10-custom-projectile-sprites-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `gorilla-wars/js/constants.js` | Modify | Update `BANANA_RADIUS`, add `PROJECTILE_SPRITE_SIZE`, `PROJECTILE_OPTIONS` |
| `gorilla-wars/js/settings.js` | Modify | Add `projectile` to `DEFAULT_SETTINGS` |
| `gorilla-wars/js/sprites.js` | Modify | Add `loadProjectileSprite()` |
| `gorilla-wars/js/renderer.js` | Modify | Rename `drawBanana` -> `drawProjectile`, scale procedural banana, add sprite path, update tracker label |
| `gorilla-wars/js/main.js` | Modify | Wire settings, sprite loading, renderer calls |
| `gorilla-wars/tests/constants.test.js` | Modify | Update `BANANA_RADIUS` assertion, add new constant assertions |

---

### Task 1: Update constants and fix test

**Files:**
- Modify: `gorilla-wars/js/constants.js:36` and after line 82
- Modify: `gorilla-wars/tests/constants.test.js:32-34`

- [ ] **Step 1: Update the test to expect new constants**

In `gorilla-wars/tests/constants.test.js`, change the banana radius test and add new constant tests:

```js
  it('exports banana radius', () => {
    assert.equal(C.BANANA_RADIUS, 8);
  });

  it('exports projectile sprite size', () => {
    assert.equal(C.PROJECTILE_SPRITE_SIZE, 16);
  });

  it('exports projectile options with Banana as first entry', () => {
    assert.ok(Array.isArray(C.PROJECTILE_OPTIONS));
    assert.equal(C.PROJECTILE_OPTIONS[0], 'Banana');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test gorilla-wars/tests/constants.test.js`
Expected: FAIL — `BANANA_RADIUS` is 4 not 8, `PROJECTILE_SPRITE_SIZE` and `PROJECTILE_OPTIONS` not defined

- [ ] **Step 3: Update constants.js**

In `gorilla-wars/js/constants.js`, change line 36:

```js
export const BANANA_RADIUS = 8;
```

After the `BANANA_TIP_COLOR` line (82), add:

```js
export const PROJECTILE_SPRITE_SIZE = 16;
export const PROJECTILE_OPTIONS = ['Banana'];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test gorilla-wars/tests/constants.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add gorilla-wars/js/constants.js gorilla-wars/tests/constants.test.js
git commit -m "feat: update BANANA_RADIUS to 8, add PROJECTILE_SPRITE_SIZE and PROJECTILE_OPTIONS"
```

---

### Task 2: Add projectile to settings

**Files:**
- Modify: `gorilla-wars/js/settings.js:5-15`

- [ ] **Step 1: Add projectile to DEFAULT_SETTINGS**

In `gorilla-wars/js/settings.js`, add `projectile: 'Banana',` after the `dynamicAimPreview` line (line 13), so `DEFAULT_SETTINGS` becomes:

```js
export const DEFAULT_SETTINGS = {
  rounds: 3,
  gravityPreset: DEFAULT_GRAVITY_PRESET,
  customGravity: 9.8,
  player2Mode: 'human',
  inputMethod: 'classic',
  shotTrail: true,
  aimPreview: false,
  dynamicAimPreview: false,
  projectile: 'Banana',
  volume: 0.5,
};
```

- [ ] **Step 2: Commit**

```bash
git add gorilla-wars/js/settings.js
git commit -m "feat: add projectile setting with Banana default"
```

---

### Task 3: Add loadProjectileSprite to sprites.js

**Files:**
- Modify: `gorilla-wars/js/sprites.js`

- [ ] **Step 1: Add the loadProjectileSprite function**

Append to `gorilla-wars/js/sprites.js` after the existing `createGorillaSprites` function:

```js
export async function loadProjectileSprite(name) {
  if (name === 'Banana') return null;
  const src = `assets/images/projectile-${name.toLowerCase()}.png`;
  const img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`Failed to load projectile sprite: ${src}, falling back to default`);
      resolve(null);
    };
    img.src = src;
  });
}
```

Note: on load failure it resolves `null` (falls back to procedural banana) rather than rejecting — a missing sprite should never crash the game.

- [ ] **Step 2: Commit**

```bash
git add gorilla-wars/js/sprites.js
git commit -m "feat: add loadProjectileSprite with fallback to procedural banana"
```

---

### Task 4: Update renderer — drawProjectile and drawBananaTracker

**Files:**
- Modify: `gorilla-wars/js/renderer.js:2-15` (imports)
- Modify: `gorilla-wars/js/renderer.js:140-163` (drawBanana -> drawProjectile)
- Modify: `gorilla-wars/js/renderer.js:460-466` (drawBananaTracker)

- [ ] **Step 1: Add PROJECTILE_SPRITE_SIZE to the import**

In `gorilla-wars/js/renderer.js`, update the import block (line 6) to include `PROJECTILE_SPRITE_SIZE`:

```js
  BANANA_COLOR, BANANA_TIP_COLOR, BANANA_RADIUS, PROJECTILE_SPRITE_SIZE,
```

- [ ] **Step 2: Replace drawBanana with drawProjectile**

Replace the `drawBanana` method (lines 140-163) with:

```js
    drawProjectile(banana, alpha, sprite) {
      if (!banana.active) return;
      // Interpolate position for smooth rendering
      const rx = banana.prevX + (banana.x - banana.prevX) * alpha;
      const ry = banana.prevY + (banana.y - banana.prevY) * alpha;

      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(banana.rotation);

      if (sprite) {
        // Custom sprite: draw 16x16 centered
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite,
          -PROJECTILE_SPRITE_SIZE / 2, -PROJECTILE_SPRITE_SIZE / 2,
          PROJECTILE_SPRITE_SIZE, PROJECTILE_SPRITE_SIZE);
        ctx.imageSmoothingEnabled = true;
      } else {
        // Procedural banana scaled to BANANA_RADIUS (8)
        ctx.fillStyle = BANANA_COLOR;
        ctx.beginPath();
        ctx.arc(0, 0, BANANA_RADIUS, 0.3, Math.PI - 0.3);
        ctx.arc(0, -2, BANANA_RADIUS - 3, Math.PI - 0.3, 0.3, true);
        ctx.fill();

        // Tips
        ctx.fillStyle = BANANA_TIP_COLOR;
        ctx.fillRect(-BANANA_RADIUS + 2, -2, 4, 4);
        ctx.fillRect(BANANA_RADIUS - 6, -2, 4, 4);
      }

      ctx.restore();
    },
```

- [ ] **Step 3: Update drawBananaTracker to accept a label**

Replace the `drawBananaTracker` method (lines 460-466) with:

```js
    drawBananaTracker(bananaX, label) {
      ctx.fillStyle = '#FFFF00';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      const x = Math.max(20, Math.min(CANVAS_WIDTH - 20, bananaX));
      ctx.fillText('\u25B2 ' + (label || 'BANANA'), x, 10);
    },
```

- [ ] **Step 4: Commit**

```bash
git add gorilla-wars/js/renderer.js
git commit -m "feat: rename drawBanana to drawProjectile with sprite support, scale procedural banana to 16px"
```

---

### Task 5: Wire everything in main.js

**Files:**
- Modify: `gorilla-wars/js/main.js:1-24` (imports)
- Modify: `gorilla-wars/js/main.js:45` (module instances — add projectileSprite variable)
- Modify: `gorilla-wars/js/main.js:473-491` (getSettingsItemCount / getSettingsItemName)
- Modify: `gorilla-wars/js/main.js:593-617` (handleSettingsKey cycling)
- Modify: `gorilla-wars/js/renderer.js:593-604` via `main.js:1139-1143` (settings menu items — this is in renderer.js but called from main.js)
- Modify: `gorilla-wars/js/main.js:1209` (drawBanana call)
- Modify: `gorilla-wars/js/main.js:1213` (drawBananaTracker call)

- [ ] **Step 1: Update imports in main.js**

In `gorilla-wars/js/main.js`, add `PROJECTILE_OPTIONS` to the constants import (line 2-16):

```js
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, DT, STATE,
  VELOCITY_SCALE, GRAVITY_SCALE, WIND_SCALE,
  WIND_MIN, WIND_MAX,
  EXPLOSION_BUILDING_RADIUS, EXPLOSION_GORILLA_RADIUS,
  GORILLA_FRAME_SIZE, BANANA_RADIUS,
  GORILLA_COLLISION_WIDTH, GORILLA_COLLISION_HEIGHT,
  GRAVITY_PRESETS, PROJECTILE_OPTIONS,
  DEFAULT_ANGLE, DEFAULT_VELOCITY, VELOCITY_MAX,
  INPUT_BAR_Y, INPUT_BAR_HEIGHT,
  SLIDER_THUMB_HIT_RADIUS,
  MENU_BUTTON_MIN_H,
  SETTINGS_ROW_H, SETTINGS_ROW_GAP, SETTINGS_ARROW_W, SETTINGS_ARROW_HIT,
  PAUSE_BUTTON_CX, PAUSE_BUTTON_CY, PAUSE_BUTTON_HIT_RADIUS,
} from './constants.js';
```

Add `loadProjectileSprite` to the sprites import (line 21):

```js
import { createGorillaSprites, loadProjectileSprite } from './sprites.js';
```

- [ ] **Step 2: Add projectileSprite variable**

After `let settings = loadSettings();` (line 46), add:

```js
let projectileSprite = null;
```

- [ ] **Step 3: Update getSettingsItemCount and getSettingsItemName**

Replace `getSettingsItemCount` (line 473-475):

```js
function getSettingsItemCount() {
  return settings.gravityPreset === 'Custom' ? 11 : 10;
}
```

Replace `getSettingsItemName` (lines 477-492) — add `'projectile'` after `'dynamicAimPreview'`:

```js
function getSettingsItemName(index) {
  const isCustom = settings.gravityPreset === 'Custom';
  const items = [
    'inputMethod',
    'rounds',
    'gravityPreset',
    ...(isCustom ? ['customGravity'] : []),
    'player2Mode',
    'shotTrail',
    'aimPreview',
    'dynamicAimPreview',
    'projectile',
    'volume',
    'back',
  ];
  return items[index] || null;
}
```

- [ ] **Step 4: Add cycling logic in handleSettingsKey**

In the `switch (itemName)` block inside `handleSettingsKey`, add a new case before the `'volume'` case (before line 609):

```js
    case 'projectile': {
      const idx = PROJECTILE_OPTIONS.indexOf(settings.projectile);
      const newIdx = (idx + dir + PROJECTILE_OPTIONS.length) % PROJECTILE_OPTIONS.length;
      settings.projectile = PROJECTILE_OPTIONS[newIdx];
      loadProjectileSprite(settings.projectile).then(img => { projectileSprite = img; });
      break;
    }
```

- [ ] **Step 5: Add Projectile row to drawSettingsMenu items in renderer.js**

In `gorilla-wars/js/renderer.js`, in the `drawSettingsMenu` method, add the Projectile row after the Dynamic Aim row (after line 601) and before the Volume row:

```js
        { label: 'Projectile', value: settings.projectile, cycle: true },
```

So the items array becomes:

```js
      const items = [
        { label: 'Input', value: settings.inputMethod === 'sliders' ? 'Sliders' : 'Classic', cycle: true },
        { label: 'Rounds', value: String(settings.rounds), cycle: true },
        { label: 'Gravity', value: `${settings.gravityPreset} (${settings.gravityPreset === 'Custom' ? settings.customGravity : (GRAVITY_PRESETS.find(p => p.name === settings.gravityPreset)?.gravity ?? '')})`, cycle: true },
        ...(settings.gravityPreset === 'Custom' ? [{ label: 'Custom G', value: editingCustom ? customValue + '_' : String(settings.customGravity), cycle: false }] : []),
        { label: 'Player 2', value: settings.player2Mode, cycle: true },
        { label: 'Shot Trail', value: settings.shotTrail ? 'ON' : 'OFF', cycle: true },
        { label: 'Aim Preview', value: settings.aimPreview ? 'ON' : 'OFF', cycle: true },
        { label: 'Dynamic Aim', value: settings.dynamicAimPreview ? 'ON' : 'OFF', cycle: true },
        { label: 'Projectile', value: settings.projectile, cycle: true },
        { label: 'Volume', value: null, volume: settings.volume, cycle: true },
        { label: 'Back', value: null, cycle: false, isBack: true },
      ];
```

- [ ] **Step 6: Update render calls in main.js**

Replace `renderer.drawBanana(game.banana, alpha);` (line 1209) with:

```js
  renderer.drawProjectile(game.banana, alpha, projectileSprite);
```

Replace `renderer.drawBananaTracker(game.banana.x);` (line 1213) with:

```js
    renderer.drawBananaTracker(game.banana.x, settings.projectile.toUpperCase());
```

- [ ] **Step 7: Run all tests**

Run: `node --test gorilla-wars/tests/constants.test.js`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add gorilla-wars/js/main.js gorilla-wars/js/renderer.js
git commit -m "feat: wire projectile setting into menu, sprite loading, and render calls"
```

---

### Task 6: Manual smoke test

- [ ] **Step 1: Open the game in a browser and verify:**
  - Settings menu shows "Projectile: Banana" row with left/right arrows
  - The procedural banana is visibly larger than before (~16px vs ~8px)
  - Banana rotates during flight as before
  - Collision detection still works — bananas hit buildings and gorillas
  - The overhead tracker shows "BANANA" when the projectile is above screen
  - AI opponent still works correctly (its shots connect)
