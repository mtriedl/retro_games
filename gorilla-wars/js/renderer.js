// gorilla-wars/js/renderer.js
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  SKY_DAY_COLOR, SKY_NIGHT_COLOR,
  WINDOW_LIT_COLOR, WINDOW_UNLIT_COLOR,
  BANANA_COLOR, BANANA_TIP_COLOR, BANANA_RADIUS,
  GORILLA_FRAME_SIZE, GORILLA_COLLISION_WIDTH, GORILLA_COLLISION_HEIGHT,
  GRAVITY_PRESETS, VELOCITY_SCALE, GRAVITY_SCALE,
  INPUT_BAR_HEIGHT, INPUT_BAR_Y, VELOCITY_MAX,
  SLIDER_THUMB_RADIUS,
  FIRE_BUTTON_WIDTH, FIRE_BUTTON_HEIGHT,
  MENU_BUTTON_MIN_H,
  SETTINGS_ROW_H, SETTINGS_ROW_GAP, SETTINGS_ARROW_W,
  PAUSE_BUTTON_X, PAUSE_BUTTON_Y, PAUSE_BUTTON_W, PAUSE_BUTTON_H,
} from './constants.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @returns {object} All drawing methods for the game
 */
export function createRenderer(ctx) {
  const sunMoonY = 35;
  const sunMoonX = CANVAS_WIDTH / 2;
  const sunRadius = 18;

  return {
    /** Get celestial body bounds for collision checking */
    getCelestialBounds() {
      return { x: sunMoonX, y: sunMoonY, radius: sunRadius };
    },

    drawSky(isNight) {
      ctx.fillStyle = isNight ? SKY_NIGHT_COLOR : SKY_DAY_COLOR;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (isNight) {
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 60; i++) {
          const sx = (i * 97 + 13) % CANVAS_WIDTH; // deterministic scatter
          const sy = (i * 53 + 7) % (CANVAS_HEIGHT / 2);
          ctx.fillRect(sx, sy, 1, 1);
        }
      }
    },

    drawSunMoon(isNight, surprised) {
      const cx = sunMoonX;
      const cy = sunMoonY;

      if (!isNight) {
        // Sun: circle + rays
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        ctx.arc(cx, cy, sunRadius, 0, Math.PI * 2);
        ctx.fill();

        // Rays
        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * (sunRadius + 2), cy + Math.sin(angle) * (sunRadius + 2));
          ctx.lineTo(cx + Math.cos(angle) * (sunRadius + 8), cy + Math.sin(angle) * (sunRadius + 8));
          ctx.stroke();
        }
      } else {
        // Moon: full circle
        ctx.fillStyle = '#CCCCCC';
        ctx.beginPath();
        ctx.arc(cx, cy, sunRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Face
      ctx.fillStyle = '#000000';
      if (surprised) {
        // Wide eyes
        ctx.beginPath(); ctx.arc(cx - 5, cy - 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 5, cy - 3, 3, 0, Math.PI * 2); ctx.fill();
        // Open mouth
        ctx.beginPath(); ctx.arc(cx, cy + 5, 4, 0, Math.PI * 2); ctx.fill();
      } else {
        // Dot eyes
        ctx.fillRect(cx - 6, cy - 4, 3, 3);
        ctx.fillRect(cx + 3, cy - 4, 3, 3);
        // Smile
        ctx.beginPath();
        ctx.arc(cx, cy + 2, 6, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
      }
    },

    drawBuildings(buildings) {
      for (const b of buildings) {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.width, b.height);

        for (const w of b.windows) {
          ctx.fillStyle = w.lit ? WINDOW_LIT_COLOR : WINDOW_UNLIT_COLOR;
          ctx.fillRect(w.x, w.y, 8, 10);
        }
      }
    },

    drawBuildingsFromHeightmap(buildings, heightmap) {
      // Draw buildings column-by-column respecting craters via heightmap
      for (const b of buildings) {
        for (let x = b.x; x < b.x + b.width; x++) {
          const top = heightmap[x];
          if (top < CANVAS_HEIGHT) {
            ctx.fillStyle = b.color;
            ctx.fillRect(x, top, 1, CANVAS_HEIGHT - top);
          }
        }
        // Draw windows that are still visible (inside solid building, below heightmap)
        for (const w of b.windows) {
          if (w.y >= heightmap[w.x]) {
            ctx.fillStyle = w.lit ? WINDOW_LIT_COLOR : WINDOW_UNLIT_COLOR;
            ctx.fillRect(w.x, w.y, 8, 10);
          }
        }
      }
    },

    drawGorilla(gorilla, spriteFrames, frame) {
      if (!gorilla.visible) return;
      const sprite = spriteFrames[frame];
      if (!sprite) return;
      // Anchor: bottom-center of 32x32 frame
      const drawX = gorilla.x - GORILLA_FRAME_SIZE / 2;
      const drawY = gorilla.y - GORILLA_FRAME_SIZE;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, drawX, drawY, GORILLA_FRAME_SIZE, GORILLA_FRAME_SIZE);
      ctx.imageSmoothingEnabled = true;
    },

    drawBanana(banana, alpha) {
      if (!banana.active) return;
      // Interpolate position for smooth rendering
      const rx = banana.prevX + (banana.x - banana.prevX) * alpha;
      const ry = banana.prevY + (banana.y - banana.prevY) * alpha;

      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(banana.rotation);

      // Crescent banana shape
      ctx.fillStyle = BANANA_COLOR;
      ctx.beginPath();
      ctx.arc(0, 0, BANANA_RADIUS, 0.3, Math.PI - 0.3);
      ctx.arc(0, -1, BANANA_RADIUS - 1.5, Math.PI - 0.3, 0.3, true);
      ctx.fill();

      // Tips
      ctx.fillStyle = BANANA_TIP_COLOR;
      ctx.fillRect(-BANANA_RADIUS + 1, -1, 2, 2);
      ctx.fillRect(BANANA_RADIUS - 3, -1, 2, 2);

      ctx.restore();
    },

    drawExplosion(explosion) {
      // Expanding circle
      ctx.fillStyle = `rgba(255, 200, 50, ${1 - explosion.progress})`;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius * explosion.progress, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright core
      ctx.fillStyle = `rgba(255, 255, 200, ${0.8 - explosion.progress * 0.8})`;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius * explosion.progress * 0.5, 0, Math.PI * 2);
      ctx.fill();
    },

    drawParticles(particles) {
      for (const p of particles) {
        ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.alpha})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    },

    drawWindIndicator(wind) {
      const cx = CANVAS_WIDTH / 2;
      const y = 8;
      const maxArrows = 5;
      const arrowCount = Math.min(maxArrows, Math.ceil(Math.abs(wind) / 3));
      const dir = wind > 0 ? 1 : -1;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';

      let arrow = 'wind: ';
      if (wind === 0) {
        arrow += '-';
      } else {
        for (let i = 0; i < arrowCount; i++) {
          arrow += dir > 0 ? '>' : '<';
        }
      }
      ctx.fillText(arrow, cx, y + 4);
    },

    drawHUD(activePlayer, inputField, inputValue, lastInputs, scores, blinkOn, round, totalRounds) {
      ctx.font = '10px monospace';

      // Player labels
      for (let p = 0; p < 2; p++) {
        const x = p === 0 ? 8 : CANVAS_WIDTH - 100;
        const isActive = p === activePlayer;

        ctx.fillStyle = isActive ? '#FFFFFF' : '#888888';
        ctx.textAlign = 'left';
        ctx.fillText(`Player ${p + 1}`, x, 14);

        // Angle
        const angleLabel = 'Angle: ';
        let angleHandled = false;
        if (isActive && inputField === 'angle') {
          if (inputValue === '' && lastInputs[p].angle !== null) {
            // Cursor at beginning, greyed placeholder after
            const cursorChar = blinkOn ? '_' : ' ';
            ctx.fillText(angleLabel + cursorChar, x, 28);
            const offset = ctx.measureText(angleLabel + cursorChar).width;
            ctx.fillStyle = '#555555';
            ctx.fillText(String(Math.round(lastInputs[p].angle)), x + offset, 28);
            angleHandled = true;
          } else {
            ctx.fillText(angleLabel + inputValue + (blinkOn ? '_' : ' '), x, 28);
            angleHandled = true;
          }
        } else if (lastInputs[p].angle !== null) {
          if (!isActive) ctx.fillStyle = '#555555';
          ctx.fillText(angleLabel + String(Math.round(lastInputs[p].angle)), x, 28);
          angleHandled = true;
        }
        if (!angleHandled) ctx.fillText(angleLabel, x, 28);

        // Velocity
        ctx.fillStyle = isActive ? '#FFFFFF' : '#888888';
        const velLabel = 'Vel:   ';
        let velHandled = false;
        if (isActive && inputField === 'velocity') {
          if (inputValue === '' && lastInputs[p].velocity !== null) {
            const cursorChar = blinkOn ? '_' : ' ';
            ctx.fillText(velLabel + cursorChar, x, 42);
            const offset = ctx.measureText(velLabel + cursorChar).width;
            ctx.fillStyle = '#555555';
            ctx.fillText(String(Math.round(lastInputs[p].velocity)), x + offset, 42);
            velHandled = true;
          } else {
            ctx.fillText(velLabel + inputValue + (blinkOn ? '_' : ' '), x, 42);
            velHandled = true;
          }
        } else if (lastInputs[p].velocity !== null) {
          ctx.fillStyle = '#555555';
          ctx.fillText(velLabel + String(Math.round(lastInputs[p].velocity)), x, 42);
          velHandled = true;
        }
        if (!velHandled) ctx.fillText(velLabel, x, 42);
      }

      // Round and Score with background box
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      const roundText = `Round: ${(round || 0) + 1}/${totalRounds || 1}`;
      const scoreText = `${scores[0]} :score: ${scores[1]}`;
      const scoreY = CANVAS_HEIGHT - 10;
      const roundY = scoreY - 14;
      const pad = 7;
      const maxTextW = Math.max(ctx.measureText(roundText).width, ctx.measureText(scoreText).width);
      const boxW = maxTextW + pad * 2;
      const boxX = CANVAS_WIDTH / 2 - boxW / 2;
      const boxYStart = roundY - 10 - pad;
      const boxH = (scoreY + 3 + pad) - boxYStart;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(boxX, boxYStart, boxW, boxH);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(roundText, CANVAS_WIDTH / 2, roundY);
      ctx.fillText(scoreText, CANVAS_WIDTH / 2, scoreY);
    },

    drawBananaTracker(bananaX) {
      ctx.fillStyle = '#FFFF00';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      const x = Math.max(20, Math.min(CANVAS_WIDTH - 20, bananaX));
      ctx.fillText('\u25B2 BANANA', x, 10);
    },

    drawShotTrail(trail, alpha) {
      if (trail.length < 2) return;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * alpha})`;
      for (let i = 0; i < trail.length; i += 3) {
        ctx.fillRect(trail[i].x - 1, trail[i].y - 1, 2, 2);
      }
    },

    drawAimPreview(gorilla, localAngle, playerIndex) {
      if (localAngle === null) return;
      const worldAngleDeg = playerIndex === 0 ? localAngle : 180 - localAngle;
      const rad = worldAngleDeg * Math.PI / 180;
      const cx = gorilla.x;
      const cy = gorilla.y - GORILLA_FRAME_SIZE / 2;
      const startOffset = GORILLA_FRAME_SIZE / 2 + 4;
      const len = 50;
      const sx = cx + Math.cos(rad) * startOffset;
      const sy = cy - Math.sin(rad) * startOffset;
      const ex = cx + Math.cos(rad) * len;
      const ey = cy - Math.sin(rad) * len;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
    },

    drawDynamicAimPreview(gorilla, localAngle, velocity, playerIndex, gravityValue) {
      if (localAngle === null || velocity === null) return;
      const worldAngleDeg = playerIndex === 0 ? localAngle : 180 - localAngle;
      const rad = worldAngleDeg * Math.PI / 180;
      const speed = velocity * VELOCITY_SCALE;
      let vx = speed * Math.cos(rad);
      let vy = -speed * Math.sin(rad);
      let px = gorilla.x;
      let py = gorilla.y - GORILLA_FRAME_SIZE / 2;
      const g = gravityValue * GRAVITY_SCALE;
      const dt = 1 / 60;
      const steps = 300;

      ctx.fillStyle = 'rgba(255, 255, 100, 0.4)';
      for (let i = 0; i < steps; i++) {
        px += vx * dt;
        py += vy * dt;
        vy += g * dt;
        if (px < 0 || px >= CANVAS_WIDTH || py >= CANVAS_HEIGHT) break;
        if (i % 3 === 0) {
          ctx.fillRect(px - 1, py - 1, 2, 2);
        }
      }
    },

    drawTitleScreen(selectedIndex) {
      ctx.fillStyle = SKY_DAY_COLOR;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#FFFF00';
      ctx.font = '32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GORILLA WARS', CANVAS_WIDTH / 2, 120);

      const items = ['New Game', 'Settings', 'Fullscreen'];
      ctx.font = '14px monospace';
      items.forEach((item, i) => {
        const y = 200 + i * 54;
        const w = 180;
        const h = MENU_BUTTON_MIN_H;
        const x = CANVAS_WIDTH / 2 - w / 2;
        const selected = i === selectedIndex;

        ctx.fillStyle = selected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(x, y - h / 2, w, h);

        ctx.strokeStyle = selected ? '#FFD700' : '#555555';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y - h / 2, w, h);

        ctx.fillStyle = selected ? '#FFFFFF' : '#888888';
        ctx.fillText(item, CANVAS_WIDTH / 2, y + 5);
      });
    },

    drawPauseMenu(selectedIndex) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', CANVAS_WIDTH / 2, 120);

      const items = ['Resume', 'Restart Round', 'Settings', 'Quit to Title'];
      ctx.font = '14px monospace';
      items.forEach((item, i) => {
        const y = 170 + i * 52;
        const w = 200;
        const h = MENU_BUTTON_MIN_H;
        const x = CANVAS_WIDTH / 2 - w / 2;
        const selected = i === selectedIndex;

        ctx.fillStyle = selected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(x, y - h / 2, w, h);

        ctx.strokeStyle = selected ? '#FFD700' : '#555555';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y - h / 2, w, h);

        ctx.fillStyle = selected ? '#FFFFFF' : '#888888';
        ctx.fillText(item, CANVAS_WIDTH / 2, y + 5);
      });
    },

    drawSettingsMenu(settings, selectedIndex, editingCustom, customValue) {
      ctx.fillStyle = SKY_NIGHT_COLOR;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SETTINGS', CANVAS_WIDTH / 2, 40);

      const items = [
        { label: 'Input', value: settings.inputMethod === 'sliders' ? 'Sliders' : 'Classic', cycle: true },
        { label: 'Rounds', value: String(settings.rounds), cycle: true },
        { label: 'Gravity', value: `${settings.gravityPreset} (${settings.gravityPreset === 'Custom' ? settings.customGravity : (GRAVITY_PRESETS.find(p => p.name === settings.gravityPreset)?.gravity ?? '')})`, cycle: true },
        ...(settings.gravityPreset === 'Custom' ? [{ label: 'Custom G', value: editingCustom ? customValue + '_' : String(settings.customGravity), cycle: false }] : []),
        { label: 'Player 2', value: settings.player2Mode, cycle: true },
        { label: 'Shot Trail', value: settings.shotTrail ? 'ON' : 'OFF', cycle: true },
        { label: 'Aim Preview', value: settings.aimPreview ? 'ON' : 'OFF', cycle: true },
        { label: 'Dynamic Aim', value: settings.dynamicAimPreview ? 'ON' : 'OFF', cycle: true },
        { label: 'Volume', value: null, volume: settings.volume, cycle: true },
        { label: 'Back', value: null, cycle: false, isBack: true },
      ];

      const rowH = SETTINGS_ROW_H;
      const rowGap = SETTINGS_ROW_GAP;
      const startY = 68;
      const rowW = 340;
      const rowX = CANVAS_WIDTH / 2 - rowW / 2;
      const arrowW = SETTINGS_ARROW_W;

      ctx.font = '11px monospace';
      items.forEach((item, i) => {
        const y = startY + i * (rowH + rowGap);
        const selected = i === selectedIndex;

        if (item.isBack) {
          const bw = 120;
          const bx = CANVAS_WIDTH / 2 - bw / 2;
          ctx.fillStyle = selected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(bx, y, bw, rowH);
          ctx.strokeStyle = selected ? '#FFD700' : '#555555';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx, y, bw, rowH);
          ctx.fillStyle = selected ? '#FFFFFF' : '#888888';
          ctx.textAlign = 'center';
          ctx.fillText('Back', CANVAS_WIDTH / 2, y + rowH - 6);
          return;
        }

        // Row background
        ctx.fillStyle = selected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(rowX, y, rowW, rowH);

        // Label
        ctx.fillStyle = selected ? '#FFD700' : '#888888';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, rowX + 8, y + rowH - 6);

        // Value area
        ctx.textAlign = 'center';
        const valueX = rowX + rowW - 100;

        if (item.volume !== undefined && item.volume !== null) {
          // Volume bar
          const barX = valueX - 50;
          const barW = 80;
          const barH = 6;
          const barY = y + (rowH - barH) / 2;
          ctx.fillStyle = '#333333';
          ctx.fillRect(barX, barY, barW, barH);
          ctx.fillStyle = '#55FF55';
          ctx.fillRect(barX, barY, barW * item.volume, barH);
          ctx.fillStyle = '#AAAAAA';
          ctx.textAlign = 'right';
          ctx.fillText(`${Math.round(item.volume * 100)}%`, rowX + rowW - 8, y + rowH - 6);
        } else if (item.value !== null) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(item.value, valueX, y + rowH - 6);
        }

        // Arrow buttons for cycling items
        if (item.cycle) {
          const leftArrowX = valueX - 70;
          const rightArrowX = rowX + rowW - arrowW - 4;
          const arrowY = y + 2;
          const arrowH = rowH - 4;

          ctx.fillStyle = '#444444';
          ctx.fillRect(leftArrowX, arrowY, arrowW, arrowH);
          ctx.fillStyle = '#FFD700';
          ctx.textAlign = 'center';
          ctx.fillText('<', leftArrowX + arrowW / 2, arrowY + arrowH - 4);

          ctx.fillStyle = '#444444';
          ctx.fillRect(rightArrowX, arrowY, arrowW, arrowH);
          ctx.fillStyle = '#FFD700';
          ctx.textAlign = 'center';
          ctx.fillText('>', rightArrowX + arrowW / 2, arrowY + arrowH - 4);
        }
      });
    },

    drawRoundEnd(winner, scores) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#FFFF00';
      ctx.font = '18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Player ${winner + 1} scores!`, CANVAS_WIDTH / 2, 180);
      ctx.fillText(`${scores[0]} - ${scores[1]}`, CANVAS_WIDTH / 2, 210);
    },

    drawGameOver(scores) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#FFFF00';
      ctx.font = '24px monospace';
      ctx.textAlign = 'center';

      let text;
      if (scores[0] > scores[1]) text = 'Player 1 Wins!';
      else if (scores[1] > scores[0]) text = 'Player 2 Wins!';
      else text = 'Tie Game!';

      ctx.fillText(text, CANVAS_WIDTH / 2, 160);
      ctx.font = '16px monospace';
      ctx.fillText(`${scores[0]} - ${scores[1]}`, CANVAS_WIDTH / 2, 195);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px monospace';
      ctx.fillText('Tap or press Enter to continue', CANVAS_WIDTH / 2, 240);
    },

    drawBuildingRise(buildings, progress) {
      // Buildings rise from bottom during ROUND_START animation
      for (const b of buildings) {
        const visibleHeight = b.height * progress;
        const drawY = CANVAS_HEIGHT - visibleHeight;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, drawY, b.width, visibleHeight);
      }
    },
  };
}
