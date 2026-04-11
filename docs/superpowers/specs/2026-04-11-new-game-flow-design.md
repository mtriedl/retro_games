# New Game Flow & Per-Player Character Selection Design

## Overview

Add a dedicated "New Game" setup screen that appears when clicking "New Game" from the title screen. This screen presents the game-relevant settings subset (rounds, gravity, characters, player 2 mode, projectile) with a "Start" button. Character selection becomes per-player throughout — both the New Game screen and the Settings menu support independent P1/P2 character choices.

## Data Model Changes

### Settings (`settings.js`)

Replace the single `character` field with per-player fields:

```js
// Before
character: 'Gorilla'

// After
p1Character: 'Gorilla',
p2Character: 'Gorilla',
```

**Migration:** `loadSettings()` checks for the legacy `character` key. If found, copies `character` to each new field that is absent — `p1Character` and `p2Character` are guarded independently so a partially-migrated save (e.g. `character` + `p2Character` present, `p1Character` missing) fills only the missing field. The legacy key is then deleted. This preserves existing user preferences.

## State Machine

### New State: `STATE.NEW_GAME`

Added to the `STATE` enum in `constants.js`.

**Flow:**
```
Title Screen → "New Game" → STATE.NEW_GAME → "Start" → startNewGame() → STATE.ROUND_START
```

The New Game screen is reachable only from the title screen. The pause menu is unaffected — its existing options (Resume, Restart Round, Settings, Quit to Title) remain unchanged.

**Title screen change:** Modify `handleTitleAction()` — the `'new_game'` case sets `game.state = STATE.NEW_GAME` and initializes New Game UI state (see below) instead of calling `startNewGame()` directly.

**New game state variables:**
- `game.newGameIndex` — selected row index on the New Game screen
- `game.newGameScrollOffset` — scroll offset for the New Game screen

### Entering New Game Screen

When the title screen transitions to `STATE.NEW_GAME`, initialize UI state and load preview sprites:

```js
case 'new_game':
  game.newGameIndex = 0;
  game.newGameScrollOffset = 0;
  game.customGravityInput = String(settings.customGravity);
  game.state = STATE.NEW_GAME;
  loadCharacterPreview(settings.p1Character).then(img => { game.p1CharacterPreviewSprite = img; });
  loadCharacterPreview(settings.p2Character).then(img => { game.p2CharacterPreviewSprite = img; });
  loadProjectileSprite(settings.projectile).then(img => { projectileSprite = img; });
  break;
```

This mirrors the existing settings entry pattern in `handleTitleAction()`.

### Navigation

- **Enter on "Start":** Saves settings and calls `startNewGame()`
- **Escape:** Returns to title screen without starting a game. Changes already persist to settings (saved on every value change, same as the Settings menu).

## New Game Screen

### Items (in order)

| # | Item | Type | Notes |
|---|------|------|-------|
| 1 | Rounds | Cycle: 1, 3, 5, 10 | |
| 2 | Gravity Preset | Cycle: planet list + Custom | |
| 3 | Custom Gravity | Text input | Conditional — only visible when preset = "Custom" |
| 4 | P1 Character | Cycle + preview sprite | |
| 5 | Player 2 Mode | Cycle: Human / AI Easy / Medium / Hard | |
| 6 | P2 Character | Cycle + preview sprite | Conditional — hidden when P2 mode is any AI difficulty; auto-assigned random at game start |
| 7 | Projectile | Cycle + preview sprite | |
| 8 | Start | Button | Same styling as "Back" button in settings |

The item list is dynamic — Custom Gravity appears only when gravity preset is "Custom", and P2 Character is hidden when P2 mode is any AI difficulty. Both conditionals can be active simultaneously, adjusting the item count by 0–2. `getNewGameItemCount()` and `getNewGameItemName()` follow the same pattern as the existing `getSettingsItemCount()`/`getSettingsItemName()`, building the item list dynamically based on current settings state. The same P2 Character conditional also applies in the Settings menu (see below).

### Defaults

All values default to the currently saved settings. Changes made on this screen persist back to settings via `saveSettings()` on every change (same behavior as the Settings menu).

### AI Character Assignment

When Player 2 mode is any AI difficulty, the P2 Character row is hidden. At game start (`startNewGame()`), a random character is selected from `CHARACTER_OPTIONS` for the AI player. The random selection may match P1's character — this is fine since each player has independent sprite data. This random selection is not saved to `settings.p2Character` — it's a per-match assignment stored only in the game state.

## Per-Player Sprites

### Sprite Variables

The single `let spriteFrames = []` declaration in `main.js` is replaced by two:

