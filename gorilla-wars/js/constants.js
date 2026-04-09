// gorilla-wars/js/constants.js

// Canvas
export const CANVAS_WIDTH = 640;
export const CANVAS_HEIGHT = 400;

// Physics timing
export const DT = 1 / 60;

// Physics tuning — converts displayed values to px/s or px/s²
export const VELOCITY_SCALE = 2.5;
export const GRAVITY_SCALE = 50.0;
export const WIND_SCALE = 4.0;

// Buildings
export const BUILDING_COUNT_MIN = 11;
export const BUILDING_COUNT_MAX = 12;
export const BUILDING_MIN_WIDTH = 52;
export const BUILDING_MAX_WIDTH = 62;
export const BUILDING_MIN_HEIGHT = 120;
export const BUILDING_MAX_HEIGHT = 230;

// Windows
export const WINDOW_WIDTH = 8;
export const WINDOW_HEIGHT = 10;
export const WINDOW_GUTTER = 4;

// Gorilla
export const GORILLA_FRAME_SIZE = 32;
export const GORILLA_COLLISION_WIDTH = 24;
export const GORILLA_COLLISION_HEIGHT = 28;
export const GORILLA_PLACEMENT_RANGE = 4;

// Banana
export const BANANA_RADIUS = 4;

// Explosions
export const EXPLOSION_BUILDING_RADIUS = 15;
export const EXPLOSION_GORILLA_RADIUS = 55;

// Wind
export const WIND_MIN = -15;
export const WIND_MAX = 15;

// Colors
export const SKY_DAY_COLOR = '#0000AA';
export const SKY_NIGHT_COLOR = '#000033';
export const WINDOW_LIT_COLOR = '#FFFF55';
export const WINDOW_UNLIT_COLOR = '#555555';
export const BANANA_COLOR = '#FFFF00';
export const BANANA_TIP_COLOR = '#AA5500';

export const EGA_BUILDING_COLORS = [
  '#AA0000', '#0000AA', '#00AA00', '#00AAAA',
  '#AA00AA', '#AA5500', '#AAAAAA', '#5555FF',
];

// Gravity presets
export const GRAVITY_PRESETS = [
  { name: 'Mercury', gravity: 3.7 },
  { name: 'Venus', gravity: 8.87 },
  { name: 'Earth', gravity: 9.8 },
  { name: 'Moon', gravity: 1.62 },
  { name: 'Mars', gravity: 3.72 },
  { name: 'Jupiter', gravity: 24.79 },
  { name: 'Saturn', gravity: 10.44 },
  { name: 'Uranus', gravity: 8.87 },
  { name: 'Neptune', gravity: 11.15 },
  { name: 'Pluto', gravity: 0.62 },
  { name: 'Titan', gravity: 1.35 },
  { name: 'Europa', gravity: 1.31 },
  { name: 'Io', gravity: 1.80 },
];

export const DEFAULT_GRAVITY_PRESET = 'Earth';
export const CUSTOM_GRAVITY_MIN = 0.1;

// AI difficulty
export const AI_DIFFICULTY = {
  easy: { angleError: 15, velocityError: 0.20 },
  medium: { angleError: 8, velocityError: 0.10 },
  hard: { angleError: 3, velocityError: 0.05 },
};

// Game states
export const STATE = {
  TITLE_SCREEN: 'TITLE_SCREEN',
  ROUND_START: 'ROUND_START',
  PLAYER_INPUT: 'PLAYER_INPUT',
  PROJECTILE_FLIGHT: 'PROJECTILE_FLIGHT',
  IMPACT: 'IMPACT',
  ROUND_END: 'ROUND_END',
  GAME_OVER: 'GAME_OVER',
  PAUSED: 'PAUSED',
};
