import {
  CANVAS_WIDTH, CANVAS_HEIGHT, VELOCITY_SCALE,
  GORILLA_COLLISION_WIDTH, GORILLA_COLLISION_HEIGHT,
  BANANA_RADIUS,
} from './constants.js';

export function createProjectile(startX, startY, localAngle, displayedVelocity, playerIndex) {
  const worldAngleDeg = playerIndex === 0 ? localAngle : 180 - localAngle;
  const worldAngleRad = worldAngleDeg * Math.PI / 180;
  const speed = displayedVelocity * VELOCITY_SCALE;
  const vx = speed * Math.cos(worldAngleRad);
  const vy = -speed * Math.sin(worldAngleRad);
  return { x: startX, y: startY, vx, vy, prevX: startX, prevY: startY, rotation: 0, active: true };
}

export function stepSimulation(p, gravitySim, windSim, dt) {
  p.prevX = p.x;
  p.prevY = p.y;
  p.x += p.vx * dt + 0.5 * windSim * dt * dt;
  p.y += p.vy * dt + 0.5 * gravitySim * dt * dt;
  p.vx += windSim * dt;
  p.vy += gravitySim * dt;
  p.rotation += 5 * dt;
}

export function checkCollisions(banana, heightmap, gorillas, celestialBounds, ignoreIndex = -1) {
  const { x, y, radius } = banana;
  const col = Math.floor(x);

  // 1. Screen bounds
  if (x < 0 || x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT) return { type: 'miss', x, y };
  if (y < -radius) return { type: 'tracker', x, y };

  if (col >= 0 && col < CANVAS_WIDTH) {
    // 2. Gorilla hitboxes (before terrain — gorilla takes priority)
    for (let i = 0; i < gorillas.length; i++) {
      if (i === ignoreIndex) continue;
      const g = gorillas[i];
      if (!g.visible) continue;
      const boxLeft = g.x - GORILLA_COLLISION_WIDTH / 2;
      const boxRight = g.x + GORILLA_COLLISION_WIDTH / 2;
      const boxTop = g.y - GORILLA_COLLISION_HEIGHT;
      const boxBottom = g.y;
      if (circleVsAABB(x, y, radius, boxLeft, boxTop, boxRight, boxBottom)) {
        return { type: 'gorilla', x, y, gorillaIndex: i };
      }
    }

    // 3. Terrain heightmap
    if (y + radius >= heightmap[col]) return { type: 'building', x, y };
  }

  // 4. Sun/Moon (cosmetic)
  if (celestialBounds) {
    const dx = x - celestialBounds.x;
    const dy = y - celestialBounds.y;
    if (Math.sqrt(dx * dx + dy * dy) < radius + celestialBounds.radius) {
      return { type: 'sunmoon', x, y };
    }
  }

  return { type: 'none', x, y };
}

function circleVsAABB(cx, cy, cr, left, top, right, bottom) {
  const closestX = Math.max(left, Math.min(cx, right));
  const closestY = Math.max(top, Math.min(cy, bottom));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) <= (cr * cr);
}
