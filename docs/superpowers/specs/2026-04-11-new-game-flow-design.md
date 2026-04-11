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

**Migration:** `loadSettings()` checks for the legacy `character` key. If found and `p1Character`/`p2Character` are absent, copies `character` to both new fields and deletes the old key. This preserves existing user preferences.

## State Machine

### New State: `STATE.NEW_GAME`

Added to the `STATE` enum in `constants.js`.

**Flow:**
```
Title Screen → "New Game" → STATE.NEW_GAME → "Start" → startNewGame() → STATE.ROUND_START
```

**New game state variables:**
- `game.newGameIndex` — selected row index on the New Game screen
- `game.newGameScrollOffset` — scroll offset for the New Game screen

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
| 6 | P2 Character | Cycle + preview sprite | Hidden when P2 mode is AI; auto-assigned random at game start |
| 7 | Projectile | Cycle + preview sprite | |
| 8 | Start | Button | Same styling as "Back" button in settings |

The item list is dynamic — Custom Gravity appears only when gravity preset is "Custom", and P2 Character is hidden when P2 mode is any AI difficulty. Both conditionals can be active simultaneously. `getNewGameItemCount()` and `getNewGameItemName()` follow the same pattern as the existing `getSettingsItemCount()`/`getSettingsItemName()`, building the item list dynamically based on current settings state.

### Defaults

All values default to the currently saved settings. Changes made on this screen persist back to settings via `saveSettings()` on every change (same behavior as the Settings menu).

### AI Character Assignment

When Player 2 mode is any AI difficulty, the P2 Character row is hidden. At game start (`startNewGame()`), a random character is selected from `CHARACTER_OPTIONS` for the AI player. This random selection is not saved to `settings.p2Character` — it's a per-match assignment stored only in the game state.

## Per-Player Sprites

### Sprite Loading

Currently the game has a single `spriteFrames` array used for both players. This becomes two arrays:

- `p1SpriteFrames` — loaded from `settings.p1Character`
- `p2SpriteFrames` — loaded from `settings.p2Character` (or the random AI character)

`createCharacterSprites()` is called twice — once per player. If both players pick the same character, each still gets their own loaded sprite set (simpler than sharing, negligible memory cost).

### Preview Sprites

Two preview sprites are tracked in game state:

- `game.p1CharacterPreviewSprite` — preview for P1 character selection
- `game.p2CharacterPreviewSprite` — preview for P2 character selection

These are loaded/updated when entering the New Game or Settings screen, and when the player cycles character selection.

### Renderer Changes

`drawGorilla()` already accepts a `spriteFrames` parameter. The game loop passes the appropriate per-player sprite set based on which gorilla is being drawn (index 0 → `p1SpriteFrames`, index 1 → `p2SpriteFrames`).

## Shared Rendering & Input Helpers

### Approach

Extract reusable code from the existing settings implementation so both screens share mechanical logic without duplication.

### Rendering (`renderer.js`)

The row-drawing logic (row background, label, value text, arrow buttons, sprite previews, scroll indicators, volume bar, back/start button) is extracted into a shared internal helper function. Both `drawSettingsMenu()` and a new `drawNewGameMenu()` call this helper with their respective:

- Item array (different items per screen)
- Title string ("SETTINGS" vs "NEW GAME")
- UI state (selected index, scroll offset)

`drawSettingsMenu()` and `drawNewGameMenu()` remain the public API.

### Input Handling (`main.js`)

The per-item value cycling logic (the `switch` block in `handleSettingsKey()` that handles rounds, gravity, character, projectile, etc.) is extracted into a shared `cycleSettingItem(itemName, dir)` function.

- `handleSettingsKey()` — handles settings-specific navigation (up/down, enter/escape for "Back") and calls `cycleSettingItem()` for left/right
- `handleNewGameKey()` — handles New Game-specific navigation (up/down, enter for "Start", escape to title) and calls `cycleSettingItem()` for left/right

### Click Handling (`main.js`)

Same pattern for touch/click — shared hit-testing logic for settings-style rows. Each screen provides its own item list and bottom-button action ("Back" vs "Start").

## Settings Menu Changes

### Character Rows

The single "Character" row is replaced by two consecutive rows in the same position:

- **P1 Character** — cycles `settings.p1Character`, shows preview sprite
- **P2 Character** — cycles `settings.p2Character`, shows preview sprite

### Item List Update

`getSettingsItemName()` returns `'p1Character'` and `'p2Character'` instead of `'character'`. The total item count increases by 1.

Updated settings item order:

1. Input Method
2. Rounds
3. Gravity Preset
4. *(Custom Gravity — conditional)*
5. Player 2 Mode
6. P1 Character
7. P2 Character
8. Projectile
9. Shot Trail
10. Aim Preview
11. Dynamic Aim Preview
12. Volume
13. Back

### Exit Behavior

On exiting settings, `createCharacterSprites()` is called twice (once for P1, once for P2) to load both sprite sets.

## What Stays the Same

- **Physics** (`physics.js`) — unchanged, no character-specific logic
- **AI** (`ai.js`) — unchanged, no character-specific logic
- **Buildings** (`buildings.js`) — unchanged, gorilla placement is character-agnostic
- **Audio** (`audio.js`) — unchanged
- **Input** (`input.js`) — unchanged
- **`drawGorilla()`** — unchanged signature, already takes `spriteFrames` as parameter
- **Projectile system** — unchanged
- **localStorage key** — same key, migration handles schema change