```js
let p1SpriteFrames = [];
let p2SpriteFrames = [];
```

All existing references to `spriteFrames` (init, settings exit, render loop) are updated accordingly.

### Sprite Loading

`createCharacterSprites()` is called twice — once per player. If both players pick the same character, each still gets their own loaded sprite set (simpler than sharing, negligible memory cost).

Sprites are loaded at two points:

1. **`startNewGame()`** — awaits both loads before entering gameplay so the first frame always has valid sprites. The AI character is resolved here:

```js
async function startNewGame() {
  game.state = STATE.ROUND_START; // block input during async sprite load
  // ...existing setup...
  const p2Char = settings.player2Mode !== 'human'
    ? CHARACTER_OPTIONS[Math.floor(Math.random() * CHARACTER_OPTIONS.length)]
    : settings.p2Character;
  [p1SpriteFrames, p2SpriteFrames] = await Promise.all([
    createCharacterSprites(settings.p1Character),
    createCharacterSprites(p2Char),
  ]);
  startRound();
}
```

Setting `STATE.ROUND_START` immediately prevents the New Game screen from processing input during the brief async gap before `startRound()` sets the real gameplay state. Since the `handleKey` switch has no `ROUND_START` case, all keypresses are harmlessly ignored.

2. **On exiting settings** — loads both sprite sets via `.then()`, the same fire-and-forget pattern as the existing single-character reload (see "Exit Behavior" under Settings Menu Changes). The previous sprites remain valid during the brief load.

No loading indicator is needed — `createCharacterSprites` loads four small local PNGs, which resolves effectively instantly.

### Preview Sprites

Two preview sprites are tracked in game state:

- `game.p1CharacterPreviewSprite` — preview for P1 character selection
- `game.p2CharacterPreviewSprite` — preview for P2 character selection

These are loaded/updated when entering the New Game or Settings screen, and when the player cycles character selection.

The projectile preview reuses the existing module-level `projectileSprite` variable — loaded on screen entry, updated on cycle. No new state variable needed.

### Renderer Changes

`drawGorilla()` already accepts a `spriteFrames` parameter — its signature is unchanged.

### Main Loop Changes (`main.js`)

The render loop's `drawGorilla` call passes the per-player sprite set:

```js
for (let i = 0; i < 2; i++) {
  const frames = i === 0 ? p1SpriteFrames : p2SpriteFrames;
  renderer.drawGorilla(game.gorillas[i], frames, game.gorillas[i].frame);
}
```

### State Dispatch Changes (`main.js`)

Three dispatch points need a new `STATE.NEW_GAME` case:

**Input (`handleKey` switch):**
```js
case STATE.NEW_GAME:
  handleNewGameKey(key);
  break;
```

**Render (render switch):**
```js
case STATE.NEW_GAME:
  renderer.drawNewGameMenu(settings, game.newGameIndex,
    settings.gravityPreset === 'Custom', game.customGravityInput,
    game.newGameScrollOffset,
    game.p1CharacterPreviewSprite, game.p2CharacterPreviewSprite, projectileSprite);
  break;
```

**Click handler (`handleClick`):** Add a `STATE.NEW_GAME` branch using the shared hit-testing logic, with the New Game item list and "Start" as the bottom-button action.

## Shared Rendering & Input Helpers

### Approach

Extract reusable code from the existing settings implementation so both screens share mechanical logic without duplication.

### Rendering (`renderer.js`)

The row-drawing logic (row background, label, value text, arrow buttons, sprite previews, scroll indicators, volume bar, back/start button) is extracted into a shared internal helper function:

```js
// Shared helper signature
drawMenuRows(items, title, selectedIndex, scrollOffset, {
  p1CharacterPreview, p2CharacterPreview, projectileSprite,
  editingCustom, customValue
})
```

Both public functions become thin wrappers that build their item list and delegate:

- `drawSettingsMenu(settings, selectedIndex, editingCustom, customValue, scrollOffset, p1CharacterPreview, p2CharacterPreview, projectileSprite)` — adds `p2CharacterPreview` parameter (was single `characterPreview`)
- `drawNewGameMenu(settings, selectedIndex, editingCustom, customValue, scrollOffset, p1CharacterPreview, p2CharacterPreview, projectileSprite)` — same signature

### Input Handling (`main.js`)

The per-item value cycling logic (the `switch` block in `handleSettingsKey()` that handles rounds, gravity, character, projectile, etc.) is extracted into a shared `cycleSettingItem(itemName, dir)` function. The old `'character'` case is replaced by two cases:

