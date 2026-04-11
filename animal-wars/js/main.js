// animal-wars/js/main.js
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, DT, STATE,
  VELOCITY_SCALE, GRAVITY_SCALE, WIND_SCALE,
  WIND_MIN, WIND_MAX,
  EXPLOSION_BUILDING_RADIUS, EXPLOSION_GORILLA_RADIUS,
  GORILLA_FRAME_SIZE, BANANA_RADIUS,
  GORILLA_COLLISION_WIDTH, GORILLA_COLLISION_HEIGHT,
  GRAVITY_PRESETS, PROJECTILE_OPTIONS, CHARACTER_OPTIONS,
  DEFAULT_ANGLE, DEFAULT_VELOCITY, VELOCITY_MAX,
  INPUT_BAR_Y, INPUT_BAR_HEIGHT,
  SLIDER_THUMB_HIT_RADIUS,
  MENU_BUTTON_MIN_H,
  SETTINGS_ROW_H, SETTINGS_ROW_GAP, SETTINGS_ARROW_W, SETTINGS_ARROW_HIT,
  SETTINGS_VISIBLE_ROWS, SETTINGS_SCROLL_PADDING,
  PAUSE_BUTTON_CX, PAUSE_BUTTON_CY, PAUSE_BUTTON_HIT_RADIUS,
} from './constants.js';
import { loadSettings, saveSettings, getGravityValue } from './settings.js';
import { generateCity, initHeightmap, carveExplosion } from './buildings.js';
import { createProjectile, stepSimulation, checkCollisions } from './physics.js';
import { createInputHandler } from './input.js';
import { createCharacterSprites, loadCharacterPreview, loadProjectileSprite } from './sprites.js';
import { createAudioEngine } from './audio.js';
import { createRenderer } from './renderer.js';
import { calculateAIShot } from './ai.js';

const VICTORY_FRAMES = [
  [0, 1, 3, 2, 0, 1, 3, 0, 3, 0, 3, 0, 3, 0, 3], // Player 1
  [0, 2, 3, 1, 0, 2, 3, 0, 3, 0, 3, 0, 3, 0, 3], // Player 2
];
const VICTORY_FRAME_DURATION = 5.0 / 15; // 5 seconds total across 15 frames

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Hi-DPI canvas for crisp font rendering
const dpr = window.devicePixelRatio || 1;
canvas.width = CANVAS_WIDTH * dpr;
canvas.height = CANVAS_HEIGHT * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

// --- Module instances ---
const renderer = createRenderer(ctx);
const input = createInputHandler();
const audio = createAudioEngine();
let p1SpriteFrames = [];
let p2SpriteFrames = [];
let settings = loadSettings();
let projectileSprite = null;

// --- Game state ---
const game = {
  state: STATE.TITLE_SCREEN,
  previousState: null,
  round: 0,
  totalRounds: settings.rounds,
  scores: [0, 0],
  startingPlayer: 0,
  activePlayer: 0,
  wind: 0,
  isNight: false,
  buildings: [],
  heightmap: new Float64Array(CANVAS_WIDTH),
  gorillas: [
    { x: 0, y: 0, buildingIndex: 0, visible: true, frame: 0 },
    { x: 0, y: 0, buildingIndex: 0, visible: true, frame: 0 },
  ],
  banana: { x: 0, y: 0, vx: 0, vy: 0, prevX: 0, prevY: 0, rotation: 0, active: false },
  inputField: 'angle',
  inputValue: '',
  confirmedAngle: null,
  aimPreviewAngle: null,
  lastInputs: [{ angle: null, velocity: null }, { angle: null, velocity: null }],
  explosions: [],
  particles: [],
  shotTrail: [],
  previousTrail: [],
  trailAlpha: 1,
  celestialSurprised: false,
  celestialTimer: 0,
  menuIndex: 0,
  settingsIndex: 0,
  settingsFrom: null,
  settingsScrollOffset: 0,
  p1CharacterPreviewSprite: null,
  p2CharacterPreviewSprite: null,
  customGravityInput: '',
  buildingAnimProgress: 0,
  roundEndTimer: 0,
  roundEndDelay: 0,
  roundEndWinner: -1,
  victoryAnimIndex: 0,
  victoryAnimTimer: 0,
  aiThinkTimer: 0,
  aiLastShot: null,
  blinkTimer: 0,
  blinkOn: true,
  sliderValues: [
    { angle: DEFAULT_ANGLE, velocity: DEFAULT_VELOCITY },
    { angle: DEFAULT_ANGLE, velocity: DEFAULT_VELOCITY },
  ],
  sliderFocus: 'angle', // 'angle' | 'velocity' | 'fire'
  activeSliderDrag: null, // null | 'angle' | 'velocity'
  touchStartPos: null, // {x, y} for tap-vs-drag detection
};

