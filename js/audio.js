/* Castle Cascade — synthesized sound effects (Web Audio, no files). */
(function (root) {
  'use strict';
  let ctx = null, master = null, enabled = true, noiseBuf = null;

  function ensure() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, opt) {
    const c = ensure(); if (!c) return;
    opt = opt || {};
    const t = c.currentTime + (opt.delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = opt.type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t + dur);
    const vol = opt.vol != null ? opt.vol : 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, opt) {
    const c = ensure(); if (!c) return;
    opt = opt || {};
    const t = c.currentTime + (opt.delay || 0);
    const s = c.createBufferSource(); s.buffer = noiseBuf;
    const f = c.createBiquadFilter();
    f.type = opt.filter || 'lowpass';
    f.frequency.setValueAtTime(opt.freq || 1200, t);
    if (opt.to) f.frequency.exponentialRampToValueAtTime(opt.to, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(opt.vol || 0.4, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  // Pentatonic steps so cascades climb musically.
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const note = (step) => 523.25 * Math.pow(2, SCALE[Math.min(step, SCALE.length - 1)] / 12);

  const S = {
    unlock() { ensure(); },
    setEnabled(v) { enabled = v; if (!v && ctx) ctx.suspend(); else if (v && ctx) ctx.resume(); },
    swap() { tone(420, 0.08, { type: 'triangle', to: 560, vol: 0.18 }); },
    bad() { tone(200, 0.12, { type: 'square', vol: 0.08, to: 150 }); tone(180, 0.14, { type: 'square', vol: 0.06, delay: 0.09, to: 120 }); },
    pop(combo) {
      const f = note(Math.max(0, (combo || 1) - 1));
      tone(f, 0.16, { type: 'triangle', vol: 0.25 });
      tone(f * 2, 0.09, { type: 'sine', vol: 0.1, delay: 0.02 });
    },
    crack() { noise(0.12, { freq: 2400, to: 500, vol: 0.35, filter: 'bandpass' }); tone(140, 0.08, { type: 'square', vol: 0.06 }); },
    special() { [0, 4, 7, 12].forEach((s, k) => tone(784 * Math.pow(2, s / 12), 0.18, { type: 'triangle', vol: 0.14, delay: k * 0.045 })); },
    rocket() { noise(0.45, { freq: 600, to: 4000, vol: 0.35, filter: 'bandpass' }); tone(300, 0.35, { type: 'sawtooth', to: 900, vol: 0.05 }); },
    boom(big) { noise(big ? 0.9 : 0.6, { freq: 900, to: 60, vol: big ? 0.9 : 0.7 }); tone(90, big ? 0.7 : 0.45, { type: 'sine', to: 35, vol: 0.5 }); },
    prop() { for (let k = 0; k < 5; k++) tone(500 + k * 60, 0.05, { type: 'square', vol: 0.05, delay: k * 0.05 }); },
    zap() { for (let k = 0; k < 6; k++) tone(1200 + k * 180, 0.09, { type: 'sawtooth', vol: 0.05, delay: k * 0.035 }); noise(0.3, { freq: 5000, vol: 0.15, filter: 'highpass' }); },
    collect() { tone(988, 0.12, { type: 'sine', vol: 0.18 }); tone(1319, 0.2, { type: 'sine', vol: 0.18, delay: 0.08 }); },
    coin() { tone(1568, 0.07, { type: 'square', vol: 0.06 }); tone(2093, 0.16, { type: 'square', vol: 0.06, delay: 0.06 }); },
    click() { tone(660, 0.05, { type: 'triangle', vol: 0.15 }); },
    build() { [0, 4, 7, 12, 16].forEach((s, k) => tone(523 * Math.pow(2, s / 12), 0.25, { type: 'triangle', vol: 0.16, delay: k * 0.07 })); },
    win() {
      [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, k) => tone(523 * Math.pow(2, s / 12), 0.22, { type: 'triangle', vol: 0.2, delay: k * 0.11 }));
      tone(261, 0.9, { type: 'sine', vol: 0.15, delay: 0.66 });
    },
    lose() { [7, 4, 0, -5].forEach((s, k) => tone(392 * Math.pow(2, s / 12), 0.3, { type: 'triangle', vol: 0.16, delay: k * 0.18 })); },
    intro() {
      [0, 4, 7, 12].forEach((s, k) => {
        const f = 392 * Math.pow(2, s / 12);
        tone(f, 0.3, { type: 'sawtooth', vol: 0.06, delay: k * 0.09 });
        tone(f, 0.3, { type: 'triangle', vol: 0.14, delay: k * 0.09 });
      });
      tone(784, 0.8, { type: 'triangle', vol: 0.16, delay: 0.36 });
      tone(1175, 0.8, { type: 'sine', vol: 0.1, delay: 0.36 });
      noise(0.6, { freq: 6000, vol: 0.12, filter: 'highpass', delay: 0.36 });
    },
    chest() { noise(0.25, { freq: 800, vol: 0.3 }); [0, 7, 12, 19, 24].forEach((s, k) => tone(659 * Math.pow(2, s / 12), 0.3, { type: 'sine', vol: 0.15, delay: 0.15 + k * 0.06 })); },
  };
  root.CCAudio = S;
})(window);
