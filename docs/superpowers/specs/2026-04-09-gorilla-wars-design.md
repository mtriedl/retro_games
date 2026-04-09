# Gorilla Wars -- Browser Game Design Spec

A faithful clone of the classic QBasic DOS game "Gorillas" (GORILLAS.BAS), reimagined as a browser-based game with modern quality-of-life improvements and smoother animations.

## Technology

- **Platform**: Browser-based (HTML5 Canvas + vanilla JavaScript with JSDoc type annotations)
- **Target browsers**: Latest Chromium-based, Firefox, WebKit
- **Architecture**: ES modules (native `import/export`, no bundler)
- **Build step**: None -- serve files with any local HTTP server
- **Audio**: Web Audio API (all sounds synthesized, no audio files)
- **Assets**: Single gorilla sprite sheet PNG

## Project Structure

```
gorilla-wars/
  index.html          -- canvas element, loads main.js as module
  css/
    style.css         -- minimal layout (canvas centering, body bg)
  js/
    main.js           -- entry point, game loop, state machine
    renderer.js       -- all canvas drawing (sky, buildings, gorillas, banana, explosions, UI text)
    physics.js        -- projectile trajectory, wind, collision detection
    buildings.js      -- random city generation, terrain heightmap
    ai.js             -- computer opponent logic
    audio.js          -- Web Audio synthesized sounds
    input.js          -- keyboard handling, angle/velocity entry
    settings.js       -- gravity presets, QoL toggles, round config
    sprites.js        -- sprite sheet loading and frame management
    constants.js      -- canvas size, colors, gravity values, building params
  assets/
    gorilla-sprite.png  -- sprite sheet (idle, throw-L, throw-R, victory), 4 frames × 32×32px
  serve.sh            -- one-liner: python3 -m http.server 8080
```

Each module has a single responsibility. `main.js` orchestrates the state machine and game loop, calling into the other modules. No module imports more than 2-3 others.

## Canvas & Scaling

- **Internal resolution**: 640x400 logical pixels (matching original proportions)
- **Scaling**: CSS scales the canvas to fill the browser viewport while maintaining 640:400 aspect ratio
- **Pixel rendering**: `image-rendering: pixelated` / `crisp-edges` to preserve chunky pixel art when scaled
- **Fullscreen**: Fullscreen API via button on title screen. F11 is a browser-native shortcut and is not handled in-game. In fullscreen the game fills the entire screen.
- All game logic, collision, and rendering use the 640x400 coordinate space

## Game Flow & States

```
TITLE_SCREEN → ROUND_START → PLAYER_INPUT → PROJECTILE_FLIGHT
                                  ↑                ↓
                                  |          hit? → IMPACT → ROUND_END → (next round or GAME_OVER)
                                  |          miss? ────────→ PLAYER_INPUT (other player)
                                  |                              |
                              PAUSED ←── Escape ──────────── (toggle)
```

- **PROJECTILE_FLIGHT** branches: a hit transitions to IMPACT; a miss loops back to PLAYER_INPUT for the other player.
- **Escape** toggles PAUSED during PLAYER_INPUT and PROJECTILE_FLIGHT only. Pause is disabled during IMPACT, ROUND_END, and TITLE_SCREEN.
- **PAUSED** menu options: Resume, Restart Round, Settings, Quit to Title.

All menus (title screen, pause, settings) are navigated via **arrow keys + Enter** or **mouse click**.

### TITLE_SCREEN

DOS-style blocky text title "GORILLA WARS" with retro aesthetic. Menu options:

- New Game
- Settings
- Fullscreen

### ROUND_START

- Generate random cityscape (11-12 buildings spanning full width)
- Place gorillas on buildings: Player 1 on a random building among the 1st–4th from the left, Player 2 on a random building among the 1st–4th from the right
- Set random wind value
- Randomly select day or night sky
- Brief animation of buildings "drawing in"

### PLAYER_INPUT

- Active player enters angle (0–90, integer only) then velocity (1–200, integer only) sequentially
- **Enter/Return** confirms each field: first confirms angle and advances to velocity, second confirms velocity and fires the shot
- Angle is in **local space**: 0 = horizontal toward the opponent, 90 = straight up. The UI converts to world-space internally; players never see world angles. Player 1's local 45° maps to world 45°; Player 2's local 45° maps to world 135°.
- Placeholders and stored values are always in local space
- After a player's first turn, input fields show last-used values as dimmed gray placeholder text
- Blinking `__` cursor appears under the active field (angle first, then velocity)
- User's typed input overwrites the placeholder directly (no need to clear). Only digit keys and Backspace are accepted.
- **Enter/Return** on an empty field is ignored. Parsed values are clamped on confirm: angle 0–90, velocity 1–200.
- If aim preview QoL is enabled, a faint directional line shows from the gorilla

