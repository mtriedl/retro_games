# Touch-Friendly Interface Design

**Date:** 2026-04-10
**Scope:** Gorilla Wars — make the game playable on touchscreen phones and tablets

## Target Devices

- **Phone:** iPhone 18 Max in landscape (~932x430 CSS pixels)
- **Tablet:** iPad Mini 5 in landscape (~1024x768 CSS pixels)
- **Orientation:** Landscape only for both form factors
- **Desktop:** All changes also work with keyboard/mouse; existing keyboard controls preserved

## 1. In-Game Input Controls

### Unified Bottom Bar

Replace the per-player angle/velocity text fields (currently drawn in the top-left and top-right corners of the HUD) with a single shared input bar at the bottom of the screen.

**Layout:** `[Player Label] — [Angle Slider] — [Velocity Slider] — [FIRE! Button]`

- **Player label:** Shows whose turn it is (e.g., "Player 1") in gold text. Swaps each turn.
- **Angle slider:** Horizontal slider, range 0–180, integers only (snaps to whole numbers). 0° is horizontal in the player's facing direction, 90° is straight up, 180° is horizontal behind the player. The physics layer handles directional mirroring based on active player — the slider always shows the same 0–180 range for both players. Label "ANGLE" above, current value displayed to the left of the track.
- **Velocity slider:** Horizontal slider, range 1-500, integers only. Label "VELOCITY" above, current value displayed to the left of the track.
- **FIRE! button:** Large red button, visually separated from the sliders with generous spacing.

**Spacing & touch targets:** 24-40px gaps between elements (wider on tablet). Slider thumbs are 20px diameter visually with 44x44px touch hit areas (centered on thumb), meeting Apple's minimum 44pt touch target guideline. FIRE! button is minimum 44px tall and 88px wide. Fire button padded to prevent accidental taps when adjusting sliders.

**Pre-fill behavior:** At the start of each player's turn, both sliders are set to that player's values from their previous throw. First throw of the game defaults to angle 45, velocity 50.

**Bar styling:** Semi-transparent dark background (`rgba(0,0,0,0.88)`), 2px solid top border (`#444`). The bar is drawn directly onto the canvas in canvas logical coordinates (640x400 space), not as a DOM overlay. It occupies the bottom 48 logical pixels of the canvas (y=352 to y=400). This scales identically with the canvas on all screen sizes and uses the same hit-testing path as existing menu click handlers.

**Gameplay area overlap:** The bar overlaps the lowest 48px of the 400px canvas. Buildings in this zone (heights 120–230px, drawn from the bottom up) are partially obscured. This is acceptable because the bar is only shown during PLAYER_INPUT state — it hides during PROJECTILE_FLIGHT, IMPACT, and ROUND_END, giving full visibility when action is happening. Gorillas stand atop buildings, well above the overlap zone in most configurations.

### Slider Interaction

- **Thumb drag:** Touch the thumb (hit area: 44x44px centered on the thumb visual) and drag horizontally. The slider tracks horizontal movement even if the touch drifts vertically outside the slider bounds, until touchend.
- **Track tap:** Tapping anywhere on the slider track (outside the thumb hit area) jumps the value to that position immediately, then allows drag from there.
- **No visual feedback beyond value update:** The thumb does not enlarge or show a tooltip during drag. The numeric value label updates in real time as the thumb moves.
- **Touch isolation:** Only one slider can be active at a time. If a touch starts on the angle slider thumb, it controls angle until released, even if the finger crosses into the velocity slider's area.

### Keyboard Support for Sliders

The slider input method also supports keyboard control:
- **Tab:** Move focus between angle slider, velocity slider, and fire button
- **Left/Right arrow keys:** Adjust the focused slider by 1 unit
- **Enter/Return:** Activate the fire button (only when the fire button is focused)

### Aim Preview Integration

When `aimPreview` is enabled in settings and the input method is "Sliders":
- The static aim preview line updates in real time as the angle slider is dragged, using the current slider angle and the last-used velocity (or default 50 on first turn)
- Once the player adjusts the velocity slider, the preview uses the confirmed angle and updates with the velocity in real time

When `dynamicAimPreview` is enabled:
- The full trajectory arc (accounting for gravity) renders in real time as either slider is adjusted. Wind is not included in the preview — this keeps the preview as a planning aid rather than a perfect predictor, matching the existing Classic mode behavior.
- Updates are throttled to every 3rd frame (20fps) if performance is an issue on low-end devices

When input method is "Classic", aim previews work as they do today (based on typed digits).