// --- Init ---
async function init() {
  [p1SpriteFrames, p2SpriteFrames] = await Promise.all([
    createCharacterSprites(settings.p1Character),
    createCharacterSprites(settings.p2Character),
  ]);
  input.attach(canvas);

  // Unlock audio on first interaction
  const unlockAudio = () => {
    audio.unlock();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('keydown', unlockAudio);

  // Key handler
  input.onKey = (key) => handleKey(key);

  // Mouse handlers for menus and slider dragging
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);

  // Touch handlers for slider and menu interaction
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

  // Start loop
  requestAnimationFrame(gameLoop);
}

// --- Game loop (fixed-step accumulator) ---
let lastTime = 0;
let accumulator = 0;
const MAX_FRAME_TIME = 0.25;

function gameLoop(currentTime) {
  requestAnimationFrame(gameLoop);

  if (lastTime === 0) { lastTime = currentTime; return; }

  const frameTime = Math.min((currentTime - lastTime) / 1000, MAX_FRAME_TIME);
  lastTime = currentTime;
  accumulator += frameTime;

  while (accumulator >= DT) {
    update(DT);
    accumulator -= DT;
  }

  const alpha = accumulator / DT;
  render(alpha);
}

// --- Update (per fixed timestep) ---
function update(dt) {
  game.blinkTimer += dt;
  if (game.blinkTimer >= 0.5) {
    game.blinkTimer -= 0.5;
    game.blinkOn = !game.blinkOn;
  }

  if (game.celestialSurprised) {
    game.celestialTimer -= dt;
    if (game.celestialTimer <= 0) game.celestialSurprised = false;
  }

  switch (game.state) {
    case STATE.ROUND_START:
      game.buildingAnimProgress += dt * 2; // 0.5s animation
      if (game.buildingAnimProgress >= 1) {
        game.buildingAnimProgress = 1;
        game.state = STATE.PLAYER_INPUT;
        resetInput();
        audio.playRoundStart();
      }
      break;

    case STATE.PLAYER_INPUT:
      handleAITurn(dt);
      break;

    case STATE.PROJECTILE_FLIGHT:
      updateProjectile(dt);
      break;

    case STATE.IMPACT:
      updateExplosions(dt);
      break;

    case STATE.ROUND_END: {
      // Victory sprite cycle
      const vFrames = VICTORY_FRAMES[game.roundEndWinner];
      if (vFrames && game.victoryAnimIndex < vFrames.length) {
        game.victoryAnimTimer += dt;
        if (game.victoryAnimTimer >= VICTORY_FRAME_DURATION) {
          game.victoryAnimTimer -= VICTORY_FRAME_DURATION;
          game.victoryAnimIndex++;
          if (game.victoryAnimIndex < vFrames.length) {
            game.gorillas[game.roundEndWinner].frame = vFrames[game.victoryAnimIndex];
          }
        }
      }
      if (game.roundEndDelay > 0) {
        game.roundEndDelay -= dt;
      } else {
        game.roundEndTimer -= dt;
        if (game.roundEndTimer <= 0) {
          if (game.round + 1 >= game.totalRounds) {
            game.state = STATE.GAME_OVER;
          } else {
            game.round++;
            startRound();
          }
        }
      }
      break;
    }
  }

  // Update particles
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.vy += 300 * dt; // particle gravity
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.alpha -= dt * 1.5;
    if (p.alpha <= 0) game.particles.splice(i, 1);
  }

  // Fade previous shot trail
  if (game.trailAlpha > 0 && game.state !== STATE.PROJECTILE_FLIGHT) {
    game.trailAlpha -= dt * 0.15;
    if (game.trailAlpha < 0) game.trailAlpha = 0;
  }
}

