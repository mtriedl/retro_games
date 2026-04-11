# New Game Flow & Per-Player Character Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated "New Game" setup screen with a game-relevant settings subset and make character selection per-player throughout both the New Game and Settings screens.

**Architecture:** A new `STATE.NEW_GAME` state sits between the title screen and `startNewGame()`. The single `character` setting is replaced by `p1Character`/`p2Character` with migration. Settings rendering/input logic is extracted into shared helpers that both the Settings and New Game screens use. Each player gets independent sprite data (`p1SpriteFrames`/`p2SpriteFrames`). AI players get a random character at game start.

**Tech Stack:** Vanilla JS, HTML5 Canvas, node:test

**Spec:** `docs/superpowers/specs/2026-04-11-new-game-flow-design.md`

---

## File Structure

| File | Responsibility | Change Type |
|------|---------------|-------------|
| `animal-wars/js/constants.js` | Add `STATE.NEW_GAME` | Modify |
| `animal-wars/js/settings.js` | Replace `character` with `p1Character`/`p2Character`, add migration | Modify |
| `animal-wars/js/main.js` | Per-player sprites, shared helpers, New Game state handlers, settings character split | Modify |
| `animal-wars/js/renderer.js` | Extract `drawMenuRows()`, add `drawNewGameMenu()`, update `drawSettingsMenu()` for two character previews | Modify |
| `animal-wars/tests/settings.test.js` | Test per-player defaults and migration | Modify |
| `animal-wars/tests/constants.test.js` | Test `STATE.NEW_GAME` exists | Modify |

---

### Task 1: Settings Data Model — Per-Player Characters

**Files:**
- Modify: `animal-wars/js/settings.js` — replace `character` with `p1Character`/`p2Character` in `DEFAULT_SETTINGS`, add migration logic to `loadSettings()`
- Modify: `animal-wars/tests/settings.test.js`

- [ ] **Step 1: Write failing tests for new defaults and migration**

In `animal-wars/tests/settings.test.js`:
1. Find and replace the existing `DEFAULT_SETTINGS includes character as Gorilla` test with a check for the new fields.
2. Update the `loadSettings returns defaults when localStorage is empty` test — it uses `assert.deepEqual(s, DEFAULT_SETTINGS)` which will already pass once `DEFAULT_SETTINGS` is updated, but verify it doesn't reference `character`.
3. Add migration tests.

Replace the `'DEFAULT_SETTINGS includes character as Gorilla'` test with:

```js
it('DEFAULT_SETTINGS includes p1Character and p2Character as Gorilla', () => {
  assert.equal(DEFAULT_SETTINGS.p1Character, 'Gorilla');
  assert.equal(DEFAULT_SETTINGS.p2Character, 'Gorilla');
  assert.equal(DEFAULT_SETTINGS.character, undefined);
});
```

Then add the following migration tests after it:

```js
it('defaults include p1Character and p2Character as Gorilla', () => {
  const settings = loadSettings();
  assert.equal(settings.p1Character, 'Gorilla');
  assert.equal(settings.p2Character, 'Gorilla');
  assert.equal(settings.character, undefined);
});

it('migrates legacy character to p1Character and p2Character', () => {
  localStorage.setItem('animal-wars-settings', JSON.stringify({ character: 'Robot' }));
  const settings = loadSettings();
  assert.equal(settings.p1Character, 'Robot');
  assert.equal(settings.p2Character, 'Robot');
  assert.equal(settings.character, undefined);
});

it('does not overwrite existing p1Character/p2Character during migration', () => {
  localStorage.setItem('animal-wars-settings', JSON.stringify({
    character: 'Robot',
    p1Character: 'Alien',
    p2Character: 'Penguin',
  }));
  const settings = loadSettings();
  assert.equal(settings.p1Character, 'Alien');
  assert.equal(settings.p2Character, 'Penguin');
});

it('migrates legacy character to only the missing per-player field', () => {
  localStorage.setItem('animal-wars-settings', JSON.stringify({
    character: 'Robot',
    p2Character: 'Penguin',
  }));
  const settings = loadSettings();
  assert.equal(settings.p1Character, 'Robot');
  assert.equal(settings.p2Character, 'Penguin');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test animal-wars/tests/settings.test.js`
Expected: Failures — `p1Character` is undefined, `character` is 'Gorilla'.

- [ ] **Step 3: Update DEFAULT_SETTINGS**

In `animal-wars/js/settings.js`, replace the `character` field:

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
  p1Character: 'Gorilla',
  p2Character: 'Gorilla',
  volume: 0.5,
};
```

- [ ] **Step 4: Add migration logic to `loadSettings()`**

In `animal-wars/js/settings.js`, after the `Object.assign(base, stored)` line inside `loadSettings()`, add:

```js
    // Migrate legacy single-character setting (guard each field independently)
    if (stored && stored.character) {
      if (!stored.p1Character) base.p1Character = stored.character;
      if (!stored.p2Character) base.p2Character = stored.character;
    }
    delete base.character;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test animal-wars/tests/settings.test.js`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add animal-wars/js/settings.js animal-wars/tests/settings.test.js
git commit -m "feat: replace character with p1Character/p2Character in settings"
```

---

### Task 2: Constants — Add STATE.NEW_GAME

**Files:**
- Modify: `animal-wars/js/constants.js` — add `NEW_GAME` to `STATE` enum
- Modify: `animal-wars/tests/constants.test.js`