### AI Turns (Slider Mode)

When Player 2 is AI and input method is "Sliders":
- The bottom bar is shown but grayed out (reduced opacity, ~0.4) during the AI's thinking delay (0.8s)
- The player label reads "Player 2 (AI)" in a muted color
- Sliders are not interactive — touch events on the bar are ignored
- The AI fires automatically after the thinking delay, same as in Classic mode
- Sliders do NOT animate to show the AI's chosen values — this would telegraph the AI's strategy and slow down gameplay

### Pause Button

A pause button is shown in the top-right corner of the canvas during gameplay states (PLAYER_INPUT, PROJECTILE_FLIGHT):
- **Visual:** "| |" (pause icon), 10px monospace, semi-transparent background
- **Position:** Top-right corner, y=4, x=CANVAS_WIDTH-28, 24x16px visual, 44x44px touch hit area (extending down and left from the corner)
- **Tap:** Calls `enterPause()`, same as pressing Escape
- **Not shown:** On TITLE_SCREEN, SETTINGS, PAUSED, ROUND_START, ROUND_END, GAME_OVER states
- **Desktop:** Visible but non-essential — Escape key still works
- **Positioning:** Placed to avoid collision with the Player 2 HUD area (which starts at x=540) in both input modes

### Revised Top HUD (Slider Mode Only)

This revised HUD layout applies only when the input method is "Sliders":

- **Remove:** Angle and velocity text fields from under player names
- **Remove:** The bottom-center round/score overlay box (currently rendered at the bottom of the canvas with semi-transparent background)
- **Remove:** The standalone `drawWindIndicator()` call — wind is consolidated into the HUD center line below
- **Add:** Score counter under each player name (e.g., "Score: 2")
- **Move:** Round counter from the bottom-center box to the top HUD, on a single center line: `Round 3/5` on the left of center, `Wind: <<<` on the right of center, with a wide gap between them

**Slider mode HUD layout:**
```
Player 1          Round 3/5          Wind: <<<          Player 2
Score: 2                                                Score: 1
```

**Classic mode HUD:** Retains the existing layout entirely unchanged — angle/velocity text fields under player names, round/score box at bottom center, standalone wind indicator at top center.

**Sun/Moon position:** The sun/moon sprite remains at its current position (top-center, y≈35). It is a gameplay entity with collision bounds, not a HUD element. The round/wind line (at approximately y≈12) must not overlap the sun/moon below it. The HUD diagram above is schematic — it does not imply the sun/moon is repositioned.

**Banana off-screen tracker:** Retained as-is in both modes. When the banana is in flight and above the visible area, the "▲ BANANA" indicator draws at y=10, horizontally tracking the banana's x position. In Slider mode this may briefly overlap the round/wind text during flight — this is acceptable because the round/wind text is static reference info while the tracker is transient and actionable.

## 2. Input Method Setting

Add a new setting: **Input Method** with two options:
- **Classic** — the existing keyboard-driven text input (type digits, press Enter)
- **Sliders** — the new slider-based input described above

This setting cycles with `<` / `>` like existing settings. Stored in localStorage alongside other settings. It appears as the first row in the Settings menu (above Rounds) and displays as `Input: < Classic >` or `Input: < Sliders >`.

**Auto-detection:** On touch devices (detected via `'ontouchstart' in window` or similar), default to "Sliders". On desktop, default to "Classic". The user can override in either direction via Settings.

**When "Classic" is selected:** The original per-player angle/velocity text fields are drawn in the top corners as before. The bottom bar is not shown.

**When "Sliders" is selected:** The bottom bar is shown, top HUD angle/velocity text fields are removed.

**HUD layout is mode-dependent:** Classic mode keeps its existing HUD unchanged. Slider mode uses the revised HUD described in Section 1. See "Revised Top HUD (Slider Mode Only)" for details.

## 3. Touch-Friendly Menus

### Title Screen

The three menu items ("New Game", "Settings", "Fullscreen") become tappable button-styled elements. The "Fullscreen" item calls the enhanced fullscreen handler described in Section 4 — enters fullscreen, then attempts orientation lock to landscape.
- Each item rendered as a bordered rectangle (min 44px tall, ~180px+ wide)
- Selected item (via keyboard nav): gold border + white text
- Unselected items: gray border + gray text
- **Tap:** Activates the item immediately (no select-then-confirm needed)
- **Keyboard:** Arrow keys to navigate, Enter to confirm (unchanged behavior)

### Settings Menu

