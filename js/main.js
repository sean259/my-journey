/* ==========================================================
   SEAN LORICO — PORTFOLIO
   Scroll drives one GSAP timeline:
   room → lamp on → monitor on → zoom into screen → boot →
   title card → the journey (walk from home to CIT-U) → enter school →
   profile → quests → inventory → side quests → levels → save point →
   power off → outro
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

      // rain on the window
      const rain = ctx.createBufferSource();
      rain.buffer = noiseBuf; rain.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600;
      const rg = ctx.createGain(); rg.gain.value = 0.03;
      rain.connect(hp).connect(lp).connect(rg).connect(master);
      rain.start();

      // CRT hum
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
      start() { seq([523, 659, 784, 1046, 784, 1046], 85, 'square', 0.035); },   // game start jingle
      step() { noise(0.04, 0.22, 380 + Math.random() * 120, 2); },
      talk() { seq([880, 988, 880], 50, 'square', 0.03, 0.05); },
      door() { seq([392, 523, 659, 784], 110, 'triangle', 0.06, 0.3); },
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

  /* --------------------------------------------------------
     THE JOURNEY — pixel world + walking sprite
     World units: 360 tall, ground line at y = 290.
     -------------------------------------------------------- */
  const VH = 360, W_WORLD = 4200, W_FAR = 2600, W_CLOUD = 1800;
  const START_X = 380, DOOR_X = 3250, BOY_X = 0.3;
  const INK = '#1b1b2f', PAPER = '#fff6e0', MAROON = '#8a1c2b', GOLD = '#f4c542';

  const R = (x, y, w, h, f, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${extra}/>`;
  const T = (x, y, t, size, fill, anchor = 'start') =>
    `<text x="${x}" y="${y}" font-family="'Press Start 2P', monospace" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${t}</text>`;
  const S4 = `stroke="${INK}" stroke-width="4"`;
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  function tree(x) {
    return R(x + 22, 226, 14, 64, '#6b3e22') +
      R(x - 6, 186, 70, 30, '#2f7d3f') + R(x, 164, 58, 30, '#3f9a4a') +
      R(x + 10, 146, 38, 22, '#4fb35a') + R(x + 14, 154, 12, 8, '#7fd67f') + R(x + 4, 178, 10, 8, '#7fd67f');
  }
  const bush = (x) => R(x, 266, 64, 24, '#2f7d3f') + R(x + 10, 254, 42, 14, '#3f9a4a') + R(x + 16, 258, 8, 6, '#7fd67f');
  const lamp = (x) => R(x, 160, 8, 130, '#2b2b3a') + R(x - 10, 148, 28, 14, '#2b2b3a') + R(x - 6, 162, 20, 6, '#ffe9a8');
  function sign(x, top, bottom) {
    const w = Math.max(150, bottom.length * 9 + 28);
    return R(x + w / 2 - 5, 238, 10, 52, '#6b3e22') +
      R(x, 182, w, 58, PAPER, S4) +
      T(x + 14, 208, top, 14, MAROON) + T(x + 14, 228, bottom, 9, INK);
  }
  function house(x) {
    let s = R(x + 20, 180, 220, 110, '#f2d7a6', S4);
    for (let i = 0; i < 6; i++) s += R(x + 4 + i * 14, 180 - (i + 1) * 14, 252 - i * 28, 14, '#b3403a');
    s += R(x + 180, 112, 22, 40, '#7a2c28');                                  // chimney
    s += R(x + 70, 220, 44, 70, '#6b3e22', S4) + R(x + 104, 252, 5, 5, GOLD); // door
    s += R(x + 150, 206, 56, 44, '#9fdcff', S4) + R(x + 176, 206, 4, 44, INK) + R(x + 150, 226, 56, 4, INK);
    s += R(x + 266, 248, 6, 42, '#6b3e22') + R(x + 254, 230, 30, 20, '#2f5d9e', S4); // mailbox
    s += T(x + 92, 214, 'HOME', 8, INK, 'middle');
    return s;
  }
  function jeepney(x) {
    let s = R(x + 60, 166, 110, 18, GOLD, S4) + T(x + 115, 180, 'CIT-U', 9, INK, 'middle');
    s += R(x + 6, 184, 220, 14, '#b33a3a', S4);
    s += R(x, 198, 232, 62, '#dcdcdc', S4);
    for (let i = 0; i < 5; i++) s += R(x + 16 + i * 40, 206, 30, 22, '#9fdcff', 'stroke="#1b1b2f" stroke-width="3"');
    s += R(x, 236, 232, 6, '#2f5d9e') + R(x, 244, 232, 5, '#e3b21b') + R(x, 251, 232, 4, '#b33a3a');
    s += R(x + 232, 218, 34, 42, '#dcdcdc', S4) + R(x + 254, 226, 9, 9, '#ffe9a8');
    s += R(x + 240, 204, 6, 14, '#b9b9b9') + R(x + 236, 196, 14, 10, '#e3b21b'); // hood ornament
    s += R(x - 6, 258, 278, 7, '#8a8a8a');
    s += R(x + 28, 256, 34, 34, '#141414') + R(x + 40, 268, 10, 10, '#9a9a9a');
    s += R(x + 178, 256, 34, 34, '#141414') + R(x + 190, 268, 10, 10, '#9a9a9a');
    return s;
  }
  function school(x) { // x = left edge; door centre lands on DOOR_X
    const cx = DOOR_X;
    let s = '';
    s += R(x - 40, 52, 6, 238, '#9a9a9a') + R(x - 34, 56, 52, 18, MAROON) + R(x - 34, 74, 52, 14, GOLD); // flag
    s += R(x, 110, 600, 180, '#e9dfcc', S4);
    s += R(x, 92, 600, 22, MAROON, S4) + R(x, 114, 600, 5, GOLD);
    s += T(cx, 108, 'CEBU INSTITUTE OF TECHNOLOGY - UNIVERSITY', 9, GOLD, 'middle');
    for (const y of [134, 184]) {
      for (let wx = x + 22; wx < x + 580; wx += 62) {
        if (wx > cx - 100 && wx < cx + 60) continue;
        s += R(wx, y, 38, 32, '#9fdcff', 'stroke="#1b1b2f" stroke-width="3"') + R(wx + 17, y, 3, 32, INK);
      }
    }
    s += R(cx - 76, 128, 152, 162, '#d8cbb2', S4);
    s += R(cx - 84, 140, 168, 42, MAROON, S4) + T(cx, 170, 'CIT-U', 18, GOLD, 'middle');
    s += R(cx - 70, 190, 14, 100, PAPER, S4) + R(cx + 56, 190, 14, 100, PAPER, S4);
    s += R(cx - 44, 188, 88, 102, '#3a2416', S4);
    s += `<rect id="door-open" x="${cx - 42}" y="190" width="84" height="98" fill="#ffe9a8" opacity="0"/>`;
    s += R(cx - 2, 190, 4, 98, INK);
    s += R(cx - 56, 284, 112, 6, '#bdb3a0') + R(cx - 66, 288, 132, 4, '#a89e8b');
    return s;
  }

  function buildWorld() {
    // world (moves 1:1)
    let w = `<defs><pattern id="dirt" width="32" height="32" patternUnits="userSpaceOnUse">
      <rect width="32" height="32" fill="#9a6a3a"/><rect x="4" y="6" width="6" height="4" fill="#7d5430"/>
      <rect x="20" y="18" width="8" height="4" fill="#7d5430"/><rect x="12" y="26" width="4" height="4" fill="#b0804c"/></pattern></defs>`;
    w += house(80);
    w += sign(520, 'START', 'AMA ITER &gt;');
    for (const x of [760, 1330, 2240, 2860, 3580]) w += bush(x);
    for (const x of [1080, 1250, 1700, 1860, 3660, 3800, 3960, 4100]) w += tree(x);
    for (const x of [1000, 1620, 2170]) w += lamp(x);
    w += sign(840, '2015', "ST. SCHOLASTICA'S");
    w += sign(1400, '2020', 'DIVINO AMORE');
    w += sign(1940, '2022', 'ASIAN COLLEGE OF TECH');
    w += jeepney(2330);
    w += sign(2660, '2023', 'CIT-U &gt;&gt;');
    w += school(2950);
    w += R(0, 290, W_WORLD, 8, '#5ac35a') + R(0, 298, W_WORLD, 6, '#3f9a4a') + R(0, 304, W_WORLD, 56, 'url(#dirt)');
    $('#layer-world').innerHTML = w;

    // far skyline: Cebu hills + city
    let f = '';
    let path = 'M0 290 ';
    for (let x = 0; x <= W_FAR; x += 40) {
      const y = Math.round((178 - 38 * Math.sin(x / 310) - 18 * Math.sin(x / 97)) / 8) * 8;
      path += `L${x} ${y} L${x + 40} ${y} `;
    }
    f += `<path d="${path} L${W_FAR} 290 Z" fill="#a9c4e6"/>`;
    for (let x = 0; x < W_FAR;) {
      const bw = 40 + Math.round(rnd() * 60), bh = 50 + Math.round(rnd() * 110);
      f += R(x, 290 - bh, bw, bh, '#7f9fc9');
      for (let wy = 300 - bh; wy < 280; wy += 16) for (let wx = x + 8; wx < x + bw - 8; wx += 14) if (rnd() > 0.45) f += R(wx, wy, 6, 6, '#cfe0f5');
      x += bw + 8 + Math.round(rnd() * 26);
    }
    $('#layer-far').innerHTML = f;

    // clouds
    let c = '';
    for (let x = 40; x < W_CLOUD; x += 160 + Math.round(rnd() * 200)) {
      const y = 30 + Math.round(rnd() * 100);
      c += `<g opacity=".92">${R(x, y, 96, 18, '#fff')}${R(x + 18, y - 14, 50, 14, '#fff')}${R(x - 14, y + 10, 124, 14, '#fff')}</g>`;
    }
    $('#layer-clouds').innerHTML = c;
  }

  /* --- the boy (16×24 pixel sprite, facing right) --- */
  const PAL = { H: '#5a3520', S: '#e8b088', s: '#c98d64', G: '#2a2a2a', O: '#ff8a1e', W: '#f4f4ef', w: '#cfcfc8', L: MAROON, B: '#2f5d9e', P: '#2b2b3a', K: '#141414' };
  const TOP = [
    '......HHHHH.....',
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '...HHHHHHHHHHH..',
    '...HHHHHHHHHHH..',
    '...HHHSSSSSSSS..',
    '...HHSSGGGGGGGG.',
    '...HHSSGOOOGOOG.',
    '....HSSSSSSSSS..',
    '....SSSSSSSSSS..',
    '.....SSSSSSss...',
    '......SSSSS.....',
    '...BBWWWWWWW....',
    '..BBBWWLWWWWW...',
    '..BBBWWLWWWWW...',
    '..BBBWWLWWWWW...',
    '..BBBWWLWWWWW...',
    '...BBwwLwwww....',
    '.....PPPPPP.....'
  ];
  const STRIDE = ['....PPP..PPP....', '...PPP....PPP...', '...PP......PP...', '..PP........PP..', '.KKK........KKK.'];
  const STAND  = ['.....PPPPPP.....', '.....PPP.PPP....', '.....PP...PP....', '.....PP...PP....', '....KKK...KKK...'];
  const ARM_FWD = [[13, 13, 'w'], [14, 14, 'w'], [14, 15, 'S'], [15, 15, 'S']];
  const ARM_DOWN = [[13, 14, 'w'], [13, 15, 'w'], [13, 16, 'S'], [13, 17, 'S']];

  function spriteSVG(rows, extra) {
    const grid = rows.map((r) => r.padEnd(16, '.').slice(0, 16).split(''));
    for (const [x, y, c] of extra) grid[y][x] = c;
    let out = '';
    grid.forEach((row, y) => {
      for (let x = 0; x < 16;) {
        const c = row[x];
        if (c === '.') { x++; continue; }
        let run = 1;
        while (x + run < 16 && row[x + run] === c) run++;
        out += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${PAL[c]}"/>`;
        x += run;
      }
    });
    return out;
  }
  const FRAMES = {
    A: spriteSVG([...TOP, ...STRIDE], ARM_FWD),
    B: spriteSVG([...TOP, ...STAND], ARM_DOWN),
    C: spriteSVG([...TOP, ...STRIDE], [])
  };
  const boyInner = $('#boy-inner');
  boyInner.innerHTML = Object.entries(FRAMES).map(([k, v]) => `<g data-f="${k}" style="display:none">${v}</g>`).join('');
  const frameEls = Object.fromEntries($$('[data-f]', boyInner).map((g) => [g.dataset.f, g]));

  const journeyEl = $('#journey'), worldEl = $('#layer-world'), farEl = $('#layer-far'), cloudEl = $('#layer-clouds');
  const J = { p: 0 };
  let jScale = 1, jW = 0;

  function sizeJourney() {
    jW = journeyEl.clientWidth;
    jScale = journeyEl.clientHeight / VH;
    worldEl.style.width = `${W_WORLD * jScale}px`;
    farEl.style.width = `${W_FAR * jScale}px`;
    cloudEl.style.width = `${W_CLOUD * jScale}px`;
    renderJourney();
  }
  function renderJourney() {
    const boyX = jW * BOY_X;
    const tx0 = Math.min(0, boyX - START_X * jScale);
    const tx1 = boyX - DOOR_X * jScale;
    const tx = tx0 + (tx1 - tx0) * J.p;
    worldEl.style.transform = `translate3d(${tx}px,0,0)`;
    farEl.style.transform = `translate3d(${tx * 0.35}px,0,0)`;
    cloudEl.style.transform = `translate3d(${tx * 0.12}px,0,0)`;
  }

  // walk cycle follows scroll distance; stands still when you stop scrolling
  const CYCLE = ['A', 'B', 'C', 'B'];
  let lastJP = 0, lastMove = -1e9, dir = 1, shownDir = 1, curFrame = '';
  function showFrame(f) {
    if (f === curFrame) return;
    if (curFrame) frameEls[curFrame].style.display = 'none';
    frameEls[f].style.display = '';
    curFrame = f;
  }
  showFrame('B');
  gsap.ticker.add(() => {
    const now = performance.now();
    if (J.p !== lastJP) { dir = J.p > lastJP ? 1 : -1; lastMove = now; lastJP = J.p; }
    const walking = now - lastMove < 160 && J.p > 0 && J.p < 1;
    if (!walking && now - lastMove > 600) dir = 1; // when he stops, he faces the school again
    const units = J.p * (DOOR_X - START_X);
    const f = walking ? CYCLE[Math.floor(units / 16) % 4] : 'B';
    if (f !== curFrame && walking && f !== 'B') Sound.step();
    showFrame(f);
    if (dir !== shownDir) {
      boyInner.setAttribute('transform', dir < 0 ? 'translate(16 0) scale(-1 1)' : '');
      shownDir = dir;
    }
  });

  buildWorld();
  gsap.set('#boy', { xPercent: -50 });
  gsap.set('#bubble', { xPercent: -12 });

  measure(); renderCam(); sizeJourney();
  addEventListener('resize', () => { measure(); renderCam(); sizeJourney(); });
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
  let c = camTween(0, 0.12, 9, 'sine.inOut');
  tl.to('#hint', { autoAlpha: 0, duration: 2 }, 0)
    .fromTo(cam, c.from, c.to, 0)
    .addLabel('lamp', 2.5)
    .to('#shade', { opacity: 0.12, duration: 1.2 }, 'lamp')
    .to('#lamp-light', { opacity: 1, duration: 0.6 }, 'lamp')
    .to('#bulb', { attr: { fill: '#fff1c4' }, duration: 0.3 }, 'lamp')
    .addLabel('monitor', 6)
    .fromTo('#scr-flash', { opacity: 0 }, { opacity: 0.9, duration: 0.25, yoyo: true, repeat: 1, immediateRender: false }, 'monitor')
    .to('#scr-on', { opacity: 1, duration: 0.8 }, 'monitor+=0.3')
    .to('#scr-glow', { opacity: 1, duration: 1.5 }, 'monitor+=0.3')
    .to('#led', { attr: { fill: '#7dffad' }, duration: 0.2 }, 'monitor');

  // 2 — fly into the screen
  c = camTween(0.12, 1, 12, 'power2.inOut');
  tl.fromTo(cam, c.from, c.to, 9)
    .addLabel('boot', 19.5)
    .to('#os', { autoAlpha: 1, duration: 1.5 }, 'boot');

  // 3 — boot sequence
  const bootLines = $$('#boot p');
  const BOOT_START = 1.5, BOOT_GAP = 0.9;
  tl.fromTo(bootLines, { autoAlpha: 0, x: -10 },
    { autoAlpha: 1, x: 0, duration: 0.3, stagger: BOOT_GAP, immediateRender: false }, `boot+=${BOOT_START}`);

  // 4 — title card over the morning street
  const WALK = 24;
  tl.addLabel('journey', `boot+=${BOOT_START + bootLines.length * BOOT_GAP + 2}`)
    .to('#boot', { autoAlpha: 0, y: -30, duration: 0.8 }, 'journey')
    .to('#journey', { autoAlpha: 1, duration: 1.2 }, 'journey+=0.3')
    .fromTo('#title-card', { autoAlpha: 0, y: -24 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'power2.out', immediateRender: false }, 'journey+=0.9')
    .to({}, { duration: 3 })

  // 5 — the walk: home → schools he passed → CIT-U
    .addLabel('walk')
    .to('#title-card', { autoAlpha: 0, y: -40, duration: 1 }, 'walk')
    .fromTo(J, { p: 0 }, { p: 1, duration: WALK, ease: 'none', immediateRender: false, onUpdate: renderJourney }, 'walk+=0.4')
    .to('#sky-day', { opacity: 1, duration: WALK * 0.6 }, 'walk+=0.4')
    .fromTo('#sun', { top: '64%' }, { top: '9%', duration: WALK * 0.8, immediateRender: false }, 'walk+=0.4')

  // 6 — arrive, door opens, walk in, iris out
    .addLabel('arrive', `walk+=${WALK + 0.4}`)
    .fromTo('#bubble', { autoAlpha: 0, yPercent: 30 }, { autoAlpha: 1, yPercent: 0, duration: 0.5, immediateRender: false }, 'arrive')
    .to('#door-open', { opacity: 1, duration: 0.6 }, 'arrive+=1.2')
    .to('#bubble', { autoAlpha: 0, duration: 0.4 }, 'arrive+=2.2')
    .to('#boy', { autoAlpha: 0, scale: 0.82, yPercent: -6, duration: 1 }, 'arrive+=2.4')
    .to('#hallway', { autoAlpha: 1, duration: 0.3 }, 'arrive+=3.3')
    .fromTo('#journey', { clipPath: 'circle(150% at 30% 70%)' },
      { clipPath: 'circle(0% at 30% 70%)', duration: 1.8, ease: 'power2.in', immediateRender: false }, 'arrive+=3.4')
    .to({}, { duration: 0.4 });

  // 7 — portfolio windows, one after another
  let current = null;
  function scene(label, sel, hold = 5) {
    tl.addLabel(label);
    if (current) tl.to(current, { autoAlpha: 0, y: -50, scale: 0.97, duration: 0.9, ease: 'power1.in' }, label);
    tl.fromTo(sel, { autoAlpha: 0, y: 60, scale: 0.96 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 1.6, ease: 'back.out(1.4)', immediateRender: false }, current ? `${label}+=1` : label)
      .to({}, { duration: hold });
    current = sel;
  }
  const projects = $$('.win.proj');
  scene('about', '#about');
  projects.forEach((el, i) => scene(`proj${i}`, `#${el.id}`));
  scene('skills', '#skills');
  scene('hobbies', '#hobbies');
  scene('education', '#education');
  scene('contact', '#contact', 7);

  // 8 — power off + pull back out of the screen
  c = camTween(1, 0, 10, 'power2.inOut');
  tl.addLabel('off')
    .to('#scr-on', { opacity: 0, duration: 0.2 }, 'off')
    .to('#scr-glow', { opacity: 0, duration: 0.6 }, 'off')
    .to('#led', { attr: { fill: '#3b3b31' }, duration: 0.2 }, 'off')
    .to('.os-frame', { scaleY: 0.005, filter: 'brightness(4)', duration: 1, ease: 'power3.in' }, 'off')
    .to('.os-frame', { scaleX: 0, duration: 0.6, ease: 'power3.in' }, 'off+=1')
    .to('#os', { autoAlpha: 0, duration: 0.3 }, 'off+=1.6')
    .fromTo(cam, c.from, c.to, 'off+=2')
    .addLabel('lampOff', 'off+=9')
    .to('#lamp-light', { opacity: 0, duration: 0.4 }, 'lampOff')
    .to('#bulb', { attr: { fill: '#3a3020' }, duration: 0.2 }, 'lampOff')
    .to('#shade', { opacity: 0.82, duration: 0.8 }, 'lampOff')
    .fromTo('#outro', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 2, immediateRender: false }, 'lampOff+=1')
    .to({}, { duration: 3 });

  /* --------------------------------------------------------
     SCROLL → TIMELINE
     -------------------------------------------------------- */
  const VH_PER_BEAT = 13; // bigger = slower / longer scroll
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
    [L.arrive + 1.2, () => Sound.door()],
    [L.arrive + 3.4, () => Sound.iris()],
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
        measure(); renderCam(); sizeJourney();
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