function updateProjectile(dt) {
  const gravitySim = getGravityValue(settings) * GRAVITY_SCALE;
  const windSim = game.wind * WIND_SCALE;

  stepSimulation(game.banana, gravitySim, windSim, dt);

  // Record trail
  game.shotTrail.push({ x: game.banana.x, y: game.banana.y });

  // Clear owner once banana leaves the throwing gorilla's collision zone
  if (game.banana.ownerIndex >= 0) {
    const g = game.gorillas[game.banana.ownerIndex];
    const hw = GORILLA_COLLISION_WIDTH / 2;
    const bx = game.banana.x, by = game.banana.y, br = BANANA_RADIUS;
    if (bx + br < g.x - hw || bx - br > g.x + hw || by + br < g.y - GORILLA_COLLISION_HEIGHT || by - br > g.y) {
      game.banana.ownerIndex = -1;
    }
  }

  // Check collisions
  const result = checkCollisions(
    { x: game.banana.x, y: game.banana.y, radius: BANANA_RADIUS },
    game.heightmap,
    game.gorillas,
    renderer.getCelestialBounds(),
    game.banana.ownerIndex
  );

  switch (result.type) {
    case 'miss':
      game.banana.active = false;
      game.gorillas[game.activePlayer].frame = 0;
      audio.playMiss();
      if (isAITurn() && game.aiLastShot) {
        const target = game.gorillas[0];
        game.aiLastShot.missDirection = game.banana.x < target.x ? -1 : 1;
      }
      game.previousTrail = [...game.shotTrail];
      game.trailAlpha = 1;
      game.shotTrail = [];
      game.activePlayer = 1 - game.activePlayer;
      game.state = STATE.PLAYER_INPUT;
      resetInput();
      break;

    case 'building':
      game.banana.active = false;
      game.gorillas[game.activePlayer].frame = 0;
      audio.playBuildingHit();
      if (isAITurn() && game.aiLastShot) {
        const target = game.gorillas[0];
        game.aiLastShot.missDirection = game.banana.x < target.x ? -1 : 1;
      }
      spawnExplosion(result.x, result.y, EXPLOSION_BUILDING_RADIUS);
      carveExplosion(game.heightmap, result.x, result.y, EXPLOSION_BUILDING_RADIUS);
      game.previousTrail = [...game.shotTrail];
      game.trailAlpha = 1;
      game.shotTrail = [];
      game.state = STATE.IMPACT;
      break;

    case 'gorilla':
      game.banana.active = false;
      game.gorillas[game.activePlayer].frame = 0;
      audio.playGorillaHit();
      game.gorillas[result.gorillaIndex].visible = false;
      spawnExplosion(result.x, result.y, EXPLOSION_GORILLA_RADIUS);
      carveExplosion(game.heightmap, result.x, result.y, EXPLOSION_GORILLA_RADIUS);
      game.previousTrail = [...game.shotTrail];
      game.trailAlpha = 1;
      game.shotTrail = [];
      game.roundEndWinner = 1 - result.gorillaIndex;
      game.state = STATE.IMPACT;
      break;

    case 'sunmoon':
      if (!game.celestialSurprised) {
        game.celestialSurprised = true;
        game.celestialTimer = 1.0;
        audio.playSunMoonSurprise();
      }
      break;

    case 'tracker':
      // Banana above viewport — continue simulation
      break;
  }
}

function updateExplosions(dt) {
  let allDone = true;
  for (const e of game.explosions) {
    e.progress += dt * 3; // ~0.33s explosion
    if (e.progress < 1) allDone = false;
  }

  if (allDone) {
    game.explosions = [];
    if (game.roundEndWinner >= 0) {
      // Gorilla hit — end round
      game.scores[game.roundEndWinner]++;
      audio.playVictory();
      // Start victory animation cycle
      game.victoryAnimIndex = 0;
      game.victoryAnimTimer = 0;
      game.gorillas[game.roundEndWinner].frame = VICTORY_FRAMES[game.roundEndWinner][0];
      game.roundEndDelay = 3.0;
      game.roundEndTimer = 2.0;
      game.state = STATE.ROUND_END;
    } else {
      // Building hit — back to other player's input
      game.activePlayer = 1 - game.activePlayer;
      game.state = STATE.PLAYER_INPUT;
      resetInput();
    }
  }
}

