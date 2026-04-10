// gorilla-wars/js/constants.js

// Canvas
export const CANVAS_WIDTH = 640;
export const CANVAS_HEIGHT = 400;

// Physics timing
export const DT = 1 / 60;

// Physics tuning — converts displayed values to px/s or px/s²
export const VELOCITY_SCALE = 5.0;
export const GRAVITY_SCALE = 20.0;
export const WIND_SCALE = 4.0;

// Buildings
export const BUILDING_COUNT_MIN = 11;
export const BUILDING_COUNT_MAX = 12;
export const BUILDING_MIN_WIDTH = 50;
export const BUILDING_MAX_WIDTH = 62;
export const BUILDING_MIN_HEIGHT = 120;
export const BUILDING_MAX_HEIGHT = 230;
export const BUILDING_GAP = 2;

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

// Slider input defaults
export const VELOCITY_MAX = 250;
export const DEFAULT_ANGLE = 45;
export const DEFAULT_VELOCITY = 50;

// Bottom bar dimensions (canvas logical coordinates)
export const INPUT_BAR_HEIGHT = 48;
export const INPUT_BAR_Y = CANVAS_HEIGHT - INPUT_BAR_HEIGHT;

// Touch target sizes (canvas logical coordinates)
// Apple HIG minimum: 44pt touch targets
export const SLIDER_THUMB_RADIUS = 10;
export const SLIDER_THUMB_HIT_RADIUS = 22;
export const FIRE_BUTTON_WIDTH = 88;
export const FIRE_BUTTON_HEIGHT = 44;
export const MENU_BUTTON_MIN_H = 44;

// Settings arrow buttons — visual 28px constrained by row height,
// but touch hit area expanded to 44x44 (centered on arrow)
export const SETTINGS_ROW_H = 28;
export const SETTINGS_ROW_GAP = 4;
export const SETTINGS_ARROW_W = 28;
export const SETTINGS_ARROW_HIT = 44;

// Pause button (circular, lower-left of input bar)
export const PAUSE_BUTTON_RADIUS = 14;
export const PAUSE_BUTTON_CX = 22;
export const PAUSE_BUTTON_CY = INPUT_BAR_Y + INPUT_BAR_HEIGHT / 2;
export const PAUSE_BUTTON_HIT_RADIUS = 22;

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
  SETTINGS: 'SETTINGS',
};