### PROJECTILE_FLIGHT

- Banana arcs across screen with smooth animation and rotation
- Wind affects trajectory as horizontal acceleration
- Gorilla plays throw animation (throw-left or throw-right depending on direction)
- If banana goes above viewport, an upward-pointing arrow (▲) tracks the banana's X position along the top edge, labeled "BANANA"
- If banana passes through the sun (day) or moon (night), the celestial body switches to a surprised open-mouth expression for ~1 second

### IMPACT

- **Building hit**: Small explosion with circular crater carved out of the building. Debris particles fly out. Building damage persists for the round.
- **Gorilla hit**: Significantly larger explosion (3-4x the building crater radius) that engulfs and hides the gorilla. Gorilla sprite is hidden as soon as explosion starts. Larger debris particles.

### ROUND_END

- A direct gorilla hit immediately ends the round; the hitting player scores 1 point
- A single round cannot end in a draw — every projectile resolves as hit or miss. (The overall match can still tie if both players win an equal number of rounds.)
- Brief result display
- If all rounds in the match have been played (Rounds setting = rounds-to-play, not rounds-to-win), transition to GAME_OVER
- Otherwise start next round; **starting player alternates** each round (Player 1 starts round 1)

### GAME_OVER

- Display final scores and winner (or tie if scores are equal)
- Option to play again (returns to title screen)

## Visual Design

### Sky