function spawnExplosion(x, y, radius) {
  game.explosions.push({ x, y, radius, progress: 0 });

  // Spawn debris particles
  const count = radius > 30 ? 20 : 10;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 150;
    game.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 100,
      r: 180 + Math.floor(Math.random() * 75),
      g: 100 + Math.floor(Math.random() * 100),
      b: 50,
      alpha: 1,
      size: 2 + Math.random() * 3,
    });
  }
}

// --- Input handling ---
function handleKey(key) {
  switch (game.state) {
    case STATE.TITLE_SCREEN:
      handleMenuKey(key, ['new_game', 'settings', 'fullscreen'], game, 'menuIndex', handleTitleAction);
      break;

    case STATE.PLAYER_INPUT:
      if (key === 'Escape') { enterPause(); break; }
      if (isAITurn()) break;
      if (settings.inputMethod === 'sliders') {
        handleSliderInputKey(key);
      } else {
        handlePlayerInputKey(key);
      }
      break;

    case STATE.PROJECTILE_FLIGHT:
      if (key === 'Escape') enterPause();
      break;

    case STATE.PAUSED:
      handleMenuKey(key, ['resume', 'restart', 'settings', 'quit'], game, 'menuIndex', handlePauseAction);
      break;

    case STATE.SETTINGS:
      handleSettingsKey(key);
      break;

    case STATE.GAME_OVER:
      if (key === 'Enter') {
        game.state = STATE.TITLE_SCREEN;
        game.menuIndex = 0;
      }
      break;
  }
}

function handleMenuKey(key, items, stateObj, indexKey, actionFn) {
  if (key === 'ArrowUp') {
    stateObj[indexKey] = (stateObj[indexKey] - 1 + items.length) % items.length;
    audio.playMenuSelect();
  } else if (key === 'ArrowDown') {
    stateObj[indexKey] = (stateObj[indexKey] + 1) % items.length;
    audio.playMenuSelect();
  } else if (key === 'Enter') {
    actionFn(items[stateObj[indexKey]]);
  }
}

function handleTitleAction(action) {
  switch (action) {
    case 'new_game':
      startNewGame();
      break;
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
    case 'fullscreen':
      (async () => {
        try {
          await document.documentElement.requestFullscreen();
        } catch { /* fullscreen unsupported */ }
      })();
      break;
  }
}

function handlePauseAction(action) {
  switch (action) {
    case 'resume':
      game.state = game.pausedFromState;
      break;
    case 'restart':
      startRound();
      break;
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
    case 'quit':
      game.state = STATE.TITLE_SCREEN;
      game.menuIndex = 0;
      break;
  }
}

function getSettingsItemCount() {
  let count = 11; // base items (without conditionals)
  if (settings.gravityPreset === 'Custom') count++;
  if (settings.player2Mode === 'human') count++;
  return count;
}

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

