# Touch-Friendly Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Gorilla Wars playable on touchscreen phones (iPhone Max) and tablets (iPad Mini) in landscape mode, with a new slider-based input system that also works on desktop.

**Architecture:** Add a slider input mode alongside the existing classic keyboard input. The slider UI is drawn on the canvas (bottom 48px bar) using the same coordinate system as the rest of the game. Touch events on the canvas are translated to canvas coordinates using the existing click-to-canvas conversion pattern. A new `inputMethod` setting controls which mode is active, with auto-detection defaulting to sliders on touch devices. Menus get touch-friendly button styling. A CSS rotate prompt handles portrait orientation.

**Tech Stack:** Vanilla JS, HTML5 Canvas, CSS media queries, Fullscreen API, Screen Orientation API

**Spec:** `docs/superpowers/specs/2026-04-10-touch-friendly-interface-design.md`

---

## File Structure

| File | Responsibility | Change Type |
|------|---------------|-------------|
| `js/constants.js` | Add slider/touch constants, update VELOCITY_SCALE and add VELOCITY_MAX | Modify |
| `js/settings.js` | Add `inputMethod` field with touch auto-detection | Modify |
| `js/input.js` | Update velocity clamp, remove unused `confirmed` field | Modify |
| `js/ai.js` | Halve velocity search ranges for VELOCITY_SCALE rescaling | Modify |
| `js/renderer.js` | Add slider HUD, touch-friendly menus, pause button, update game over text | Modify |
| `js/main.js` | Add touch event handling, slider state, route input by mode, pause button hit testing | Modify |
| `css/style.css` | Add rotate prompt, touch-action/user-select on canvas | Modify |
| `index.html` | Add rotate prompt element, update viewport meta | Modify |
| `tests/settings.test.js` | Test inputMethod defaults and auto-detection | Modify |
| `tests/ai.test.js` | Update AI range assertions for new velocity scale | Modify |
| `tests/constants.test.js` | Test new constants | Modify |

---

### Task 1: Update Constants for Velocity Rescaling

**Files:**
- Modify: `gorilla-wars/js/constants.js:11`
- Modify: `gorilla-wars/tests/constants.test.js`

- [ ] **Step 1: Write failing test for new constants**

In `gorilla-wars/tests/constants.test.js`, add tests for the new constants:

```js
it('VELOCITY_SCALE is 5.0 for rescaled velocity range', () => {
  assert.equal(VELOCITY_SCALE, 5.0);
});

it('VELOCITY_MAX is 500', () => {
  assert.equal(VELOCITY_MAX, 500);
});

it('DEFAULT_VELOCITY is 50', () => {
  assert.equal(DEFAULT_VELOCITY, 50);
});

it('DEFAULT_ANGLE is 45', () => {
  assert.equal(DEFAULT_ANGLE, 45);
});
```

Also add `VELOCITY_MAX, DEFAULT_VELOCITY, DEFAULT_ANGLE` to the import at the top of the test file.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd gorilla-wars && node --test tests/constants.test.js`
Expected: FAIL — `VELOCITY_MAX` is not exported, `VELOCITY_SCALE` is 2.5

- [ ] **Step 3: Update constants.js**

In `gorilla-wars/js/constants.js`, change:

```js
export const VELOCITY_SCALE = 5.0;
```

And add after the Wind section (after line 44):

```js
// Slider input defaults
export const VELOCITY_MAX = 500;
export const DEFAULT_ANGLE = 45;
export const DEFAULT_VELOCITY = 50;

// Bottom bar dimensions (canvas logical coordinates)
export const INPUT_BAR_HEIGHT = 48;
export const INPUT_BAR_Y = CANVAS_HEIGHT - INPUT_BAR_HEIGHT;

// Touch target sizes (canvas logical coordinates)
export const SLIDER_THUMB_RADIUS = 10;
export const SLIDER_THUMB_HIT_RADIUS = 22;
export const FIRE_BUTTON_WIDTH = 56;
export const FIRE_BUTTON_HEIGHT = 28;

// Pause button (top-right corner)
export const PAUSE_BUTTON_X = CANVAS_WIDTH - 28;
export const PAUSE_BUTTON_Y = 4;
export const PAUSE_BUTTON_W = 24;
export const PAUSE_BUTTON_H = 16;
export const PAUSE_BUTTON_HIT_SIZE = 44;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd gorilla-wars && node --test tests/constants.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add gorilla-wars/js/constants.js gorilla-wars/tests/constants.test.js
git commit -m "feat: add slider/touch constants, rescale VELOCITY_SCALE to 5.0"
```

---

### Task 2: Add inputMethod Setting with Auto-Detection

**Files:**
- Modify: `gorilla-wars/js/settings.js:5-14`
- Modify: `gorilla-wars/tests/settings.test.js`

- [ ] **Step 1: Write failing tests for inputMethod**

In `gorilla-wars/tests/settings.test.js`, add:

```js
it('DEFAULT_SETTINGS includes inputMethod as classic', () => {
  assert.equal(DEFAULT_SETTINGS.inputMethod, 'classic');
});

it('loadSettings defaults inputMethod to classic when no ontouchstart', () => {
  globalThis.ontouchstart = undefined;
  delete globalThis.ontouchstart;
  const s = loadSettings();
  assert.equal(s.inputMethod, 'classic');
});

it('loadSettings defaults inputMethod to sliders on touch devices', () => {
  globalThis.ontouchstart = null; // simulates touch device
  localStorage.clear();
  const freshLoad = loadSettings();
  assert.equal(freshLoad.inputMethod, 'sliders');
  delete globalThis.ontouchstart;
});