- **Day**: Flat solid blue (#0000AA). Sun centered horizontally near top of screen with ray spikes and smiley face.
- **Night**: Dark blue (#000033) with scattered stars. Moon centered horizontally near top of screen with face (same expressions as sun).
- Randomly selected per round.

### HUD Layout

- **Top center above sun/moon**: Wind direction indicator (visual arrows scaling with strength)
- **Top left**: Player 1 label with angle/velocity input below
- **Top right**: Player 2 label with angle/velocity input below (mirrored layout)
- Only the **active player's** input field shows a blinking cursor and accepts input. The inactive player's panel shows their last-used values dimmed.
- **Bottom center**: Score in original format `P1Score>Score<P2Score`

### Buildings

- 11-12 buildings spanning the full 640px width edge-to-edge
- Varied widths (52-62px range) and heights (120-230px range, starting lower overall)
- Colors from the EGA palette: red (#AA0000), dark blue (#0000AA), green (#00AA00), cyan (#00AAAA), magenta (#AA00AA), brown (#AA5500), gray (#AAAAAA), bright blue (#5555FF)
- **Constraint**: Building color must not match the sky background color (no dark blue buildings on day sky, etc.)
- Windows are **8×10px** with **4px gutters**, arranged in a grid filling the building face (3–4 columns depending on width)
- Windows randomly lit (yellow #FFFF55) or unlit (dark #555555)
- For daytime, lit windows could optionally reflect sky blue instead of yellow

### Gorillas

- Pixel-art sprite sheet: **4 frames in a single row, each 32×32px**
  - Frame 0 — **Idle**: Standing neutral, arms at sides (faithful to original's blocky gorilla shape — flat head with brow ridge, broad shoulders, V-chest detail, arms out, wide-stance legs)
  - Frame 1 — **Throw left**: Left arm raised overhead
  - Frame 2 — **Throw right**: Right arm raised overhead
  - Frame 3 — **Victory**: Both arms raised, celebratory pose
- On gorilla hit, the sprite is hidden immediately by the explosion — no dedicated hit frame
- **Anchor**: bottom-center of the 32×32 frame
- **Collision box**: 24×28px, centered horizontally, aligned to bottom of frame
- Gorilla negative space (eyes, chest V, leg gap) is transparent, showing the building/sky behind
- Positioned standing on top of their building. Gorilla position is fixed for the entire round — gorillas do not fall even if the terrain beneath them is cratered away.

### Banana Projectile

- **Canvas-drawn banana** (no emoji — emoji rendering varies across browsers). Simple crescent shape in yellow (#FFFF00) with brown (#AA5500) tips.
- **Collision radius**: 4px circle. Collision against gorillas uses circle-vs-AABB. Collision against terrain: hit if `banana.y + radius >= heightmap[floor(banana.x)]` to match the visible sprite edge.
- Rotates during flight
- Smooth animation via `requestAnimationFrame` with delta-time interpolation

### Explosions

- Building hit: small circular crater (~15px radius) with brief particle burst. Crater moves the terrain surface downward (increases heightmap Y values) in affected columns.
- Gorilla hit: large explosion (~50–60px radius), hides gorilla, more/larger debris particles. Also craters the terrain in affected columns.
- All explosions damage the terrain heightmap. Craters persist for the round; no separate damage tracking needed.

### Sun / Moon

- **Sun** (day): Centered at top, circular with ray spikes radiating outward. Smiley face (two dot eyes, curved smile). When banana passes through, switches to surprised face (wide eyes, open circle mouth) for ~1 second.
- **Moon** (night): Same position, crescent or full moon shape. Same face expressions and banana-pass behavior as sun.

## Physics

### Terrain Representation

The game uses a **column heightmap**: an array of 640 integers (one per pixel column), each storing the Y coordinate of the topmost solid pixel in that column. Buildings initialize the heightmap at round start. Explosion craters move the terrain surface downward (increase heightmap Y values) in affected columns.

- Collision check uses `floor(banana.x)` to index the heightmap, ensuring deterministic behavior at subpixel positions
- Gorilla collision uses a **separate 24×28px rectangle** (see Gorillas section) — the heightmap does not cover gorilla hits

### Projectile Motion

```
// Per-step integration (Euler), dt = 1/60s fixed
x += vx * dt + 0.5 * wind_sim * dt²
y += vy * dt + 0.5 * gravity_sim * dt²
vx += wind_sim * dt
vy += gravity_sim * dt
```

- **Fixed timestep**: dt = 1/60s. Simulation runs in fixed steps independent of render cadence — use a fixed-step accumulator loop (accumulate real elapsed time, consume in dt-sized steps) with rendering interpolation to handle displays above or below 60 Hz.
- **Units**: all simulation velocities are in px/s; all accelerations (gravity, wind) are in px/s².
- **Velocity scaling**: internal launch speed = displayed velocity (1–200) × `VELOCITY_SCALE`, where `VELOCITY_SCALE` converts displayed units to px/s.
- **Gravity scaling**: `gravity_sim = gravity_m_s2 * GRAVITY_SCALE`, converting preset gravity values to px/s².
- **Wind scaling**: `wind_sim = displayed_wind * WIND_SCALE`, converting displayed wind values to px/s² horizontal acceleration.
- **Launch vector**: `vx = launch_speed * cos(world_angle)`, `vy = -launch_speed * sin(world_angle)` (canvas Y-down). `launch_speed` is in px/s. World angle is derived from the player's local-space input (see Player Input section).
- Both AI and player projectiles use this same discrete step-by-step simulation — no analytic shortcuts.

### Wind

- Random value per round, range approximately −15 to +15 (displayed value)
- Converted to px/s² via `WIND_SCALE` (see above)
- Visual arrow indicator scales with magnitude and shows direction

### Collision Detection

Each simulation step, check banana position (using `floor(banana.x)` for deterministic column indexing). **Screen bounds are checked first** to avoid out-of-range heightmap access:

1. **Screen bounds** — left/right/bottom edges = miss; top edge = banana tracker activates (banana continues in simulation). If the banana is outside the 0–639 x-range, skip terrain/gorilla checks.
2. **Gorilla hitboxes** — circle-vs-AABB test against each gorilla's 24×28px collision rectangle. Checked before terrain so gorilla hits take priority over building hits at the gorilla's feet.
3. **Terrain heightmap** — hit if `banana.y + banana.radius >= heightmap[floor(banana.x)]` (banana radius = 4px, as defined in Banana Projectile section)
4. **Sun/Moon bounds** — triggers expression change only. Cosmetic; does not deflect or destroy the banana.

### Gravity Presets

Dropdown with value displayed:

| Body | Gravity (m/s²) |
|------|----------------|
| Mercury | 3.7 |
| Venus | 8.87 |
| Earth | 9.8 |
| Moon | 1.62 |
| Mars | 3.72 |
| Jupiter | 24.79 |
| Saturn | 10.44 |
| Uranus | 8.87 |
| Neptune | 11.15 |
| Pluto | 0.62 |
| Titan | 1.35 |
| Europa | 1.31 |
| Io | 1.80 |
| Custom | (manual input) |

**Default**: Earth (9.8). **Custom input**: integer or float with up to two decimal places, minimum 0.1. Displayed as "Earth (9.8)", "Moon (1.62)", etc. All values pass through `GRAVITY_SCALE` to convert from m/s² to px/s² before use in simulation.

## AI Opponent

- Available as Player 2 replacement (Easy / Medium / Hard)
- Uses **coarse-to-fine simulation search**: sweeps angle/velocity ranges at coarse intervals, then refines around the top candidates. Total simulated candidates per turn should be capped for performance.
- Runs the same discrete physics simulation as gameplay; selects the combination whose impact point is closest to the target gorilla
- Accounts for current wind, gravity preset, and terrain heightmap (including craters from prior shots)
- After selecting the ideal shot, applies random error based on difficulty:
  - **Easy**: angle ±15°, velocity ±20%
  - **Medium**: angle ±8°, velocity ±10%
  - **Hard**: angle ±3°, velocity ±5%
- Angle error is in degrees, velocity error is a percentage — applied independently, then clamped to valid ranges (angle 0–90, velocity 1–200)
- After a miss, AI nudges toward the target: if last shot fell short/left, adjust angle/velocity accordingly. Remembers only its own last shot.
- Brief delay before "entering" values to simulate thinking

## Audio Design

All sounds synthesized via Web Audio API oscillators, noise buffers, and filters. No audio files.

All sounds route through a master DynamicsCompressor for consistent perceived loudness, then through a master gain node for volume control.

| Event | Sound Design |
|-------|-------------|
| Banana launch | Rising whistle (sine sweep 300→900Hz + triangle harmonic) |
| Banana flight | Faint sine with vibrato (subtle, optional) |
| Building hit | 4-layer: sharp crack (bandpass noise burst), crumbling debris (descending lowpass noise), low thud (sine 90→25Hz), concrete resonance (triangle 250→100Hz) |
| Gorilla hit | 3-layer: wide noise burst (LP 2000→60Hz), sawtooth rumble (60→20Hz), square impact crack (200→40Hz). Longer decay than building hit. |
| Victory | Ascending major scale jingle: C5-D5-E5-G5-C6 (square + triangle waves) |
| Round start | Military fanfare: G4-C5-E5-G5 (square) with bandpass noise drum roll |
| Sun/Moon surprise | Comedic boing (sine bouncing 150→600→200→500→150Hz + triangle overtone) |
| Menu select | Quick two-tone click (square 800→1000Hz) |
| Miss (off screen) | Descending whistle fade (sine 600→100Hz) |
| Input keystroke | Subtle highpass noise click |

Master volume slider on title screen. Mute toggle accessible during gameplay.

**Web Audio unlock**: The `AudioContext` must be created or resumed on the first user gesture (click or keypress) to comply with browser autoplay policies.

## Quality of Life Features

1. **Prefilled angle/velocity**: After a player's first turn, input fields show the last-used values (in local-space degrees and velocity) as dimmed gray placeholder text. Typing overwrites directly. Blinking `__` cursor indicates active field.

2. **Off-screen banana tracker**: When the banana goes above the viewport, an upward-pointing arrow (▲) labeled "BANANA" tracks its X position along the top edge of the screen.

3. **Visual wind indicator**: Directional arrows at the top of screen that scale with wind strength, replacing the original's plain number.

4. **Shot trail** (toggleable, default on): Faint dotted trail showing the most recent shot's arc (by either player). The trail fades out before being replaced by the next shot's trail.

5. **Aim direction preview** (toggleable, default off): Faint directional line from the gorilla showing the angle. Does not show full trajectory -- just direction, so the challenge remains.

6. **Explosion debris**: Particle effects on building and gorilla hits. Craters persist visually.

7. **Quick restart**: Available via the pause menu's "Restart Round" option. Regenerates city, wind, and sky, but preserves match scores and current round index. Does not consume an additional round.

8. **Score display**: Persistent scoreboard in original `P1>Score<P2` format at bottom center.

9. **Gravity presets**: Solar system bodies with displayed values (e.g., "Earth (9.8)") plus custom input.

10. **Sun/Moon expressions**: Smiley face switches to surprised open-mouth when banana passes through. Moon at night, sun during day. Purely cosmetic.

## Settings & Persistence

All settings stored in `localStorage`:

- Rounds to play (1, 3, 5, 10) — total rounds in the match, not rounds-to-win
- Gravity preset + custom value
- Player 2 mode (Human / AI Easy / AI Medium / AI Hard)
- Shot trail toggle
- Aim preview toggle
- Volume level

Settings accessible from title screen and via pause menu during gameplay.

## Animations & Modern Touches

- Rendering via `requestAnimationFrame`; physics decoupled via fixed-step accumulator (see Physics section)
- Banana rotates during flight
- Buildings "draw in" at round start (rising from bottom)
- Explosion particles with physics (gravity-affected debris)
- Gorilla throw animation (arm raise)
- Gorilla victory animation (arms up)
- Sun/Moon expression transitions
- Blinking cursor on input fields
- Shot trail fade-out
