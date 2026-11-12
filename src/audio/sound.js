/* ==========================================================
   SOUND — synthesized with Web Audio, no audio files
   ========================================================== */

export const Sound = (() => {
  let ctx = null, engOsc, engGain, engLevel = -1, engRate = -1, master, humGain, rainGain, noiseBuf, on = false, humWanted = false, rainWanted = true, lastStep = 0;
  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const rain = ctx.createBufferSource(); rain.buffer = noiseBuf; rain.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600;
    rainGain = ctx.createGain(); rainGain.gain.value = rainWanted ? 0.03 : 0;
    rain.connect(hp).connect(lp).connect(rainGain).connect(master); rain.start();
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 60;
    const hl = ctx.createBiquadFilter(); hl.type = 'lowpass'; hl.frequency.value = 200;
    humGain = ctx.createGain(); humGain.gain.value = humWanted ? 0.04 : 0;
    o1.connect(hl).connect(humGain).connect(master); o1.start();
    engOsc = ctx.createOscillator(); engOsc.type = 'sawtooth'; engOsc.frequency.value = 34;
    const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 280;
    engGain = ctx.createGain(); engGain.gain.value = 0;
    engOsc.connect(ef).connect(engGain).connect(master); engOsc.start();
  }
  function setEnabled(v) {
    on = v;
    if (v) { init(); if (!ctx) { on = false; return; } ctx.resume(); master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.3); }
    else if (ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
  }
  function tone(freq, dur = 0.08, type = 'square', vol = 0.05, slideTo) {
    if (!on || !ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur = 0.05, vol = 0.2, freq = 2000, q = 1, sweepTo) {
    if (!on || !ctx) return;
    const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.05, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  const seq = (notes, gap, type = 'square', vol = 0.04, len = 0.12) => notes.forEach((f, i) => setTimeout(() => tone(f, len, type, vol), i * gap));
  const level = (node, want, v) => { if (node) node.gain.setTargetAtTime(want ? v : 0, ctx.currentTime, 0.3); };
  return {
    setEnabled, get on() { return on; },
    hum(v) { if (v !== humWanted) { humWanted = v; level(humGain, v, 0.04); } },
    rain(v) { if (v !== rainWanted) { rainWanted = v; level(rainGain, v, 0.03); } },
    engine(level, rate) {
      if (!ctx || (Math.abs(level - engLevel) < 0.02 && Math.abs(rate - engRate) < 0.3)) return;
      engLevel = level; engRate = rate;
      engGain.gain.setTargetAtTime(level * 0.07, ctx.currentTime, 0.25);
      engOsc.frequency.setTargetAtTime(30 + rate * 3.2, ctx.currentTime, 0.25);
    },
    horn() { for (const d of [0, 300]) setTimeout(() => { tone(415, 0.2, 'square', 0.045); tone(523, 0.2, 'square', 0.035); }, d); },
    click() { noise(0.03, 0.6, 3200, 2); setTimeout(() => noise(0.02, 0.3, 1400, 2), 45); },
    powerOn() { noise(0.35, 0.18, 700); tone(48, 0.7, 'sine', 0.3, 28); },
    key() { noise(0.025, 0.35, 2400 + Math.random() * 1600, 3); },
    whoosh() { noise(0.9, 0.25, 300, 0.8, 3000); },
    start() { seq([523, 659, 784, 1046], 90, 'triangle', 0.05, 0.3); },
    chime() { seq([784, 1046], 120, 'sine', 0.04, 0.5); },
    step() { const n = performance.now(); if (n - lastStep < 140) return; lastStep = n; noise(0.06, 0.18, 240 + Math.random() * 120, 1.4); },
    talk() { seq([660, 740, 660], 60, 'triangle', 0.04, 0.07); },
    door() { noise(0.5, 0.08, 900, 0.6); seq([392, 523, 659, 784], 120, 'triangle', 0.05, 0.35); },
    open() { tone(660, 0.06, 'sine', 0.04); setTimeout(() => tone(990, 0.09, 'sine', 0.035), 70); },
    off() { tone(1200, 0.5, 'sine', 0.06, 40); noise(0.18, 0.12, 500); }
  };
})();
