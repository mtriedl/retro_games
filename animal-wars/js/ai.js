// animal-wars/js/ai.js
// AI opponent using coarse-to-fine simulation search

import {
  CANVAS_WIDTH, CANVAS_HEIGHT, DT, VELOCITY_SCALE, WIND_SCALE,
  BANANA_RADIUS, GORILLA_COLLISION_WIDTH, GORILLA_COLLISION_HEIGHT,
  AI_DIFFICULTY,
} from './constants.js';

/**
 * Simulate a shot and return the closest distance to the target gorilla.
 * Uses the same Euler integration as the real game physics.
 * The AI fires as Player 2 (playerIndex=1).
 */
function simulateShot(aiGorilla, localAngle, velocity, wind, gravity, heightmap) {
  // Player 2: worldAngle = 180 - localAngle
  const worldAngleDeg = 180 - localAngle;
  const worldAngleRad = worldAngleDeg * Math.PI / 180;
  const speed = velocity * VELOCITY_SCALE;

  let x = aiGorilla.x;
  let y = aiGorilla.y - 16; // launch from gorilla center (GORILLA_FRAME_SIZE / 2)
  let vx = speed * Math.cos(worldAngleRad);
  let vy = -speed * Math.sin(worldAngleRad);

  const windSim = wind * WIND_SCALE;
  const maxSteps = 2000; // safety limit

  for (let step = 0; step < maxSteps; step++) {
    // Euler integration (matches stepSimulation in physics.js)
    x += vx * DT + 0.5 * windSim * DT * DT;
    y += vy * DT + 0.5 * gravity * DT * DT;
    vx += windSim * DT;
    vy += gravity * DT;

    // Off screen horizontally or below ground level
    if (x < 0 || x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT) {
      return { distance: Infinity, impactX: x };
    }

    // Skip collision checks if above canvas
    if (y < -BANANA_RADIUS) continue;

    const col = Math.floor(x);
    if (col >= 0 && col < CANVAS_WIDTH) {
      // Hit terrain
      if (y + BANANA_RADIUS >= heightmap[col]) {
        return { distance: Infinity, impactX: x };
      }
    }
  }

  return { distance: Infinity, impactX: 0 };
}

/**
 * Calculate distance from a point to the target gorilla's collision box center.
 */