function handleSettingsKey(key) {
  const itemCount = getSettingsItemCount();
  const itemName = getSettingsItemName(game.settingsIndex);

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

  // Enter on Back
  if (key === 'Enter' && itemName === 'back') {
    createCharacterSprites(settings.p1Character).then(frames => { p1SpriteFrames = frames; });
    createCharacterSprites(settings.p2Character).then(frames => { p2SpriteFrames = frames; });
    if (game.settingsFrom === 'title') {
      game.state = STATE.TITLE_SCREEN;
      game.menuIndex = 0;
    } else {
      game.state = STATE.PAUSED;
      game.menuIndex = 0;
    }
    return;
  }

  // Escape also goes back
  if (key === 'Escape') {
    createCharacterSprites(settings.p1Character).then(frames => { p1SpriteFrames = frames; });
    createCharacterSprites(settings.p2Character).then(frames => { p2SpriteFrames = frames; });
    if (game.settingsFrom === 'title') {
      game.state = STATE.TITLE_SCREEN;
      game.menuIndex = 0;
    } else {
      game.state = STATE.PAUSED;
      game.menuIndex = 0;
    }
    return;
  }

  // Custom gravity text input
  if (itemName === 'customGravity') {
    if (key >= '0' && key <= '9' || key === '.') {
      let candidate = game.customGravityInput + key;
      // Prevent multiple dots
      if (key === '.' && game.customGravityInput.includes('.')) return;
      // Limit to 2 decimal places
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

  switch (itemName) {
    case 'inputMethod': {
      const options = ['classic', 'sliders'];
      const idx = options.indexOf(settings.inputMethod);
      const newIdx = (idx + dir + options.length) % options.length;
      settings.inputMethod = options[newIdx];
      break;
    }
    case 'rounds': {
      const options = [1, 3, 5, 10];
      const idx = options.indexOf(settings.rounds);
      const newIdx = (idx + dir + options.length) % options.length;
      settings.rounds = options[newIdx];
      break;
    }
    case 'gravityPreset': {
      const presetNames = GRAVITY_PRESETS.map(p => p.name).concat('Custom');
      const idx = presetNames.indexOf(settings.gravityPreset);
      const newIdx = (idx + dir + presetNames.length) % presetNames.length;
      settings.gravityPreset = presetNames[newIdx];
      game.customGravityInput = String(settings.customGravity);
      // Clamp settingsIndex if Custom row disappeared
      const newCount = getSettingsItemCount();
      if (game.settingsIndex >= newCount) {
        game.settingsIndex = newCount - 1;
      }
      clampSettingsScroll();
      break;
    }
    case 'player2Mode': {
      const options = ['human', 'ai_easy', 'ai_medium', 'ai_hard'];
      const idx = options.indexOf(settings.player2Mode);
      const newIdx = (idx + dir + options.length) % options.length;
      settings.player2Mode = options[newIdx];
      break;
    }
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
      const newIdx = (idx + dir + PROJECTILE_OPTIONS.length) % PROJECTILE_OPTIONS.length;
      settings.projectile = PROJECTILE_OPTIONS[newIdx];
      loadProjectileSprite(settings.projectile).then(img => { projectileSprite = img; });
      break;
    }
    case 'volume': {
      settings.volume = Math.round(Math.min(1, Math.max(0, settings.volume + dir * 0.1)) * 10) / 10;
      audio.setVolume(settings.volume);
      break;
    }
    default:
      return; // No cycling for back or customGravity
  }
  saveSettings(settings);
}

function handlePlayerInputKey(key) {
  const result = input.processInputKey(key);
  if (key >= '0' && key <= '9') audio.playKeystroke();
  if (key === 'Backspace') audio.playKeystroke();

  if (result.type === 'angle_confirmed') {
    game.confirmedAngle = result.angle;
    game.lastInputs[game.activePlayer].angle = result.angle;
    game.inputField = 'velocity';
    game.inputValue = '';
  } else if (result.type === 'back_to_angle') {
    // Restore confirmed angle as editable text
    input.state.value = game.confirmedAngle !== null ? String(game.confirmedAngle) : '';
    game.inputField = 'angle';
    game.inputValue = input.state.value;
    game.confirmedAngle = null;
  } else if (result.type === 'fire') {
    game.lastInputs[game.activePlayer].velocity = result.velocity;
    fireBanana(game.confirmedAngle, result.velocity);
  }

  game.inputField = input.state.field;
  game.inputValue = input.state.value;

  // Update aim preview angle while typing
  if (game.inputField === 'angle' && game.inputValue !== '') {
    const parsed = parseInt(game.inputValue, 10);
    game.aimPreviewAngle = isNaN(parsed) ? null : Math.max(0, Math.min(180, parsed));
  } else if (game.inputField !== 'angle') {
    game.aimPreviewAngle = null;
  }
}

function handleSliderInputKey(key) {
  if (key === 'Tab') {
    const order = ['angle', 'velocity'];
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

  // Left/Right switches focus between angle and velocity sliders
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    game.sliderFocus = game.sliderFocus === 'angle' ? 'velocity' : 'angle';
    return;
  }

  // Up/Down adjusts the focused slider value
  const sv = game.sliderValues[game.activePlayer];
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    const delta = key === 'ArrowUp' ? 1 : -1;
    if (game.sliderFocus === 'angle') {
      sv.angle = Math.max(0, Math.min(180, sv.angle + delta));
    } else if (game.sliderFocus === 'velocity') {
      sv.velocity = Math.max(1, Math.min(VELOCITY_MAX, sv.velocity + delta));
    }
  }
}

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

  if (game.state === STATE.TITLE_SCREEN) {
    const items = ['new_game', 'settings', 'fullscreen'];
    for (let i = 0; i < items.length; i++) {
      const itemY = 200 + i * 54;
      const w = 180;
      const h = MENU_BUTTON_MIN_H;
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
      const itemY = 170 + i * 52;
      const w = 200;
      const h = MENU_BUTTON_MIN_H;
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

  // Fire button click
  if (game.state === STATE.PLAYER_INPUT && settings.inputMethod === 'sliders' && !isAITurn()) {
    const geo = renderer.getSliderGeometry();
    const fb = geo.fire;
    if (cx >= fb.x && cx <= fb.x + fb.width && cy >= fb.y && cy <= fb.y + fb.height) {
      const sv = game.sliderValues[game.activePlayer];
      game.lastInputs[game.activePlayer].angle = sv.angle;
      game.lastInputs[game.activePlayer].velocity = sv.velocity;
      fireBanana(sv.angle, sv.velocity);
      return;
    }
  }

  // Pause button click (circular hit test)
  if (game.state === STATE.PLAYER_INPUT || game.state === STATE.PROJECTILE_FLIGHT) {
    const dx = cx - PAUSE_BUTTON_CX;
    const dy = cy - PAUSE_BUTTON_CY;
    if (dx * dx + dy * dy <= PAUSE_BUTTON_HIT_RADIUS * PAUSE_BUTTON_HIT_RADIUS) {
      enterPause();
      return;
    }
  }
}

function handleMouseDown(e) {
  const { x, y } = canvasCoords(e);
  game.touchStartPos = { x, y };

  if (game.state === STATE.PLAYER_INPUT && settings.inputMethod === 'sliders' && !isAITurn()) {
    const geo = renderer.getSliderGeometry();
    if (hitTestSlider(x, y, geo.angle)) {
      game.activeSliderDrag = 'angle';
      game.sliderFocus = 'angle';
      updateSliderFromX(x, geo.angle, 'angle');
    } else if (hitTestSlider(x, y, geo.velocity)) {
      game.activeSliderDrag = 'velocity';
      game.sliderFocus = 'velocity';
      updateSliderFromX(x, geo.velocity, 'velocity');
    }
  }
}

function handleMouseMove(e) {
  if (!game.activeSliderDrag) return;
  const { x } = canvasCoords(e);
  const geo = renderer.getSliderGeometry();
  updateSliderFromX(x, geo[game.activeSliderDrag], game.activeSliderDrag);
}

function handleMouseUp(e) {
  if (game.activeSliderDrag) {
    game.activeSliderDrag = null;
    return;
  }
  // Non-drag clicks are handled by the 'click' listener (handleClick)
}

function canvasCoords(touch) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;
  return {
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top) * scaleY,
  };
}

