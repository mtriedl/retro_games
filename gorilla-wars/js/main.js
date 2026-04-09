// gorilla-wars/js/main.js
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, DT, STATE,
  VELOCITY_SCALE, GRAVITY_SCALE, WIND_SCALE,
  WIND_MIN, WIND_MAX,
  EXPLOSION_BUILDING_RADIUS, EXPLOSION_GORILLA_RADIUS,
  GORILLA_FRAME_SIZE, BANANA_RADIUS,
  GRAVITY_PRESETS,
} from './constants.js';
import { loadSettings, saveSettings, getGravityValue } from './settings.js';
import { generateCity, initHeightmap, carveExplosion } from './buildings.js';
import { createProjectile, stepSimulation, checkCollisions } from './physics.js';
import { createInputHandler } from './input.js';
import { createGorillaSprites } from './sprites.js';
import { createAudioEngine } from './audio.js';
import { createRenderer } from './renderer.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// --- Module instances ---
const renderer = createRenderer(ctx);
const input = createInputHandler();
const audio = createAudioEngine();
let spriteFrames = [];
let settings = loadSettings();

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
  customGravityInput: '',
  buildingAnimProgress: 0,
  roundEndTimer: 0,
  roundEndWinner: -1,
  aiThinkTimer: 0,
  blinkTimer: 0,
  blinkOn: true,
};

// --- Init ---
async function init() {
  spriteFrames = await createGorillaSprites();
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

  // Mouse handler for menus
  canvas.addEventListener('click', handleClick);

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

    case STATE.ROUND_END:
      game.roundEndTimer -= dt;
      if (game.roundEndTimer <= 0) {
        game.round++;
        if (game.round >= game.totalRounds) {
          game.state = STATE.GAME_OVER;
        } else {
          startRound();
        }
      }
      break;
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
    game.trailAlpha -= dt * 0.5;
    if (game.trailAlpha < 0) game.trailAlpha = 0;
  }
}

function updateProjectile(dt) {
  const gravitySim = getGravityValue(settings) * GRAVITY_SCALE;
  const windSim = game.wind * WIND_SCALE;

  stepSimulation(game.banana, gravitySim, windSim, dt);

  // Record trail
  game.shotTrail.push({ x: game.banana.x, y: game.banana.y });

  // Check collisions
  const result = checkCollisions(
    { x: game.banana.x, y: game.banana.y, radius: BANANA_RADIUS },
    game.heightmap,
    game.gorillas,
    renderer.getCelestialBounds()
  );

  switch (result.type) {
    case 'miss':
      game.banana.active = false;
      audio.playMiss();
      game.previousTrail = [...game.shotTrail];
      game.trailAlpha = 1;
      game.shotTrail = [];
      game.activePlayer = 1 - game.activePlayer;
      game.state = STATE.PLAYER_INPUT;
      resetInput();
      break;

    case 'building':
      game.banana.active = false;
      audio.playBuildingHit();
      spawnExplosion(result.x, result.y, EXPLOSION_BUILDING_RADIUS);
      carveExplosion(game.heightmap, result.x, result.y, EXPLOSION_BUILDING_RADIUS);
      game.previousTrail = [...game.shotTrail];
      game.trailAlpha = 1;
      game.shotTrail = [];
      game.state = STATE.IMPACT;
      break;

    case 'gorilla':
      game.banana.active = false;
      audio.playGorillaHit();
      game.gorillas[result.gorillaIndex].visible = false;
      spawnExplosion(result.x, result.y, EXPLOSION_GORILLA_RADIUS);
      carveExplosion(game.heightmap, result.x, result.y, EXPLOSION_GORILLA_RADIUS);
      game.previousTrail = [...game.shotTrail];
      game.trailAlpha = 1;
      game.shotTrail = [];
      game.roundEndWinner = game.activePlayer;
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
      // Show victory animation
      const winnerGorilla = game.gorillas[game.roundEndWinner];
      winnerGorilla.frame = 3; // victory
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
      handlePlayerInputKey(key);
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
      game.customGravityInput = String(settings.customGravity);
      game.previousState = game.state;
      game.state = STATE.SETTINGS;
      break;
    case 'fullscreen':
      canvas.requestFullscreen?.();
      break;
  }
}

function handlePauseAction(action) {
  switch (action) {
    case 'resume':
      game.state = game.previousState;
      break;
    case 'restart':
      startRound();
      break;
    case 'settings':
      game.settingsFrom = 'pause';
      game.settingsIndex = 0;
      game.customGravityInput = String(settings.customGravity);
      game.previousState = game.state;
      game.state = STATE.SETTINGS;
      break;
    case 'quit':
      game.state = STATE.TITLE_SCREEN;
      game.menuIndex = 0;
      break;
  }
}

function getSettingsItemCount() {
  return settings.gravityPreset === 'Custom' ? 8 : 7;
}

function getSettingsItemName(index) {
  const isCustom = settings.gravityPreset === 'Custom';
  const items = [
    'rounds',
    'gravityPreset',
    ...(isCustom ? ['customGravity'] : []),
    'player2Mode',
    'shotTrail',
    'aimPreview',
    'volume',
    'back',
  ];
  return items[index] || null;
}

