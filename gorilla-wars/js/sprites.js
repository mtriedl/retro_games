import { GORILLA_FRAME_SIZE } from './constants.js';

const S = GORILLA_FRAME_SIZE; // 32

export async function createGorillaSprites() {
  return [
    drawGorillaIdle(),
    drawGorillaThrowLeft(),
    drawGorillaThrowRight(),
    drawGorillaVictory(),
  ];
}

function createFrame() {
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  return c;
}

function drawBody(ctx) {
  ctx.fillStyle = '#8B4513';
  // Head (flat top, brow ridge)
  ctx.fillRect(10, 4, 12, 3);
  ctx.fillRect(9, 7, 14, 3);
  // Eyes (transparent)
  ctx.clearRect(12, 7, 2, 2);
  ctx.clearRect(18, 7, 2, 2);
  ctx.fillStyle = '#8B4513';
  // Chest/torso
  ctx.fillRect(8, 10, 16, 4);
  ctx.fillRect(10, 14, 12, 5);
  // V-chest detail (transparent)
  ctx.clearRect(14, 11, 1, 3);
  ctx.clearRect(17, 11, 1, 3);
  ctx.clearRect(15, 13, 2, 1);
  // Legs
  ctx.fillRect(10, 19, 5, 9);
  ctx.fillRect(17, 19, 5, 9);
}

function drawGorillaIdle() {
  const c = createFrame();
  const ctx = c.getContext('2d');
  drawBody(ctx);
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(4, 11, 4, 8);  // left arm
  ctx.fillRect(24, 11, 4, 8); // right arm
  return c;
}

function drawGorillaThrowLeft() {
  const c = createFrame();
  const ctx = c.getContext('2d');
  drawBody(ctx);
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(6, 1, 4, 10);  // left arm up
  ctx.fillRect(24, 11, 4, 8); // right arm at side
  return c;
}

function drawGorillaThrowRight() {
  const c = createFrame();
  const ctx = c.getContext('2d');
  drawBody(ctx);
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(4, 11, 4, 8);  // left arm at side
  ctx.fillRect(22, 1, 4, 10); // right arm up
  return c;
}

function drawGorillaVictory() {
  const c = createFrame();
  const ctx = c.getContext('2d');
  drawBody(ctx);
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(6, 1, 4, 10);  // left arm up
  ctx.fillRect(22, 1, 4, 10); // right arm up
  return c;
}