Each setting row rendered with visible `<` and `>` arrow buttons:
- Arrow buttons: 36x36px visual with 44x44px touch hit area, visible background (`#444`)
- Current value displayed between the arrows
- Tap `<` or `>` to cycle the value
- Label on the left, value controls on the right
- Volume: visual progress bar between the arrows, percentage label
- Custom Gravity: when gravity preset is "Custom", tapping the value area:
  1. Positions a hidden `<input type="number" inputmode="decimal">` element off-screen (left: -9999px)
  2. Calls `.focus()` on it, triggering the native numeric keyboard on mobile
  3. Listens for `input` events — each keystroke updates the canvas-rendered value in real time
  4. On `blur` (keyboard dismissed), the entered value is parsed, clamped to minimum 0.1, and committed to settings
  5. If the value is empty or unparseable on blur, it reverts to the previous value
  6. Decimal input is supported (`inputmode="decimal"` ensures the keyboard shows a decimal point)
  7. On desktop, this input is also used but is visually hidden — keyboard input goes through the existing `handleSettingsKey` path as before
- "Back" button: same bordered button style as title screen items
- Keyboard navigation still works: arrow keys to move between rows, left/right to cycle values

### Pause Menu

Same button treatment as the title screen. Four items: Resume, Restart Round, Settings, Quit to Title. Tap to activate.

### Game Over Screen

Tap anywhere on the canvas to return to the title screen, matching the existing Enter key behavior. Update the `drawGameOver()` prompt text from "Press Enter to continue" to "Tap or press Enter to continue".

## 4. Orientation & Fullscreen

### Fullscreen + Orientation Lock

The existing "Fullscreen" menu item on the title screen is enhanced:
1. Call `canvas.requestFullscreen()` (or the element wrapping the canvas)
2. After entering fullscreen, attempt `screen.orientation.lock('landscape')`
3. Wrap the orientation lock in a try/catch — it's unsupported on iOS Safari

**Android:** Both APIs work. User taps Fullscreen, gets locked landscape fullscreen.
**iOS Safari:** Orientation lock not supported. The Fullscreen API is not available in Safari. For home-screen installs, iOS uses the `apple-mobile-web-app-capable` meta tag to launch in standalone mode (no Safari chrome). A web app manifest with `display: fullscreen` and `orientation: landscape` provides the equivalent behavior on Android. Falls back to rotate prompt when neither is available.
**Desktop:** Fullscreen works normally. Orientation lock is a no-op.

### Rotate Prompt (Portrait Fallback)

A CSS-only overlay shown when the device is in portrait orientation:
- Triggered by `@media (orientation: portrait)` media query
- Covers the entire viewport, blocks all game interaction
- Shows a phone icon, "Rotate Your Device" heading, and brief explanation
- Hides the canvas and all game UI underneath
- Disappears automatically when the device is rotated to landscape
- Never appears on desktop (always landscape or wide enough)

## 5. Architecture

### Files Modified

- **`input.js`** — Add slider input state management: track slider values per player, handle touch events (touchstart/touchmove/touchend) on slider areas, emit the same angle/velocity values to main.js that the classic input does. Update the Classic mode velocity clamp from `Math.min(1000, ...)` to `Math.min(500, ...)` so both input methods share the same 1–500 range. Remove the unused `confirmed` field from the input state object and from `resetInput()`.
- **`renderer.js`** — Add `drawSliderHUD(activePlayer, scores, round, totalRounds, wind)` for the Slider mode layout (scores under names, round+wind center line). The existing `drawHUD()` is unchanged for Classic mode. Add drawing methods for the bottom input bar (sliders, fire button, player label), pause button, and touch-friendly menu buttons and settings rows. Update `drawGameOver()` prompt text to "Tap or press Enter to continue".
- **`main.js`** — Route input based on the input method setting. In `drawGameScene()`, check the input method: if "Sliders", call `drawSliderHUD()` and skip the standalone `drawWindIndicator()` call; if "Classic", call `drawHUD()` and `drawWindIndicator()` unchanged. Register touch/click handlers for menu items and settings arrows. Add touch/click handler for GAME_OVER state (tap anywhere returns to title, same as Enter). Add pause button hit testing to the touch/click handler: during PLAYER_INPUT and PROJECTILE_FLIGHT states, a tap in the pause button's hit area (top-right corner, 44x44px) calls `enterPause()`. Update `handleTitleAction('fullscreen')` to call the new fullscreen+orientation-lock sequence (Section 4) instead of bare `canvas.requestFullscreen?.()`.
- **`constants.js`** — Add constants for slider dimensions, touch target sizes, bottom bar height, default slider values. Change `VELOCITY_SCALE` from 2.5 to 5.0 so that the new max velocity (500) produces the same peak speed as the old max (1000). Add `VELOCITY_MAX = 500` and `DEFAULT_VELOCITY = 50`.
- **`ai.js`** — Halve the velocity search ranges to maintain equivalent AI behavior after the `VELOCITY_SCALE` rescaling. Coarse sweep: 10–100 step 5 (was 20–200 step 10). Fine sweep: ±5 step 1 (was ±10 step 2). Final clamp: 1–100 (was 1–200). The AI's effective physical speed range (50–500 px/s) is preserved.
- **`settings.js`** — Add `inputMethod` field ('classic' | 'sliders'). `loadSettings()` applies auto-detection: if no stored `inputMethod` value exists, check `'ontouchstart' in window` at load time and default to `'sliders'` on touch devices, `'classic'` otherwise. Once the user manually changes the setting, the stored value takes precedence.
- **`css/style.css`** — Add the rotate prompt overlay and its portrait media query. Add `touch-action: none` and `user-select: none` on the canvas element to prevent browser scroll/zoom gestures from interfering with slider dragging and game touch input:
  ```css
  #game {
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
  }
  ```