function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const { x, y } = canvasCoords(touch);
  game.touchStartPos = { x, y };

  // Slider interaction during PLAYER_INPUT — needs immediate response for dragging
  if (game.state === STATE.PLAYER_INPUT && settings.inputMethod === 'sliders' && !isAITurn()) {
    const geo = renderer.getSliderGeometry();

    if (hitTestSlider(x, y, geo.angle)) {
      game.activeSliderDrag = 'angle';
      game.sliderFocus = 'angle';
      updateSliderFromX(x, geo.angle, 'angle');
      return;
    }

    if (hitTestSlider(x, y, geo.velocity)) {
      game.activeSliderDrag = 'velocity';
      game.sliderFocus = 'velocity';
      updateSliderFromX(x, geo.velocity, 'velocity');
      return;
    }
  }
}

function handleTouchMove(e) {
  e.preventDefault();
  if (!game.activeSliderDrag) return;

  const touch = e.changedTouches[0];
  const { x } = canvasCoords(touch);
  const geo = renderer.getSliderGeometry();
  const slider = geo[game.activeSliderDrag];
  updateSliderFromX(x, slider, game.activeSliderDrag);
}

// handleTouchEnd handles all activation events: fire button, pause button, and menu items.
// This gives users the standard mobile UX of cancelling a tap by dragging away
// (if the finger moved more than 15px from the start, the tap is ignored).
function handleTouchEnd(e) {
  e.preventDefault();

  // If a slider was being dragged, just release it
  if (game.activeSliderDrag) {
    game.activeSliderDrag = null;
    return;
  }

  const touch = e.changedTouches[0];
  const { x, y } = canvasCoords(touch);

  // Cancel if finger moved too far from start (drag, not tap)
  if (game.touchStartPos) {
    const dx = x - game.touchStartPos.x;
    const dy = y - game.touchStartPos.y;
    if (dx * dx + dy * dy > 15 * 15) {
      game.touchStartPos = null;
      return;
    }
  }
  game.touchStartPos = null;

  // Pause button hit test (circular)
  if (game.state === STATE.PLAYER_INPUT || game.state === STATE.PROJECTILE_FLIGHT) {
    const dx = x - PAUSE_BUTTON_CX;
    const dy = y - PAUSE_BUTTON_CY;
    if (dx * dx + dy * dy <= PAUSE_BUTTON_HIT_RADIUS * PAUSE_BUTTON_HIT_RADIUS) {
      enterPause();
      return;
    }
  }

  // Fire button (touch-up activation)
  if (game.state === STATE.PLAYER_INPUT && settings.inputMethod === 'sliders' && !isAITurn()) {
    const geo = renderer.getSliderGeometry();
    const fb = geo.fire;
    if (x >= fb.x && x <= fb.x + fb.width && y >= fb.y && y <= fb.y + fb.height) {
      const sv = game.sliderValues[game.activePlayer];
      game.lastInputs[game.activePlayer].angle = sv.angle;
      game.lastInputs[game.activePlayer].velocity = sv.velocity;
      fireBanana(sv.angle, sv.velocity);
      return;
    }
  }

  // Menu/settings/game-over tap — forward to click handler
  // Note from review: handleClick receives both native clicks and forwarded touch events.
  // e.preventDefault() in touch handlers suppresses the synthetic click that mobile browsers
  // emit ~300ms later, so handleClick won't fire twice.
  handleClick(e);
}

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
  return game.sliderValues[game.activePlayer][slider.which];
}