it('loadSettings preserves stored inputMethod over auto-detection', () => {
  globalThis.ontouchstart = null;
  saveSettings({ ...DEFAULT_SETTINGS, inputMethod: 'classic' });
  const s = loadSettings();
  assert.equal(s.inputMethod, 'classic');
  delete globalThis.ontouchstart;
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd gorilla-wars && node --test tests/settings.test.js`
Expected: FAIL — `DEFAULT_SETTINGS.inputMethod` is undefined

- [ ] **Step 3: Update settings.js**

Replace the `DEFAULT_SETTINGS` and `loadSettings` in `gorilla-wars/js/settings.js`:

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
  volume: 0.5,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = { ...DEFAULT_SETTINGS };
    if (raw) {
      Object.assign(base, JSON.parse(raw));
    }
    // Auto-detect input method if no stored preference
    if (!raw || !JSON.parse(raw).hasOwnProperty('inputMethod')) {
      base.inputMethod = ('ontouchstart' in globalThis) ? 'sliders' : 'classic';
    }
    return base;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd gorilla-wars && node --test tests/settings.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add gorilla-wars/js/settings.js gorilla-wars/tests/settings.test.js
git commit -m "feat: add inputMethod setting with touch auto-detection"
```

---

### Task 3: Update input.js — Velocity Clamp and Cleanup

**Files:**
- Modify: `gorilla-wars/js/input.js:2,55,65-68`

- [ ] **Step 1: Update input.js**

Three changes in `gorilla-wars/js/input.js`:

1. Remove `confirmed` from state (line 2):
```js
const state = { field: 'angle', value: '' };
```

2. Change velocity clamp from 1000 to 500 (line 55):
```js
const velocity = Math.max(1, Math.min(500, parsed));
```

3. Remove `state.confirmed = false;` from `resetInput()` (lines 65-69):
```js
function resetInput() {
  state.field = 'angle';
  state.value = '';
}
```

- [ ] **Step 2: Run existing tests to verify nothing breaks**

Run: `cd gorilla-wars && node --test`
Expected: All existing tests PASS

- [ ] **Step 3: Commit**

```bash
git add gorilla-wars/js/input.js
git commit -m "fix: clamp velocity to 500, remove unused confirmed field from input state"
```

---

### Task 4: Update AI Velocity Ranges

**Files:**
- Modify: `gorilla-wars/js/ai.js:150-163,166-184,202-203`
- Modify: `gorilla-wars/tests/ai.test.js`

- [ ] **Step 1: Update AI test assertions**

In `gorilla-wars/tests/ai.test.js`, update the range assertion test:

```js
it('returns angle and velocity in valid ranges', () => {
  const shot = calculateAIShot(targetGorilla, aiGorilla, 0, gravitySim, heightmap, 'hard', null);
  assert.ok(shot.angle >= 0 && shot.angle <= 90, `angle ${shot.angle} out of range`);
  assert.ok(shot.velocity >= 1 && shot.velocity <= 100, `velocity ${shot.velocity} out of range`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd gorilla-wars && node --test tests/ai.test.js`
Expected: FAIL — velocity can be up to 200

- [ ] **Step 3: Update ai.js search ranges**

In `gorilla-wars/js/ai.js`, update the three phases:

Phase 1 coarse sweep (lines 150-163) — change velocity range:
```js
  // --- Phase 1: Coarse sweep ---
  // Angle: 5-85 in steps of 5, Velocity: 10-100 in steps of 5
  for (let angle = 5; angle <= 85; angle += 5) {
    for (let vel = 10; vel <= 100; vel += 5) {
```

Phase 2 fine sweep (lines 166-184) — change velocity range:
```js
  // --- Phase 2: Fine sweep around best coarse result ---
  if (bestDistance > 0) {
    const fineAngleMin = Math.max(1, bestAngle - 5);
    const fineAngleMax = Math.min(89, bestAngle + 5);
    const fineVelMin = Math.max(5, bestVelocity - 5);
    const fineVelMax = Math.min(100, bestVelocity + 5);

    for (let angle = fineAngleMin; angle <= fineAngleMax; angle += 1) {
      for (let vel = fineVelMin; vel <= fineVelMax; vel += 1) {
```

Final clamp (lines 202-203):
```js
  bestAngle = Math.max(0, Math.min(90, Math.round(bestAngle * 10) / 10));
  bestVelocity = Math.max(1, Math.min(100, Math.round(bestVelocity * 10) / 10));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd gorilla-wars && node --test tests/ai.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add gorilla-wars/js/ai.js gorilla-wars/tests/ai.test.js
git commit -m "feat: halve AI velocity search ranges for VELOCITY_SCALE rescaling"
```

---

### Task 5: Update index.html and CSS — Rotate Prompt, Viewport, Touch

**Files:**
- Modify: `gorilla-wars/index.html`
- Modify: `gorilla-wars/css/style.css`

- [ ] **Step 1: Update index.html**

Replace the full contents of `gorilla-wars/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Gorilla Wars</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <canvas id="game" width="640" height="400"></canvas>
  <div id="rotate-prompt">
    <div class="rotate-icon">&#x1F4F1;</div>
    <h2>Rotate Your Device</h2>
    <p>Gorilla Wars plays in landscape mode</p>
  </div>
  <input id="custom-gravity-input" type="number" inputmode="decimal" style="position:absolute;left:-9999px;opacity:0;" aria-hidden="true">
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Update style.css**

Replace the full contents of `gorilla-wars/css/style.css`:

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
  width: min(100vw, calc(100vh * 640 / 400));
  height: min(100vh, calc(100vw * 400 / 640));
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}

/* Rotate prompt — hidden by default, shown in portrait */
#rotate-prompt {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #000;
  color: #fff;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-family: monospace;
}

#rotate-prompt .rotate-icon {
  font-size: 48px;
  transform: rotate(90deg);
}

#rotate-prompt h2 {
  color: #FFD700;
  font-size: 18px;
}

#rotate-prompt p {
  color: #888;
  font-size: 14px;
}

@media (orientation: portrait) {
  #rotate-prompt {
    display: flex;
  }
  canvas#game {
    display: none;
  }
}

/* Hidden input for custom gravity on touch */
#custom-gravity-input {
  position: absolute;
  left: -9999px;
  opacity: 0;
}
```

- [ ] **Step 3: Verify in browser**

Run: `cd gorilla-wars && bash serve.sh &`

Open the game in browser. Verify:
- Canvas still displays correctly
- No visual changes on desktop
- Rotate prompt does not appear in landscape
- If you resize browser to portrait aspect ratio, rotate prompt shows

- [ ] **Step 4: Commit**

```bash
git add gorilla-wars/index.html gorilla-wars/css/style.css
git commit -m "feat: add rotate prompt overlay, touch-action CSS, viewport meta"
```

---

### Task 6: Renderer — Touch-Friendly Menus

**Files:**
- Modify: `gorilla-wars/js/renderer.js:347-411,424-444`

- [ ] **Step 1: Update drawTitleScreen for touch-friendly buttons**

In `gorilla-wars/js/renderer.js`, replace `drawTitleScreen` (lines 347-363):

```js
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
        const y = 200 + i * 40;
        const w = 180;
        const h = 30;
        const x = CANVAS_WIDTH / 2 - w / 2;
        const selected = i === selectedIndex;

        // Button background
        ctx.fillStyle = selected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(x, y - h / 2, w, h);

        // Button border
        ctx.strokeStyle = selected ? '#FFD700' : '#555555';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y - h / 2, w, h);

        // Text
        ctx.fillStyle = selected ? '#FFFFFF' : '#888888';
        ctx.fillText(item, CANVAS_WIDTH / 2, y + 5);
      });
    },
```

- [ ] **Step 2: Update drawPauseMenu for touch-friendly buttons**

Replace `drawPauseMenu` (lines 365-382):

```js
    drawPauseMenu(selectedIndex) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', CANVAS_WIDTH / 2, 130);

      const items = ['Resume', 'Restart Round', 'Settings', 'Quit to Title'];
      ctx.font = '14px monospace';
      items.forEach((item, i) => {
        const y = 180 + i * 36;
        const w = 200;
        const h = 28;
        const x = CANVAS_WIDTH / 2 - w / 2;
        const selected = i === selectedIndex;

        ctx.fillStyle = selected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(x, y - h / 2, w, h);

        ctx.strokeStyle = selected ? '#FFD700' : '#555555';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y - h / 2, w, h);

        ctx.fillStyle = selected ? '#FFFFFF' : '#888888';
        ctx.fillText(item, CANVAS_WIDTH / 2, y + 5);
      });
    },
```

- [ ] **Step 3: Update drawSettingsMenu for touch-friendly rows**

Replace `drawSettingsMenu` (lines 384-411):

```js
    drawSettingsMenu(settings, selectedIndex, editingCustom, customValue) {
      ctx.fillStyle = SKY_NIGHT_COLOR;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SETTINGS', CANVAS_WIDTH / 2, 40);

      const items = [
        { label: 'Input', value: settings.inputMethod === 'sliders' ? 'Sliders' : 'Classic', cycle: true },
        { label: 'Rounds', value: String(settings.rounds), cycle: true },
        { label: 'Gravity', value: `${settings.gravityPreset} (${settings.gravityPreset === 'Custom' ? settings.customGravity : (GRAVITY_PRESETS.find(p => p.name === settings.gravityPreset)?.gravity ?? '')})`, cycle: true },
        ...(settings.gravityPreset === 'Custom' ? [{ label: 'Custom G', value: editingCustom ? customValue + '_' : String(settings.customGravity), cycle: false }] : []),
        { label: 'Player 2', value: settings.player2Mode, cycle: true },
        { label: 'Shot Trail', value: settings.shotTrail ? 'ON' : 'OFF', cycle: true },
        { label: 'Aim Preview', value: settings.aimPreview ? 'ON' : 'OFF', cycle: true },
        { label: 'Dynamic Aim', value: settings.dynamicAimPreview ? 'ON' : 'OFF', cycle: true },
        { label: 'Volume', value: null, volume: settings.volume, cycle: true },
        { label: 'Back', value: null, cycle: false, isBack: true },
      ];

      const rowH = 22;
      const rowGap = 4;
      const startY = 68;
      const rowW = 340;
      const rowX = CANVAS_WIDTH / 2 - rowW / 2;
      const arrowW = 24;

      ctx.font = '11px monospace';
      items.forEach((item, i) => {
        const y = startY + i * (rowH + rowGap);
        const selected = i === selectedIndex;

        if (item.isBack) {
          // Back button — centered, button-styled
          const bw = 120;
          const bx = CANVAS_WIDTH / 2 - bw / 2;
          ctx.fillStyle = selected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(bx, y, bw, rowH);
          ctx.strokeStyle = selected ? '#FFD700' : '#555555';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx, y, bw, rowH);
          ctx.fillStyle = selected ? '#FFFFFF' : '#888888';
          ctx.textAlign = 'center';
          ctx.fillText('Back', CANVAS_WIDTH / 2, y + rowH - 6);
          return;
        }

        // Row background
        ctx.fillStyle = selected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(rowX, y, rowW, rowH);

        // Label
        ctx.fillStyle = selected ? '#FFD700' : '#888888';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, rowX + 8, y + rowH - 6);

        // Value area
        ctx.textAlign = 'center';
        const valueX = rowX + rowW - 100;

        if (item.volume !== undefined && item.volume !== null) {
          // Volume bar
          const barX = valueX - 50;
          const barW = 80;
          const barH = 6;
          const barY = y + (rowH - barH) / 2;
          ctx.fillStyle = '#333333';
          ctx.fillRect(barX, barY, barW, barH);
          ctx.fillStyle = '#55FF55';
          ctx.fillRect(barX, barY, barW * item.volume, barH);
          ctx.fillStyle = '#AAAAAA';
          ctx.textAlign = 'right';
          ctx.fillText(`${Math.round(item.volume * 100)}%`, rowX + rowW - 8, y + rowH - 6);
        } else if (item.value !== null) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(item.value, valueX, y + rowH - 6);
        }

        // Arrow buttons for cycling items
        if (item.cycle) {
          const leftArrowX = valueX - 70;
          const rightArrowX = rowX + rowW - arrowW - 4;
          const arrowY = y + 2;
          const arrowH = rowH - 4;

          // Left arrow
          ctx.fillStyle = '#444444';
          ctx.fillRect(leftArrowX, arrowY, arrowW, arrowH);
          ctx.fillStyle = '#FFD700';
          ctx.textAlign = 'center';
          ctx.fillText('<', leftArrowX + arrowW / 2, arrowY + arrowH - 4);

          // Right arrow
          ctx.fillStyle = '#444444';
          ctx.fillRect(rightArrowX, arrowY, arrowW, arrowH);
          ctx.fillStyle = '#FFD700';
          ctx.textAlign = 'center';
          ctx.fillText('>', rightArrowX + arrowW / 2, arrowY + arrowH - 4);
        }
      });
    },
```

- [ ] **Step 4: Update drawGameOver text**

Replace the "Press Enter" line in `drawGameOver` (line 443):

```js
      ctx.fillText('Tap or press Enter to continue', CANVAS_WIDTH / 2, 240);
```

- [ ] **Step 5: Verify in browser**

Open the game and check:
- Title screen shows button-styled menu items
- Settings menu shows rows with `<` `>` arrow buttons and the new "Input" row at top
- Pause menu shows button-styled items
- Game Over screen says "Tap or press Enter to continue"
- Keyboard navigation still works on all menus

- [ ] **Step 6: Commit**

```bash
git add gorilla-wars/js/renderer.js
git commit -m "feat: touch-friendly menu rendering with button styles and arrow controls"
```

---

### Task 7: Renderer — Slider HUD and Bottom Bar Drawing

**Files:**
- Modify: `gorilla-wars/js/renderer.js` (add new methods, update imports)

- [ ] **Step 1: Add imports for new constants**

At the top of `gorilla-wars/js/renderer.js`, update the import to include:

```js
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  SKY_DAY_COLOR, SKY_NIGHT_COLOR,
  WINDOW_LIT_COLOR, WINDOW_UNLIT_COLOR,
  BANANA_COLOR, BANANA_TIP_COLOR, BANANA_RADIUS,
  GORILLA_FRAME_SIZE, GORILLA_COLLISION_WIDTH, GORILLA_COLLISION_HEIGHT,
  GRAVITY_PRESETS, VELOCITY_SCALE, GRAVITY_SCALE,
  INPUT_BAR_HEIGHT, INPUT_BAR_Y, VELOCITY_MAX,
  SLIDER_THUMB_RADIUS,
  FIRE_BUTTON_WIDTH, FIRE_BUTTON_HEIGHT,
  PAUSE_BUTTON_X, PAUSE_BUTTON_Y, PAUSE_BUTTON_W, PAUSE_BUTTON_H,
} from './constants.js';
```

- [ ] **Step 2: Add drawSliderHUD method**

Add inside the returned object in `createRenderer`, after the `drawHUD` method:

```js
    drawSliderHUD(activePlayer, scores, round, totalRounds, wind) {
      ctx.font = '10px monospace';

      // Player labels + scores
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFD700';
      ctx.fillText('Player 1', 8, 14);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`Score: ${scores[0]}`, 8, 26);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#FFD700';
      ctx.fillText('Player 2', CANVAS_WIDTH - 8, 14);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`Score: ${scores[1]}`, CANVAS_WIDTH - 8, 26);

      // Round and wind on single center line, split apart
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#AAAAAA';
      ctx.fillText(`Round ${(round || 0) + 1}/${totalRounds || 1}`, CANVAS_WIDTH / 2 - 20, 12);

      ctx.textAlign = 'left';
      const maxArrows = 5;
      const arrowCount = Math.min(maxArrows, Math.ceil(Math.abs(wind) / 3));
      let windStr = 'Wind: ';
      if (wind === 0) {
        windStr += '-';
      } else {
        const ch = wind > 0 ? '>' : '<';
        for (let i = 0; i < arrowCount; i++) windStr += ch;
      }
      ctx.fillText(windStr, CANVAS_WIDTH / 2 + 20, 12);
    },

    drawInputBar(activePlayer, sliderAngle, sliderVelocity, isAI) {
      const barY = INPUT_BAR_Y;
      const barH = INPUT_BAR_HEIGHT;
      const alpha = isAI ? 0.4 : 0.88;

      // Bar background
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(0, barY, CANVAS_WIDTH, barH);
      ctx.strokeStyle = '#444444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, barY);
      ctx.lineTo(CANVAS_WIDTH, barY);
      ctx.stroke();

      const centerY = barY + barH / 2;

      // Player label
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = isAI ? '#888888' : '#FFD700';
      const playerLabel = isAI ? `Player ${activePlayer + 1} (AI)` : `Player ${activePlayer + 1}`;
      ctx.fillText(playerLabel, 60, centerY + 4);

      // Angle slider
      const angleSliderX = 130;
      const angleSliderW = 160;
      this._drawSlider(angleSliderX, centerY, angleSliderW, sliderAngle, 0, 180, '#FFD700', 'ANGLE', `${sliderAngle}\u00B0`);

      // Velocity slider
      const velSliderX = 340;
      const velSliderW = 160;
      this._drawSlider(velSliderX, centerY, velSliderW, sliderVelocity, 1, VELOCITY_MAX, '#FF4444', 'VELOCITY', String(sliderVelocity));

      // FIRE button
      const fireX = CANVAS_WIDTH - 80;
      const fireW = FIRE_BUTTON_WIDTH;
      const fireH = FIRE_BUTTON_HEIGHT;
      const fireY = centerY - fireH / 2;

      ctx.fillStyle = isAI ? '#441111' : '#CC0000';
      ctx.fillRect(fireX - fireW / 2, fireY, fireW, fireH);
      ctx.strokeStyle = isAI ? '#663333' : '#FF4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(fireX - fireW / 2, fireY, fireW, fireH);

      ctx.fillStyle = isAI ? '#666666' : '#FFFFFF';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FIRE!', fireX, centerY + 4);
    },

    _drawSlider(x, centerY, width, value, min, max, color, label, displayValue) {
      const trackY = centerY + 2;
      const trackH = 6;

      // Label
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#AAAAAA';
      ctx.fillText(label, x + width / 2, centerY - 14);

      // Value display
      ctx.font = '11px monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'right';
      ctx.fillText(displayValue, x - 4, centerY + 6);

      // Track background
      ctx.fillStyle = '#333333';
      ctx.fillRect(x, trackY - trackH / 2, width, trackH);

      // Track fill
      const pct = (value - min) / (max - min);
      ctx.fillStyle = color;
      ctx.fillRect(x, trackY - trackH / 2, width * pct, trackH);

      // Thumb
      const thumbX = x + width * pct;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(thumbX, trackY, SLIDER_THUMB_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(thumbX, trackY, SLIDER_THUMB_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    },

    getSliderGeometry() {
      const centerY = INPUT_BAR_Y + INPUT_BAR_HEIGHT / 2;
      const trackY = centerY + 2;
      return {
        angle: { x: 130, y: trackY, width: 160, min: 0, max: 180 },
        velocity: { x: 340, y: trackY, width: 160, min: 1, max: VELOCITY_MAX },
        fire: {
          x: CANVAS_WIDTH - 80 - FIRE_BUTTON_WIDTH / 2,
          y: centerY - FIRE_BUTTON_HEIGHT / 2,
          width: FIRE_BUTTON_WIDTH,
          height: FIRE_BUTTON_HEIGHT,
        },
      };
    },

    drawPauseButton() {
      const x = PAUSE_BUTTON_X;
      const y = PAUSE_BUTTON_Y;
      const w = PAUSE_BUTTON_W;
      const h = PAUSE_BUTTON_H;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('| |', x + w / 2, y + h - 4);
    },
```

- [ ] **Step 3: Verify in browser**

The new methods are added but not yet called. Verify the game still loads without errors by opening it in the browser.

- [ ] **Step 4: Commit**

```bash
git add gorilla-wars/js/renderer.js
git commit -m "feat: add slider HUD, input bar, and pause button renderer methods"
```

---

### Task 8: Main.js — Slider State and Input Mode Routing

**Files:**
- Modify: `gorilla-wars/js/main.js`

This task adds the slider state to the game object, routes rendering based on input method, and wires up the new slider HUD. Touch event handling is added in the next task.

- [ ] **Step 1: Add imports for new constants**

Update the import at the top of `gorilla-wars/js/main.js` (lines 1-10):

```js
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, DT, STATE,
  VELOCITY_SCALE, GRAVITY_SCALE, WIND_SCALE,
  WIND_MIN, WIND_MAX,
  EXPLOSION_BUILDING_RADIUS, EXPLOSION_GORILLA_RADIUS,
  GORILLA_FRAME_SIZE, BANANA_RADIUS,
  GORILLA_COLLISION_WIDTH, GORILLA_COLLISION_HEIGHT,
  GRAVITY_PRESETS,
  DEFAULT_ANGLE, DEFAULT_VELOCITY, VELOCITY_MAX,
  INPUT_BAR_Y, INPUT_BAR_HEIGHT,
  SLIDER_THUMB_HIT_RADIUS,
  PAUSE_BUTTON_X, PAUSE_BUTTON_Y, PAUSE_BUTTON_HIT_SIZE,
} from './constants.js';
```

- [ ] **Step 2: Add slider state to game object**

After `aiLastShot: null,` (line 83) in the game object, add:

```js
  sliderValues: [
    { angle: DEFAULT_ANGLE, velocity: DEFAULT_VELOCITY },
    { angle: DEFAULT_ANGLE, velocity: DEFAULT_VELOCITY },
  ],
  sliderFocus: 'angle', // 'angle' | 'velocity' | 'fire'
  activeSliderDrag: null, // null | 'angle' | 'velocity'
```

- [ ] **Step 3: Add inputMethod to settings menu item list**

Update `getSettingsItemName` (lines 447-461) to include `inputMethod` as the first item:

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
    'volume',
    'back',
  ];
  return items[index] || null;
}
```

Update `getSettingsItemCount` (lines 443-445):

```js
function getSettingsItemCount() {
  return settings.gravityPreset === 'Custom' ? 10 : 9;
}
```

- [ ] **Step 4: Add inputMethod cycling to handleSettingsKey**

In `handleSettingsKey`, add a case for `inputMethod` in the switch statement (after `case 'rounds':`):

```js
    case 'inputMethod': {
      const options = ['classic', 'sliders'];
      const idx = options.indexOf(settings.inputMethod);
      const newIdx = (idx + dir + options.length) % options.length;
      settings.inputMethod = options[newIdx];
      break;
    }