- **`index.html`** — Add the rotate prompt DOM element after the canvas:
  ```html
  <div id="rotate-prompt">
    <div class="rotate-icon">&#x1F4F1;</div>
    <h2>Rotate Your Device</h2>
    <p>Gorilla Wars plays in landscape mode</p>
  </div>
  ```
  Styled in `style.css` with `display: none` by default, shown via `@media (orientation: portrait) { #rotate-prompt { display: flex; } }`. The overlay uses `position: fixed; inset: 0; z-index: 100` to cover the entire viewport. Update the viewport meta tag to prevent pinch-zoom during gameplay:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  ```
  `viewport-fit=cover` ensures the canvas extends into safe area insets on notched phones. `user-scalable=no` + `maximum-scale=1.0` prevents accidental pinch-zoom, which conflicts with slider dragging.

  Add iOS standalone web app meta tags and link the manifest so "Add to Home Screen" launches in fullscreen without browser chrome:
  ```html
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="Gorilla Wars">
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#000000">
  ```
- **`manifest.json`** (new file) — Web app manifest for home-screen installation. Sets `display: fullscreen` and `orientation: landscape` so Android Chrome launches the game fullscreen in landscape when installed. iOS Safari ignores the manifest display mode but uses the `apple-mobile-web-app-capable` meta tag for the same effect.

### Files Not Modified

- **`physics.js`** — No changes. Receives angle and velocity the same way regardless of input method. The velocity rescaling is transparent to physics — it reads `VELOCITY_SCALE` from constants.
- **`buildings.js`** — No changes.
- **`audio.js`** — No changes.
- **`sprites.js`** — No changes.
- Shot trail rendering is unaffected — trail points are recorded during PROJECTILE_FLIGHT regardless of input method.

### Touch Event Strategy

All touch handling happens on the canvas element. Touch coordinates are translated identically to the existing click handler in `main.js`:

```js
const rect = canvas.getBoundingClientRect();
const scaleX = CANVAS_WIDTH / rect.width;
const scaleY = CANVAS_HEIGHT / rect.height;
const cx = (touch.clientX - rect.left) * scaleX;
const cy = (touch.clientY - rect.top) * scaleY;
```

This works for both the bottom bar and all other canvas UI elements, since everything exists in the same 640x400 coordinate space. Hit testing determines which UI element (slider thumb, fire button, menu item, settings arrow) was touched, and dispatches accordingly.

The game already has click handling for menu items — touch support extends this with proper touch events (touchstart/touchmove/touchend) to enable drag behavior on sliders and prevent the 300ms click delay on mobile.

### Slider State

Each player's slider values are stored in the game state object, persisting across turns within a round. On round start, values reset to defaults (angle 45, velocity 50). On subsequent turns within the same round, values carry over from that player's last throw.

## 6. What This Design Does NOT Include

- Portrait mode support — landscape only
- Gesture-based aiming (slingshot/drag-to-aim) — sliders only
- Haptic feedback — not in scope
- On-screen D-pad or virtual keyboard — not needed
- Changes to game physics behavior or audio (the `VELOCITY_SCALE` constant changes and AI search ranges are halved, but the effective speed ranges are preserved for both players and AI)