function updateSliderFromX(x, slider, which) {
  const pct = Math.max(0, Math.min(1, (x - slider.x) / slider.width));
  const raw = slider.min + pct * (slider.max - slider.min);
  const value = Math.round(Math.max(slider.min, Math.min(slider.max, raw)));
  game.sliderValues[game.activePlayer][which] = value;
}

// --- Game flow ---
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

function startRound() {
  game.isNight = Math.random() < 0.5;
  game.wind = WIND_MIN + Math.random() * (WIND_MAX - WIND_MIN);
  game.wind = Math.round(game.wind * 10) / 10;

  const { buildings, gorillas } = generateCity(game.isNight);
  game.buildings = buildings;
  game.heightmap = initHeightmap(buildings);

  game.gorillas[0] = { ...gorillas[0], visible: true, frame: 0 };
  game.gorillas[1] = { ...gorillas[1], visible: true, frame: 0 };

  game.banana.active = false;
  game.explosions = [];
  game.particles = [];
  game.shotTrail = [];
  game.previousTrail = [];
  game.trailAlpha = 0;
  game.celestialSurprised = false;
  game.roundEndWinner = -1;
  game.lastInputs = [{ angle: null, velocity: null }, { angle: null, velocity: null }];
  game.sliderValues = [
    { angle: DEFAULT_ANGLE, velocity: DEFAULT_VELOCITY },
    { angle: DEFAULT_ANGLE, velocity: DEFAULT_VELOCITY },
  ];

  game.activePlayer = game.startingPlayer;
  game.startingPlayer = 1 - game.startingPlayer; // alternate next round

  game.buildingAnimProgress = 0;
  game.state = STATE.ROUND_START;
}

function fireBanana(angle, velocity) {
  const g = game.gorillas[game.activePlayer];
  const startY = g.y - GORILLA_FRAME_SIZE / 2; // launch from gorilla center
  game.banana = {
    ...createProjectile(g.x, startY, angle, velocity, game.activePlayer),
    rotation: 0,
    active: true,
    ownerIndex: game.activePlayer,
  };

  // Throw animation: P1 throws right (frame 2), P2 throws left (frame 1)
  game.gorillas[game.activePlayer].frame = game.activePlayer === 0 ? 2 : 1;

  game.shotTrail = [];
  audio.playLaunch();
  game.state = STATE.PROJECTILE_FLIGHT;
}

function enterPause() {
  game.pausedFromState = game.state;
  game.state = STATE.PAUSED;
  game.menuIndex = 0;
}

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

function isAITurn() {
  return game.activePlayer === 1 && settings.player2Mode !== 'human';
}

