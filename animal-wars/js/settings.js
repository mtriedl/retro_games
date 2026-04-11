import { GRAVITY_PRESETS, DEFAULT_GRAVITY_PRESET, CUSTOM_GRAVITY_MIN } from './constants.js';

const STORAGE_KEY = 'animal-wars-settings';

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

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = { ...DEFAULT_SETTINGS };
    const stored = raw ? JSON.parse(raw) : null;
    if (stored) {
      Object.assign(base, stored);
    }
    // Migrate legacy single-character setting (guard each field independently)
    if (stored && stored.character) {
      if (!stored.p1Character) base.p1Character = stored.character;
      if (!stored.p2Character) base.p2Character = stored.character;
    }
    delete base.character;
    // Auto-detect input method if no stored preference
    if (!stored || !stored.hasOwnProperty('inputMethod')) {
      base.inputMethod = ('ontouchstart' in globalThis) ? 'sliders' : 'classic';
    }
    return base;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getGravityValue(settings) {
  if (settings.gravityPreset === 'Custom') {
    return Math.max(CUSTOM_GRAVITY_MIN, settings.customGravity);
  }
  const preset = GRAVITY_PRESETS.find(p => p.name === settings.gravityPreset);
  return preset ? preset.gravity : 9.8;
}
