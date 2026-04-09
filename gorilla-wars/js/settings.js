import { GRAVITY_PRESETS, DEFAULT_GRAVITY_PRESET, CUSTOM_GRAVITY_MIN } from './constants.js';

const STORAGE_KEY = 'gorilla-wars-settings';

export const DEFAULT_SETTINGS = {
  rounds: 3,
  gravityPreset: DEFAULT_GRAVITY_PRESET,
  customGravity: 9.8,
  player2Mode: 'human',
  shotTrail: true,
  aimPreview: false,
  volume: 0.5,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
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