function distanceToTarget(x, y, target) {
  const dx = x - target.x;
  const dy = y - (target.y - GORILLA_COLLISION_HEIGHT / 2);
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Simulate a shot and check if it hits the target gorilla or how close it gets.
 * Returns the minimum distance to target during flight and the impact x position.
 */
function simulateShotWithTracking(aiGorilla, target, localAngle, velocity, wind, gravity, heightmap) {
  const worldAngleDeg = 180 - localAngle;
  const worldAngleRad = worldAngleDeg * Math.PI / 180;
  const speed = velocity * VELOCITY_SCALE;

  let x = aiGorilla.x;
  let y = aiGorilla.y - 16;
  let vx = speed * Math.cos(worldAngleRad);
  let vy = -speed * Math.sin(worldAngleRad);

  const windSim = wind * WIND_SCALE;
  const maxSteps = 2000;
  let minDist = Infinity;
  let impactX = x;

  for (let step = 0; step < maxSteps; step++) {
    x += vx * DT + 0.5 * windSim * DT * DT;
    y += vy * DT + 0.5 * gravity * DT * DT;
    vx += windSim * DT;
    vy += gravity * DT;

    // Track closest approach to target
    const dist = distanceToTarget(x, y, target);
    if (dist < minDist) {
      minDist = dist;
      impactX = x;
    }

    // Off screen
    if (x < 0 || x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT) {
      return { distance: minDist, impactX };
    }

    // Skip collision checks if above canvas
    if (y < -BANANA_RADIUS) continue;

    const col = Math.floor(x);
    if (col >= 0 && col < CANVAS_WIDTH) {
      // Check gorilla hitbox
      const boxLeft = target.x - GORILLA_COLLISION_WIDTH / 2;
      const boxRight = target.x + GORILLA_COLLISION_WIDTH / 2;
      const boxTop = target.y - GORILLA_COLLISION_HEIGHT;
      const boxBottom = target.y;

      // Circle vs AABB
      const closestX = Math.max(boxLeft, Math.min(x, boxRight));
      const closestY = Math.max(boxTop, Math.min(y, boxBottom));
      const dx = x - closestX;
      const dy = y - closestY;
      if (dx * dx + dy * dy <= BANANA_RADIUS * BANANA_RADIUS) {
        return { distance: 0, impactX: x };
      }

      // Hit terrain
      if (y + BANANA_RADIUS >= heightmap[col]) {
        return { distance: minDist, impactX };
      }
    }
  }

  return { distance: minDist, impactX };
}

/**
 * Calculate the AI's shot using coarse-to-fine simulation search.
 *
 * @param {Object} target - Target gorilla {x, y}
 * @param {Object} aiGorilla - AI gorilla {x, y}
 * @param {number} wind - Wind value
 * @param {number} gravity - Gravity value (already scaled by GRAVITY_SCALE)
 * @param {Float64Array} heightmap - Terrain heightmap
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @param {Object|null} lastShot - Previous shot info for miss correction
 * @returns {{angle: number, velocity: number}}
 */
export function calculateAIShot(target, aiGorilla, wind, gravity, heightmap, difficulty, lastShot) {
  let bestAngle = 45;
  let bestVelocity = 100;
  let bestDistance = Infinity;

  // --- Phase 1: Coarse sweep ---
  // Angle: 5-85 in steps of 5, Velocity: 10-100 in steps of 5
  for (let angle = 5; angle <= 85; angle += 5) {
    for (let vel = 10; vel <= 100; vel += 5) {
      const result = simulateShotWithTracking(aiGorilla, target, angle, vel, wind, gravity, heightmap);
      if (result.distance < bestDistance) {
        bestDistance = result.distance;
        bestAngle = angle;
        bestVelocity = vel;
      }
      // Direct hit found - no need to continue
      if (bestDistance === 0) break;
    }
    if (bestDistance === 0) break;
  }

  // --- Phase 2: Fine sweep around best coarse result ---
  if (bestDistance > 0) {
    const fineAngleMin = Math.max(1, bestAngle - 5);
    const fineAngleMax = Math.min(89, bestAngle + 5);
    const fineVelMin = Math.max(5, bestVelocity - 5);
    const fineVelMax = Math.min(100, bestVelocity + 5);

    for (let angle = fineAngleMin; angle <= fineAngleMax; angle += 1) {
      for (let vel = fineVelMin; vel <= fineVelMax; vel += 1) {
        const result = simulateShotWithTracking(aiGorilla, target, angle, vel, wind, gravity, heightmap);
        if (result.distance < bestDistance) {
          bestDistance = result.distance;
          bestAngle = angle;
          bestVelocity = vel;
        }
        if (bestDistance === 0) break;
      }
      if (bestDistance === 0) break;
    }
  }

  // --- Phase 3: Apply miss correction nudge ---
  if (lastShot && lastShot.missDirection !== 0) {
    // If the last shot missed left (missDirection = -1), increase angle slightly
    // If missed right (missDirection = 1), decrease angle slightly
    bestAngle -= lastShot.missDirection * 2;
  }

  // --- Phase 4: Apply difficulty error ---
  const difficultyConfig = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.medium;
  const angleError = (Math.random() * 2 - 1) * difficultyConfig.angleError;
  const velocityError = (Math.random() * 2 - 1) * difficultyConfig.velocityError;

  bestAngle += angleError;
  bestVelocity *= (1 + velocityError);

  // --- Clamp to valid ranges ---
  bestAngle = Math.max(0, Math.min(90, Math.round(bestAngle * 10) / 10));
  bestVelocity = Math.max(1, Math.min(100, Math.round(bestVelocity * 10) / 10));

  return { angle: bestAngle, velocity: bestVelocity };
}