```js
case 'p1Character': {
  const idx = CHARACTER_OPTIONS.indexOf(settings.p1Character);
  settings.p1Character = CHARACTER_OPTIONS[(idx + dir + len) % len];
  loadCharacterPreview(settings.p1Character).then(img => { game.p1CharacterPreviewSprite = img; });
  break;
}
case 'p2Character': {
  const idx = CHARACTER_OPTIONS.indexOf(settings.p2Character);
  settings.p2Character = CHARACTER_OPTIONS[(idx + dir + len) % len];
  loadCharacterPreview(settings.p2Character).then(img => { game.p2CharacterPreviewSprite = img; });
  break;
}
```

- `handleSettingsKey()` — handles settings-specific navigation (up/down, enter/escape for "Back") and calls `cycleSettingItem()` for left/right
- `handleNewGameKey()` — handles New Game-specific navigation (up/down, enter for "Start", escape to title) and calls `cycleSettingItem()` for left/right

### Click Handling (`main.js`)

The row hit-testing logic (scroll indicators, arrow buttons, custom gravity input, bottom-button detection) is extracted into a shared `handleMenuClick(cx, cy, opts)` function. Each screen calls it with its own item helpers and callbacks:

```js
handleMenuClick(cx, cy, {
  getItemCount, getItemName, getIndex, setIndex,
  getScroll, setScroll, onBottomButton, onKey,
})
```

- `getItemCount` / `getItemName` — the item list helpers for this screen
- `getIndex` / `setIndex` — read/write the selected row index
- `getScroll` / `setScroll` — read/write the scroll offset
- `onBottomButton` — called when the bottom button is tapped ("Back" for settings, "Start" for New Game)
- `onKey` — dispatches synthetic key events for arrow taps (e.g. `handleSettingsKey('ArrowLeft')`)

Both `handleClick` branches for `STATE.SETTINGS` and `STATE.NEW_GAME` become thin wrappers that call `handleMenuClick` with their own options.

## Settings Menu Changes

### Character Rows

The single "Character" row is replaced by two rows:

- **P1 Character** — cycles `settings.p1Character`, shows preview sprite
- **P2 Character** — cycles `settings.p2Character`, shows preview sprite. **Hidden when P2 mode is any AI difficulty** (same rule as the New Game screen — showing a row whose value gets discarded is confusing).

### Item List Update

`getSettingsItemName()` returns `'p1Character'` and conditionally `'p2Character'` instead of `'character'`. The item list uses two conditionals:

```js
const items = [
  'inputMethod', 'rounds', 'gravityPreset',
  ...(isCustom ? ['customGravity'] : []),
  'player2Mode', 'p1Character',
  ...(isHuman ? ['p2Character'] : []),
  'projectile', 'shotTrail', 'aimPreview', 'dynamicAimPreview',
  'volume', 'back',
];
```

Updated settings item order:

1. Input Method
2. Rounds
3. Gravity Preset
4. *(Custom Gravity — conditional, when preset = "Custom")*
5. Player 2 Mode
6. P1 Character
7. *(P2 Character — conditional, when P2 mode = "Human")*
8. Projectile
9. Shot Trail
10. Aim Preview
11. Dynamic Aim Preview
12. Volume
13. Back

### Settings Entry Points

All settings entry points (`handleTitleAction`, `handlePauseAction`) load both character previews on entry:

```js
loadCharacterPreview(settings.p1Character).then(img => { game.p1CharacterPreviewSprite = img; });
loadCharacterPreview(settings.p2Character).then(img => { game.p2CharacterPreviewSprite = img; });
loadProjectileSprite(settings.projectile).then(img => { projectileSprite = img; });
```

### Exit Behavior

On exiting settings, both sprite sets are loaded via `.then()` — the same fire-and-forget pattern as the existing single-character reload. The previous sprites remain valid during the brief load, so no visual glitch occurs:

```js
createCharacterSprites(settings.p1Character).then(frames => { p1SpriteFrames = frames; });
createCharacterSprites(settings.p2Character).then(frames => { p2SpriteFrames = frames; });
```

## What Stays the Same

- **Physics** (`physics.js`) — unchanged, no character-specific logic
- **AI** (`ai.js`) — unchanged, no character-specific logic
- **Buildings** (`buildings.js`) — unchanged, gorilla placement is character-agnostic
- **Audio** (`audio.js`) — unchanged
- **Input** (`input.js`) — unchanged
- **`drawGorilla()`** — unchanged signature, already takes `spriteFrames` as parameter
- **Projectile system** — unchanged
- **localStorage key** — same key, migration handles schema change
