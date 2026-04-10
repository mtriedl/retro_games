export function createInputHandler() {
  const state = { field: 'angle', value: '' };
  const keysDown = new Set();
  let onKeyCallback = null;

  function handleKeyDown(e) {
    if (e.key === 'Tab') e.preventDefault();
    keysDown.add(e.key);
    if (onKeyCallback) onKeyCallback(e.key);
  }

  function handleKeyUp(e) {
    keysDown.delete(e.key);
  }

  function attach(canvas) {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  }

  function detach() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  }

  function processInputKey(key) {
    if (state.field === 'done') return { type: 'none' };

    if (key >= '0' && key <= '9') {
      state.value += key;
      return { type: 'none' };
    }

    if (key === 'Backspace') {
      if (state.value === '' && state.field === 'velocity') {
        state.field = 'angle';
        return { type: 'back_to_angle' };
      }
      state.value = state.value.slice(0, -1);
      return { type: 'none' };
    }

    if (key === 'Enter') {
      if (state.value === '') return { type: 'none' };
      const parsed = parseInt(state.value, 10);
      if (isNaN(parsed)) return { type: 'none' };

      if (state.field === 'angle') {
        const angle = Math.max(0, Math.min(180, parsed));
        state.field = 'velocity';
        state.value = '';
        return { type: 'angle_confirmed', angle };
      }

      if (state.field === 'velocity') {
        const velocity = Math.max(1, Math.min(250, parsed));
        state.field = 'done';
        state.value = '';
        return { type: 'fire', velocity };
      }
    }

    return { type: 'none' };
  }

  function resetInput() {
    state.field = 'angle';
    state.value = '';
  }

  function isKeyDown(key) {
    return keysDown.has(key);
  }

  return {
    state,
    attach,
    detach,
    processInputKey,
    resetInput,
    isKeyDown,
    set onKey(cb) { onKeyCallback = cb; },
  };
}