```

- [ ] **Step 5: Update drawGameScene for input method routing**

Replace the `drawGameScene` function (lines 794-856):

```js
function drawGameScene(alpha) {
  renderer.drawSky(game.isNight);

  if (settings.inputMethod === 'sliders') {
    renderer.drawSliderHUD(game.activePlayer, game.scores, game.round, game.totalRounds, game.wind);
  } else {
    renderer.drawWindIndicator(game.wind);
  }

  renderer.drawBuildingsFromHeightmap(game.buildings, game.heightmap);

  for (let i = 0; i < 2; i++) {
    renderer.drawGorilla(game.gorillas[i], spriteFrames, game.gorillas[i].frame);
  }

  // Shot trail — live during flight, fading previous after
  if (settings.shotTrail) {
    if (game.banana.active && game.shotTrail.length > 1) {
      renderer.drawShotTrail(game.shotTrail, 1);
    }
    if (game.trailAlpha > 0 && game.previousTrail.length > 1) {
      renderer.drawShotTrail(game.previousTrail, game.trailAlpha);
    }
  }

  // Aim preview
  if (game.state === STATE.PLAYER_INPUT && settings.aimPreview) {
    let previewAngle;
    if (settings.inputMethod === 'sliders') {
      previewAngle = game.sliderValues[game.activePlayer].angle;
    } else {
      previewAngle = game.inputField === 'angle' ? game.aimPreviewAngle : game.confirmedAngle;
    }
    if (previewAngle !== null && previewAngle !== undefined) {
      renderer.drawAimPreview(game.gorillas[game.activePlayer], previewAngle, game.activePlayer);
    }
  }

  // Dynamic aim preview
  if (game.state === STATE.PLAYER_INPUT && settings.dynamicAimPreview) {
    let dynAngle, dynVel;
    if (settings.inputMethod === 'sliders') {
      dynAngle = game.sliderValues[game.activePlayer].angle;
      dynVel = game.sliderValues[game.activePlayer].velocity;
    } else {
      dynAngle = game.inputField === 'angle' ? game.aimPreviewAngle : game.confirmedAngle;
      dynVel = null;
      if (game.inputField === 'velocity' && game.inputValue !== '') {
        dynVel = parseInt(game.inputValue, 10);
      } else if (game.inputField === 'velocity' && game.lastInputs[game.activePlayer].velocity !== null) {
        dynVel = game.lastInputs[game.activePlayer].velocity;
      }
    }
    if (dynAngle !== null && dynAngle !== undefined && dynVel !== null && !isNaN(dynVel) && dynVel > 0) {
      renderer.drawDynamicAimPreview(
        game.gorillas[game.activePlayer], dynAngle, dynVel,
        game.activePlayer, getGravityValue(settings)
      );
    }
  }

  renderer.drawBanana(game.banana, alpha);
  renderer.drawSunMoon(game.isNight, game.celestialSurprised);

  if (game.banana.active && game.banana.y < 0) {
    renderer.drawBananaTracker(game.banana.x);
  }

  for (const e of game.explosions) renderer.drawExplosion(e);
  renderer.drawParticles(game.particles);

  if (settings.inputMethod === 'sliders') {
    // Draw input bar during PLAYER_INPUT
    if (game.state === STATE.PLAYER_INPUT) {
      const sv = game.sliderValues[game.activePlayer];
      renderer.drawInputBar(game.activePlayer, sv.angle, sv.velocity, isAITurn());
    }
  } else {
    renderer.drawHUD(
      game.activePlayer, game.inputField, game.inputValue,
      game.lastInputs, game.scores, game.blinkOn,
      game.round, game.totalRounds
    );
  }

  // Pause button during gameplay
  if (game.state === STATE.PLAYER_INPUT || game.state === STATE.PROJECTILE_FLIGHT) {
    renderer.drawPauseButton();
  }
}
```

- [ ] **Step 6: Update resetInput for slider mode**

Update `resetInput` (lines 712-719) to reset slider focus:

```js
function resetInput() {
  input.resetInput();
  game.inputField = 'angle';
  game.inputValue = '';
  game.confirmedAngle = null;
  game.aimPreviewAngle = null;
  game.aiThinkTimer = 0;
  game.sliderFocus = 'angle';
  game.activeSliderDrag = null;
}
```

- [ ] **Step 7: Update startRound to reset slider values**

In `startRound` (line 679), change the `lastInputs` reset to also reset slider values:

```js
  game.lastInputs = [{ angle: null, velocity: null }, { angle: null, velocity: null }];
  game.sliderValues = [
    { angle: DEFAULT_ANGLE, velocity: DEFAULT_VELOCITY },
    { angle: DEFAULT_ANGLE, velocity: DEFAULT_VELOCITY },
  ];