- [ ] **Step 1: Update the existing STATE test and add NEW_GAME test**

In `animal-wars/tests/constants.test.js`, the existing `'exports all game states'` test checks only 8 states and is missing `SETTINGS` (already in the enum) and `NEW_GAME` (being added). Replace it with a complete check, and add a specific test for `NEW_GAME`:

```js
it('exports all game states', () => {
  const expected = ['TITLE_SCREEN', 'NEW_GAME', 'ROUND_START', 'PLAYER_INPUT',
    'PROJECTILE_FLIGHT', 'IMPACT', 'ROUND_END', 'GAME_OVER', 'PAUSED', 'SETTINGS'];
  for (const s of expected) {
    assert.ok(C.STATE[s], `missing state: ${s}`);
  }
  // Verify no unexpected states exist
  assert.equal(Object.keys(C.STATE).length, expected.length,
    `STATE has unexpected entries: ${Object.keys(C.STATE).filter(k => !expected.includes(k))}`);
});

it('STATE.NEW_GAME equals NEW_GAME', () => {
  assert.equal(C.STATE.NEW_GAME, 'NEW_GAME');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test animal-wars/tests/constants.test.js`
Expected: FAIL — `STATE.NEW_GAME` is undefined.

- [ ] **Step 3: Add NEW_GAME to STATE enum**

In `animal-wars/js/constants.js`, add `NEW_GAME: 'NEW_GAME',` inside the `STATE` object, after `SETTINGS`:

```js
export const STATE = {
  TITLE_SCREEN: 'TITLE_SCREEN',
  NEW_GAME: 'NEW_GAME',
  ROUND_START: 'ROUND_START',
  PLAYER_INPUT: 'PLAYER_INPUT',
  PROJECTILE_FLIGHT: 'PROJECTILE_FLIGHT',
  IMPACT: 'IMPACT',
  ROUND_END: 'ROUND_END',
  GAME_OVER: 'GAME_OVER',
  PAUSED: 'PAUSED',
  SETTINGS: 'SETTINGS',
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test animal-wars/tests/constants.test.js`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add animal-wars/js/constants.js animal-wars/tests/constants.test.js
git commit -m "feat: add STATE.NEW_GAME constant"
```

---

### Task 3: Per-Player Sprites in main.js

Replace the single `spriteFrames` variable with `p1SpriteFrames`/`p2SpriteFrames` and update all references. This is a pure refactor — no new features, no test failures.

**Files:**
- Modify: `animal-wars/js/main.js` — `spriteFrames` variable declaration, `init()` sprite loading, `drawGameScene()` gorilla rendering loop, `startNewGame()`

- [ ] **Step 1: Replace sprite variable declarations**

In `animal-wars/js/main.js`, find the `let spriteFrames = [];` declaration near the top-level variables and replace:

```js
let spriteFrames = [];
```

with:

```js
let p1SpriteFrames = [];
let p2SpriteFrames = [];
```

- [ ] **Step 2: Update `init()` sprite loading**

In the `init()` function in `animal-wars/js/main.js`, find the sprite loading line and replace:

```js
  spriteFrames = await createCharacterSprites(settings.character);
```

with:

```js
  [p1SpriteFrames, p2SpriteFrames] = await Promise.all([
    createCharacterSprites(settings.p1Character),
    createCharacterSprites(settings.p2Character),
  ]);
```

- [ ] **Step 3: Update `drawGameScene()` gorilla rendering**

In `drawGameScene()` in `animal-wars/js/main.js`, find the gorilla rendering loop and replace:

```js
  for (let i = 0; i < 2; i++) {
    renderer.drawGorilla(game.gorillas[i], spriteFrames, game.gorillas[i].frame);
  }
```

with:

```js
  for (let i = 0; i < 2; i++) {
    const frames = i === 0 ? p1SpriteFrames : p2SpriteFrames;
    renderer.drawGorilla(game.gorillas[i], frames, game.gorillas[i].frame);
  }
