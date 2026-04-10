export function createAudioEngine() {
  let ctx = null;
  let masterGain = null;
  let compressor = null;
  let unlocked = false;
  let muted = false;
  let volume = 0.5;

  function ensureContext() {
    if (!ctx) {
      ctx = new AudioContext();
      compressor = ctx.createDynamicsCompressor();
      masterGain = ctx.createGain();
      masterGain.gain.value = volume;
      compressor.connect(masterGain);
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function unlock() {
    ensureContext();
    unlocked = true;
  }

  function setVolume(v) {
    volume = v;
    if (masterGain) masterGain.gain.value = muted ? 0 : v;
  }

  function setMuted(m) {
    muted = m;
    if (masterGain) masterGain.gain.value = m ? 0 : volume;
  }

  function osc(type, freq, duration, startTime) {
    const c = ensureContext();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0.3;
    g.gain.linearRampToValueAtTime(0, startTime + duration);
    o.connect(g);
    g.connect(compressor);
    o.start(startTime);
    o.stop(startTime + duration);
  }

  function noise(duration, startTime, lpFreq) {
    const c = ensureContext();
    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lpFreq || 4000;
    const g = c.createGain();
    g.gain.value = 0.3;
    g.gain.linearRampToValueAtTime(0, startTime + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(compressor);
    src.start(startTime);
  }

  function sweep(type, startFreq, endFreq, duration) {
    const c = ensureContext();
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(startFreq, t);
    o.frequency.linearRampToValueAtTime(endFreq, t + duration);
    g.gain.value = 0.3;
    g.gain.linearRampToValueAtTime(0, t + duration);
    o.connect(g);
    g.connect(compressor);
    o.start(t);
    o.stop(t + duration);
  }

  return {
    unlock,
    setVolume,
    setMuted,
    get muted() { return muted; },

    playLaunch() {
      sweep('sine', 300, 900, 0.3);
      sweep('triangle', 450, 1200, 0.25);
    },

    playBuildingHit() {
      const c = ensureContext();
      const t = c.currentTime;
      noise(0.15, t, 3000);
      noise(0.4, t + 0.05, 500);
      sweep('sine', 90, 25, 0.3);
      sweep('triangle', 250, 100, 0.2);
    },

    playGorillaHit() {
      const c = ensureContext();
      const t = c.currentTime;
      noise(0.5, t, 2000);
      sweep('sawtooth', 60, 20, 0.6);
      sweep('square', 200, 40, 0.4);
    },

    playVictory() {
      const c = ensureContext();
      const t = c.currentTime;
      const notes = [523, 587, 659, 784, 1047];
      notes.forEach((freq, i) => {
        osc('square', freq, 0.15, t + i * 0.12);
        osc('triangle', freq, 0.15, t + i * 0.12);
      });
    },

    playRoundStart() {
      const c = ensureContext();
      const t = c.currentTime;
      const notes = [392, 523, 659, 784];
      notes.forEach((freq, i) => osc('square', freq, 0.12, t + i * 0.1));
      noise(0.4, t, 2000);
    },

    playSunMoonSurprise() {
      const c = ensureContext();
      const t = c.currentTime;
      const freqs = [150, 600, 200, 500, 150];
      freqs.forEach((freq, i) => osc('sine', freq, 0.08, t + i * 0.06));
    },

    playMenuSelect() {
      const c = ensureContext();
      const t = c.currentTime;
      osc('square', 800, 0.05, t);
      osc('square', 1000, 0.05, t + 0.05);
    },

    playMiss() {
      sweep('sine', 600, 100, 0.5);
    },

    playKeystroke() {
      const c = ensureContext();
      noise(0.03, c.currentTime, 8000);
    },
  };
}