```

Add `DEFAULT_ANGLE, DEFAULT_VELOCITY` to the destructured import from `./constants.js` if not already there (it was added in step 1).

- [ ] **Step 8: Update handleTitleAction for fullscreen + orientation lock**

Replace the `fullscreen` case in `handleTitleAction` (line 415-417):

```js
    case 'fullscreen':
      (async () => {
        try {
          await document.documentElement.requestFullscreen();
          await screen.orientation.lock('landscape').catch(() => {});
        } catch { /* fullscreen unsupported */ }
      })();
      break;
```

- [ ] **Step 9: Add keyboard handling for slider mode**

Add a new function after `handlePlayerInputKey`:

```js
function handleSliderInputKey(key) {
  if (key === 'Tab') {
    const order = ['angle', 'velocity', 'fire'];
    const idx = order.indexOf(game.sliderFocus);
    game.sliderFocus = order[(idx + 1) % order.length];
    return;
  }

  if (key === 'Enter') {
    const sv = game.sliderValues[game.activePlayer];
    game.lastInputs[game.activePlayer].angle = sv.angle;
    game.lastInputs[game.activePlayer].velocity = sv.velocity;
    fireBanana(sv.angle, sv.velocity);
    return;
  }

  const sv = game.sliderValues[game.activePlayer];
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const delta = key === 'ArrowRight' ? 1 : -1;
    if (game.sliderFocus === 'angle') {
      sv.angle = Math.max(0, Math.min(180, sv.angle + delta));
    } else if (game.sliderFocus === 'velocity') {
      sv.velocity = Math.max(1, Math.min(VELOCITY_MAX, sv.velocity + delta));
    }
  }
}
```

Update the `PLAYER_INPUT` case in `handleKey` (lines 364-367):

```js
    case STATE.PLAYER_INPUT:
      if (key === 'Escape') { enterPause(); break; }
      if (isAITurn()) break;
      if (settings.inputMethod === 'sliders') {
        handleSliderInputKey(key);
      } else {
        handlePlayerInputKey(key);
      }
      break;
