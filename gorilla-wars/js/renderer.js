// gorilla-wars/js/renderer.js
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  SKY_DAY_COLOR, SKY_NIGHT_COLOR,
  WINDOW_LIT_COLOR, WINDOW_UNLIT_COLOR,
  BANANA_COLOR, BANANA_TIP_COLOR, BANANA_RADIUS,
  GORILLA_FRAME_SIZE, GORILLA_COLLISION_WIDTH, GORILLA_COLLISION_HEIGHT,
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
        // Draw windows that are still visible (above heightmap)
        for (const w of b.windows) {
          if (w.y + 10 > heightmap[w.x] && w.y >= heightmap[w.x]) continue; // cratered away
          if (w.y < heightmap[w.x]) {
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
      ctx.drawImage(sprite, drawX, drawY, GORILLA_FRAME_SIZE, GORILLA_FRAME_SIZE);
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

      let arrow = '';
      for (let i = 0; i < arrowCount; i++) {
        arrow += dir > 0 ? '>' : '<';
      }
      if (wind === 0) arrow = '-';
      ctx.fillText(arrow, cx, y + 4);
    },

    drawHUD(activePlayer, inputField, inputValue, lastInputs, scores, blinkOn) {
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
        let angleVal = '';
        if (isActive && inputField === 'angle') {
          angleVal = inputValue + (blinkOn ? '_' : ' ');
        } else if (lastInputs[p].angle !== null) {
          angleVal = String(lastInputs[p].angle);
          if (!isActive) ctx.fillStyle = '#555555';
        }
        ctx.fillText(angleLabel + angleVal, x, 28);

        // Velocity
        ctx.fillStyle = isActive ? '#FFFFFF' : '#888888';
        const velLabel = 'Vel:   ';
        let velVal = '';
        if (isActive && inputField === 'velocity') {
          velVal = inputValue + (blinkOn ? '_' : ' ');
        } else if (lastInputs[p].velocity !== null) {
          velVal = String(lastInputs[p].velocity);
          if (!isActive) ctx.fillStyle = '#555555';
        }
        ctx.fillText(velLabel + velVal, x, 42);
      }

      // Score
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${scores[0]}>${scores[0] + scores[1]}<${scores[1]}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 8);
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
      ctx.fillStyle = `rgba(255, 255, 255, ${0.2 * alpha})`;
      for (let i = 0; i < trail.length; i += 3) {
        ctx.fillRect(trail[i].x, trail[i].y, 1, 1);
      }
    },

    drawAimPreview(gorilla, localAngle, playerIndex) {
      if (localAngle === null) return;
      const worldAngleDeg = playerIndex === 0 ? localAngle : 180 - localAngle;
      const rad = worldAngleDeg * Math.PI / 180;
      const len = 40;
      const ex = gorilla.x + Math.cos(rad) * len;
      const ey = gorilla.y - GORILLA_FRAME_SIZE / 2 - Math.sin(rad) * len;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(gorilla.x, gorilla.y - GORILLA_FRAME_SIZE / 2);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
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
        ctx.fillStyle = i === selectedIndex ? '#FFFFFF' : '#888888';
        const prefix = i === selectedIndex ? '> ' : '  ';
        ctx.fillText(prefix + item, CANVAS_WIDTH / 2, 200 + i * 30);
      });
    },

    drawPauseMenu(selectedIndex) {
      // Dim overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', CANVAS_WIDTH / 2, 130);

      const items = ['Resume', 'Restart Round', 'Settings', 'Quit to Title'];
      ctx.font = '14px monospace';
      items.forEach((item, i) => {
        ctx.fillStyle = i === selectedIndex ? '#FFFFFF' : '#888888';
        const prefix = i === selectedIndex ? '> ' : '  ';
        ctx.fillText(prefix + item, CANVAS_WIDTH / 2, 180 + i * 28);
      });
    },

    drawSettingsMenu(settings, selectedIndex, editingCustom, customValue) {
      ctx.fillStyle = SKY_NIGHT_COLOR;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SETTINGS', CANVAS_WIDTH / 2, 60);

      const items = [
        `Rounds: < ${settings.rounds} >`,
        `Gravity: < ${settings.gravityPreset} (${settings.gravityPreset === 'Custom' ? settings.customGravity : ''}) >`,
        settings.gravityPreset === 'Custom' ? `Custom Gravity: ${editingCustom ? customValue + '_' : settings.customGravity}` : null,
        `Player 2: < ${settings.player2Mode} >`,
        `Shot Trail: < ${settings.shotTrail ? 'ON' : 'OFF'} >`,
        `Aim Preview: < ${settings.aimPreview ? 'ON' : 'OFF'} >`,
        `Volume: ${'='.repeat(Math.round(settings.volume * 10))}${'·'.repeat(10 - Math.round(settings.volume * 10))} ${Math.round(settings.volume * 100)}%`,
        'Back',
      ].filter(Boolean);

      ctx.font = '12px monospace';
      items.forEach((item, i) => {
        ctx.fillStyle = i === selectedIndex ? '#FFFFFF' : '#888888';
        const prefix = i === selectedIndex ? '> ' : '  ';
        ctx.fillText(prefix + item, CANVAS_WIDTH / 2, 110 + i * 24);
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
      ctx.fillText('Press Enter to continue', CANVAS_WIDTH / 2, 240);
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
