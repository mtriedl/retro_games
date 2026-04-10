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
- **Angle slider:** Horizontal slider, range 0-90, integers only (snaps to whole numbers). Label "ANGLE" above, current value displayed to the left of the track.
- **Velocity slider:** Horizontal slider, range 1-200, integers only. Label "VELOCITY" above, current value displayed to the left of the track.
- **FIRE! button:** Large red button, visually separated from the sliders with generous spacing.

**Spacing:** 24-40px gaps between elements (wider on tablet). Slider thumbs 20-24px diameter with expanded touch hit areas. Fire button padded to prevent accidental taps when adjusting sliders.

**Pre-fill behavior:** At the start of each player's turn, both sliders are set to that player's values from their previous throw. First throw of the game defaults to angle 45, velocity 100.

**Bar styling:** Semi-transparent dark background (`rgba(0,0,0,0.88)`), 2px solid top border (`#444`), height ~64px on phone, ~72px on tablet. Overlays the bottom of the canvas.

### Keyboard Support for Sliders

The slider input method also supports keyboard control:
- **Tab:** Move focus between angle slider, velocity slider, and fire button
- **Left/Right arrow keys:** Adjust the focused slider by 1 unit
- **Enter/Return:** Activate the fire button

### Revised Top HUD

- **Remove:** Angle and velocity text fields from under player names
- **Add:** Score counter under each player name (e.g., "Score: 2")
- **Round and wind on a single line:** `Round 3/5` on the left of center, `Wind: <<<` on the right of center, with a wide gap between them. Sun/moon sits below, centered.

**Top HUD layout:**
```
Player 1          Round 3/5          Wind: <<<          Player 2
Score: 2                                                Score: 1
                         [Sun/Moon]
```

## 2. Input Method Setting

Add a new setting: **Input Method** with two options:
- **Classic** — the existing keyboard-driven text input (type digits, press Enter)
- **Sliders** — the new slider-based input described above

This setting cycles with `<` / `>` like existing settings. Stored in localStorage alongside other settings.

**Auto-detection:** On touch devices (detected via `'ontouchstart' in window` or similar), default to "Sliders". On desktop, default to "Classic". The user can override in either direction via Settings.

**When "Classic" is selected:** The original per-player angle/velocity text fields are drawn in the top corners as before. The bottom bar is not shown.

**When "Sliders" is selected:** The bottom bar is shown, top HUD angle/velocity text fields are removed.

**Both modes:** The revised top HUD layout applies regardless of input method — scores under player names, round and wind on a single line with the sun/moon below.

## 3. Touch-Friendly Menus

### Title Screen

The three menu items ("New Game", "Settings", "Fullscreen") become tappable button-styled elements:
- Each item rendered as a bordered rectangle (min 44px tall, ~180px+ wide)
- Selected item (via keyboard nav): gold border + white text
- Unselected items: gray border + gray text
- **Tap:** Activates the item immediately (no select-then-confirm needed)
- **Keyboard:** Arrow keys to navigate, Enter to confirm (unchanged behavior)

### Settings Menu

Each setting row rendered with visible `<` and `>` arrow buttons:
- Arrow buttons: 36x36px tappable targets with visible background (`#444`)
- Current value displayed between the arrows
- Tap `<` or `>` to cycle the value
- Label on the left, value controls on the right
- Volume: visual progress bar between the arrows, percentage label
- Custom Gravity: when gravity preset is "Custom", tapping the value area focuses a hidden `<input type="number">` element, which triggers the native numeric keyboard on mobile
- "Back" button: same bordered button style as title screen items
- Keyboard navigation still works: arrow keys to move between rows, left/right to cycle values

### Pause Menu

Same button treatment as the title screen. Four items: Resume, Restart Round, Settings, Quit to Title. Tap to activate.

## 4. Orientation & Fullscreen

### Fullscreen + Orientation Lock

The existing "Fullscreen" menu item on the title screen is enhanced:
1. Call `canvas.requestFullscreen()` (or the element wrapping the canvas)
2. After entering fullscreen, attempt `screen.orientation.lock('landscape')`
3. Wrap the orientation lock in a try/catch — it's unsupported on iOS Safari

**Android:** Both APIs work. User taps Fullscreen, gets locked landscape fullscreen.
**iOS Safari:** Orientation lock not supported. Fullscreen is limited. Falls back to rotate prompt.
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

- **`input.js`** — Add slider input state management: track slider values per player, handle touch events (touchstart/touchmove/touchend) on slider areas, emit the same angle/velocity values to main.js that the classic input does
- **`renderer.js`** — Draw the bottom input bar (sliders, fire button, player label), update the top HUD (scores instead of angle/velocity fields, single-line round+wind), draw touch-friendly menu buttons and settings rows
- **`main.js`** — Route input based on the input method setting. Register touch/click handlers for menu items and settings arrows. Enhance fullscreen handler with orientation lock.
- **`constants.js`** — Add constants for slider dimensions, touch target sizes, bottom bar height, default slider values
- **`settings.js`** — Add `inputMethod` field ('classic' | 'sliders') with auto-detection default
- **`css/style.css`** — Add the rotate prompt overlay and its portrait media query
- **`index.html`** — Add the rotate prompt DOM element, add viewport meta tag for mobile if not present

### Files Not Modified

- **`physics.js`** — No changes. Receives angle and velocity the same way regardless of input method.
- **`ai.js`** — No changes. AI calculates shots independently of input method.
- **`buildings.js`** — No changes.
- **`audio.js`** — No changes.
- **`sprites.js`** — No changes.

### Touch Event Strategy

All touch handling happens on the canvas element. Touch coordinates are translated from screen space to canvas space (accounting for CSS scaling and device pixel ratio). Hit testing determines which UI element (slider thumb, fire button, menu item, settings arrow) was touched, and dispatches accordingly.

The game already has click handling for menu items — touch support extends this with proper touch events (touchstart/touchmove/touchend) to enable drag behavior on sliders and prevent the 300ms click delay on mobile.

### Slider State

Each player's slider values are stored in the game state object, persisting across turns within a round. On round start, values reset to defaults (angle 45, velocity 100). On subsequent turns within the same round, values carry over from that player's last throw.

## 6. What This Design Does NOT Include

- Portrait mode support — landscape only
- Gesture-based aiming (slingshot/drag-to-aim) — sliders only
- Haptic feedback — not in scope
- On-screen D-pad or virtual keyboard — not needed
- Changes to game physics, AI, or audio