```

- [ ] **Step 10: Add GAME_OVER click/tap handler**

In `handleKey`, update the `GAME_OVER` case to also support the click handler. In `handleClick` (after the pause menu section), add:

```js
  } else if (game.state === STATE.GAME_OVER) {
    game.state = STATE.TITLE_SCREEN;
    game.menuIndex = 0;
  }
```

- [ ] **Step 11: Verify in browser**

Open the game, go to Settings, and toggle Input to "Sliders". Start a new game.
- Slider HUD should display at the bottom
- Top HUD should show scores and round/wind
- Keyboard arrows should adjust sliders
- Enter should fire
- Pause button should appear in top-right

- [ ] **Step 12: Commit**

```bash
git add gorilla-wars/js/main.js
git commit -m "feat: slider state, input mode routing, keyboard slider controls, fullscreen orientation lock"
```

---

### Task 9: Main.js — Touch Event Handling

**Files:**
- Modify: `gorilla-wars/js/main.js`

- [ ] **Step 1: Add touch event listeners in init()**

In the `init()` function, after `canvas.addEventListener('click', handleClick);` (line 106), add:

```js
  // Touch handlers for slider and menu interaction
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
```

- [ ] **Step 2: Add canvas coordinate translation helper**

Add after the `handleClick` function:

```js
function canvasCoords(touch) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;
  return {
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top) * scaleY,
  };
}
```

- [ ] **Step 3: Add handleTouchStart**

```js
function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const { x, y } = canvasCoords(touch);

  // Pause button hit test
  if (game.state === STATE.PLAYER_INPUT || game.state === STATE.PROJECTILE_FLIGHT) {
    const px = PAUSE_BUTTON_X;
    const py = PAUSE_BUTTON_Y;
    const hitSize = PAUSE_BUTTON_HIT_SIZE;
    if (x >= px - (hitSize - 24) && x <= px + 24 && y >= py && y <= py + hitSize) {
      enterPause();
      return;
    }
  }

  // Slider interaction during PLAYER_INPUT
  if (game.state === STATE.PLAYER_INPUT && settings.inputMethod === 'sliders' && !isAITurn()) {
    const geo = renderer.getSliderGeometry();

    // Fire button
    const fb = geo.fire;
    if (x >= fb.x && x <= fb.x + fb.width && y >= fb.y && y <= fb.y + fb.height) {
      const sv = game.sliderValues[game.activePlayer];
      game.lastInputs[game.activePlayer].angle = sv.angle;
      game.lastInputs[game.activePlayer].velocity = sv.velocity;
      fireBanana(sv.angle, sv.velocity);
      return;
    }

    // Angle slider
    if (hitTestSlider(x, y, geo.angle)) {
      game.activeSliderDrag = 'angle';
      updateSliderFromX(x, geo.angle, 'angle');
      return;
    }

    // Velocity slider
    if (hitTestSlider(x, y, geo.velocity)) {
      game.activeSliderDrag = 'velocity';
      updateSliderFromX(x, geo.velocity, 'velocity');
      return;
    }
  }

  // Menu tap — forward to click handler
  handleClick(e);
}
```

- [ ] **Step 4: Add handleTouchMove**

```js
function handleTouchMove(e) {
  e.preventDefault();
  if (!game.activeSliderDrag) return;

  const touch = e.changedTouches[0];
  const { x } = canvasCoords(touch);
  const geo = renderer.getSliderGeometry();
  const slider = geo[game.activeSliderDrag];
  updateSliderFromX(x, slider, game.activeSliderDrag);
}
```

- [ ] **Step 5: Add handleTouchEnd**

```js
function handleTouchEnd(e) {
  e.preventDefault();
  game.activeSliderDrag = null;
}
```

- [ ] **Step 6: Add slider hit test and update helpers**

```js
function hitTestSlider(x, y, slider) {
  const thumbX = slider.x + slider.width * ((currentSliderValue(slider) - slider.min) / (slider.max - slider.min));
  const hitR = SLIDER_THUMB_HIT_RADIUS;

  // Hit the thumb?
  if (Math.abs(x - thumbX) <= hitR && Math.abs(y - slider.y) <= hitR) return true;

  // Hit the track?
  if (x >= slider.x && x <= slider.x + slider.width && Math.abs(y - slider.y) <= 12) return true;

  return false;
}

