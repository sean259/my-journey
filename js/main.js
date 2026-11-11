/* ==========================================================
   SEAN LORICO — PORTFOLIO
   Scroll drives one GSAP timeline:
   room → lamp on → monitor on → zoom into screen → boot →
   title card → the journey (walk from home to CIT-U) → enter school →
   profile → quests → inventory → side quests → levels → save point →
   power off → outro

   Pacing knobs (search for them below):
     VH_PER_BEAT  overall scroll length
     WALK         how long the walk to school lasts
     HOLD         how long each portfolio window stays on screen
   ========================================================== */
(() => {
  'use strict';

  if (!window.gsap || !window.ScrollTrigger) {
    document.body.classList.remove('locked');
    console.error('GSAP failed to load.');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------------
     PACING
     -------------------------------------------------------- */
  const VH_PER_BEAT = 11;  // bigger = slower / longer scroll overall
  const WALK = 16;         // beats spent walking to school
  const HOLD = 4;          // beats each window stays fully visible

  /* --------------------------------------------------------
     SOUND — synthesized with Web Audio, no files to host
     -------------------------------------------------------- */
  const Sound = (() => {
    let ctx = null, master = null, humGain = null, noiseBuf = null;
    let on = false, humWanted = false;

    function init() {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      const len = ctx.sampleRate * 2;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

      const rain = ctx.createBufferSource();
      rain.buffer = noiseBuf; rain.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600;
      const rg = ctx.createGain(); rg.gain.value = 0.03;
      rain.connect(hp).connect(lp).connect(rg).connect(master);
      rain.start();

      const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 60;
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 120;
      const hl = ctx.createBiquadFilter(); hl.type = 'lowpass'; hl.frequency.value = 200;
      humGain = ctx.createGain(); humGain.gain.value = humWanted ? 0.04 : 0;
      o1.connect(hl); o2.connect(hl); hl.connect(humGain).connect(master);
      o1.start(); o2.start();
    }

    function setEnabled(v) {
      on = v;
      if (v) {
        init();
        if (!ctx) { on = false; return; }
        ctx.resume();
        master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.3);
      } else if (ctx) {
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      }
    }

    function tone(freq, dur = 0.08, type = 'square', vol = 0.05, slideTo) {
      if (!on || !ctx) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + dur + 0.05);
    }

    function noise(dur = 0.05, vol = 0.2, freq = 2000, q = 1) {
      if (!on || !ctx) return;
      const t = ctx.currentTime;
      const s = ctx.createBufferSource(); s.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g).connect(master);
      s.start(t, Math.random()); s.stop(t + dur + 0.05);
    }

    const seq = (notes, gap, type = 'square', vol = 0.04, len = 0.12) =>
      notes.forEach((f, i) => setTimeout(() => tone(f, len, type, vol), i * gap));

    let lastStep = 0;
    return {
      setEnabled,
      get on() { return on; },
      hum(v) {
        if (v === humWanted) return;
        humWanted = v;
        if (humGain) humGain.gain.setTargetAtTime(v ? 0.04 : 0, ctx.currentTime, 0.25);
      },
      click() { noise(0.03, 0.6, 3200, 2); setTimeout(() => noise(0.02, 0.3, 1400, 2), 45); },
      powerOn() { noise(0.35, 0.18, 700); tone(48, 0.7, 'sine', 0.3, 28); },
      key() { noise(0.025, 0.35, 2400 + Math.random() * 1600, 3); },
      start() { seq([523, 659, 784, 1046, 784, 1046], 85, 'square', 0.035); },
      step() {
        const now = performance.now();
        if (now - lastStep < 110) return; // fast scrolling shouldn't machine-gun
        lastStep = now;
        noise(0.05, 0.2, 260 + Math.random() * 120, 1.5);
      },
      talk() { seq([880, 988, 880], 50, 'square', 0.03, 0.05); },
      door() { noise(0.4, 0.08, 900, 0.6); seq([392, 523, 659, 784], 110, 'triangle', 0.06, 0.3); },
      iris() { tone(900, 0.7, 'square', 0.03, 120); },
      open() { tone(660, 0.05, 'square', 0.025); setTimeout(() => tone(990, 0.07, 'square', 0.025), 60); },
      off() { tone(1200, 0.5, 'sine', 0.06, 40); noise(0.18, 0.12, 500); }
    };
  })();

  /* --------------------------------------------------------
     SMOOTH SCROLL (optional — skipped if Lenis didn't load)
     -------------------------------------------------------- */
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new window.Lenis({ lerp: 0.085 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* --------------------------------------------------------
     CAMERA — zooms the room into the monitor screen
     -------------------------------------------------------- */
  const room = $('#room');
  const screenRect = $('#scr-rect');
  const cam = { p: 0 };
  const look = { x: 0, y: 0 };
  let cs = { x: 0, y: 0, s: 1 };
  let focus = null;

  function measure() {
    const r = screenRect.getBoundingClientRect();
    const lx = (r.left - cs.x) / cs.s;
    const ly = (r.top - cs.y) / cs.s;
    const w = r.width / cs.s, h = r.height / cs.s;
    focus = { fx: lx + w / 2, fy: ly + h / 2, w, h };
  }

  function renderCam() {
    if (!focus) return;
    const vw = innerWidth, vh = innerHeight, p = cam.p;
    const target = Math.max(vw / focus.w, vh / focus.h) * 1.04;
    const s = Math.exp(Math.log(target) * p);
    const par = (1 - p) * 16;
    const px = focus.fx + (vw / 2 - focus.fx) * p + look.x * par;
    const py = focus.fy + (vh / 2 - focus.fy) * p + look.y * par;
    cs = { x: px - s * focus.fx, y: py - s * focus.fy, s };
    room.style.transform = `translate3d(${cs.x}px, ${cs.y}px, 0) scale(${s})`;
  }

  /* ==========================================================
     PIXEL SPRITE — Sean, rendered procedurally.
     A 32×54 pixel grid is rasterised for every frame from a simple
     skeleton (hips → knees → ankles, shoulders → elbows → hands),
     so the walk has real knee bend, arm swing, a body bob that comes
     from the feet touching the ground, and feet that stay planted.
     ========================================================== */
  const SPR_W = 32, SPR_H = 54, FOOT_BOTTOM = 54;
  const LT = 9, LS = 9, LA = 7, LF = 6;                 // thigh, shin, upper arm, forearm (px)
  const A_LEG = 26 * Math.PI / 180, A_ARM = 24 * Math.PI / 180;
  const STRIDE_PX = 4 * (LT + LS) * Math.sin(A_LEG);    // body travel per full walk cycle
  const WALK_FRAMES = 16;
  const C = {
    hair: '#4f2e1b', hairHi: '#77492b', skin: '#e8b088', skinSh: '#c98d64', neck: '#d39568',
    glass: '#262626', lens: '#ff8a1e', lensHi: '#ffd9a0', mouth: '#a8644e',
    shirt: '#f4f4ef', shirtSh: '#d6d6cf', sleeve: '#e4e4dc', sleeveFar: '#c9c9c2', lany: '#8a1c2b', card: '#f4c542',
    bag: '#2f5d9e', bagSh: '#244a80', bagHi: '#4a78bb', strap: '#22467a', belt: '#232323',
    pants: '#2b2b3a', pantsFar: '#1b1b26', shoe: '#151515', shoeFar: '#0b0b0b', sole: '#4a4a4a', skinFar: '#bf8560'
  };

  function rasterFrame(pose) {
    const g = Array.from({ length: SPR_H }, () => new Array(SPR_W).fill(null));
    const plot = (x, y, c) => { if (x >= 0 && x < SPR_W && y >= 0 && y < SPR_H) g[y][x] = c; };
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) plot(x, y, c); };
    const ellipse = (cx, cy, rx, ry, c, test) => {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1 && (!test || test(x, y))) plot(x, y, c);
        }
    };
    const capsule = (x1, y1, x2, y2, r, c) => {
      const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1e-6;
      for (let y = Math.floor(Math.min(y1, y2) - r - 1); y <= Math.ceil(Math.max(y1, y2) + r + 1); y++)
        for (let x = Math.floor(Math.min(x1, x2) - r - 1); x <= Math.ceil(Math.max(x1, x2) + r + 1); x++) {
          const px = x + 0.5, py = y + 0.5;
          const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / L2));
          const ex = x1 + t * dx - px, ey = y1 + t * dy - py;
          if (ex * ex + ey * ey <= r * r) plot(x, y, c);
        }
    };

    // --- skeleton -------------------------------------------------
    const leg = (hx, hy, th, flex, footFlat) => {
      const kx = hx + LT * Math.sin(th), ky = hy + LT * Math.cos(th);
      const sh = th - flex;
      const ax = kx + LS * Math.sin(sh), ay = ky + LS * Math.cos(sh);
      const fa = footFlat ? 0 : sh * 0.9;
      const fx = Math.cos(fa), fy = -Math.sin(fa);
      const heel = [ax - 1.3 * fx, ay - 1.3 * fy], toe = [ax + 3.8 * fx, ay + 3.8 * fy];
      return { hx, hy, kx, ky, ax, ay, heel, toe, bottom: Math.max(heel[1], toe[1]) + 1.6 };
    };
    const legFromPhase = (hx, hy, ph) => {
      const s = Math.sin(2 * Math.PI * ph), co = Math.cos(2 * Math.PI * ph);
      const th = A_LEG * s;
      const flex = 0.1 + 1.05 * Math.pow(Math.max(0, co), 2); // knee folds during the swing
      return leg(hx, hy, th, flex, co <= 0.15);                // foot flat while planted
    };

    let near, far, armN, armF;
    const HIP_Y = 34;
    if (pose.walk) {
      near = legFromPhase(16.5, HIP_Y, pose.phase);
      far = legFromPhase(15.5, HIP_Y, pose.phase + 0.5);
      const s = Math.sin(2 * Math.PI * pose.phase);
      armN = -A_ARM * s; armF = A_ARM * s;                    // arms swing opposite the legs
    } else {
      near = leg(16.5, HIP_Y, 0.07, 0.06, true);
      far = leg(15.5, HIP_Y, -0.07, 0.06, true);
      armN = 0.06; armF = -0.04;
    }
    // ground contact → whole body drops/rises (natural bob)
    const dy = Math.round(FOOT_BOTTOM - Math.max(near.bottom, far.bottom));
    const ub = pose.breathe ? -1 : 0;                         // idle breathing (upper body only)
    const Y = (v) => v + dy;
    const U = (v) => v + dy + ub;

    const arm = (sx, sy, a, sleeve, skin) => {
      const ex = sx + LA * Math.sin(a), ey = sy + LA * Math.cos(a);
      const fa = a + 0.25 + 0.55 * Math.max(0, a / A_ARM);    // elbow bends more on the forward swing
      const hx = ex + LF * Math.sin(fa), hy = ey + LF * Math.cos(fa);
      const mx = sx + (ex - sx) * 0.55, my = sy + (ey - sy) * 0.55;
      capsule(mx, my, ex, ey, 1.5, skin);
      capsule(ex, ey, hx, hy, 1.35, skin);
      ellipse(hx, hy + 0.3, 1.7, 1.7, skin);
      capsule(sx, sy, mx, my, 2.15, sleeve);
    };
    const drawLeg = (l, pants, shoe) => {
      capsule(l.hx, Y(l.hy), l.kx, Y(l.ky), 2.35, pants);
      capsule(l.kx, Y(l.ky), l.ax, Y(l.ay), 2.0, pants);
      capsule(l.heel[0], Y(l.heel[1]), l.toe[0], Y(l.toe[1]), 1.55, shoe);
      const bx0 = Math.round(Math.min(l.heel[0], l.toe[0]) - 0.5), bx1 = Math.round(Math.max(l.heel[0], l.toe[0]) + 0.5);
      if (Math.abs(l.toe[1] - l.heel[1]) < 0.6) rect(bx0, Math.round(Y(l.bottom)) - 1, bx1, Math.round(Y(l.bottom)) - 1, C.sole);
    };

    // --- draw, back to front ----------------------------------------
    arm(14.5, U(19.5), armF, C.sleeveFar, C.skinFar);         // far arm
    drawLeg(far, C.pantsFar, C.shoeFar);                      // far leg

    rect(5, U(19), 10, U(31), C.bag);                         // backpack
    rect(6, U(18), 9, U(18), C.bag);
    rect(5, U(25), 8, U(29), C.bagSh);
    rect(9, U(20), 9, U(29), C.bagHi);
    rect(7, U(17), 8, U(17), C.bagSh);

    rect(11, Y(32), 20, Y(36), C.pants);                      // pelvis

    rect(10, U(17), 21, U(31), C.shirt);                      // torso
    rect(10, U(18), 11, U(31), C.shirtSh);
    plot(10, U(17), null); plot(21, U(17), null);
    rect(17, U(17), 19, U(17), C.shirtSh); plot(18, U(18), C.shirtSh); // collar
    rect(10, U(32), 21, U(32), C.belt);
    capsule(11.5, U(18), 12.5, U(27), 0.6, C.strap);          // backpack strap
    capsule(17.5, U(18.5), 17.5, U(27), 0.5, C.lany);         // CIT-U lanyard
    rect(16, U(27), 19, U(30), C.card); rect(17, U(29), 18, U(29), '#8fb8e8'); rect(16, U(27), 19, U(27), C.lany);

    drawLeg(near, C.pants, C.shoe);                           // near leg

    rect(15, U(14), 17, U(17), C.neck);                       // head
    ellipse(17.5, U(9), 6, 6.5, C.skin);
    rect(15, U(14), 20, U(14), C.skinSh);
    ellipse(15, U(6), 8, 6, C.hair, (x, y) => {
      const ly = y - dy - ub;
      return ly <= 4 || x <= 13 || (ly === 5 && x <= 23);
    });
    rect(12, U(1), 16, U(2), C.hairHi);
    plot(13, U(9), C.skinSh); plot(14, U(9), C.skin); plot(13, U(10), C.skinSh); plot(14, U(10), C.skin); // ear
    rect(14, U(7), 23, U(7), C.glass);                        // sunglasses
    rect(18, U(8), 23, U(9), C.lens);
    plot(17, U(8), C.glass); plot(17, U(9), C.glass);
    plot(22, U(8), C.lensHi);
    plot(24, U(10), C.skin); plot(24, U(11), C.skinSh);       // nose
    rect(21, U(13), 22, U(13), C.mouth);

    arm(16.5, U(19), armN, C.sleeve, C.skin);                  // near arm

    // --- to SVG (merge horizontal runs) -------------------------------
    let out = '';
    g.forEach((row, y) => {
      for (let x = 0; x < SPR_W;) {
        const c = row[x];
        if (!c) { x++; continue; }
        let run = 1;
        while (x + run < SPR_W && row[x + run] === c) run++;
        out += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${c}"/>`;
        x += run;
      }
    });
    return out;
  }

  // Pre-render every frame once and reuse it for both walkers
  const FRAME_SVG = {};
  for (let i = 0; i < WALK_FRAMES; i++) FRAME_SVG[`w${i}`] = rasterFrame({ walk: true, phase: i / WALK_FRAMES });
  FRAME_SVG.i0 = rasterFrame({ walk: false });
  FRAME_SVG.i1 = rasterFrame({ walk: false, breathe: true });

  // A walker = one sprite on screen whose legs follow a distance value
  function createWalker(gEl, unitsPerPx) {
    gEl.innerHTML = `<ellipse cx="16" cy="53.3" rx="8.5" ry="1.3" fill="rgba(0,0,0,.25)"/>` +
      Object.entries(FRAME_SVG).map(([k, v]) => `<g data-f="${k}" style="display:none">${v}</g>`).join('');
    const frames = Object.fromEntries($$('[data-f]', gEl).map((el) => [el.dataset.f, el]));
    const cycle = STRIDE_PX * unitsPerPx;          // world units per walk cycle
    let last = null, dist = 0, lastMove = -1e9, dir = 1, shownDir = 1, cur = '', lastPhase = 0;

    function show(f) {
      if (f === cur) return;
      if (cur) frames[cur].style.display = 'none';
      frames[f].style.display = '';
      cur = f;
    }
    show('i0');

    return {
      update(src, now, onStep) {
        if (last === null) last = src;
        const d = src - last;
        if (Math.abs(d) > 1e-4) { dist += Math.abs(d); dir = d > 0 ? 1 : -1; lastMove = now; }
        last = src;
        const walking = now - lastMove < 140;
        if (walking) {
          const ph = (dist / cycle) % 1;
          // heel strikes happen at phase .25 and .75
          if (onStep && ((lastPhase < 0.25 && ph >= 0.25) || (lastPhase < 0.75 && ph >= 0.75))) onStep();
          lastPhase = ph;
          show(`w${Math.floor(ph * WALK_FRAMES) % WALK_FRAMES}`);
        } else {
          if (now - lastMove > 600) dir = 1;          // when he stops, he faces forward again
          show(Math.floor(now / 1100) % 2 ? 'i1' : 'i0');
        }
        if (dir !== shownDir) {
          gEl.setAttribute('transform', dir < 0 ? 'translate(32 0) scale(-1 1)' : '');
          shownDir = dir;
        }
      }
    };
  }

  /* ==========================================================
     THE JOURNEY WORLD — 360 units tall, ground line at y = 290
     ========================================================== */
  const VH = 360, W_WORLD = 4200, W_FAR = 2600, W_MID = 3400, W_FG = 5600, W_CLOUD = 3600;
  const START_X = 380, DOOR_X = 3250, BOY_X = 0.3;
  const BOY_UNITS_PER_PX = (VH * 0.2475) / SPR_H;      // sprite px → world units (matches CSS height)
  const INK = '#1b1b2f', PAPER = '#fff6e0', MAROON = '#8a1c2b', GOLD = '#f4c542';

  const R = (x, y, w, h, f, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${extra}/>`;
  const T = (x, y, t, size, fill, anchor = 'start') =>
    `<text x="${x}" y="${y}" font-family="'Press Start 2P', monospace" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${t}</text>`;
  const S4 = `stroke="${INK}" stroke-width="4"`;
  const S3 = `stroke="${INK}" stroke-width="3"`;
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  function tree(x) {
    const d = `style="animation-delay:-${(rnd() * 3).toFixed(2)}s"`;
    return R(x + 22, 226, 14, 64, '#6b3e22') + R(x + 22, 226, 4, 64, '#55301a') +
      `<g class="sway" ${d}>` +
      R(x - 6, 186, 70, 30, '#2f7d3f') + R(x, 164, 58, 30, '#3f9a4a') +
      R(x + 10, 146, 38, 22, '#4fb35a') + R(x + 14, 154, 12, 8, '#7fd67f') + R(x + 4, 178, 10, 8, '#7fd67f') +
      R(x - 6, 208, 70, 8, '#276a35') + '</g>';
  }
  function palm(x, fill = '#3f9a4a', trunk = '#8a5a32') {
    let s = '';
    for (let i = 0; i < 10; i++) s += R(x + Math.round(Math.sin(i / 3) * 4), 290 - (i + 1) * 13, 10, 13, trunk);
    const tx = x + Math.round(Math.sin(10 / 3) * 4) + 5, ty = 160;
    s += `<g class="sway" style="animation-delay:-${(rnd() * 3).toFixed(2)}s">`;
    s += R(tx - 40, ty, 36, 8, fill) + R(tx - 52, ty + 8, 16, 8, fill) + R(tx + 4, ty, 36, 8, fill) + R(tx + 36, ty + 8, 16, 8, fill);
    s += R(tx - 26, ty - 10, 22, 10, fill) + R(tx + 4, ty - 10, 22, 10, fill) + R(tx - 6, ty - 18, 12, 18, fill);
    s += R(tx - 6, ty + 4, 6, 6, '#6b3e22') + R(tx + 2, ty + 6, 6, 6, '#6b3e22') + '</g>';
    return s;
  }
  const bush = (x) => R(x, 266, 64, 24, '#2f7d3f') + R(x + 10, 254, 42, 14, '#3f9a4a') + R(x + 16, 258, 8, 6, '#7fd67f');
  const lamp = (x) => R(x, 160, 8, 130, '#2b2b3a') + R(x - 10, 148, 28, 14, '#2b2b3a') + R(x - 6, 162, 20, 6, '#ffe9a8');
  function sign(x, top, bottom) {
    const w = Math.max(150, bottom.length * 9 + 28);
    return R(x + w / 2 - 5, 238, 10, 52, '#6b3e22') +
      R(x, 182, w, 58, PAPER, S4) + R(x + 2, 232, w - 4, 6, '#e8dcc0') +
      T(x + 14, 208, top, 14, MAROON) + T(x + 14, 228, bottom, 9, INK);
  }
  function house(x) {
    let s = R(x + 20, 180, 220, 110, '#f2d7a6', S4) + R(x + 22, 182, 216, 10, '#d9bd8c');
    for (let i = 0; i < 6; i++) s += R(x + 4 + i * 14, 180 - (i + 1) * 14, 252 - i * 28, 14, i % 2 ? '#a3372f' : '#b3403a');
    s += R(x + 180, 112, 22, 40, '#7a2c28');
    s += R(x + 70, 220, 44, 70, '#6b3e22', S4) + R(x + 104, 252, 5, 5, GOLD);
    s += R(x + 150, 206, 56, 44, '#9fdcff', S4) + R(x + 176, 206, 4, 44, INK) + R(x + 150, 226, 56, 4, INK) + R(x + 154, 210, 8, 8, '#fff');
    s += R(x + 266, 248, 6, 42, '#6b3e22') + R(x + 254, 230, 30, 20, '#2f5d9e', S4);
    s += T(x + 92, 214, 'HOME', 8, INK, 'middle');
    return s;
  }
  function jeepney(x) {
    let s = `<g class="idle-shake">`;
    s += R(x + 60, 166, 110, 18, GOLD, S4) + T(x + 115, 180, 'CIT-U', 9, INK, 'middle');
    s += R(x + 6, 184, 220, 14, '#b33a3a', S4);
    s += R(x, 198, 232, 62, '#dcdcdc', S4) + R(x + 2, 200, 228, 4, '#f2f2f2');
    for (let i = 0; i < 5; i++) s += R(x + 16 + i * 40, 206, 30, 22, '#9fdcff', S3) + R(x + 19 + i * 40, 209, 6, 6, '#fff');
    s += R(x, 236, 232, 6, '#2f5d9e') + R(x, 244, 232, 5, '#e3b21b') + R(x, 251, 232, 4, '#b33a3a');
    s += R(x + 232, 218, 34, 42, '#dcdcdc', S4) + R(x + 254, 226, 9, 9, '#ffe9a8');
    s += R(x + 240, 204, 6, 14, '#b9b9b9') + R(x + 236, 196, 14, 10, '#e3b21b');
    s += R(x - 6, 258, 278, 7, '#8a8a8a') + '</g>';
    s += R(x + 28, 256, 34, 34, '#141414') + R(x + 40, 268, 10, 10, '#9a9a9a');
    s += R(x + 178, 256, 34, 34, '#141414') + R(x + 190, 268, 10, 10, '#9a9a9a');
    for (const p of ['', ' p2', ' p3']) s += `<rect class="puff${p}" x="${x - 14}" y="${256}" width="10" height="8" fill="#c8c8c8"/>`;
    return s;
  }
  function school(x) {
    const cx = DOOR_X;
    let s = '';
    s += R(x - 40, 52, 6, 238, '#9a9a9a') + R(x - 34, 56, 52, 18, MAROON) + R(x - 34, 74, 52, 14, GOLD);
    s += R(x, 110, 600, 180, '#e9dfcc', S4) + R(x + 2, 112, 596, 10, '#d8cbb2');
    s += R(x, 92, 600, 22, MAROON, S4) + R(x, 114, 600, 5, GOLD);
    s += T(cx, 108, 'CEBU INSTITUTE OF TECHNOLOGY - UNIVERSITY', 9, GOLD, 'middle');
    for (const y of [134, 184]) {
      for (let wx = x + 22; wx < x + 580; wx += 62) {
        if (wx > cx - 110 && wx < cx + 70) continue;
        s += R(wx, y, 38, 32, '#9fdcff', S3) + R(wx + 17, y, 3, 32, INK) + R(wx + 4, y + 4, 6, 6, '#fff');
      }
    }
    s += R(cx - 80, 128, 160, 162, '#d8cbb2', S4);
    s += R(cx - 88, 140, 176, 42, MAROON, S4) + T(cx, 170, 'CIT-U', 18, GOLD, 'middle');
    s += R(cx - 72, 190, 14, 100, PAPER, S4) + R(cx + 58, 190, 14, 100, PAPER, S4);
    // doorway: warm light behind two door leaves that swing open
    s += R(cx - 46, 186, 92, 104, INK);
    s += R(cx - 42, 190, 84, 98, '#ffe9a8') + R(cx - 42, 190, 84, 20, '#fff5d0');
    s += `<g id="door-l">${R(cx - 42, 190, 42, 98, '#5a3a22')}${R(cx - 36, 200, 30, 26, '#9fdcff', S3)}${R(cx - 8, 242, 4, 8, GOLD)}</g>`;
    s += `<g id="door-r">${R(cx, 190, 42, 98, '#4e321d')}${R(cx + 6, 200, 30, 26, '#9fdcff', S3)}${R(cx + 4, 242, 4, 8, GOLD)}</g>`;
    s += R(cx - 60, 284, 120, 6, '#bdb3a0') + R(cx - 70, 288, 140, 4, '#a89e8b');
    return s;
  }

  function buildWorld() {
    let w = `<defs><pattern id="dirt" width="32" height="32" patternUnits="userSpaceOnUse">
      <rect width="32" height="32" fill="#9a6a3a"/><rect x="4" y="6" width="6" height="4" fill="#7d5430"/>
      <rect x="20" y="18" width="8" height="4" fill="#7d5430"/><rect x="12" y="26" width="4" height="4" fill="#b0804c"/></pattern></defs>`;
    w += house(80);
    w += sign(520, 'START', 'AMA ITER &gt;');
    for (const x of [760, 1330, 2240, 2860, 3580]) w += bush(x);
    for (const x of [1080, 1250, 1860, 3660, 3960, 4100]) w += tree(x);
    w += palm(1700) + palm(3820);
    for (const x of [1000, 1620, 2170]) w += lamp(x);
    w += sign(840, '2015', "ST. SCHOLASTICA'S");
    w += sign(1400, '2020', 'DIVINO AMORE');
    w += sign(1940, '2022', 'ASIAN COLLEGE OF TECH');
    w += jeepney(2330);
    w += sign(2660, '2023', 'CIT-U &gt;&gt;');
    w += school(2950);
    w += R(0, 290, W_WORLD, 8, '#5ac35a') + R(0, 298, W_WORLD, 6, '#3f9a4a') + R(0, 304, W_WORLD, 56, 'url(#dirt)');
    // sidewalk curb + light spilling from the school door
    w += R(0, 304, W_WORLD, 4, '#7d5430');
    w += `<polygon id="spill" points="${DOOR_X - 42},290 ${DOOR_X + 42},290 ${DOOR_X + 120},336 ${DOOR_X - 120},336" fill="#ffe9a8" opacity="0"/>`;
    $('#layer-world').innerHTML = w;

    // far: hazy hills + city
    let f = '';
    let path = 'M0 290 ';
    for (let x = 0; x <= W_FAR; x += 40) {
      const y = Math.round((178 - 38 * Math.sin(x / 310) - 18 * Math.sin(x / 97)) / 8) * 8;
      path += `L${x} ${y} L${x + 40} ${y} `;
    }
    f += `<path d="${path} L${W_FAR} 290 Z" fill="#b4cdea"/>`;
    for (let x = 0; x < W_FAR;) {
      const bw = 40 + Math.round(rnd() * 60), bh = 50 + Math.round(rnd() * 110);
      f += R(x, 290 - bh, bw, bh, '#8eabd0');
      for (let wy = 300 - bh; wy < 280; wy += 16) for (let wx = x + 8; wx < x + bw - 8; wx += 14) if (rnd() > 0.45) f += R(wx, wy, 6, 6, '#d6e4f5');
      x += bw + 8 + Math.round(rnd() * 26);
    }
    $('#layer-far').innerHTML = f;

    // mid: houses and palms of the neighbourhood
    let m = '';
    for (let x = 20; x < W_MID;) {
      if (rnd() > 0.45) {
        const hw = 90 + Math.round(rnd() * 70), hh = 50 + Math.round(rnd() * 40);
        const wall = ['#c9b79a', '#b8c4a6', '#c4a6a0', '#a9b9c9'][Math.floor(rnd() * 4)];
        m += R(x, 290 - hh, hw, hh, wall);
        for (let i = 0; i < 4; i++) m += R(x - 6 + i * 10, 290 - hh - (i + 1) * 9, hw + 12 - i * 20, 9, '#8f5a52');
        m += R(x + 14, 290 - hh + 14, 18, 14, '#d9ecff') + R(x + hw - 32, 290 - hh + 14, 18, 14, '#d9ecff');
        x += hw + 30 + Math.round(rnd() * 60);
      } else {
        m += palm(x, '#5d9a6a', '#8f6e52');
        x += 90 + Math.round(rnd() * 80);
      }
    }
    $('#layer-mid').innerHTML = `<g opacity=".92">${m}</g>`;

    // foreground: grass tufts, flowers and pebbles that pass in front of him
    let fg = '';
    for (let x = 30; x < W_FG; x += 70 + Math.round(rnd() * 160)) {
      const kind = rnd();
      if (kind < 0.55) fg += R(x, 284, 4, 10, '#2f7d3f') + R(x + 6, 280, 4, 14, '#3f9a4a') + R(x + 12, 286, 4, 8, '#2f7d3f');
      else if (kind < 0.8) fg += R(x + 4, 282, 4, 12, '#3f9a4a') + R(x, 278, 12, 6, rnd() > 0.5 ? '#ff6b6b' : '#ffd23f') + R(x + 4, 280, 4, 2, '#fff');
      else fg += R(x, 300, 18, 8, '#8a8a8a') + R(x + 2, 298, 12, 4, '#a5a5a5');
    }
    $('#layer-fg').innerHTML = fg;

    // clouds (two copies so the drift loops seamlessly)
    let c = '';
    for (let x = 40; x < 1800; x += 160 + Math.round(rnd() * 200)) {
      const y = 30 + Math.round(rnd() * 100), s = 0.7 + rnd() * 0.6;
      const one = (ox) => `<g opacity=".92" transform="translate(${x + ox} ${y}) scale(${s.toFixed(2)})">${R(0, 0, 96, 18, '#fff')}${R(18, -14, 50, 14, '#fff')}${R(-14, 10, 124, 14, '#fff')}${R(-14, 22, 124, 4, '#e3eefa')}</g>`;
      c += one(0) + one(1800);
    }
    $('#layer-clouds').innerHTML = `<g class="drift">${c}</g>`;
  }

  /* ==========================================================
     THE SCHOOL HALLWAY — scrolls as he walks between sections
     ========================================================== */
  const W_HALL = 6000, HALL_START = 220, HALL_STEP = 520, HALL_BOY_X = 0.09;
  function buildHall() {
    let h = `<defs><pattern id="tiles" width="80" height="80" patternUnits="userSpaceOnUse">
      <rect width="80" height="80" fill="#ddd1b8"/><rect x="40" width="40" height="40" fill="#c4b699"/><rect y="40" width="40" height="40" fill="#c4b699"/></pattern></defs>`;
    h += R(0, 0, W_HALL, 276, '#efe3c8');
    h += R(0, 104, W_HALL, 12, MAROON) + R(0, 116, W_HALL, 4, GOLD);
    const rooms = ['ROOM 101', 'QUEST LAB', 'COMP LAB', 'CLUB ROOM', 'REGISTRAR', 'FACULTY', 'LIBRARY'];
    for (let i = 0, x = 0; x < W_HALL; i++, x += 900) {
      // windows
      for (const wx of [x + 40, x + 560]) h += R(wx, 22, 200, 66, '#9fdcff', S4) + R(wx + 98, 22, 4, 66, INK) + R(wx + 10, 30, 30, 10, '#fff') + R(wx + 120, 34, 40, 8, '#fff');
      // bulletin board
      h += R(x + 40, 150, 140, 90, '#c79a5b', S4);
      h += R(x + 52, 160, 36, 28, PAPER) + R(x + 96, 158, 30, 36, '#ffd23f') + R(x + 134, 164, 34, 26, '#9fdcff') + R(x + 60, 200, 46, 30, '#ffb3c1') + R(x + 116, 202, 44, 28, PAPER);
      // classroom door + room sign
      h += R(x + 280, 92, 120, 22, PAPER, S4) + T(x + 340, 108, rooms[i % rooms.length], 8, INK, 'middle');
      h += R(x + 290, 124, 100, 152, '#6b3e22', S4) + R(x + 312, 142, 56, 44, '#9fdcff', S3) + R(x + 372, 206, 6, 12, GOLD);
      // lockers
      for (let lx = x + 440; lx < x + 860; lx += 42) {
        h += R(lx, 140, 40, 136, MAROON, S3) + R(lx + 6, 148, 28, 3, '#5a111c') + R(lx + 6, 154, 28, 3, '#5a111c') + R(lx + 6, 160, 28, 3, '#5a111c') + R(lx + 30, 202, 4, 14, GOLD);
      }
      // little details
      if (i % 2 === 0) h += R(x + 210, 196, 18, 40, '#d62828', S3) + R(x + 214, 188, 10, 8, INK); // fire extinguisher
      else h += `<circle cx="${x + 220}" cy="70" r="20" fill="#fff" stroke="${INK}" stroke-width="4"/>` + R(x + 219, 56, 3, 15, INK) + R(x + 219, 69, 12, 3, INK);
    }
    h += R(0, 272, W_HALL, 8, INK);
    h += R(0, 280, W_HALL, 80, 'url(#tiles)');
    $('#hall-world').innerHTML = h;
  }

  /* --- sizes & rendering of the two scenes --- */
  const journeyEl = $('#journey'), hallEl = $('#hallway');
  const layers = {
    world: [$('#layer-world'), W_WORLD, 1],
    far: [$('#layer-far'), W_FAR, 0.35],
    mid: [$('#layer-mid'), W_MID, 0.62],
    fg: [$('#layer-fg'), W_FG, 1.35],
    clouds: [$('#layer-clouds'), W_CLOUD, 0.12]
  };
  const hallWorld = $('#hall-world');
  const J = { p: 0 }, E = { t: 0 }, H = { x: 0 };
  let jScale = 1, jW = 0, hScale = 1, hW = 0;

  function sizeScenes() {
    jW = journeyEl.clientWidth;
    jScale = journeyEl.clientHeight / VH;
    for (const [el, w] of Object.values(layers)) el.style.width = `${w * jScale}px`;
    hW = hallEl.clientWidth;
    hScale = hallEl.clientHeight / VH;
    hallWorld.style.width = `${W_HALL * hScale}px`;
    renderJourney(); renderHall();
  }
  function renderJourney() {
    const boyX = jW * BOY_X;
    const tx0 = Math.min(0, boyX - START_X * jScale);
    const tx1 = boyX - DOOR_X * jScale;
    const tx = tx0 + (tx1 - tx0) * J.p;
    for (const [el, , k] of Object.values(layers)) el.style.transform = `translate3d(${tx * k}px,0,0)`;
  }
  function renderHall() {
    const tx = hW * HALL_BOY_X - (HALL_START + H.x) * hScale;
    hallWorld.style.transform = `translate3d(${tx}px,0,0)`;
  }

  buildWorld();
  buildHall();
  const boy = createWalker($('#boy-inner'), BOY_UNITS_PER_PX);
  const hallBoy = createWalker($('#hall-boy-inner'), BOY_UNITS_PER_PX);
  gsap.ticker.add(() => {
    const now = performance.now();
    boy.update(J.p * (DOOR_X - START_X) + E.t * 90, now, Sound.step);
    hallBoy.update(H.x, now, Sound.step);
  });
  gsap.set('#boy, #hall-boy', { xPercent: -50 });
  gsap.set('#bubble', { xPercent: -12 });

  /* --------------------------------------------------------
     PIXEL LOOK FOR REAL IMAGES — downsample into a tiny canvas,
     then scale it up with hard edges (hover shows the original)
     -------------------------------------------------------- */
  function pixelate(img) {
    const n = +img.dataset.pixel;
    const draw = () => {
      const w = img.naturalWidth || 128, h = img.naturalHeight || 128;
      const c = document.createElement('canvas');
      c.width = n; c.height = Math.max(1, Math.round(n * h / w));
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      try { ctx.drawImage(img, 0, 0, c.width, c.height); } catch (e) { return; }
      c.className = 'px-canvas';
      c.setAttribute('aria-hidden', 'true');
      img.after(c);
      img.classList.add('px-src');
    };
    if (img.complete && img.naturalWidth) draw();
    else img.addEventListener('load', draw, { once: true });
  }
  $$('img[data-pixel]').forEach(pixelate);

  // Pixel-art hobby icons (12×12)
  const ICON_PAL = { k: INK, g: '#6b6b80', r: '#e63946', b: '#4aa8ff', s: '#9a9a9a', w: '#ffffff', y: '#f4c542', h: '#6b3e22', n: '#2b2b3a', m: MAROON, o: '#e8792b' };
  const ICONS = {
    gaming: ['............', '............', '..kkkkkkkk..', '.kggggggggk.', 'kggkgggggrgk', 'kgkkkgggrgbk', 'kggkgggggbgk', 'kggggggggggk', 'kggkkkkkkggk', '.kkk....kkk.', '............', '............'],
    cooking: ['............', '...kkkkkk...', '..kssssssk..', '.ksswwwwssk.', 'kssswyywwssk', 'ksswwyywwssk', 'ksswwwwwsssk', '.kssswwsssk.', '..kssssssk..', '...kkkkkkhhh', '..........hh', '............'],
    editing: ['............', 'kkkkkkkkkkkk', 'kwkwkwkwkwkk', 'kkkkkkkkkkkk', 'kbbbbkkyyyyk', 'kbbbbkkyyyyk', 'kbbbbkkyyyyk', 'kkkkkkkkkkkk', 'kwkwkwkwkwkk', 'kkkkkkkkkkkk', '............', '............'],
    sports: (() => { // basketball, drawn procedurally
      const rows = [];
      for (let y = 0; y < 12; y++) {
        let r = '';
        for (let x = 0; x < 12; x++) {
          const dx = x - 5.5, dy = y - 5.5, d = Math.hypot(dx, dy);
          if (d > 5.6) r += '.';
          else if (d > 4.7 || Math.abs(dx) < 0.6 || Math.abs(dy) < 0.6 || Math.abs(Math.hypot(dx + 8.5, dy) - 6.2) < 0.6 || Math.abs(Math.hypot(dx - 8.5, dy) - 6.2) < 0.6) r += 'k';
          else r += 'o';
        }
        rows.push(r);
      }
      return rows;
    })(),
    reading: ['............', '.kkkk..kkkk.', 'kwwwwkkwwwwk', 'kwkkwkkwkkwk', 'kwwwwkkwwwwk', 'kwkkwkkwkkwk', 'kwwwwkkwwwwk', 'kwkkwkkwkkwk', 'kwwwwkkwwwwk', 'kmmmmkkmmmmk', '.kkkkkkkkkk.', '............'],
    movies: ['...wyw.wy...', '..wwywwwyw..', '.ywwwwywwwy.', '.kkkkkkkkkk.', '.krrwwrrwwk.', '.krrwwrrwwk.', '..krwwrrwk..', '..krwwrrwk..', '..krwwrrwk..', '...kwwrrk...', '...kkkkkk...', '............']
  };
  ICON_PAL.r = '#e63946';
  $$('.px-icon').forEach((el) => {
    const map = ICONS[el.dataset.icon];
    if (!map) return;
    let s = '';
    map.forEach((row, y) => [...row.padEnd(12, '.')].slice(0, 12).forEach((ch, x) => {
      if (ch !== '.') s += `<rect x="${x}" y="${y}" width="1" height="1" fill="${ICON_PAL[ch]}"/>`;
    }));
    el.innerHTML = `<svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">${s}</svg>`;
  });

  measure(); renderCam(); sizeScenes();
  addEventListener('resize', () => { measure(); renderCam(); sizeScenes(); });
  if (!reduceMotion && matchMedia('(pointer: fine)').matches) {
    addEventListener('mousemove', (e) => {
      gsap.to(look, {
        x: (e.clientX / innerWidth - 0.5) * -2,
        y: (e.clientY / innerHeight - 0.5) * -2,
        duration: 1.2, ease: 'power2.out', overwrite: true, onUpdate: renderCam
      });
    });
  }

  /* --------------------------------------------------------
     MASTER TIMELINE (units are "beats"; scroll length derives from total)
     -------------------------------------------------------- */
  const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true });
  const camTween = (from, to, dur, ease) => ({
    from: { p: from },
    to: { p: to, duration: dur, ease, immediateRender: false, onUpdate: renderCam }
  });

  // 1 — the room wakes up
  let c = camTween(0, 0.12, 8, 'sine.inOut');
  tl.to('#hint', { autoAlpha: 0, duration: 2 }, 0)
    .fromTo(cam, c.from, c.to, 0)
    .addLabel('lamp', 2)
    .to('#shade', { opacity: 0.12, duration: 1.2 }, 'lamp')
    .to('#lamp-light', { opacity: 1, duration: 0.6 }, 'lamp')
    .to('#bulb', { attr: { fill: '#fff1c4' }, duration: 0.3 }, 'lamp')
    .addLabel('monitor', 5)
    .fromTo('#scr-flash', { opacity: 0 }, { opacity: 0.9, duration: 0.25, yoyo: true, repeat: 1, immediateRender: false }, 'monitor')
    .to('#scr-on', { opacity: 1, duration: 0.8 }, 'monitor+=0.3')
    .to('#scr-glow', { opacity: 1, duration: 1.5 }, 'monitor+=0.3')
    .to('#led', { attr: { fill: '#7dffad' }, duration: 0.2 }, 'monitor');

  // 2 — fly into the screen
  c = camTween(0.12, 1, 10, 'power2.inOut');
  tl.fromTo(cam, c.from, c.to, 8)
    .addLabel('boot', 16.5)
    .to('#os', { autoAlpha: 1, duration: 1.5 }, 'boot');

  // 3 — boot sequence
  const bootLines = $$('#boot p');
  const BOOT_START = 1.2, BOOT_GAP = 0.7;
  tl.fromTo(bootLines, { autoAlpha: 0, x: -10 },
    { autoAlpha: 1, x: 0, duration: 0.3, stagger: BOOT_GAP, immediateRender: false }, `boot+=${BOOT_START}`);

  // 4 — title card over the morning street
  tl.addLabel('journey', `boot+=${BOOT_START + bootLines.length * BOOT_GAP + 1.5}`)
    .to('#boot', { autoAlpha: 0, y: -30, duration: 0.8 }, 'journey')
    .to('#journey', { autoAlpha: 1, duration: 1.2 }, 'journey+=0.3')
    .fromTo('#title-card', { autoAlpha: 0, y: -24 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'power2.out', immediateRender: false }, 'journey+=0.9')
    .to({}, { duration: 2.5 })

  // 5 — the walk: home → schools he passed → CIT-U, morning turning to day
    .addLabel('walk')
    .to('#title-card', { autoAlpha: 0, y: -40, duration: 1 }, 'walk')
    .fromTo(J, { p: 0 }, { p: 1, duration: WALK, ease: 'sine.inOut', immediateRender: false, onUpdate: renderJourney }, 'walk+=0.4')
    .to('#sky-day', { opacity: 1, duration: WALK * 0.6 }, 'walk+=0.4')
    .to('#tint', { opacity: 0, duration: WALK * 0.7 }, 'walk+=0.4')
    .fromTo('#sun', { top: '64%' }, { top: '9%', duration: WALK * 0.8, immediateRender: false }, 'walk+=0.4')

  // 6 — arrive, doors swing open, he walks into the light, iris out
    .addLabel('arrive', `walk+=${WALK + 0.4}`)
    .fromTo('#bubble', { autoAlpha: 0, yPercent: 30 }, { autoAlpha: 1, yPercent: 0, duration: 0.5, immediateRender: false }, 'arrive')
    .to('#door-l', { scaleX: 0.12, svgOrigin: `${DOOR_X - 42} 239`, duration: 0.9, ease: 'power2.inOut' }, 'arrive+=1')
    .to('#door-r', { scaleX: 0.12, svgOrigin: `${DOOR_X + 42} 239`, duration: 0.9, ease: 'power2.inOut' }, 'arrive+=1')
    .to('#spill', { opacity: 0.55, duration: 0.9 }, 'arrive+=1')
    .to('#bubble', { autoAlpha: 0, duration: 0.4 }, 'arrive+=1.8')
    .to(E, { t: 1, duration: 1.6 }, 'arrive+=2')
    .to('#boy', { scale: 0.8, yPercent: -7, filter: 'brightness(1.6)', duration: 1.6, ease: 'power1.in' }, 'arrive+=2')
    .to('#boy', { autoAlpha: 0, duration: 0.6 }, 'arrive+=3')
    .to('#hallway', { autoAlpha: 1, duration: 0.3 }, 'arrive+=3.4')
    .fromTo('#journey', { clipPath: 'circle(150% at 30% 66%)' },
      { clipPath: 'circle(0% at 30% 66%)', duration: 1.6, ease: 'power2.in', immediateRender: false }, 'arrive+=3.5')
    .to({}, { duration: 0.3 });

  // 7 — portfolio windows; between each one he walks down the hallway
  let current = null, hx = 0;
  function scene(label, sel, hold = HOLD) {
    tl.addLabel(label);
    tl.fromTo(H, { x: hx }, { x: hx + HALL_STEP, duration: 1.8, ease: 'sine.inOut', immediateRender: false, onUpdate: renderHall }, label);
    hx += HALL_STEP;
    if (current) tl.to(current, { autoAlpha: 0, y: -50, scale: 0.97, duration: 0.8, ease: 'power1.in' }, label);
    tl.fromTo(sel, { autoAlpha: 0, y: 60, scale: 0.96 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 1.4, ease: 'back.out(1.4)', immediateRender: false }, `${label}+=1`)
      .to({}, { duration: hold });
    current = sel;
  }
  const projects = $$('.win.proj');
  scene('about', '#about');
  projects.forEach((el, i) => scene(`proj${i}`, `#${el.id}`));
  scene('skills', '#skills');
  scene('hobbies', '#hobbies');
  scene('education', '#education');
  scene('contact', '#contact', HOLD + 2);

  // 8 — power off + pull back out of the screen
  c = camTween(1, 0, 8, 'power2.inOut');
  tl.addLabel('off')
    .to('#scr-on', { opacity: 0, duration: 0.2 }, 'off')
    .to('#scr-glow', { opacity: 0, duration: 0.6 }, 'off')
    .to('#led', { attr: { fill: '#3b3b31' }, duration: 0.2 }, 'off')
    .to('.os-frame', { scaleY: 0.005, filter: 'brightness(4)', duration: 1, ease: 'power3.in' }, 'off')
    .to('.os-frame', { scaleX: 0, duration: 0.6, ease: 'power3.in' }, 'off+=1')
    .to('#os', { autoAlpha: 0, duration: 0.3 }, 'off+=1.6')
    .fromTo(cam, c.from, c.to, 'off+=2')
    .addLabel('lampOff', 'off+=8')
    .to('#lamp-light', { opacity: 0, duration: 0.4 }, 'lampOff')
    .to('#bulb', { attr: { fill: '#3a3020' }, duration: 0.2 }, 'lampOff')
    .to('#shade', { opacity: 0.82, duration: 0.8 }, 'lampOff')
    .fromTo('#outro', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 2, immediateRender: false }, 'lampOff+=1')
    .to({}, { duration: 3 });

  /* --------------------------------------------------------
     SCROLL → TIMELINE
     -------------------------------------------------------- */
  $('#track').style.height = `${Math.round(tl.duration() * VH_PER_BEAT)}vh`;
  ScrollTrigger.create({
    animation: tl,
    trigger: '#track',
    start: 'top top',
    end: 'bottom bottom',
    scrub: lenis ? 0.6 : 1
  });

  /* --------------------------------------------------------
     HUD, CHAPTERS & SOUND CUES
     -------------------------------------------------------- */
  const L = tl.labels;
  const pad = (n) => String(n).padStart(2, '0');
  const chapters = [
    { t: 0, n: '00', name: 'THE ROOM', task: 'IDLE' },
    { t: L.boot, n: '01', name: 'BOOT SEQUENCE', task: 'BOOT.SYS' },
    { t: L.journey, n: '02', name: 'THE JOURNEY', task: 'WORLD 1 · CEBU, PH' },
    { t: L.about, n: '03', name: 'PLAYER PROFILE', task: 'STAGE 1 · ABOUT' },
    ...projects.map((el, i) => ({
      t: L[`proj${i}`], n: '04',
      name: `QUESTS ${pad(i + 1)}/${pad(projects.length)}`,
      task: el.querySelector('.win-bar span').textContent
    })),
    { t: L.skills, n: '05', name: 'INVENTORY', task: 'STAGE 3 · TECH STACK' },
    { t: L.hobbies, n: '06', name: 'SIDE QUESTS', task: 'STAGE 4 · OFF THE CLOCK' },
    { t: L.education, n: '07', name: 'LEVELS CLEARED', task: 'STAGE 5 · EDUCATION' },
    { t: L.contact, n: '08', name: 'SAVE POINT', task: 'STAGE 6 · CONTACT' },
    { t: L.off, n: '09', name: 'POWER OFF', task: 'SHUTDOWN' }
  ];

  const cues = [
    [L.lamp, () => Sound.click()],
    [L.monitor, () => Sound.powerOn()],
    ...bootLines.map((_, i) => [L.boot + BOOT_START + i * BOOT_GAP, () => Sound.key()]),
    [L.journey + 0.9, () => Sound.start()],
    [L.arrive, () => Sound.talk()],
    [L.arrive + 1, () => Sound.door()],
    [L.arrive + 3.5, () => Sound.iris()],
    ...['about', ...projects.map((_, i) => `proj${i}`), 'skills', 'hobbies', 'education', 'contact'].map((k) => [L[k] + 1, () => Sound.open()]),
    [L.off, () => Sound.off()],
    [L.lampOff, () => Sound.click()]
  ];

  const chapterEl = $('#chapter'), progressEl = $('#progress'), taskEl = $('#task-label');
  let chapIdx = -1, lastT = 0;

  tl.eventCallback('onUpdate', () => {
    const t = tl.time();
    if (t > lastT) for (const [ct, fn] of cues) if (lastT < ct && t >= ct) fn();
    lastT = t;

    Sound.hum(t >= L.monitor && t < L.journey);
    progressEl.textContent = `${String(Math.round(tl.progress() * 100)).padStart(3, '0')}%`;

    let i = 0;
    for (let k = 0; k < chapters.length; k++) if (t >= chapters[k].t - 0.001) i = k;
    if (i !== chapIdx) {
      chapIdx = i;
      chapterEl.textContent = `CH.${chapters[i].n} — ${chapters[i].name}`;
      taskEl.textContent = chapters[i].task;
    }
  });

  /* --------------------------------------------------------
     CLOCKS (wall clock in the room + game HUD)
     -------------------------------------------------------- */
  const hands = { h: $('#hand-h'), m: $('#hand-m'), s: $('#hand-s') };
  const osClock = $('#os-clock');
  function tick() {
    const d = new Date();
    const s = d.getSeconds(), m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
    hands.h.setAttribute('transform', `rotate(${h * 30} 1070 140)`);
    hands.m.setAttribute('transform', `rotate(${m * 6} 1070 140)`);
    hands.s.setAttribute('transform', `rotate(${s * 6} 1070 140)`);
    osClock.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  tick(); setInterval(tick, 1000);

  /* --------------------------------------------------------
     GATE → ENTER
     -------------------------------------------------------- */
  const soundBtn = $('#sound-toggle');
  function syncSoundBtn() {
    soundBtn.textContent = Sound.on ? 'SOUND ● ON' : 'SOUND ○ OFF';
    soundBtn.setAttribute('aria-pressed', String(Sound.on));
  }
  soundBtn.addEventListener('click', () => { Sound.setEnabled(!Sound.on); syncSoundBtn(); });

  let entered = false;
  function enter(withSound) {
    if (entered) return;
    entered = true;
    Sound.setEnabled(withSound);
    syncSoundBtn();

    gsap.timeline({
      onComplete() {
        $('#gate').remove();
        document.body.classList.remove('locked');
        if (lenis) lenis.start();
        measure(); renderCam(); sizeScenes();
        ScrollTrigger.refresh();
      }
    })
      .to('.gate-title .ln > span', { yPercent: -110, duration: 0.8, stagger: 0.08, ease: 'power3.in' })
      .to('.gate-sub, .gate-actions, .gate-note, .mini-pc, .gate .bar, .gate-foot', { autoAlpha: 0, duration: 0.5 }, 0)
      .to('#gate', { autoAlpha: 0, duration: 0.8 }, 0.6)
      .fromTo('#room', { opacity: 0 }, { opacity: 1, duration: 1.6 }, 0.8)
      .fromTo('#hud, #hud-bottom', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 1.4);
  }
  $$('[data-enter]').forEach((b) => b.addEventListener('click', () => enter(b.dataset.enter === 'sound')));

  gsap.from('.gate-title .ln > span', { yPercent: 110, duration: 1.1, stagger: 0.12, ease: 'power4.out', delay: 0.15 });
  gsap.from('.mini-pc, .gate-sub, .gate-actions, .gate-note', { autoAlpha: 0, y: 16, duration: 0.9, stagger: 0.08, delay: 0.5 });

  /* --------------------------------------------------------
     REWIND
     -------------------------------------------------------- */
  $('#rewind').addEventListener('click', () => {
    if (lenis) lenis.scrollTo(0, { duration: 6, easing: (x) => 1 - Math.pow(1 - x, 3) });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
