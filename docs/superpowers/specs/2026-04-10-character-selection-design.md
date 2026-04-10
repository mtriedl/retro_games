# Character Selection & Scrollable Settings Design

## Overview

Add selectable character sprites (Robot, Alien, Dinosaur, Penguin, Goku) alongside the default Gorilla, choosable via the settings menu. Add sprite previews to both the Character and Projectile settings rows. Make the settings menu scrollable to accommodate the growing list of options.

## Characters

Six characters at launch, each with 4 frames at 128x128 source resolution (rendered at 32x32 in-game):

| Character | Normal | Throw P1 | Throw P2 | Victory |
|-----------|--------|----------|----------|---------|
| Gorilla | Existing | Existing | Existing | Existing |
| Robot | Mechanical idle | Right arm extend | Left arm extend | Antenna flash |
| Alien | Tentacle idle | Right tentacle throw | Left tentacle throw | Levitation |
| Dinosaur | Godzilla-style idle | Right claw throw | Left claw throw | Roar pose |
| Penguin | Standing idle | Right flipper throw | Left flipper throw | Belly slide |
| Goku | Fighting stance | Right-hand throw | Left-hand throw | Power-up pose |

All sprites use the same anchor convention as the existing gorilla: bottom-center positioning, 32x32 render size, collision box `GORILLA_COLLISION_WIDTH x GORILLA_COLLISION_HEIGHT`.

## Asset Naming

Flat naming convention in `assets/images/`, matching existing pattern:

- `{character}-normal.png`
- `{character}-throw-p1.png`
- `{character}-throw-p2.png`
- `{character}-victory.png`

Existing gorilla files already follow this convention. New files: `robot-normal.png`, `robot-throw-p1.png`, etc.

## Changes

### 1. Constants (`constants.js`)

- Add `CHARACTER_OPTIONS = ['Gorilla', 'Robot', 'Alien', 'Dinosaur', 'Penguin', 'Goku']`
- Add `CHARACTER_PREVIEW_SIZE = 32` (rendered preview size in settings menu)
- Add `SETTINGS_PREVIEW_ROW_H = 36` for taller preview rows (standard rows keep `SETTINGS_ROW_H = 28`)
- Add scroll-related constants:
  - `SETTINGS_VISIBLE_ROWS = 8`
  - `SETTINGS_SCROLL_PADDING = 3` (blank rows after last item)

### 2. Settings (`settings.js`)

- Add `character: 'Gorilla'` to `DEFAULT_SETTINGS`

### 3. Sprites (`sprites.js`)

**Modify `createGorillaSprites(characterName)`:**
- Accept a character name parameter (default `'Gorilla'`)
- Build paths dynamically: `assets/images/${name.toLowerCase()}-normal.png`, etc.
- Returns `Promise<Image[]>` (4 frames) as before

**Add `loadCharacterPreview(characterName)`:**
- Loads only the `-normal.png` frame for use in the settings menu preview
- Returns `Promise<Image|null>`

### 4. Renderer (`renderer.js`)

**`drawSettingsMenu` updates:**

**Menu item order (reordered):**
1. Input
2. Rounds
3. Gravity
4. (Custom G — conditional)
5. Player 2
6. Character *(new, tall row with sprite preview)*
7. Projectile *(updated, tall row with sprite preview)*
8. Shot Trail
9. Aim Preview
10. Dynamic Aim
11. Volume
12. Back

**Scrollable rendering:**
- Accept `scrollOffset` parameter
- Only draw items in range `[scrollOffset..scrollOffset + SETTINGS_VISIBLE_ROWS - 1]`
- Use `ctx.save()` / `ctx.beginPath()` / `ctx.rect()` / `ctx.clip()` to clip the menu area
- Draw scroll indicators (up/down arrows) at top/bottom of menu area when content exists above/below the visible window
- Append `SETTINGS_SCROLL_PADDING` blank rows after "Back" so it can scroll into the center of the visible area

**Preview rows (Character & Projectile):**
- Use taller row height (36px instead of 28px)
- After the `>` arrow button, draw a 32x32 sprite preview at the right edge of the row
- Sprite rendered with `imageSmoothingEnabled = false`
- Subtle background rect behind the preview for visual framing
- Character preview: draws the loaded preview sprite (normal frame)
- Projectile preview: draws the projectile sprite, or procedural banana if "Banana" selected

### 5. Main game loop (`main.js`)

**New state variables:**
- `settingsScrollOffset = 0` — tracks which row is at the top of the visible window
- `characterPreviewSprite = null` — cached preview image for settings menu

**Settings item reorder:**
- Update `getSettingsItemName()` to reflect new item order (character and projectile after player2Mode)
- Update `getSettingsItemCount()` to include the new character item

**Character cycling logic in `handleSettingsKey()`:**
- Cycle through `CHARACTER_OPTIONS` using left/right arrows (same pattern as projectile)
- On change: reload `characterPreviewSprite` via `loadCharacterPreview()`
- On exiting settings: reload full 4-frame sprite set via `createGorillaSprites(settings.character)`

**Auto-scroll logic:**
- When `selectedIndex` changes, adjust `settingsScrollOffset` to keep the selected item visible
- If selected item is above the visible window: `scrollOffset = selectedIndex`
- If selected item is below: `scrollOffset = selectedIndex - SETTINGS_VISIBLE_ROWS + 1`
- Clamp `scrollOffset` to `[0, totalItems + SETTINGS_SCROLL_PADDING - SETTINGS_VISIBLE_ROWS]`

**Scroll indicator tap targets:**
- Add touch/click handlers for scroll indicator arrows at top/bottom of menu

**Render call updates:**
- Pass `settingsScrollOffset` to `drawSettingsMenu()`
- Pass preview sprites to `drawSettingsMenu()` for both character and projectile
- On game start / settings exit: call `createGorillaSprites(settings.character)` to load full sprite set

### 6. Touch handling (`main.js` touch/click handlers)

- Existing arrow button tap detection continues to work on logical item positions
- Adjust hit detection to account for scroll offset (screen position = logical position - scrollOffset)
- Scroll indicator arrows at top/bottom are tappable

## What stays the same

- Physics (`physics.js`) — unchanged, collision box constants unchanged
- AI (`ai.js`) — unchanged, no character-specific logic
- Buildings (`buildings.js`) — unchanged, gorilla placement is character-agnostic
- Audio (`audio.js`) — unchanged
- Gorilla rendering (`drawGorilla`) — unchanged, already takes `spriteFrames` array

## Future extensibility

To add a new character:
1. Add 4 PNGs at 128x128 to `assets/images/{name}-{frame}.png`
2. Add the name to `CHARACTER_OPTIONS` in `constants.js`

No other changes required.