function handleAITurn(dt) {
  if (!isAITurn()) return;
  game.aiThinkTimer += dt;
  if (game.aiThinkTimer < 0.8) return; // thinking delay

  const difficulty = settings.player2Mode.replace('ai_', '');
  const gravitySim = getGravityValue(settings) * GRAVITY_SCALE;
  const shot = calculateAIShot(
    game.gorillas[0],     // target (P1)
    game.gorillas[1],     // AI gorilla (P2)
    game.wind,
    gravitySim,
    game.heightmap,
    difficulty,
    game.aiLastShot || null
  );

  const aiAngle = Math.round(shot.angle);
  const aiVelocity = Math.round(shot.velocity);
  game.lastInputs[1].angle = aiAngle;
  game.lastInputs[1].velocity = aiVelocity;
  game.confirmedAngle = aiAngle;
  fireBanana(aiAngle, aiVelocity);
  game.aiLastShot = { angle: aiAngle, velocity: aiVelocity, missDirection: 0 };
  game.aiThinkTimer = 0;
}

// --- Render ---
function render(alpha) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  switch (game.state) {
    case STATE.TITLE_SCREEN:
      renderer.drawTitleScreen(game.menuIndex);
      break;

    case STATE.ROUND_START:
      renderer.drawSky(game.isNight);
      renderer.drawSunMoon(game.isNight, game.celestialSurprised);
      renderer.drawBuildingRise(game.buildings, game.buildingAnimProgress);
      break;

    case STATE.PLAYER_INPUT:
    case STATE.PROJECTILE_FLIGHT:
    case STATE.IMPACT:
    case STATE.ROUND_END:
      drawGameScene(alpha);
      if (game.state === STATE.ROUND_END && game.roundEndDelay <= 0) {
        renderer.drawRoundEnd(game.roundEndWinner, game.scores);
      }
      break;

    case STATE.GAME_OVER:
      drawGameScene(alpha);
      renderer.drawGameOver(game.scores);
      break;

    case STATE.PAUSED:
      drawGameScene(alpha);
      renderer.drawPauseMenu(game.menuIndex);
      break;

    case STATE.SETTINGS:
      renderer.drawSettingsMenu(settings, game.settingsIndex,
        settings.gravityPreset === 'Custom', game.customGravityInput,
        game.settingsScrollOffset,
        game.p1CharacterPreviewSprite, game.p2CharacterPreviewSprite, projectileSprite);
      break;
  }
}

function drawGameScene(alpha) {
  renderer.drawSky(game.isNight);

  if (settings.inputMethod === 'sliders') {
    renderer.drawSliderHUD(game.activePlayer, game.scores, game.round, game.totalRounds, game.wind);
  } else {
    renderer.drawWindIndicator(game.wind);
  }

  renderer.drawBuildingsFromHeightmap(game.buildings, game.heightmap);

  for (let i = 0; i < 2; i++) {
    const frames = i === 0 ? p1SpriteFrames : p2SpriteFrames;
    renderer.drawGorilla(game.gorillas[i], frames, game.gorillas[i].frame);
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

  renderer.drawProjectile(game.banana, alpha, projectileSprite);
  renderer.drawSunMoon(game.isNight, game.celestialSurprised);

  if (game.banana.active && game.banana.y < 0) {
    renderer.drawBananaTracker(game.banana.x, settings.projectile.toUpperCase());
  }

  for (const e of game.explosions) renderer.drawExplosion(e);
  renderer.drawParticles(game.particles);

  if (settings.inputMethod === 'sliders') {
    // Draw input bar during PLAYER_INPUT
    if (game.state === STATE.PLAYER_INPUT) {
      const sv = game.sliderValues[game.activePlayer];
      renderer.drawInputBar(game.activePlayer, sv.angle, sv.velocity, isAITurn(), game.sliderFocus);
    }
  } else {
    renderer.drawHUD(
      game.activePlayer, game.inputField, game.inputValue,
      game.lastInputs, game.scores, game.blinkOn,
      game.round, game.totalRounds
    );
  }

  // Pause button — in slider mode it's part of the input bar (lower-left),
  // so only show during PLAYER_INPUT when the bar is visible.
  // During PROJECTILE_FLIGHT, Escape key still works.
  if (game.state === STATE.PLAYER_INPUT) {
    renderer.drawPauseButton();
  }
}

// --- Boot ---
init();
