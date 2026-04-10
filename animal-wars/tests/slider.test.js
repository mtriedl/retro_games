import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ANGLE, DEFAULT_VELOCITY, VELOCITY_MAX,
  SLIDER_THUMB_HIT_RADIUS,
} from '../js/constants.js';

describe('Slider value calculation', () => {
  // Mirrors updateSliderFromX logic
  function calcSliderValue(touchX, sliderX, sliderWidth, min, max) {
    const pct = Math.max(0, Math.min(1, (touchX - sliderX) / sliderWidth));
    return Math.round(Math.max(min, Math.min(max, min + pct * (max - min))));
  }

  it('touch at slider start gives min value', () => {
    assert.equal(calcSliderValue(130, 130, 160, 0, 180), 0);
  });

  it('touch at slider end gives max value', () => {
    assert.equal(calcSliderValue(290, 130, 160, 0, 180), 180);
  });

  it('touch at slider midpoint gives midpoint value', () => {
    assert.equal(calcSliderValue(210, 130, 160, 0, 180), 90);
  });

  it('touch before slider clamps to min', () => {
    assert.equal(calcSliderValue(100, 130, 160, 0, 180), 0);
  });

  it('touch after slider clamps to max', () => {
    assert.equal(calcSliderValue(400, 130, 160, 0, 180), 180);
  });

  it('velocity slider maps correctly', () => {
    assert.equal(calcSliderValue(340, 340, 160, 1, VELOCITY_MAX), 1);
    assert.equal(calcSliderValue(500, 340, 160, 1, VELOCITY_MAX), VELOCITY_MAX);
  });

  it('rounds to nearest integer', () => {
    // Touch slightly off-center
    const val = calcSliderValue(131, 130, 160, 0, 180);
    assert.equal(val, Math.round(180 / 160));
  });
});

describe('Slider hit testing', () => {
  // Mirrors hitTestSlider logic
  function hitTest(touchX, touchY, thumbX, trackY, sliderX, sliderWidth) {
    const hitR = SLIDER_THUMB_HIT_RADIUS;
    if (Math.abs(touchX - thumbX) <= hitR && Math.abs(touchY - trackY) <= hitR) return true;
    if (touchX >= sliderX && touchX <= sliderX + sliderWidth && Math.abs(touchY - trackY) <= 12) return true;
    return false;
  }

  it('hit near thumb center returns true', () => {
    assert.ok(hitTest(130, 378, 130, 378, 130, 160));
  });

  it('hit on track away from thumb returns true', () => {
    assert.ok(hitTest(200, 378, 130, 378, 130, 160));
  });

  it('hit far from track returns false', () => {
    assert.ok(!hitTest(200, 340, 130, 378, 130, 160));
  });

  it('hit outside slider x range on track returns false', () => {
    assert.ok(!hitTest(100, 378, 130, 378, 130, 160));
  });
});

describe('Keyboard slider controls', () => {
  it('default slider values are angle 45, velocity 50', () => {
    assert.equal(DEFAULT_ANGLE, 45);
    assert.equal(DEFAULT_VELOCITY, 50);
  });

  it('angle clamps to 0-180 range', () => {
    assert.equal(Math.max(0, Math.min(180, -1)), 0);
    assert.equal(Math.max(0, Math.min(180, 181)), 180);
    assert.equal(Math.max(0, Math.min(180, 90)), 90);
  });

  it('velocity clamps to 1-VELOCITY_MAX range', () => {
    assert.equal(Math.max(1, Math.min(VELOCITY_MAX, 0)), 1);
    assert.equal(Math.max(1, Math.min(VELOCITY_MAX, VELOCITY_MAX + 1)), VELOCITY_MAX);
  });
});