function handleSettingsKey(key) {
  const itemCount = getSettingsItemCount();
  const itemName = getSettingsItemName(game.settingsIndex);

  if (key === 'ArrowUp') {
    game.settingsIndex = (game.settingsIndex - 1 + itemCount) % itemCount;
    audio.playMenuSelect();
    return;
  }
  if (key === 'ArrowDown') {
    game.settingsIndex = (game.settingsIndex + 1) % itemCount;
    audio.playMenuSelect();
    return;
  }

  // Enter on Back
  if (key === 'Enter' && itemName === 'back') {
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
      break;
    }
    case 'player2Mode': {
      const options = ['human', 'ai_easy', 'ai_medium', 'ai_hard'];
      const idx = options.indexOf(settings.player2Mode);
      const newIdx = (idx + dir + options.length) % options.length;
      settings.player2Mode = options[newIdx];
      break;
    }
    case 'shotTrail':
      settings.shotTrail = !settings.shotTrail;
      break;
    case 'aimPreview':
      settings.aimPreview = !settings.aimPreview;
      break;
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
  } else if (result.type === 'fire') {
    game.lastInputs[game.activePlayer].velocity = result.velocity;
    fireBanana(game.confirmedAngle, result.velocity);
  }

  game.inputField = input.state.field;
  game.inputValue = input.state.value;
}

function handleClick(e) {
  // Convert click coords to canvas space
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;
  const cx = (e.clientX - rect.left) * scaleX;
  const cy = (e.clientY - rect.top) * scaleY;

  // Menu item click detection
  if (game.state === STATE.TITLE_SCREEN) {
    const items = ['new_game', 'settings', 'fullscreen'];
    for (let i = 0; i < items.length; i++) {
      const itemY = 200 + i * 30;
      if (cy >= itemY - 12 && cy <= itemY + 4 && cx >= CANVAS_WIDTH / 2 - 80 && cx <= CANVAS_WIDTH / 2 + 80) {
        game.menuIndex = i;
        handleTitleAction(items[i]);
        break;
      }
    }
  } else if (game.state === STATE.PAUSED) {
    const items = ['resume', 'restart', 'settings', 'quit'];
    for (let i = 0; i < items.length; i++) {
      const itemY = 180 + i * 28;
      if (cy >= itemY - 12 && cy <= itemY + 4 && cx >= CANVAS_WIDTH / 2 - 80 && cx <= CANVAS_WIDTH / 2 + 80) {
        game.menuIndex = i;
        handlePauseAction(items[i]);
        break;
      }
    }
  }
}

// --- Game flow ---
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
  };

  // Throw animation: P1 throws right (frame 2), P2 throws left (frame 1)
  game.gorillas[game.activePlayer].frame = game.activePlayer === 0 ? 2 : 1;

  game.shotTrail = [];
  audio.playLaunch();
  game.state = STATE.PROJECTILE_FLIGHT;
}

function enterPause() {
  game.previousState = game.state;
  game.state = STATE.PAUSED;
  game.menuIndex = 0;
}

function resetInput() {
  input.resetInput();
  game.inputField = 'angle';
  game.inputValue = '';
  game.confirmedAngle = null;
  // Reset gorilla frame to idle
  game.gorillas[game.activePlayer].frame = 0;
}

function isAITurn() {
  return game.activePlayer === 1 && settings.player2Mode !== 'human';
}

function handleAITurn(dt) {
  if (!isAITurn()) return;
  // AI delay handled in Task 12
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
      if (game.state === STATE.ROUND_END) {
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
        settings.gravityPreset === 'Custom', game.customGravityInput);
      break;
  }
}

function drawGameScene(alpha) {
  renderer.drawSky(game.isNight);
  renderer.drawSunMoon(game.isNight, game.celestialSurprised);
  renderer.drawWindIndicator(game.wind);
  renderer.drawBuildingsFromHeightmap(game.buildings, game.heightmap);

  for (let i = 0; i < 2; i++) {
    renderer.drawGorilla(game.gorillas[i], spriteFrames, game.gorillas[i].frame);
  }

  // Shot trail (previous)
  if (game.trailAlpha > 0 && settings.shotTrail) {
    renderer.drawShotTrail(game.previousTrail, game.trailAlpha);
  }

  // Aim preview
  if (game.state === STATE.PLAYER_INPUT && settings.aimPreview && game.confirmedAngle !== null) {
    renderer.drawAimPreview(game.gorillas[game.activePlayer], game.confirmedAngle, game.activePlayer);
  }

  renderer.drawBanana(game.banana, alpha);

  // Banana tracker when above viewport
  if (game.banana.active && game.banana.y < 0) {
    renderer.drawBananaTracker(game.banana.x);
  }

  for (const e of game.explosions) renderer.drawExplosion(e);
  renderer.drawParticles(game.particles);

  renderer.drawHUD(
    game.activePlayer, game.inputField, game.inputValue,
    game.lastInputs, game.scores, game.blinkOn
  );
}

// --- Boot ---
init();
