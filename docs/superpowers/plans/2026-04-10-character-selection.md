# Character Selection & Scrollable Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add selectable character sprites with settings menu previews and make the settings menu scrollable.

**Architecture:** New `CHARACTER_OPTIONS` constant drives a cycling selector (same pattern as `PROJECTILE_OPTIONS`). `createGorillaSprites` is renamed to `createCharacterSprites` with a name parameter and gorilla fallback. The settings menu switches to uniform 36px rows, renders only a visible window of items with clip rect, and draws sprite previews for both Character and Projectile rows. Auto-scroll keeps the selected item visible. Touch hit detection is offset-adjusted.

**Tech Stack:** Vanilla JS, HTML5 Canvas, node:test

**Spec:** `docs/superpowers/specs/2026-04-10-character-selection-design.md`

---

## File Structure

| File | Responsibility | Change Type |
|------|---------------|-------------|
| `animal-wars/js/constants.js` | Add CHARACTER_OPTIONS, CHARACTER_PREVIEW_SIZE, SETTINGS_VISIBLE_ROWS, SETTINGS_SCROLL_PADDING; update SETTINGS_ROW_H, SETTINGS_ROW_GAP | Modify |
| `animal-wars/js/settings.js` | Add `character: 'Gorilla'` to DEFAULT_SETTINGS | Modify |
| `animal-wars/js/sprites.js` | Rename `createGorillaSprites` → `createCharacterSprites(name)` with fallback; add `loadCharacterPreview(name)` | Modify |
| `animal-wars/js/renderer.js` | Reorder settings items; uniform 36px rows; scrollable clipping; scroll indicators; sprite preview drawing | Modify |
| `animal-wars/js/main.js` | Update imports/call sites; add state vars; reorder items; character cycling; auto-scroll; settings entry/exit; touch scroll handling | Modify |
| `animal-wars/tests/constants.test.js` | Test new/updated constants | Modify |
| `animal-wars/tests/settings.test.js` | Test character default | Modify |

---

### Task 1: Constants — Add Character & Scroll Constants

**Files:**
- Modify: `animal-wars/js/constants.js:64-68` — update SETTINGS_ROW_H/GAP, add new constants
- Modify: `animal-wars/tests/constants.test.js`

- [ ] **Step 1: Write failing tests for new constants**

In `animal-wars/tests/constants.test.js`, add these tests after the existing `SETTINGS_ARROW_HIT` test (line 103):

```js
it('CHARACTER_OPTIONS has 6 entries starting with Gorilla', () => {
  assert.ok(Array.isArray(C.CHARACTER_OPTIONS));
  assert.equal(C.CHARACTER_OPTIONS.length, 6);
  assert.equal(C.CHARACTER_OPTIONS[0], 'Gorilla');
  assert.equal(C.CHARACTER_OPTIONS[5], 'Goku');
});

it('CHARACTER_PREVIEW_SIZE is 32', () => {
  assert.equal(C.CHARACTER_PREVIEW_SIZE, 32);
});

it('SETTINGS_ROW_H is 36 for uniform row height', () => {
  assert.equal(C.SETTINGS_ROW_H, 36);
});

it('SETTINGS_ROW_GAP is 2', () => {
  assert.equal(C.SETTINGS_ROW_GAP, 2);
});

it('SETTINGS_VISIBLE_ROWS is 8', () => {
  assert.equal(C.SETTINGS_VISIBLE_ROWS, 8);
});

it('SETTINGS_SCROLL_PADDING is 3', () => {
  assert.equal(C.SETTINGS_SCROLL_PADDING, 3);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd animal-wars && node --test tests/constants.test.js`

Expected: Failures for `CHARACTER_OPTIONS`, `CHARACTER_PREVIEW_SIZE`, `SETTINGS_VISIBLE_ROWS`, `SETTINGS_SCROLL_PADDING` (not exported). `SETTINGS_ROW_H` test fails (expected 36, got 28). `SETTINGS_ROW_GAP` test fails (expected 2, got 4).

- [ ] **Step 3: Update constants.js**

In `animal-wars/js/constants.js`, change lines 65-66:

```js
export const SETTINGS_ROW_H = 36;
export const SETTINGS_ROW_GAP = 2;
```