function currentSliderValue(slider) {
  const sv = game.sliderValues[game.activePlayer];
  if (slider.min === 0 && slider.max === 180) return sv.angle;
  return sv.velocity;
}

function updateSliderFromX(x, slider, which) {
  const pct = Math.max(0, Math.min(1, (x - slider.x) / slider.width));
  const raw = slider.min + pct * (slider.max - slider.min);
  const value = Math.round(Math.max(slider.min, Math.min(slider.max, raw)));
  game.sliderValues[game.activePlayer][which] = value;
}
```

- [ ] **Step 7: Update handleClick for touch-forwarded events**

The existing `handleClick` receives both native clicks and forwarded touch events. Update it to handle the `TouchEvent` case by extracting coordinates from `changedTouches`:

Replace the coordinate extraction at the top of `handleClick` (lines 616-621):

```js
function handleClick(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;
  let clientX, clientY;
  if (e.changedTouches) {
    clientX = e.changedTouches[0].clientX;
    clientY = e.changedTouches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  const cx = (clientX - rect.left) * scaleX;
  const cy = (clientY - rect.top) * scaleY;
```

- [ ] **Step 8: Update handleClick hit areas for new button geometry**

Update the title screen click detection to match the new button layout (items now at `200 + i * 40` with 180px wide, 30px tall buttons):

```js
  if (game.state === STATE.TITLE_SCREEN) {
    const items = ['new_game', 'settings', 'fullscreen'];
    for (let i = 0; i < items.length; i++) {
      const itemY = 200 + i * 40;
      const w = 180;
      const h = 30;
      const x = CANVAS_WIDTH / 2 - w / 2;
      if (cx >= x && cx <= x + w && cy >= itemY - h / 2 && cy <= itemY + h / 2) {
        game.menuIndex = i;
        handleTitleAction(items[i]);
        break;
      }
    }
  } else if (game.state === STATE.PAUSED) {
    const items = ['resume', 'restart', 'settings', 'quit'];
    for (let i = 0; i < items.length; i++) {
      const itemY = 180 + i * 36;
      const w = 200;
      const h = 28;
      const x = CANVAS_WIDTH / 2 - w / 2;
      if (cx >= x && cx <= x + w && cy >= itemY - h / 2 && cy <= itemY + h / 2) {
        game.menuIndex = i;
        handlePauseAction(items[i]);
        break;
      }
    }
  } else if (game.state === STATE.GAME_OVER) {
    game.state = STATE.TITLE_SCREEN;
    game.menuIndex = 0;
  }
```

- [ ] **Step 9: Add settings menu touch handling to handleClick**

Add after the GAME_OVER block:

```js
  else if (game.state === STATE.SETTINGS) {
    // Settings rows: detect arrow button taps
    const rowH = 22;
    const rowGap = 4;
    const startY = 68;
    const rowW = 340;
    const rowX = CANVAS_WIDTH / 2 - rowW / 2;
    const arrowW = 24;
    const itemCount = getSettingsItemCount();

    for (let i = 0; i < itemCount; i++) {
      const y = startY + i * (rowH + rowGap);
      const itemName = getSettingsItemName(i);

      if (itemName === 'back') {
        // Back button
        const bw = 120;
        const bx = CANVAS_WIDTH / 2 - bw / 2;
        if (cx >= bx && cx <= bx + bw && cy >= y && cy <= y + rowH) {
          handleSettingsKey('Enter');
          game.settingsIndex = i;
          return;
        }
        continue;
      }

      if (cy >= y && cy <= y + rowH) {
        game.settingsIndex = i;
        const valueX = rowX + rowW - 100;
        const leftArrowX = valueX - 70;
        const rightArrowX = rowX + rowW - arrowW - 4;

        // Left arrow
        if (cx >= leftArrowX && cx <= leftArrowX + arrowW) {
          handleSettingsKey('ArrowLeft');
          return;
        }
        // Right arrow
        if (cx >= rightArrowX && cx <= rightArrowX + arrowW) {
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
                saveSettings(settings);
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

- [ ] **Step 10: Store slider values on fire for pre-fill on next turn**

In `handleAITurn` (around line 748), after the AI fires, store slider values so the AI's values don't overwrite the human's. This is already handled because `sliderValues` is per-player. No change needed — verify the sliderValues array indexing works correctly.

In the `handleSliderInputKey` Enter handler, the `fireBanana` call already uses `sv.angle` and `sv.velocity`, and sliderValues persist per-player. Verify that on the next turn, the slider pre-fill reads from `game.sliderValues[game.activePlayer]` which was set during the previous fire. This works because `sliderValues` is only reset in `startRound`, not on turn change.

No code change needed for this step — just verification.

- [ ] **Step 11: Verify touch interaction in browser**

Test on desktop by using Chrome DevTools device simulation:
1. Open DevTools → Toggle Device Toolbar → select iPhone 14 Pro Max
2. Set to landscape
3. Navigate menus by tapping
4. Start a game with Sliders input
5. Drag the angle slider — value updates in real time
6. Drag the velocity slider
7. Tap FIRE! — banana launches
8. Tap pause button — pause menu appears
9. Test Settings — tap `<` and `>` arrows to cycle values

- [ ] **Step 12: Commit**

```bash
git add gorilla-wars/js/main.js
git commit -m "feat: touch event handling for sliders, menus, pause button, and game over"
```

---

### Task 10: Integration Testing and Final Verification

**Files:**
- All modified files

- [ ] **Step 1: Run all unit tests**

Run: `cd gorilla-wars && node --test`
Expected: All tests PASS

- [ ] **Step 2: Browser test — Classic mode unchanged**

1. Open game, go to Settings, set Input to "Classic"
2. Start a new game
3. Verify: angle/velocity text fields in top corners, round/score box at bottom center, wind indicator at top center
4. Type angle, Enter, type velocity, Enter — banana fires
5. All existing behavior works identically

- [ ] **Step 3: Browser test — Slider mode on desktop**

1. Settings → Input: Sliders
2. Start a new game
3. Verify: scores under player names at top, round + wind split on center line
4. Bottom bar shows Player 1 label, angle slider at 45, velocity slider at 50
5. Arrow keys adjust sliders, Tab switches focus, Enter fires
6. After Player 1 fires, bar switches to Player 2 (or AI)
7. AI turn: bar grayed out, auto-fires after delay
8. Aim preview updates in real time when enabled
9. Pause button visible, click opens pause menu

- [ ] **Step 4: Browser test — Touch simulation**

1. Chrome DevTools → Device simulation → iPhone 14 Pro Max landscape
2. All menus respond to tap
3. Sliders respond to drag
4. Fire button responds to tap
5. Portrait orientation shows rotate prompt
6. Fullscreen button works

- [ ] **Step 5: Browser test — Settings persistence**

1. Set Input to "Sliders", close and reopen
2. Verify "Sliders" is still selected
3. Switch to "Classic", close and reopen
4. Verify "Classic" is still selected

- [ ] **Step 6: Commit final state**

If any fixes were needed during testing, commit them:

```bash
git add -A
git commit -m "test: integration verification for touch-friendly interface"
```
