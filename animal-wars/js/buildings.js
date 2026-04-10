import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  BUILDING_COUNT_MIN, BUILDING_COUNT_MAX,
  BUILDING_MIN_WIDTH, BUILDING_MAX_WIDTH,
  BUILDING_MIN_HEIGHT, BUILDING_MAX_HEIGHT,
  BUILDING_GAP,
  WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_GUTTER,
  GORILLA_PLACEMENT_RANGE, GORILLA_FRAME_SIZE,
  EGA_BUILDING_COLORS, SKY_DAY_COLOR, SKY_NIGHT_COLOR,
} from './constants.js';

export function generateCity(isNight) {
  const count = BUILDING_COUNT_MIN + Math.floor(Math.random() * (BUILDING_COUNT_MAX - BUILDING_COUNT_MIN + 1));
  const widths = distributeWidths(count);
  const skyColor = isNight ? SKY_NIGHT_COLOR : SKY_DAY_COLOR;
  const validColors = EGA_BUILDING_COLORS.filter(c => c !== skyColor);

  const buildings = [];
  let x = 0;
  for (let i = 0; i < count; i++) {
    const width = widths[i];
    const height = BUILDING_MIN_HEIGHT + Math.floor(Math.random() * (BUILDING_MAX_HEIGHT - BUILDING_MIN_HEIGHT + 1));
    const y = CANVAS_HEIGHT - height;
    const color = validColors[Math.floor(Math.random() * validColors.length)];
    const windows = generateWindows(x, y, width, height);
    buildings.push({ x, y, width, height, color, windows });
    x += width + BUILDING_GAP;
  }

  const p1Idx = Math.floor(Math.random() * GORILLA_PLACEMENT_RANGE);
  const p2Idx = count - 1 - Math.floor(Math.random() * GORILLA_PLACEMENT_RANGE);
  const gorillas = [
    placeGorilla(buildings[p1Idx], p1Idx),
    placeGorilla(buildings[p2Idx], p2Idx),
  ];

  return { buildings, gorillas };
}

function distributeWidths(count) {
  const totalGap = (count - 1) * BUILDING_GAP;
  const widths = new Array(count).fill(BUILDING_MIN_WIDTH);
  let remaining = CANVAS_WIDTH - totalGap - BUILDING_MIN_WIDTH * count;
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  let idx = 0;
  while (remaining > 0) {
    const i = indices[idx % count];
    if (widths[i] < BUILDING_MAX_WIDTH) { widths[i]++; remaining--; }
    idx++;
  }
  return widths;
}

function generateWindows(bx, by, bw, bh) {
  const cols = Math.floor((bw - WINDOW_GUTTER) / (WINDOW_WIDTH + WINDOW_GUTTER));
  const rows = Math.floor((bh - WINDOW_GUTTER) / (WINDOW_HEIGHT + WINDOW_GUTTER));
  const totalWindowW = cols * (WINDOW_WIDTH + WINDOW_GUTTER) - WINDOW_GUTTER;
  const startX = bx + Math.floor((bw - totalWindowW) / 2);
  const windows = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      windows.push({
        x: startX + c * (WINDOW_WIDTH + WINDOW_GUTTER),
        y: by + WINDOW_GUTTER + r * (WINDOW_HEIGHT + WINDOW_GUTTER),
        lit: Math.random() < 0.5,
      });
    }
  }
  return windows;
}

function placeGorilla(building, buildingIndex) {
  return {
    x: building.x + Math.floor(building.width / 2),
    y: building.y,
    buildingIndex,
  };
}

export function initHeightmap(buildings) {
  const hm = new Float64Array(CANVAS_WIDTH);
  hm.fill(CANVAS_HEIGHT);
  for (const b of buildings) {
    for (let x = b.x; x < b.x + b.width; x++) {
      hm[x] = b.y;
    }
  }
  return hm;
}

export function carveExplosion(heightmap, cx, cy, radius) {
  const left = Math.max(0, Math.floor(cx - radius));
  const right = Math.min(CANVAS_WIDTH - 1, Math.ceil(cx + radius));
  for (let x = left; x <= right; x++) {
    const dx = x - cx;
    const rSq = radius * radius - dx * dx;
    if (rSq < 0) continue;
    const craterBottom = Math.ceil(cy + Math.sqrt(rSq));
    if (heightmap[x] < craterBottom) {
      heightmap[x] = craterBottom;
    }
  }
}