After line 84 (`PROJECTILE_OPTIONS`), add:

```js
export const CHARACTER_OPTIONS = ['Gorilla', 'Robot', 'Alien', 'Dinosaur', 'Penguin', 'Goku'];
export const CHARACTER_PREVIEW_SIZE = 32;
export const SETTINGS_VISIBLE_ROWS = 8;
export const SETTINGS_SCROLL_PADDING = 3;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd animal-wars && node --test tests/constants.test.js`

Expected: All pass. Note: the existing test `SETTINGS_ROW_H` at line 65 asserts value `28` — **there is no such test in the existing file**, so no conflict. But the existing settings test file references `SETTINGS_ROW_H` indirectly through imports — verify no breakage.

- [ ] **Step 5: Run full test suite to check for regressions**

Run: `cd animal-wars && node --test tests/*.test.js`

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add animal-wars/js/constants.js animal-wars/tests/constants.test.js
git commit -m "feat: add character selection and scroll constants"
```

---

### Task 2: Settings — Add Character Default

**Files:**
- Modify: `animal-wars/js/settings.js:5-15` — add character to DEFAULT_SETTINGS
- Modify: `animal-wars/tests/settings.test.js`

- [ ] **Step 1: Write failing test**

In `animal-wars/tests/settings.test.js`, add inside the `describe('settings')` block after the existing `DEFAULT_SETTINGS has correct defaults` test (line 28):

```js
it('DEFAULT_SETTINGS includes character as Gorilla', () => {
  assert.equal(DEFAULT_SETTINGS.character, 'Gorilla');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd animal-wars && node --test tests/settings.test.js`

Expected: FAIL — `DEFAULT_SETTINGS.character` is `undefined`.

- [ ] **Step 3: Add character to DEFAULT_SETTINGS**

In `animal-wars/js/settings.js`, add `character: 'Gorilla',` after the `projectile: 'Banana',` line (line 14):

```js
  projectile: 'Banana',
  character: 'Gorilla',
  volume: 0.5,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd animal-wars && node --test tests/settings.test.js`

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add animal-wars/js/settings.js animal-wars/tests/settings.test.js
git commit -m "feat: add character setting with Gorilla default"
```

---

### Task 3: Sprites — Rename and Add Character Loading

**Files:**
- Modify: `animal-wars/js/sprites.js` — full rewrite

- [ ] **Step 1: Rewrite sprites.js**

Replace the entire contents of `animal-wars/js/sprites.js` with:

```js
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function characterPaths(name) {
  const base = `assets/images/${name.toLowerCase()}`;
  return [
    `${base}-normal.png`,
    `${base}-throw-p2.png`,
    `${base}-throw-p1.png`,
    `${base}-victory.png`,
  ];
}

export async function createCharacterSprites(characterName = 'Gorilla') {
  const paths = characterPaths(characterName);
  try {
    return await Promise.all(paths.map(loadImage));
  } catch {
    if (characterName !== 'Gorilla') {
      console.warn(`Failed to load ${characterName} sprites, falling back to Gorilla`);
      return Promise.all(characterPaths('Gorilla').map(loadImage));
    }
    throw new Error('Failed to load Gorilla sprites');
  }
}

export async function loadCharacterPreview(characterName = 'Gorilla') {
  const src = `assets/images/${characterName.toLowerCase()}-normal.png`;
  try {
    return await loadImage(src);
  } catch {
    if (characterName !== 'Gorilla') {
      console.warn(`Failed to load ${characterName} preview, falling back to Gorilla`);
      try {
        return await loadImage('assets/images/gorilla-normal.png');
      } catch {
        return null;
      }
    }
    return null;
  }
}

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

- [ ] **Step 2: Run full test suite to verify no regressions**

Run: `cd animal-wars && node --test tests/*.test.js`

Expected: All pass. No existing tests import from sprites.js (it requires browser `Image`).

- [ ] **Step 3: Commit**

```bash
git add animal-wars/js/sprites.js
git commit -m "refactor: rename createGorillaSprites to createCharacterSprites with fallback"
```

---

### Task 4: Main.js — Update Imports, Call Sites, and State

**Files:**
- Modify: `animal-wars/js/main.js:1-100` — imports and state

- [ ] **Step 1: Update imports**

In `animal-wars/js/main.js`, line 9, add `CHARACTER_OPTIONS` to the constants import:

```js
  GRAVITY_PRESETS, PROJECTILE_OPTIONS, CHARACTER_OPTIONS,
```

At line 14, add scroll constants to the import:

```js
  SETTINGS_ROW_H, SETTINGS_ROW_GAP, SETTINGS_ARROW_W, SETTINGS_ARROW_HIT,
  SETTINGS_VISIBLE_ROWS, SETTINGS_SCROLL_PADDING,
```

At line 21, rename the sprites import:

```js
import { createCharacterSprites, loadCharacterPreview, loadProjectileSprite } from './sprites.js';
```

- [ ] **Step 2: Update createGorillaSprites call site at init**

At line 104, change:

```js
  spriteFrames = await createGorillaSprites();
```

to:

```js
  spriteFrames = await createCharacterSprites(settings.character);
```

- [ ] **Step 3: Add new state variables**

In the `game` object (after `settingsFrom: null,` at line 81), add:

```js
  settingsScrollOffset: 0,
  characterPreviewSprite: null,
```

- [ ] **Step 4: Run full test suite**

Run: `cd animal-wars && node --test tests/*.test.js`

Expected: All pass. main.js is not imported by any test (it requires DOM).

- [ ] **Step 5: Commit**

```bash
git add animal-wars/js/main.js
git commit -m "refactor: update main.js imports and call sites for createCharacterSprites"
```

---

### Task 5: Main.js — Reorder Settings Items and Add Character

**Files:**
- Modify: `animal-wars/js/main.js:473-493` — getSettingsItemCount + getSettingsItemName

- [ ] **Step 1: Update getSettingsItemCount**

Change `getSettingsItemCount()` (line 473) from:

```js
function getSettingsItemCount() {
  return settings.gravityPreset === 'Custom' ? 11 : 10;
}
```

to:

```js
function getSettingsItemCount() {
  return settings.gravityPreset === 'Custom' ? 13 : 12;
}
```

(Was 10/11, now 12/13 — one new item: character.)

- [ ] **Step 2: Update getSettingsItemName with new order**

Change `getSettingsItemName()` (line 477) from:

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

to:

```js
function getSettingsItemName(index) {
  const isCustom = settings.gravityPreset === 'Custom';
  const items = [
    'inputMethod',
    'rounds',
    'gravityPreset',
    ...(isCustom ? ['customGravity'] : []),
    'player2Mode',
    'character',
    'projectile',
    'shotTrail',
    'aimPreview',
    'dynamicAimPreview',
    'volume',
    'back',
  ];
  return items[index] || null;
}
```

- [ ] **Step 3: Commit**

```bash
git add animal-wars/js/main.js
git commit -m "feat: reorder settings items and add character entry"
```

---

### Task 6: Main.js — Character Cycling, Settings Entry, and Settings Exit

**Files:**
- Modify: `animal-wars/js/main.js` — handleSettingsKey, handleTitleAction, handlePauseAction, settings exit

- [ ] **Step 1: Add character cycling case to handleSettingsKey**

In `handleSettingsKey()`, inside the switch statement (after the `player2Mode` case at line 599 and before the `shotTrail` case), add:

```js
    case 'character': {
      const idx = CHARACTER_OPTIONS.indexOf(settings.character);
      const newIdx = (idx + dir + CHARACTER_OPTIONS.length) % CHARACTER_OPTIONS.length;
      settings.character = CHARACTER_OPTIONS[newIdx];
      loadCharacterPreview(settings.character).then(img => { game.characterPreviewSprite = img; });
      break;
    }
```

- [ ] **Step 2: Add settings entry initialization**

In `handleTitleAction()` (the `'settings'` case, around line 434), add preview loading and scroll reset after `game.state = STATE.SETTINGS;`:

```js
    case 'settings':
      game.settingsFrom = 'title';
      game.settingsIndex = 0;
      game.settingsScrollOffset = 0;
      game.customGravityInput = String(settings.customGravity);
      game.previousState = game.state;
      game.state = STATE.SETTINGS;
      loadCharacterPreview(settings.character).then(img => { game.characterPreviewSprite = img; });
      loadProjectileSprite(settings.projectile).then(img => { projectileSprite = img; });
      break;
```

Apply the same pattern to `handlePauseAction()` (the `'settings'` case, around line 459):

```js
    case 'settings':
      game.settingsFrom = 'pause';
      game.settingsIndex = 0;
      game.settingsScrollOffset = 0;
      game.customGravityInput = String(settings.customGravity);
      game.previousState = game.state;
      game.state = STATE.SETTINGS;
      loadCharacterPreview(settings.character).then(img => { game.characterPreviewSprite = img; });
      loadProjectileSprite(settings.projectile).then(img => { projectileSprite = img; });
      break;
```

- [ ] **Step 3: Add sprite reload on settings exit**

In `handleSettingsKey()`, find the two places where settings exits (Enter on 'back' and Escape), around lines 511-531. After each state transition but before `return;`, add the sprite reload:

For Enter on 'back' (line 511):

```js
  if (key === 'Enter' && itemName === 'back') {
    createCharacterSprites(settings.character).then(frames => { spriteFrames = frames; });
    if (game.settingsFrom === 'title') {
      game.state = STATE.TITLE_SCREEN;
      game.menuIndex = 0;
    } else {
      game.state = STATE.PAUSED;
      game.menuIndex = 0;
    }
    return;
  }
```

For Escape (line 523):

```js
  if (key === 'Escape') {
    createCharacterSprites(settings.character).then(frames => { spriteFrames = frames; });
    if (game.settingsFrom === 'title') {
      game.state = STATE.TITLE_SCREEN;
      game.menuIndex = 0;
    } else {
      game.state = STATE.PAUSED;
      game.menuIndex = 0;
    }
    return;
  }
```

- [ ] **Step 4: Commit**

```bash
git add animal-wars/js/main.js
git commit -m "feat: add character cycling, settings entry/exit initialization"
```

---

### Task 7: Main.js — Auto-Scroll Logic

**Files:**
- Modify: `animal-wars/js/main.js` — handleSettingsKey ArrowUp/Down handlers

- [ ] **Step 1: Add auto-scroll helper function**

Add this function before `handleSettingsKey()`:

```js
function clampSettingsScroll() {
  const itemCount = getSettingsItemCount();
  const maxScroll = Math.max(0, itemCount + SETTINGS_SCROLL_PADDING - SETTINGS_VISIBLE_ROWS);
  if (game.settingsIndex < game.settingsScrollOffset) {
    game.settingsScrollOffset = game.settingsIndex;
  } else if (game.settingsIndex >= game.settingsScrollOffset + SETTINGS_VISIBLE_ROWS) {
    game.settingsScrollOffset = game.settingsIndex - SETTINGS_VISIBLE_ROWS + 1;
  }
  game.settingsScrollOffset = Math.max(0, Math.min(game.settingsScrollOffset, maxScroll));
}
```

- [ ] **Step 2: Call clampSettingsScroll after ArrowUp/Down**

In `handleSettingsKey()`, after the ArrowUp handler updates `game.settingsIndex` (around line 500), add a call:

```js
  if (key === 'ArrowUp') {
    game.settingsIndex = (game.settingsIndex - 1 + itemCount) % itemCount;
    clampSettingsScroll();
    audio.playMenuSelect();
    return;
  }
  if (key === 'ArrowDown') {
    game.settingsIndex = (game.settingsIndex + 1) % itemCount;
    clampSettingsScroll();
    audio.playMenuSelect();
    return;
  }
```

Also call `clampSettingsScroll()` after the gravity preset cycling case, since toggling Custom changes item count. Add it after the existing `game.settingsIndex` clamp in the `'gravityPreset'` case:

```js
    case 'gravityPreset': {
      const presetNames = GRAVITY_PRESETS.map(p => p.name).concat('Custom');
      const idx = presetNames.indexOf(settings.gravityPreset);
      const newIdx = (idx + dir + presetNames.length) % presetNames.length;
      settings.gravityPreset = presetNames[newIdx];
      game.customGravityInput = String(settings.customGravity);
      const newCount = getSettingsItemCount();
      if (game.settingsIndex >= newCount) {
        game.settingsIndex = newCount - 1;
      }
      clampSettingsScroll();
      break;
    }
```

- [ ] **Step 3: Commit**

```bash
git add animal-wars/js/main.js
git commit -m "feat: add auto-scroll logic for settings menu"
```

---

### Task 8: Renderer — Reorder Items, Uniform Rows, and Accept New Params

**Files:**
- Modify: `animal-wars/js/renderer.js:1-15` — imports
- Modify: `animal-wars/js/renderer.js:593-698` — drawSettingsMenu

- [ ] **Step 1: Update renderer imports**

In `animal-wars/js/renderer.js`, add the new constants to the import (line 13):

```js
  SETTINGS_ROW_H, SETTINGS_ROW_GAP, SETTINGS_ARROW_W,
  SETTINGS_VISIBLE_ROWS, SETTINGS_SCROLL_PADDING,
  CHARACTER_PREVIEW_SIZE,
```

Also add `BANANA_COLOR, BANANA_TIP_COLOR` if not already imported (they are — line 6).

- [ ] **Step 2: Update drawSettingsMenu signature and item order**

Change `drawSettingsMenu` (line 593) signature to accept new parameters:

```js
    drawSettingsMenu(settings, selectedIndex, editingCustom, customValue, scrollOffset = 0, characterPreview = null, projectileSprite = null) {
```

Replace the `items` array (lines 602-614) with the new order:

```js
      const items = [
        { label: 'Input', value: settings.inputMethod === 'sliders' ? 'Sliders' : 'Classic', cycle: true },
        { label: 'Rounds', value: String(settings.rounds), cycle: true },
        { label: 'Gravity', value: `${settings.gravityPreset} (${settings.gravityPreset === 'Custom' ? settings.customGravity : (GRAVITY_PRESETS.find(p => p.name === settings.gravityPreset)?.gravity ?? '')})`, cycle: true },
        ...(settings.gravityPreset === 'Custom' ? [{ label: 'Custom G', value: editingCustom ? customValue + '_' : String(settings.customGravity), cycle: false }] : []),
        { label: 'Player 2', value: settings.player2Mode, cycle: true },
        { label: 'Character', value: settings.character, cycle: true, preview: characterPreview },
        { label: 'Projectile', value: settings.projectile, cycle: true, preview: projectileSprite, isBanana: settings.projectile === 'Banana' },
        { label: 'Shot Trail', value: settings.shotTrail ? 'ON' : 'OFF', cycle: true },
        { label: 'Aim Preview', value: settings.aimPreview ? 'ON' : 'OFF', cycle: true },
        { label: 'Dynamic Aim', value: settings.dynamicAimPreview ? 'ON' : 'OFF', cycle: true },
        { label: 'Volume', value: null, volume: settings.volume, cycle: true },
        { label: 'Back', value: null, cycle: false, isBack: true },
      ];
```

- [ ] **Step 3: Commit**

```bash
git add animal-wars/js/renderer.js
git commit -m "feat: reorder settings items and accept scroll/preview params"
```

---

### Task 9: Renderer — Scrollable Rendering with Clipping

**Files:**
- Modify: `animal-wars/js/renderer.js:593-698` — drawSettingsMenu body

- [ ] **Step 1: Replace the rendering loop with scroll-aware rendering**

Replace the entire rendering body of `drawSettingsMenu` (from `const rowH = SETTINGS_ROW_H;` through the `ctx.textBaseline = 'alphabetic';` line) with:

```js
      const rowH = SETTINGS_ROW_H;
      const rowGap = SETTINGS_ROW_GAP;
      const startY = 68;
      const rowW = 340;
      const rowX = CANVAS_WIDTH / 2 - rowW / 2;
      const arrowW = SETTINGS_ARROW_W;

      const totalItems = items.length;
      const visibleH = SETTINGS_VISIBLE_ROWS * rowH + (SETTINGS_VISIBLE_ROWS - 1) * rowGap;

      // Scroll indicators
      const hasAbove = scrollOffset > 0;
      const maxScroll = Math.max(0, totalItems + SETTINGS_SCROLL_PADDING - SETTINGS_VISIBLE_ROWS);
      const hasBelow = scrollOffset < maxScroll;

      if (hasAbove) {
        ctx.fillStyle = '#888888';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('\u25B2', CANVAS_WIDTH / 2, startY - 6);
      }
      if (hasBelow) {
        ctx.fillStyle = '#888888';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('\u25BC', CANVAS_WIDTH / 2, startY + visibleH + 14);
      }

      // Clip to visible area
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, startY, CANVAS_WIDTH, visibleH);
      ctx.clip();

      ctx.font = '11px monospace';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < totalItems; i++) {
        const visIndex = i - scrollOffset;
        if (visIndex < 0 || visIndex >= SETTINGS_VISIBLE_ROWS) continue;

        const item = items[i];
        const y = startY + visIndex * (rowH + rowGap);
        const midY = y + rowH / 2;
        const selected = i === selectedIndex;

        if (item.isBack) {
          const bw = 120;
          const bx = CANVAS_WIDTH / 2 - bw / 2;
          ctx.fillStyle = selected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(bx, y, bw, rowH);
          ctx.strokeStyle = selected ? '#FFD700' : '#555555';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx, y, bw, rowH);
          ctx.fillStyle = selected ? '#FFFFFF' : '#888888';
          ctx.textAlign = 'center';
          ctx.fillText('Back', CANVAS_WIDTH / 2, midY);
          continue;
        }

        // Row background
        ctx.fillStyle = selected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(rowX, y, rowW, rowH);

        // Arrow button positions
        const leftArrowX = rowX + rowW - 200;
        const rightArrowX = rowX + rowW - arrowW - 4;
        const arrowY = y + (rowH - (arrowW - 4)) / 2;
        const arrowH = arrowW - 4;

        // Value center: midpoint between left arrow right edge and right arrow left edge
        const valueCenterX = (leftArrowX + arrowW + rightArrowX) / 2;

        // Label
        ctx.fillStyle = selected ? '#FFD700' : '#888888';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, rowX + 8, midY);

        // Value area
        if (item.volume !== undefined && item.volume !== null) {
          // Volume bar
          const barW = 80;
          const barH = 6;
          const barX = valueCenterX - barW / 2;
          const barY = y + (rowH - barH) / 2;
          ctx.fillStyle = '#333333';
          ctx.fillRect(barX, barY, barW, barH);
          ctx.fillStyle = '#55FF55';
          ctx.fillRect(barX, barY, barW * item.volume, barH);
          ctx.fillStyle = '#AAAAAA';
          ctx.textAlign = 'right';
          ctx.fillText(`${Math.round(item.volume * 100)}%`, rowX + rowW - 8, midY);
        } else if (item.value !== null) {
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.fillText(item.value, valueCenterX, midY);
        }

        // Draw arrow buttons
        if (item.cycle) {
          ctx.fillStyle = '#444444';
          ctx.fillRect(leftArrowX, arrowY, arrowW, arrowH);
          ctx.fillStyle = '#FFD700';
          ctx.textAlign = 'center';
          ctx.fillText('<', leftArrowX + arrowW / 2, midY);

          ctx.fillStyle = '#444444';
          ctx.fillRect(rightArrowX, arrowY, arrowW, arrowH);
          ctx.fillStyle = '#FFD700';
          ctx.textAlign = 'center';
          ctx.fillText('>', rightArrowX + arrowW / 2, midY);
        }

        // Sprite preview (Character / Projectile rows)
        if (item.preview || item.isBanana) {
          const previewSize = CHARACTER_PREVIEW_SIZE;
          const previewX = rightArrowX + arrowW + 8;
          const previewY = y + (rowH - previewSize) / 2;

          // Subtle background frame
          ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.fillRect(previewX - 1, previewY - 1, previewSize + 2, previewSize + 2);

          if (item.preview) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(item.preview, previewX, previewY, previewSize, previewSize);
            ctx.imageSmoothingEnabled = true;
          } else if (item.isBanana) {
            // Procedural mini banana
            ctx.save();
            ctx.translate(previewX + previewSize / 2, previewY + previewSize / 2);
            const scale = previewSize / (BANANA_RADIUS * 3);
            ctx.scale(scale, scale);
            ctx.fillStyle = BANANA_COLOR;
            ctx.beginPath();
            ctx.arc(0, 0, BANANA_RADIUS, 0.3, Math.PI - 0.3);
            ctx.arc(0, -2, BANANA_RADIUS - 3, Math.PI - 0.3, 0.3, true);
            ctx.fill();
            ctx.fillStyle = BANANA_TIP_COLOR;
            ctx.fillRect(-BANANA_RADIUS + 2, -2, 4, 4);
            ctx.fillRect(BANANA_RADIUS - 6, -2, 4, 4);
            ctx.restore();
          }
        }
      }

      ctx.restore(); // End clip
      ctx.textBaseline = 'alphabetic';
```

- [ ] **Step 2: Commit**

```bash
git add animal-wars/js/renderer.js
git commit -m "feat: scrollable settings rendering with clipping and sprite previews"
```

---

### Task 10: Main.js — Update Render Call with Scroll and Previews

**Files:**
- Modify: `animal-wars/js/main.js` — render function, STATE.SETTINGS case

- [ ] **Step 1: Update the drawSettingsMenu call**

In the `render()` function (around line 1149), change:

```js
    case STATE.SETTINGS:
      renderer.drawSettingsMenu(settings, game.settingsIndex,
        settings.gravityPreset === 'Custom', game.customGravityInput);
      break;
```

to:

```js
    case STATE.SETTINGS:
      renderer.drawSettingsMenu(settings, game.settingsIndex,
        settings.gravityPreset === 'Custom', game.customGravityInput,
        game.settingsScrollOffset, game.characterPreviewSprite, projectileSprite);
      break;
```

- [ ] **Step 2: Commit**

```bash
git add animal-wars/js/main.js
git commit -m "feat: pass scroll offset and preview sprites to settings renderer"
```

---

### Task 11: Main.js — Touch Handling with Scroll Offset and Indicator Taps

**Files:**
- Modify: `animal-wars/js/main.js` — handleClick, STATE.SETTINGS section (around line 739)

- [ ] **Step 1: Replace the settings touch handling block**

In `handleClick()`, replace the entire `} else if (game.state === STATE.SETTINGS) {` block (lines 739-816) with:

```js
  } else if (game.state === STATE.SETTINGS) {
    const rowH = SETTINGS_ROW_H;
    const rowGap = SETTINGS_ROW_GAP;
    const startY = 68;
    const rowW = 340;
    const rowX = CANVAS_WIDTH / 2 - rowW / 2;
    const arrowW = SETTINGS_ARROW_W;
    const hitSize = SETTINGS_ARROW_HIT;
    const itemCount = getSettingsItemCount();
    const visibleH = SETTINGS_VISIBLE_ROWS * rowH + (SETTINGS_VISIBLE_ROWS - 1) * rowGap;
    const maxScroll = Math.max(0, itemCount + SETTINGS_SCROLL_PADDING - SETTINGS_VISIBLE_ROWS);

    // Scroll indicator tap: up arrow area (full-width bar above menu)
    if (game.settingsScrollOffset > 0 && cy >= startY - rowH && cy < startY) {
      game.settingsScrollOffset = Math.max(0, game.settingsScrollOffset - 1);
      return;
    }
    // Scroll indicator tap: down arrow area (full-width bar below menu)
    if (game.settingsScrollOffset < maxScroll && cy > startY + visibleH && cy <= startY + visibleH + rowH) {
      game.settingsScrollOffset = Math.min(maxScroll, game.settingsScrollOffset + 1);
      return;
    }

    // Settings row taps — iterate only visible items
    for (let i = 0; i < itemCount; i++) {
      const visIndex = i - game.settingsScrollOffset;
      if (visIndex < 0 || visIndex >= SETTINGS_VISIBLE_ROWS) continue;

      const y = startY + visIndex * (rowH + rowGap);
      const itemName = getSettingsItemName(i);

      if (itemName === 'back') {
        const bw = 120;
        const bx = CANVAS_WIDTH / 2 - bw / 2;
        if (cx >= bx && cx <= bx + bw && cy >= y && cy <= y + rowH) {
          game.settingsIndex = i;
          handleSettingsKey('Enter');
          return;
        }
        continue;
      }

      if (cy >= y && cy <= y + rowH) {
        game.settingsIndex = i;
        const leftArrowX = rowX + rowW - 200;
        const rightArrowX = rowX + rowW - arrowW - 4;

        // Left arrow — 44px hit area centered on visual arrow
        const leftHitX = leftArrowX - (hitSize - arrowW) / 2;
        const arrowCenterY = y + rowH / 2;
        if (cx >= leftHitX && cx <= leftHitX + hitSize &&
            cy >= arrowCenterY - hitSize / 2 && cy <= arrowCenterY + hitSize / 2) {
          handleSettingsKey('ArrowLeft');
          return;
        }
        // Right arrow — 44px hit area centered on visual arrow
        const rightHitX = rightArrowX - (hitSize - arrowW) / 2;
        if (cx >= rightHitX && cx <= rightHitX + hitSize &&
            cy >= arrowCenterY - hitSize / 2 && cy <= arrowCenterY + hitSize / 2) {
          handleSettingsKey('ArrowRight');
          return;
        }

        // Custom gravity — tap value area to focus hidden input
        if (itemName === 'customGravity') {
          const gravInput = document.getElementById('custom-gravity-input');
          if (gravInput) {
            gravInput.value = game.customGravityInput;
            gravInput.focus();
            gravInput.oninput = () => {
              game.customGravityInput = gravInput.value;
              const parsed = parseFloat(gravInput.value);
              if (!isNaN(parsed) && parsed >= 0.1) {
                settings.customGravity = parsed;
              }
            };
            gravInput.onblur = () => {
              const parsed = parseFloat(gravInput.value);
              if (!isNaN(parsed) && parsed >= 0.1) {
                settings.customGravity = parsed;
              }
              game.customGravityInput = String(settings.customGravity);
              saveSettings(settings);
              gravInput.oninput = null;
              gravInput.onblur = null;
            };
          }
          return;
        }
        break;
      }
    }
  }
```

- [ ] **Step 2: Run full test suite**

Run: `cd animal-wars && node --test tests/*.test.js`

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add animal-wars/js/main.js
git commit -m "feat: update touch handling for scroll offset and scroll indicator taps"
```

---

### Task 12: Browser Verification

**Files:** None — manual testing only.

- [ ] **Step 1: Start the dev server**

Run: `cd animal-wars && python3 -m http.server 8080`

Open `http://localhost:8080` in a browser.

- [ ] **Step 2: Verify settings menu renders with new order**

1. Click "Settings" from title screen
2. Verify menu items appear in order: Input, Rounds, Gravity, Player 2, Character, Projectile, Shot Trail, Aim Preview, Dynamic Aim, Volume, Back
3. Verify all rows are uniform height (36px, visually taller than before)
4. Verify the "Character" row shows value "Gorilla" with left/right arrows

- [ ] **Step 3: Verify character cycling**

1. Navigate to Character row
2. Press Right arrow (or tap `>`) — should cycle through: Robot, Alien, Dinosaur, Penguin, Goku, back to Gorilla
3. Verify a sprite preview appears to the right of the `>` arrow button
4. Since only Gorilla assets exist, the preview should fall back to the gorilla sprite for all characters

- [ ] **Step 4: Verify projectile preview**

1. Navigate to Projectile row
2. With "Banana" selected — verify a small procedural banana is drawn in the preview area
3. Cycle to "Dynamite" — verify the dynamite sprite preview appears (or blank if no sprite)

- [ ] **Step 5: Verify scrolling**

1. Switch Gravity to "Custom" (adds Custom G row, bringing total to 13 items)
2. Verify a down arrow indicator (▼) appears below the menu
3. Press Down arrow to navigate past the 8th visible item — verify the menu scrolls
4. Verify an up arrow indicator (▲) appears when scrolled down
5. Verify "Back" can scroll into view and tapping it exits settings
6. Tap the ▲/▼ indicator areas — verify they scroll by one row

- [ ] **Step 6: Verify settings persistence and sprite loading**

1. Select a non-Gorilla character (e.g., Robot)
2. Exit settings, start a new game
3. Verify the game loads (gorilla sprites used as fallback since Robot assets don't exist)
4. Re-enter settings — verify Character still shows "Robot"
5. Verify the preview sprite loads on entry (gorilla fallback)

- [ ] **Step 7: Verify touch on mobile (if available)**

1. Open on a phone or use Chrome DevTools device mode
2. Verify tap targets on arrows work at the new row height
3. Verify scroll indicator taps work
4. Verify custom gravity text input still works when tapped
