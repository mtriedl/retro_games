import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

// Mock localStorage for Node.js
globalThis.localStorage = {
  _data: {},
  getItem(key) { return this._data[key] ?? null; },
  setItem(key, value) { this._data[key] = String(value); },
  removeItem(key) { delete this._data[key]; },
  clear() { this._data = {}; },
};

const { DEFAULT_SETTINGS, loadSettings, saveSettings, getGravityValue } = await import('../js/settings.js');

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('DEFAULT_SETTINGS has correct defaults', () => {
    assert.equal(DEFAULT_SETTINGS.rounds, 3);
    assert.equal(DEFAULT_SETTINGS.gravityPreset, 'Earth');
    assert.equal(DEFAULT_SETTINGS.customGravity, 9.8);
    assert.equal(DEFAULT_SETTINGS.player2Mode, 'human');
    assert.equal(DEFAULT_SETTINGS.shotTrail, true);
    assert.equal(DEFAULT_SETTINGS.aimPreview, false);
    assert.equal(DEFAULT_SETTINGS.volume, 0.5);
  });

  it('DEFAULT_SETTINGS includes p1Character and p2Character as Gorilla', () => {
    assert.equal(DEFAULT_SETTINGS.p1Character, 'Gorilla');
    assert.equal(DEFAULT_SETTINGS.p2Character, 'Gorilla');
    assert.equal(DEFAULT_SETTINGS.character, undefined);
  });

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

  it('loadSettings returns defaults when localStorage is empty', () => {
    const s = loadSettings();
    assert.deepEqual(s, DEFAULT_SETTINGS);
  });

  it('saveSettings persists and loadSettings retrieves', () => {
    const custom = { ...DEFAULT_SETTINGS, rounds: 10, volume: 0.8 };
    saveSettings(custom);
    const loaded = loadSettings();
    assert.equal(loaded.rounds, 10);
    assert.equal(loaded.volume, 0.8);
  });

  it('getGravityValue returns preset value for named presets', () => {
    const s = { ...DEFAULT_SETTINGS, gravityPreset: 'Moon' };
    assert.equal(getGravityValue(s), 1.62);
  });

  it('getGravityValue returns custom value for Custom preset', () => {
    const s = { ...DEFAULT_SETTINGS, gravityPreset: 'Custom', customGravity: 5.5 };
    assert.equal(getGravityValue(s), 5.5);
  });

  it('getGravityValue clamps custom gravity to minimum 0.1', () => {
    const s = { ...DEFAULT_SETTINGS, gravityPreset: 'Custom', customGravity: 0.0 };
    assert.equal(getGravityValue(s), 0.1);
  });

  it('DEFAULT_SETTINGS includes inputMethod as classic', () => {
    assert.equal(DEFAULT_SETTINGS.inputMethod, 'classic');
  });

  it('loadSettings defaults inputMethod to classic when no ontouchstart', () => {
    globalThis.ontouchstart = undefined;
    delete globalThis.ontouchstart;
    const s = loadSettings();
    assert.equal(s.inputMethod, 'classic');
  });

  it('loadSettings defaults inputMethod to sliders on touch devices', () => {
    globalThis.ontouchstart = null; // simulates touch device
    localStorage.clear();
    const freshLoad = loadSettings();
    assert.equal(freshLoad.inputMethod, 'sliders');
    delete globalThis.ontouchstart;
  });

  it('loadSettings preserves stored inputMethod over auto-detection', () => {
    globalThis.ontouchstart = null;
    saveSettings({ ...DEFAULT_SETTINGS, inputMethod: 'classic' });
    const s = loadSettings();
    assert.equal(s.inputMethod, 'classic');
    delete globalThis.ontouchstart;
  });
});
