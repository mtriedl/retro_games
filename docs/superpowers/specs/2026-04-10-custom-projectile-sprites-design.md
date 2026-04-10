# Custom Projectile Sprites Design

## Overview

Add support for custom 16x16 projectile sprites as an alternative to the procedural banana, selectable via the settings menu. The procedural banana is scaled up from ~8px to 16px to match. Collision radius updates accordingly.

## Changes

### 1. Constants (`constants.js`)

- `BANANA_RADIUS`: `4` -> `8` (collision circle matches 16x16 visual)
- Add `PROJECTILE_SPRITE_SIZE = 16`
- Add `PROJECTILE_OPTIONS = ['Banana']` (extensible array; future sprites added here)

### 2. Settings (`settings.js`)

- Add `projectile: 'Banana'` to `DEFAULT_SETTINGS`

### 3. Renderer (`renderer.js`)

**`drawBanana(banana, alpha)` -> `drawProjectile(banana, alpha, sprite)`**

- Rename method to `drawProjectile` for clarity
- Add optional `sprite` parameter (an `Image` or `null`)
- When `sprite` is provided: draw it as 16x16 centered on the interpolated position, inside the existing `save/translate/rotate/restore` transform
  ```js
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, -PROJECTILE_SPRITE_SIZE / 2, -PROJECTILE_SPRITE_SIZE / 2,
                PROJECTILE_SPRITE_SIZE, PROJECTILE_SPRITE_SIZE);
  ctx.imageSmoothingEnabled = true;
  ```
- When `sprite` is `null` (default banana): draw the procedural banana scaled to the new `BANANA_RADIUS = 8`:
  - Outer arc radius: `BANANA_RADIUS` (8)
  - Inner arc: `arc(0, -2, BANANA_RADIUS - 3, ...)` (scaled from offset -1/gap 1.5)
  - Tip rects: 4x4 at `(-BANANA_RADIUS + 2, -2)` and `(BANANA_RADIUS - 6, -2)`

**`drawBananaTracker(bananaX)`**

- Update label from hardcoded `'BANANA'` to accept the projectile name as a parameter

### 4. Sprites (`sprites.js`)

- Add `loadProjectileSprite(name)` function that loads `assets/images/projectile-{name}.png` and returns an `Image` (or `null` for `'Banana'`)
- Export alongside existing `createGorillaSprites()`

### 5. Main game loop (`main.js`)

**Settings menu integration:**
- Add `'projectile'` to `getSettingsItemName()` items array (after `dynamicAimPreview`, before `volume`)
- Increment `getSettingsItemCount()` by 1
- Add cycling logic in `handleSettingsKey()`: cycles through `PROJECTILE_OPTIONS`
- Add row in `drawSettingsMenu()` items array: `{ label: 'Projectile', value: settings.projectile, cycle: true }`

**Sprite management:**
- Add a `projectileSprite` variable (initially `null`)
- When settings change the projectile, load the new sprite (or set to `null` for Banana)

**Render call update:**
- Change `renderer.drawBanana(game.banana, alpha)` to `renderer.drawProjectile(game.banana, alpha, projectileSprite)`
- Pass projectile name to `drawBananaTracker`

### 6. Collision (`physics.js`, `ai.js`, `main.js`)

No code changes needed. All collision checks already reference `BANANA_RADIUS`, which updates from 4 to 8 automatically.

### 7. Tests

- Update `constants.test.js` if it asserts on `BANANA_RADIUS` value
- Update `buildings.test.js` if affected by radius change

## What stays the same

- Physics simulation (`physics.js`) - unchanged, uses `BANANA_RADIUS`
- AI logic (`ai.js`) - unchanged, uses `BANANA_RADIUS`
- Input handling (`input.js`) - unchanged
- Explosion radii - unchanged (`EXPLOSION_BUILDING_RADIUS = 15` still reasonable relative to new projectile size)

## Future extensibility

To add a new projectile, a developer needs to:
1. Add a 16x16 PNG to `assets/images/projectile-{name}.png`
2. Add the name to `PROJECTILE_OPTIONS` in `constants.js`

No other changes required.