```

- [ ] **Step 4: Update `startNewGame()` to load per-player sprites with AI random character**

In `animal-wars/js/main.js`, replace the entire `startNewGame()` function:

```js
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
```

with:

```js
async function startNewGame() {
  game.state = STATE.ROUND_START; // block input during async sprite load
  settings = loadSettings();
  game.totalRounds = settings.rounds;
  game.round = 0;
  game.scores = [0, 0];
  game.startingPlayer = 0;
  game.activePlayer = 0;
  audio.setVolume(settings.volume);
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

Setting `STATE.ROUND_START` immediately prevents the New Game screen from processing input while sprites load asynchronously. Since `handleKey` has no `ROUND_START` case, keypresses are harmlessly ignored during this brief window. `startRound()` then sets the real gameplay state.

Note: `CHARACTER_OPTIONS` is already imported at the top of the file.

- [ ] **Step 5: Verify the game loads and both players render correctly**

Run: Open `animal-wars/index.html` in a browser. Start a new game. Both players should render with their sprites. Verify no console errors.

- [ ] **Step 6: Commit**

```bash
git add animal-wars/js/main.js
git commit -m "feat: per-player sprite loading with AI random character"
```

---

### Task 4: Update Settings — Per-Player Character Rows & Preview Sprites

Split the single "Character" row in Settings into "P1 Character" and "P2 Character" (P2 conditional on human mode). Update all related state, preview sprites, and entry/exit behavior.

**Files:**
- Modify: `animal-wars/js/main.js` — `game` object state, `handleTitleAction()`, `handlePauseAction()`, `getSettingsItemCount()`/`getSettingsItemName()`, `handleSettingsKey()` character cycling, settings exit sprite loading
- Modify: `animal-wars/js/renderer.js` — `drawSettingsMenu()` signature and items array

- [ ] **Step 1: Update game state variables**

In the `game` object in `animal-wars/js/main.js`, find the `characterPreviewSprite: null` field and replace:

```js
  characterPreviewSprite: null,
```

with:

```js
  p1CharacterPreviewSprite: null,
  p2CharacterPreviewSprite: null,
```

- [ ] **Step 2: Update `getSettingsItemName()` — replace `'character'` with P1/P2**

Replace the entire `getSettingsItemName()` function:

```js
function getSettingsItemName(index) {
  const isCustom = settings.gravityPreset === 'Custom';
  const isHuman = settings.player2Mode === 'human';
  const items = [
    'inputMethod',
    'rounds',
    'gravityPreset',
    ...(isCustom ? ['customGravity'] : []),
    'player2Mode',
    'p1Character',
    ...(isHuman ? ['p2Character'] : []),
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

- [ ] **Step 3: Update `getSettingsItemCount()`**

Replace the entire `getSettingsItemCount()` function (note: the existing code returns 12/13 due to a pre-existing off-by-one; the new code corrects this with a base of 11 plus two conditionals):

```js
function getSettingsItemCount() {
  let count = 11; // base items (without conditionals)
  if (settings.gravityPreset === 'Custom') count++;
  if (settings.player2Mode === 'human') count++;
  return count;
}
```

- [ ] **Step 4: Update `handleSettingsKey()` — replace character case with p1Character/p2Character**

In `handleSettingsKey()`, find the `case 'character':` block and replace:

```js
    case 'character': {
      const idx = CHARACTER_OPTIONS.indexOf(settings.character);
      const newIdx = (idx + dir + CHARACTER_OPTIONS.length) % CHARACTER_OPTIONS.length;
      settings.character = CHARACTER_OPTIONS[newIdx];
      loadCharacterPreview(settings.character).then(img => { game.characterPreviewSprite = img; });
      break;
    }
```

with:

```js
    case 'p1Character': {
      const idx = CHARACTER_OPTIONS.indexOf(settings.p1Character);
      const newIdx = (idx + dir + CHARACTER_OPTIONS.length) % CHARACTER_OPTIONS.length;
      settings.p1Character = CHARACTER_OPTIONS[newIdx];
      loadCharacterPreview(settings.p1Character).then(img => { game.p1CharacterPreviewSprite = img; });
      break;
    }
    case 'p2Character': {
      const idx = CHARACTER_OPTIONS.indexOf(settings.p2Character);
      const newIdx = (idx + dir + CHARACTER_OPTIONS.length) % CHARACTER_OPTIONS.length;
      settings.p2Character = CHARACTER_OPTIONS[newIdx];
      loadCharacterPreview(settings.p2Character).then(img => { game.p2CharacterPreviewSprite = img; });
      break;
    }
```

- [ ] **Step 5: Update settings entry in `handleTitleAction()` — load both previews**

In `handleTitleAction()`, find the `case 'settings':` block and replace:

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

with:

```js
    case 'settings':
      game.settingsFrom = 'title';
      game.settingsIndex = 0;
      game.settingsScrollOffset = 0;
      game.customGravityInput = String(settings.customGravity);
      game.previousState = game.state;
      game.state = STATE.SETTINGS;
      loadCharacterPreview(settings.p1Character).then(img => { game.p1CharacterPreviewSprite = img; });
      loadCharacterPreview(settings.p2Character).then(img => { game.p2CharacterPreviewSprite = img; });
      loadProjectileSprite(settings.projectile).then(img => { projectileSprite = img; });
      break;
```

- [ ] **Step 6: Update settings entry in `handlePauseAction()` — load both previews**

In `handlePauseAction()`, find the `case 'settings':` block and replace:

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

with:

```js
    case 'settings':
      game.settingsFrom = 'pause';
      game.settingsIndex = 0;
      game.settingsScrollOffset = 0;
      game.customGravityInput = String(settings.customGravity);
      game.previousState = game.state;
      game.state = STATE.SETTINGS;
      loadCharacterPreview(settings.p1Character).then(img => { game.p1CharacterPreviewSprite = img; });
      loadCharacterPreview(settings.p2Character).then(img => { game.p2CharacterPreviewSprite = img; });
      loadProjectileSprite(settings.projectile).then(img => { projectileSprite = img; });
      break;
```

- [ ] **Step 7: Update settings exit — load both sprite sets**

In `handleSettingsKey()`, there are two settings exit points (Enter on "back" and Escape). Both have:

```js
    createCharacterSprites(settings.character).then(frames => { spriteFrames = frames; });
```

Replace each occurrence with:

```js
    createCharacterSprites(settings.p1Character).then(frames => { p1SpriteFrames = frames; });
    createCharacterSprites(settings.p2Character).then(frames => { p2SpriteFrames = frames; });
```

- [ ] **Step 8: Update `drawSettingsMenu()` signature in renderer (must happen before updating the caller)**

In `animal-wars/js/renderer.js`, change the `drawSettingsMenu` signature from:

```js
drawSettingsMenu(settings, selectedIndex, editingCustom, customValue, scrollOffset = 0, characterPreview = null, projectileSprite = null) {
```

to:

```js
drawSettingsMenu(settings, selectedIndex, editingCustom, customValue, scrollOffset = 0, p1CharacterPreview = null, p2CharacterPreview = null, projectileSprite = null) {
```

And update the items array inside `drawSettingsMenu()` — replace the single Character row:

```js
{ label: 'Character', value: settings.character, cycle: true, preview: characterPreview, hasPreview: true },
```

with:

```js
{ label: 'P1 Char', value: settings.p1Character, cycle: true, preview: p1CharacterPreview, hasPreview: true },
...(settings.player2Mode === 'human' ? [{ label: 'P2 Char', value: settings.p2Character, cycle: true, preview: p2CharacterPreview, hasPreview: true }] : []),
```

- [ ] **Step 9: Update settings render call**

In `render()`, find the `STATE.SETTINGS` case and replace:

```js
    case STATE.SETTINGS:
      renderer.drawSettingsMenu(settings, game.settingsIndex,
        settings.gravityPreset === 'Custom', game.customGravityInput,
        game.settingsScrollOffset, game.characterPreviewSprite, projectileSprite);
      break;
```

with:

```js
    case STATE.SETTINGS:
      renderer.drawSettingsMenu(settings, game.settingsIndex,
        settings.gravityPreset === 'Custom', game.customGravityInput,
        game.settingsScrollOffset,
        game.p1CharacterPreviewSprite, game.p2CharacterPreviewSprite, projectileSprite);
      break;
```

- [ ] **Step 10: Verify settings menu works**

Run: Open browser, go to Settings. Verify:
- "P1 Character" and "P2 Character" rows appear (when P2 mode is Human)
- Cycling each changes independent previews
- Setting P2 to AI hides the P2 Character row
- Back returns to title, sprites load correctly

- [ ] **Step 11: Commit**

```bash
git add animal-wars/js/main.js animal-wars/js/renderer.js
git commit -m "feat: split settings character into per-player P1/P2 rows"
```

---

### Task 5: Renderer — Extract Shared `drawMenuRows()` and Add `drawNewGameMenu()`

Extract the row-drawing logic from `drawSettingsMenu()` into a shared helper, then add `drawNewGameMenu()` as a thin wrapper.

**Files:**
- Modify: `animal-wars/js/renderer.js` — extract `drawMenuRows()` from `drawSettingsMenu()`, add `drawNewGameMenu()`

- [ ] **Step 1: Verify `drawSettingsMenu()` signature was updated in Task 4**

Task 4, Step 8 already updated the `drawSettingsMenu()` signature to accept `p1CharacterPreview, p2CharacterPreview` and updated the items array with P1/P2 character rows. Confirm this is in place before proceeding.

- [ ] **Step 2: (No action needed — items array updated in Task 4)**

The items array was already updated in Task 4, Step 8 to use `p1Character`/`p2Character` with conditional P2 row. Skip to Step 3.

The items array should now look like:

```js
      const items = [
        { label: 'Input', value: settings.inputMethod === 'sliders' ? 'Sliders' : 'Classic', cycle: true },
        { label: 'Rounds', value: String(settings.rounds), cycle: true },
        { label: 'Gravity', value: `${settings.gravityPreset} (${settings.gravityPreset === 'Custom' ? settings.customGravity : (GRAVITY_PRESETS.find(p => p.name === settings.gravityPreset)?.gravity ?? '')})`, cycle: true },
        ...(settings.gravityPreset === 'Custom' ? [{ label: 'Custom G', value: editingCustom ? customValue + '_' : String(settings.customGravity), cycle: false }] : []),
        { label: 'Player 2', value: settings.player2Mode, cycle: true },
        { label: 'P1 Char', value: settings.p1Character, cycle: true, preview: p1CharacterPreview, hasPreview: true },
        ...(settings.player2Mode === 'human' ? [{ label: 'P2 Char', value: settings.p2Character, cycle: true, preview: p2CharacterPreview, hasPreview: true }] : []),
        { label: 'Projectile', value: settings.projectile, cycle: true, preview: projectileSprite, hasPreview: true },
        { label: 'Shot Trail', value: settings.shotTrail ? 'ON' : 'OFF', cycle: true },
        { label: 'Aim Preview', value: settings.aimPreview ? 'ON' : 'OFF', cycle: true },
        { label: 'Dynamic Aim', value: settings.dynamicAimPreview ? 'ON' : 'OFF', cycle: true },
        { label: 'Volume', value: null, volume: settings.volume, cycle: true },
        { label: 'Back', value: null, cycle: false, isBack: true },
      ];
```

- [ ] **Step 3: Extract `drawMenuRows()` helper**

Take the drawing logic from `drawSettingsMenu()` (everything after the items array down to `ctx.restore()`) and move it into a new private function `drawMenuRows(items, title, selectedIndex, scrollOffset)` inside the `createRenderer` closure (but NOT in the returned object — it's internal only).

Place `drawMenuRows` just before the `return {` statement in `createRenderer()`:

```js
  function drawMenuRows(items, title, selectedIndex, scrollOffset) {
    ctx.fillStyle = SKY_NIGHT_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, CANVAS_WIDTH / 2, 40);

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
        ctx.fillText(item.backLabel || 'Back', CANVAS_WIDTH / 2, midY);
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

      // Value center
      const valueCenterX = (leftArrowX + arrowW + rightArrowX) / 2;

      // Label
      ctx.fillStyle = selected ? '#FFD700' : '#888888';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, rowX + 8, midY);

      // Value area
      if (item.volume !== undefined && item.volume !== null) {
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

      // Sprite preview
      if (item.preview || item.hasPreview) {
        const previewSize = CHARACTER_PREVIEW_SIZE;
        const previewX = rightArrowX + arrowW + 8;
        const previewY = y + (rowH - previewSize) / 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(previewX - 1, previewY - 1, previewSize + 2, previewSize + 2);

        if (item.preview) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(item.preview, previewX, previewY, previewSize, previewSize);
          ctx.imageSmoothingEnabled = true;
        } else {
          ctx.fillStyle = '#555555';
          ctx.font = '16px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('?', previewX + previewSize / 2, previewY + previewSize / 2 + 1);
          ctx.font = '11px monospace';
        }
      }
    }

    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }
```

- [ ] **Step 4: Refactor `drawSettingsMenu()` to use `drawMenuRows()`**

Replace the body of `drawSettingsMenu()` (everything after the items array) with a single call:

```js
    drawSettingsMenu(settings, selectedIndex, editingCustom, customValue, scrollOffset = 0, p1CharacterPreview = null, p2CharacterPreview = null, projectileSprite = null) {
      const items = [
        { label: 'Input', value: settings.inputMethod === 'sliders' ? 'Sliders' : 'Classic', cycle: true },
        { label: 'Rounds', value: String(settings.rounds), cycle: true },
        { label: 'Gravity', value: `${settings.gravityPreset} (${settings.gravityPreset === 'Custom' ? settings.customGravity : (GRAVITY_PRESETS.find(p => p.name === settings.gravityPreset)?.gravity ?? '')})`, cycle: true },
        ...(settings.gravityPreset === 'Custom' ? [{ label: 'Custom G', value: editingCustom ? customValue + '_' : String(settings.customGravity), cycle: false }] : []),
        { label: 'Player 2', value: settings.player2Mode, cycle: true },
        { label: 'P1 Char', value: settings.p1Character, cycle: true, preview: p1CharacterPreview, hasPreview: true },
        ...(settings.player2Mode === 'human' ? [{ label: 'P2 Char', value: settings.p2Character, cycle: true, preview: p2CharacterPreview, hasPreview: true }] : []),
        { label: 'Projectile', value: settings.projectile, cycle: true, preview: projectileSprite, hasPreview: true },
        { label: 'Shot Trail', value: settings.shotTrail ? 'ON' : 'OFF', cycle: true },
        { label: 'Aim Preview', value: settings.aimPreview ? 'ON' : 'OFF', cycle: true },
        { label: 'Dynamic Aim', value: settings.dynamicAimPreview ? 'ON' : 'OFF', cycle: true },
        { label: 'Volume', value: null, volume: settings.volume, cycle: true },
        { label: 'Back', value: null, cycle: false, isBack: true },
      ];
      drawMenuRows(items, 'SETTINGS', selectedIndex, scrollOffset);
    },
```

- [ ] **Step 5: Add `drawNewGameMenu()`**

Add a new public method in the returned object, right after `drawSettingsMenu`:

```js
    drawNewGameMenu(settings, selectedIndex, editingCustom, customValue, scrollOffset = 0, p1CharacterPreview = null, p2CharacterPreview = null, projectileSprite = null) {
      const items = [
        { label: 'Rounds', value: String(settings.rounds), cycle: true },
        { label: 'Gravity', value: `${settings.gravityPreset} (${settings.gravityPreset === 'Custom' ? settings.customGravity : (GRAVITY_PRESETS.find(p => p.name === settings.gravityPreset)?.gravity ?? '')})`, cycle: true },
        ...(settings.gravityPreset === 'Custom' ? [{ label: 'Custom G', value: editingCustom ? customValue + '_' : String(settings.customGravity), cycle: false }] : []),
        { label: 'P1 Char', value: settings.p1Character, cycle: true, preview: p1CharacterPreview, hasPreview: true },
        { label: 'Player 2', value: settings.player2Mode, cycle: true },
        ...(settings.player2Mode === 'human' ? [{ label: 'P2 Char', value: settings.p2Character, cycle: true, preview: p2CharacterPreview, hasPreview: true }] : []),
        { label: 'Projectile', value: settings.projectile, cycle: true, preview: projectileSprite, hasPreview: true },
        { label: 'Start', value: null, cycle: false, isBack: true, backLabel: 'Start' },
      ];
      drawMenuRows(items, 'NEW GAME', selectedIndex, scrollOffset);
    },
```

Note: The "Start" button reuses `isBack: true` for the same centered button styling, with `backLabel: 'Start'` to change the displayed text.

- [ ] **Step 6: Verify settings menu still renders correctly**

Run: Open browser, check Settings menu renders identically to before (except "Character" is now "P1 Char" / "P2 Char"). Scroll, cycle values, check previews.

- [ ] **Step 7: Commit**

```bash
git add animal-wars/js/renderer.js
git commit -m "refactor: extract drawMenuRows shared helper, add drawNewGameMenu"
```

---

### Task 6: Shared Input Helper — Extract `cycleSettingItem()`

Extract the per-item cycling logic from `handleSettingsKey()` into a reusable function, then wire it into settings.

**Files:**
- Modify: `animal-wars/js/main.js` — extract `cycleSettingItem()`, refactor `handleSettingsKey()`

- [ ] **Step 1: Create `cycleSettingItem()` function**

Add this function in `main.js` right before `handleSettingsKey()`:

```js
function cycleSettingItem(itemName, dir) {
  const len = CHARACTER_OPTIONS.length;
  switch (itemName) {
    case 'inputMethod': {
      const options = ['classic', 'sliders'];
      const idx = options.indexOf(settings.inputMethod);
      settings.inputMethod = options[(idx + dir + options.length) % options.length];
      break;
    }
    case 'rounds': {
      const options = [1, 3, 5, 10];
      const idx = options.indexOf(settings.rounds);
      settings.rounds = options[(idx + dir + options.length) % options.length];
      break;
    }
    case 'gravityPreset': {
      const presetNames = GRAVITY_PRESETS.map(p => p.name).concat('Custom');
      const idx = presetNames.indexOf(settings.gravityPreset);
      settings.gravityPreset = presetNames[(idx + dir + presetNames.length) % presetNames.length];
      game.customGravityInput = String(settings.customGravity);
      break;
    }
    case 'player2Mode': {
      const options = ['human', 'ai_easy', 'ai_medium', 'ai_hard'];
      const idx = options.indexOf(settings.player2Mode);
      settings.player2Mode = options[(idx + dir + options.length) % options.length];
      break;
    }
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
    case 'shotTrail':
      settings.shotTrail = !settings.shotTrail;
      break;
    case 'aimPreview':
      settings.aimPreview = !settings.aimPreview;
      break;
    case 'dynamicAimPreview':
      settings.dynamicAimPreview = !settings.dynamicAimPreview;
      break;
    case 'projectile': {
      const idx = PROJECTILE_OPTIONS.indexOf(settings.projectile);
      settings.projectile = PROJECTILE_OPTIONS[(idx + dir + PROJECTILE_OPTIONS.length) % PROJECTILE_OPTIONS.length];
      loadProjectileSprite(settings.projectile).then(img => { projectileSprite = img; });
      break;
    }
    case 'volume': {
      settings.volume = Math.round(Math.min(1, Math.max(0, settings.volume + dir * 0.1)) * 10) / 10;
      audio.setVolume(settings.volume);
      break;
    }
    default:
      return false; // item not cycleable
  }
  saveSettings(settings);
  return true;
}
```

- [ ] **Step 2: Refactor `handleSettingsKey()` to use `cycleSettingItem()`**

Replace the entire left/right cycling section of `handleSettingsKey()` (from `if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;` through the end of the switch/`saveSettings` call) with:

```js
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;
  const dir = key === 'ArrowRight' ? 1 : -1;

  if (cycleSettingItem(itemName, dir)) {
    // Clamp settingsIndex if a conditional row appeared/disappeared
    const newCount = getSettingsItemCount();
    if (game.settingsIndex >= newCount) {
      game.settingsIndex = newCount - 1;
    }
    clampSettingsScroll();
  }
```

Note: The gravity preset conditional row clamping that was previously inline in the `gravityPreset` case is now handled generically after any cycle — this covers both gravity and player2Mode conditionals.

- [ ] **Step 3: Verify settings cycling still works**

Run: Open browser, test all settings cycle correctly with left/right arrows and touch. Verify gravity Custom conditional and P2 Character conditional both appear/disappear correctly.

- [ ] **Step 4: Commit**

```bash
git add animal-wars/js/main.js
git commit -m "refactor: extract cycleSettingItem shared helper from handleSettingsKey"
```

---

### Task 7: Shared Click Handler — Extract `handleMenuClick()`

Extract the row hit-testing logic from the `STATE.SETTINGS` branch of `handleClick()` into a shared `handleMenuClick()` function, then refactor the settings branch to use it. This prevents duplicating ~75 lines when the New Game click handler is added in Task 8.

**Files:**
- Modify: `animal-wars/js/main.js` — extract `handleMenuClick()`, refactor settings click branch

- [ ] **Step 1: Create `handleMenuClick()` function**

Add this function in `main.js` near the other shared helpers (`cycleSettingItem`):

```js
function handleMenuClick(cx, cy, opts) {
  const { getItemCount, getItemName, getIndex, setIndex, getScroll, setScroll, onBottomButton, onKey } = opts;
  const rowH = SETTINGS_ROW_H;
  const rowGap = SETTINGS_ROW_GAP;
  const startY = 68;
  const rowW = 340;
  const rowX = CANVAS_WIDTH / 2 - rowW / 2;
  const arrowW = SETTINGS_ARROW_W;
  const hitSize = SETTINGS_ARROW_HIT;
  const itemCount = getItemCount();
  const visibleH = SETTINGS_VISIBLE_ROWS * rowH + (SETTINGS_VISIBLE_ROWS - 1) * rowGap;
  const maxScroll = Math.max(0, itemCount + SETTINGS_SCROLL_PADDING - SETTINGS_VISIBLE_ROWS);

  // Scroll indicator tap: up
  if (getScroll() > 0 && cy >= startY - rowH && cy < startY) {
    setScroll(Math.max(0, getScroll() - 1));
    return;
  }
  // Scroll indicator tap: down
  if (getScroll() < maxScroll && cy > startY + visibleH && cy <= startY + visibleH + rowH) {
    setScroll(Math.min(maxScroll, getScroll() + 1));
    return;
  }

  for (let i = 0; i < itemCount; i++) {
    const visIndex = i - getScroll();
    if (visIndex < 0 || visIndex >= SETTINGS_VISIBLE_ROWS) continue;

    const y = startY + visIndex * (rowH + rowGap);
    const itemName = getItemName(i);

    // Bottom button (back/start)
    if (itemName === 'back' || itemName === 'start') {
      const bw = 120;
      const bx = CANVAS_WIDTH / 2 - bw / 2;
      if (cx >= bx && cx <= bx + bw && cy >= y && cy <= y + rowH) {
        setIndex(i);
        onBottomButton();
        return;
      }
      continue;
    }

    if (cy >= y && cy <= y + rowH) {
      setIndex(i);
      const leftArrowX = rowX + rowW - 200;
      const rightArrowX = rowX + rowW - arrowW - 4;
      const arrowCenterY = y + rowH / 2;

      // Left arrow hit
      const leftHitX = leftArrowX - (hitSize - arrowW) / 2;
      if (cx >= leftHitX && cx <= leftHitX + hitSize &&
          cy >= arrowCenterY - hitSize / 2 && cy <= arrowCenterY + hitSize / 2) {
        onKey('ArrowLeft');
        return;
      }
      // Right arrow hit
      const rightHitX = rightArrowX - (hitSize - arrowW) / 2;
      if (cx >= rightHitX && cx <= rightHitX + hitSize &&
          cy >= arrowCenterY - hitSize / 2 && cy <= arrowCenterY + hitSize / 2) {
        onKey('ArrowRight');
        return;
      }

      // Custom gravity tap
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

- [ ] **Step 2: Refactor settings click handler to use `handleMenuClick()`**

Replace the entire `else if (game.state === STATE.SETTINGS) { ... }` block in `handleClick()` with:

```js
  else if (game.state === STATE.SETTINGS) {
    handleMenuClick(cx, cy, {
      getItemCount: getSettingsItemCount,
      getItemName: getSettingsItemName,
      getIndex: () => game.settingsIndex,
      setIndex: (i) => { game.settingsIndex = i; },
      getScroll: () => game.settingsScrollOffset,
      setScroll: (v) => { game.settingsScrollOffset = v; },
      onBottomButton: () => handleSettingsKey('Enter'),
      onKey: handleSettingsKey,
    });
  }
```

- [ ] **Step 3: Verify settings touch/click still works**

Run: Open browser, test all settings interactions via click/touch — scroll indicators, arrow buttons, custom gravity input focus, Back button. Verify no regressions.

- [ ] **Step 4: Commit**

```bash
git add animal-wars/js/main.js
git commit -m "refactor: extract handleMenuClick shared click handler"
```

---

### Task 8: New Game Screen — State Handlers (Key, Click, Render)

Wire up the `STATE.NEW_GAME` state with input handling, click handling, and rendering.

**Files:**
- Modify: `animal-wars/js/main.js` — add `handleNewGameKey()`, `getNewGameItemCount()`, `getNewGameItemName()`, `clampNewGameScroll()`, update `handleKey()`, `handleClick()`, `render()`

- [ ] **Step 1: Add New Game item list helpers**

Add these functions in `main.js` near the settings item helpers:

```js
function getNewGameItemCount() {
  let count = 6; // base items (without conditionals)
  if (settings.gravityPreset === 'Custom') count++;
  if (settings.player2Mode === 'human') count++;
  return count;
}

function getNewGameItemName(index) {
  const isCustom = settings.gravityPreset === 'Custom';
  const isHuman = settings.player2Mode === 'human';
  const items = [
    'rounds',
    'gravityPreset',
    ...(isCustom ? ['customGravity'] : []),
    'p1Character',
    'player2Mode',
    ...(isHuman ? ['p2Character'] : []),
    'projectile',
    'start',
  ];
  return items[index] || null;
}

function clampNewGameScroll() {
  const itemCount = getNewGameItemCount();
  const maxScroll = Math.max(0, itemCount + SETTINGS_SCROLL_PADDING - SETTINGS_VISIBLE_ROWS);
  if (game.newGameIndex < game.newGameScrollOffset) {
    game.newGameScrollOffset = game.newGameIndex;
  } else if (game.newGameIndex >= game.newGameScrollOffset + SETTINGS_VISIBLE_ROWS) {
    game.newGameScrollOffset = game.newGameIndex - SETTINGS_VISIBLE_ROWS + 1;
  }
  game.newGameScrollOffset = Math.max(0, Math.min(game.newGameScrollOffset, maxScroll));
}
```

- [ ] **Step 2: Add `handleNewGameKey()` function**

```js
function handleNewGameKey(key) {
  const itemCount = getNewGameItemCount();
  const itemName = getNewGameItemName(game.newGameIndex);

  if (key === 'ArrowUp') {
    game.newGameIndex = (game.newGameIndex - 1 + itemCount) % itemCount;
    clampNewGameScroll();
    audio.playMenuSelect();
    return;
  }
  if (key === 'ArrowDown') {
    game.newGameIndex = (game.newGameIndex + 1) % itemCount;
    clampNewGameScroll();
    audio.playMenuSelect();
    return;
  }

  // Enter on Start
  if (key === 'Enter' && itemName === 'start') {
    saveSettings(settings);
    startNewGame();
    return;
  }

  // Escape — back to title
  if (key === 'Escape') {
    game.state = STATE.TITLE_SCREEN;
    game.menuIndex = 0;
    return;
  }

  // Custom gravity text input
  if (itemName === 'customGravity') {
    if (key >= '0' && key <= '9' || key === '.') {
      let candidate = game.customGravityInput + key;
      if (key === '.' && game.customGravityInput.includes('.')) return;
      const dotIndex = candidate.indexOf('.');
      if (dotIndex >= 0 && candidate.length - dotIndex - 1 > 2) return;
      game.customGravityInput = candidate;
      const parsed = parseFloat(game.customGravityInput);
      if (!isNaN(parsed) && parsed >= 0.1) {
        settings.customGravity = parsed;
        saveSettings(settings);
      }
      return;
    }
    if (key === 'Backspace') {
      game.customGravityInput = game.customGravityInput.slice(0, -1);
      const parsed = parseFloat(game.customGravityInput);
      if (!isNaN(parsed) && parsed >= 0.1) {
        settings.customGravity = parsed;
        saveSettings(settings);
      }
      return;
    }
  }

  // Left/Right cycling
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;
  const dir = key === 'ArrowRight' ? 1 : -1;

  if (cycleSettingItem(itemName, dir)) {
    const newCount = getNewGameItemCount();
    if (game.newGameIndex >= newCount) {
      game.newGameIndex = newCount - 1;
    }
    clampNewGameScroll();
  }
}
```

- [ ] **Step 3: Add New Game state variables to the game object**

In the `game` object in `animal-wars/js/main.js`, add alongside the existing settings state variables:

```js
  newGameIndex: 0,
  newGameScrollOffset: 0,
```

- [ ] **Step 4: Update `handleTitleAction()` — redirect "new_game" to NEW_GAME state**

Replace the `'new_game'` case in `handleTitleAction()`:

```js
    case 'new_game':
      startNewGame();
      break;
```

with:

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

- [ ] **Step 5: Add `STATE.NEW_GAME` to `handleKey()` switch**

In the `handleKey()` function, add a case after `STATE.TITLE_SCREEN`:

```js
    case STATE.NEW_GAME:
      handleNewGameKey(key);
      break;
```

- [ ] **Step 6: Add `STATE.NEW_GAME` to `render()` switch**

In the `render()` function, add a case after `STATE.TITLE_SCREEN`:

```js
    case STATE.NEW_GAME:
      renderer.drawNewGameMenu(settings, game.newGameIndex,
        settings.gravityPreset === 'Custom', game.customGravityInput,
        game.newGameScrollOffset,
        game.p1CharacterPreviewSprite, game.p2CharacterPreviewSprite, projectileSprite);
      break;
```

- [ ] **Step 7: Add `STATE.NEW_GAME` to `handleClick()` using shared `handleMenuClick()`**

In `handleClick()`, add a new `else if` branch for `STATE.NEW_GAME` right after the `STATE.SETTINGS` branch. This uses the shared `handleMenuClick()` extracted in Task 7:

```js
  else if (game.state === STATE.NEW_GAME) {
    handleMenuClick(cx, cy, {
      getItemCount: getNewGameItemCount,
      getItemName: getNewGameItemName,
      getIndex: () => game.newGameIndex,
      setIndex: (i) => { game.newGameIndex = i; },
      getScroll: () => game.newGameScrollOffset,
      setScroll: (v) => { game.newGameScrollOffset = v; },
      onBottomButton: () => { saveSettings(settings); startNewGame(); },
      onKey: handleNewGameKey,
    });
  }
```

- [ ] **Step 8: Verify the full New Game flow**

Run: Open browser, test the complete flow:
1. Title screen → click "New Game" → NEW GAME screen appears
2. All items cycle correctly (rounds, gravity, P1/P2 characters, player 2 mode, projectile)
3. Setting P2 to AI hides P2 Character row
4. Setting gravity to Custom shows Custom G row
5. Preview sprites update when cycling characters/projectile
6. "Start" button starts the game
7. Escape returns to title screen
8. Touch/click on arrows works
9. Changes persist to settings (go back, re-enter New Game, values preserved)

- [ ] **Step 9: Commit**

```bash
git add animal-wars/js/main.js
git commit -m "feat: add New Game setup screen with per-player character selection"
```

---

### Task 9: Final Verification & Cleanup

Verify everything works end-to-end and all tests pass.

**Files:**
- All modified files

- [ ] **Step 1: Run all tests**

Run: `node --test animal-wars/tests/*.test.js`
Expected: All pass.

- [ ] **Step 2: Full integration test in browser**

Verify these scenarios:
1. **New Game flow (Human vs Human):** Title → New Game → pick different characters for P1/P2 → Start → both players render with their chosen characters
2. **New Game flow (AI):** Title → New Game → set P2 to AI → P2 Character row hidden → Start → AI plays with a random character
3. **Settings (from title):** Both P1/P2 Character rows visible (when P2 Human), previews work, back returns to title, sprites reload
4. **Settings (from pause):** Same behavior, back returns to pause menu
5. **Migration:** Clear localStorage, set legacy `character: 'Robot'`, reload page — verify both P1 and P2 default to Robot
6. **Escape from New Game:** Changes persist, returns to title
7. **Touch interactions:** All buttons, arrows, and scroll indicators work on the New Game screen

- [ ] **Step 3: Commit any fixes if needed**

Only if issues were found in step 2.

```bash
git add -A
git commit -m "fix: address issues found in integration testing"
```
