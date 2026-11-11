/* ==========================================================
   SEAN LORICO — 3D PORTFOLIO
   One Three.js canvas, three worlds, one scroll timeline:

     ROOM    lamp on → CRT boots → camera dives into the screen
     STREET  title → Sean walks from home past each school → CIT-U doors
     HALLWAY one classroom door per section; a card opens at each door
     ROOM    CRT powers off → camera pulls back → outro

   Pacing knobs:
     VH_PER_BEAT  overall scroll length (bigger = slower everything)
     WALK         beats spent walking to school
     HOLD         beats each card stays fully open
   ========================================================== */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const gateNote = $('#gate-note');

  if (!window.gsap || !window.ScrollTrigger || !window.THREE) {
    gateNote.textContent = 'SOMETHING FAILED TO LOAD. CHECK YOUR CONNECTION AND REFRESH.';
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const VH_PER_BEAT = 15;   // scroll distance per beat — bigger = slower, more deliberate movement
  const RIDE = 56;         // beats spent riding the jeepney (bigger = slower ride)
  const HOLD = 4.5;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => innerWidth <= 760;

  /* --------------------------------------------------------
     SOUND — synthesized, no files
     -------------------------------------------------------- */
  const Sound = (() => {
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

  /* --------------------------------------------------------
     SMOOTH SCROLL
     -------------------------------------------------------- */
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new window.Lenis({ lerp: 0.045, wheelMultiplier: 0.55, touchMultiplier: 1.1 });   // heavy, slow, smooth
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* --------------------------------------------------------
     RENDERER + CAMERA
     -------------------------------------------------------- */
  const canvas = $('#gl');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    document.body.classList.add('no-webgl');
    gateNote.textContent = "YOUR BROWSER CAN'T RUN THE 3D WORLD (WEBGL IS OFF).";
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile() ? 1.5 : 1.75));
  renderer.outputEncoding = THREE.sRGBEncoding;
  const LITE = /[?&]lite/.test(location.search);       // ?lite = skip the film finish (low-end devices)
  renderer.toneMapping = LITE ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;   // otherwise tone mapping happens in js/post.js
  const post = Post.create(renderer);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const camera = new THREE.PerspectiveCamera(40, 1, 0.06, 600);
  let baseFov = 40;
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    baseFov = isMobile() ? 52 : 38;
    camera.updateProjectionMatrix();
    post.setSize();
  }
  resize();
  addEventListener('resize', resize);

  /* --------------------------------------------------------
     STATE (driven by the scroll timeline)
     -------------------------------------------------------- */
  const S = { room: 0, lamp: 0, monitor: 0, boot: 0, exit: 0, jeepIn: 0, board: 0, ride: 0, alight: 0, walk2: 0, enter: 0, walkIn: 0, sitDown: 0, idL: 0, nbk: 0, page: 0, bagL: 0, dream: 0, phone: 0, zoom: 0, focus: 0, corrWalk: 0, corrDoor: 0, lap: 0, pull: 0, screenOff: 0 };
  const look = { x: 0, y: 0 };
  let room, street, hall, corr, sean, seanHall, seanCorr, ready = false;
  const camUp = new THREE.Vector3(0, 1, 0), tmpA = new THREE.Vector3();
  // the commute: home → curb → jeepney → CIT-U
  const JX0 = -40, JX1 = 3.0, JX2 = World3D.DOOR_X - 6, LANE = 4.2, SEAT_X = -1.2, SEAT_Z = -0.62, SEAT_Y = 0.425, FLOOR = 0.84;
  function makePath(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]));
    const L = cum[cum.length - 1];
    return {
      L,
      at(d) {
        d = clamp(d, 0, L);
        let i = 1; while (i < pts.length - 1 && cum[i] < d) i++;
        const a = pts[i - 1], b = pts[i], u = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
        return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), z: lerp(a[2], b[2], u), yaw: Math.atan2(-(b[2] - a[2]), b[0] - a[0]) };
      }
    };
  }
  const P_EXIT = makePath([[-4.0, 0, -3.9], [-4.0, 0, -3.2], [-2.9, 0, -2.85], [-1.2, 0.03, -2.6], [-1.0, 0.14, -1.6], [-0.6, 0.14, 1.2]]);
  const P_BOARD = makePath([[-0.6, 0.14, 1.2], [-0.9, 0.14, 1.7], [-1.1, 0, 2.6], [JX1 - 3.8, 0, LANE], [JX1 - 2.9, 0.55, LANE], [JX1 - 2.4, FLOOR, LANE], [JX1 - 1.5, FLOOR, LANE - 0.1], [JX1 + SEAT_X, FLOOR, LANE + SEAT_Z + 0.05]]);
  const P_ALIGHT = makePath([[JX2 + SEAT_X, FLOOR, LANE + SEAT_Z], [JX2 - 1.5, FLOOR, LANE], [JX2 - 2.4, FLOOR, LANE], [JX2 - 2.9, 0.55, LANE], [JX2 - 3.7, 0, LANE], [JX2 - 3.8, 0, 2.6], [JX2 - 3.6, 0.14, 1.4], [JX2 - 3.4, 0.14, 0.3]]);
  let P_CLASS = null;
  const P_WALK2 = makePath([[JX2 - 3.4, 0.14, 0.3], [World3D.DOOR_X, 0.14, 0.3]]);
  // the CIT-U corridor: walk in, stop (ID check), then into classroom CpE 301 (door at x = 4)
  const P_CORR1 = makePath([[-7, 0, 0.2], [0.6, 0, 0.2]]);
  const P_CORR2 = makePath([[0.6, 0, 0.2], [3.3, 0, 0.35], [4, 0, -0.3], [4, 0, -1.5]]);
  const rideEase = (r) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(r));
  const rideInv = (u) => Math.acos(1 - 2 * clamp(u)) / Math.PI;
  const cards = $$('.stage > .win');
  /* chapter rails: number, serif title (last word in italics), progress line */
  cards.forEach((c, i) => {
    const bar = c.querySelector('.win-bar');
    c.dataset.kicker = bar.querySelector('span').textContent;
    const words = (c.dataset.title || c.dataset.kicker).replace(/-/g, '‑').split(' ');   // non-breaking hyphens
    const last = words.pop();
    const n = String(i + 3).padStart(2, '0');
    bar.innerHTML = '<div><span class="rail-k">CHAPTER ' + n + '</span><h2 class="rail-t">' + (words.length ? words.join(' ') + ' ' : '') + '<em>' + last + '</em></h2></div>' +
      '<span class="rail-n" aria-hidden="true">' + n + '</span><span class="rail-track" aria-hidden="true"><i></i></span>';
  });
  // each chapter is drawn onto a prop's surface (desktop): ID card, notebook spread, laptop, window, phone
  const SURF = { id: { w: 600, a: 0.729 }, book: { w: 1180, a: 1.306 }, laptop: { w: 1100, a: 1.474 }, window: { w: 1150, a: 1.654 }, phone: { w: 330, a: 0.478 } };
  const SURF_OF = { about: 'id', 'proj-1': 'book', 'proj-2': 'book', 'proj-3': 'book', skills: 'laptop', hobbies: 'window', contact: 'phone' };
  const surfOn = () => !isMobile();
  cards.forEach((c) => {
    c.dataset.surf = SURF_OF[c.id] || 'window';
    const w = document.createElement('div'); w.className = 'surf';
    c.before(w); w.appendChild(c); c._surf = w;
  });
  const stageEl = $('#stage');
  function fitCards() {
    const on = surfOn();
    document.body.classList.toggle('surf-on', on);
    const cs = getComputedStyle(stageEl);
    const availH = stageEl.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    for (const c of cards) {
      const el = c._surf;
      c.style.zoom = 1; c.style.width = ''; c.style.height = '';
      if (!on) {
        el.style.width = el.style.height = el.style.transform = '';
        const h = c.offsetHeight;
        c.style.zoom = h > availH ? (availH / h).toFixed(3) : 1;
        continue;
      }
      const { w: CW, a } = SURF[c.dataset.surf], CH = Math.round(CW / a);
      el._w = CW; el._h = CH; el.style.width = CW + 'px'; el.style.height = CH + 'px';
      c.style.width = CW + 'px';
      const h = c.offsetHeight, z = h > CH ? CH / h : 1;
      c.style.zoom = z.toFixed(4); c.style.width = (CW / z) + 'px'; c.style.height = (CH / z) + 'px';
    }
  }
  fitCards();
  addEventListener('resize', fitCards);
  addEventListener('load', fitCards);
  document.fonts.ready.then(fitCards);
  const hallLabels = cards.map((c) => c.dataset.kicker.split(' · ')[0]);

  /* --------------------------------------------------------
     BUILD THE WORLDS (after fonts load so 3D signs use them)
     -------------------------------------------------------- */
  function safeImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try { const c = document.createElement('canvas'); c.width = c.height = 2; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 2, 2); g.getImageData(0, 0, 1, 1); resolve(img); }
        catch (e) { resolve(null); }                       // opened from file:// → image would taint WebGL
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }
  const gateProgress = { v: 0, target: 88 };
  (function count() {
    gateProgress.v += (gateProgress.target - gateProgress.v) * (gateProgress.target === 100 ? 0.12 : 0.02);
    const n = Math.min(100, Math.round(gateProgress.v));
    if (gateNote.dataset.ready && n >= 100) { gateNote.textContent = "SYSTEM IDLE — POWER'S ON WHEN YOU ARE"; return; }
    gateNote.textContent = `LOADING THE WORLD — ${String(n).padStart(3, '0')}%`;
    requestAnimationFrame(count);
  })();
  Promise.all([document.fonts.ready, document.fonts.load('italic 400 80px "Instrument Serif"'), document.fonts.load('900 100px Archivo'), document.fonts.load('600 40px Inter'), document.fonts.load('40px VT323'), safeImage('assets/profile.jpg')])
    .then(([, , , , , poster]) => {
      room = World3D.buildRoom({ posterImage: poster });
      street = World3D.buildStreet();
      hall = World3D.buildClassroom();
      corr = World3D.buildHall(['CpE 301', 'CpE 302', 'LAB 2', 'FACULTY']);
      sean = Sean3D.create(); sean.root.position.set(-4, 0, -3.9); street.scene.add(sean.root);
      seanHall = Sean3D.create(); hall.scene.add(seanHall.root);
      seanCorr = Sean3D.create(); corr.scene.add(seanCorr.root);
      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = (top, mid, bottom, k) => {
        const sc = new THREE.Scene();
        const m = new THREE.ShaderMaterial({
          side: THREE.BackSide,
          uniforms: { top: { value: new THREE.Color(top).multiplyScalar(k) }, mid: { value: new THREE.Color(mid).multiplyScalar(k) }, bottom: { value: new THREE.Color(bottom).multiplyScalar(k) } },
          vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
          fragmentShader: 'uniform vec3 top, mid, bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.7, h)) : mix(mid, bottom, smoothstep(0.0, 0.4, -h)); gl_FragColor = vec4(c, 1.0); }'
        });
        sc.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), m));
        return pmrem.fromScene(sc, 0.03).texture;
      };
      street.scene.environment = env('#7fa6d8', '#f3d6bf', '#5a4c3e', 0.3);
      hall.scene.environment = env('#fff3e0', '#f1e2c8', '#7a6650', 0.24);
      corr.scene.environment = env('#fff3e0', '#f1e2c8', '#7a6650', 0.26);
      P_CLASS = makePath([[-5.6, 0, 3.6], [-4.4, 0, 3.2], [-1.6, 0, 1.9], [hall.SEAT[0], 0, 1.3], [hall.SEAT[0], 0, hall.SEAT[1]]]);
      room.scene.environment = env('#1b2033', '#3a2a22', '#0b0b10', 0.5);
      for (const sc of [room.scene, street.scene, hall.scene, corr.scene]) renderer.compile(sc, camera);
      gateProgress.target = 100;
      ready = true;
      $$('[data-enter]').forEach((b) => { b.disabled = false; });
      gateNote.dataset.ready = '1';
    })
    .catch((e) => { console.error(e); gateNote.textContent = 'THE 3D WORLD FAILED TO LOAD. PLEASE REFRESH.'; });

  /* --------------------------------------------------------
     MASTER TIMELINE
     -------------------------------------------------------- */
  const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true });
  const flash = (at, color = '#fff', ramp = 0.7) => {
    tl.set('#flash', { backgroundColor: color }, at - ramp)
      .fromTo('#flash', { opacity: 0 }, { opacity: 1, duration: ramp, ease: 'power2.in', immediateRender: false }, at - ramp)
      .to('#flash', { opacity: 0, duration: 1.1, ease: 'power2.out' }, at);
  };

  // ROOM — wake up, boot, dive into the screen
  tl.to('#hint', { autoAlpha: 0, duration: 1.5 }, 0)
    .to(S, { room: 0.15, duration: 6, ease: 'sine.inOut' }, 0)
    .addLabel('lamp', 2)
    .to(S, { lamp: 1, duration: 0.8 }, 'lamp')
    .addLabel('monitor', 4.5)
    .to(S, { monitor: 1, duration: 1 }, 'monitor')
    .addLabel('boot', 6.5)
    .to(S, { boot: 1, duration: 8 }, 'boot')
    .to(S, { room: 0.75, duration: 8.5, ease: 'sine.inOut' }, 'boot')
    .to(S, { room: 1, duration: 3.5, ease: 'power2.in' }, 'boot+=8.5')
    .addLabel('street', 'boot+=12');
  flash(tl.labels.street);

  // STREET — title, then the walk (cinema bars in)
  tl.fromTo('.lb', { scaleY: 0 }, { scaleY: 1, duration: 2, ease: 'power3.out', immediateRender: false }, 'street');
  tl.fromTo('#title-card', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1.4, ease: 'power3.out', immediateRender: false }, 'street+=0.6')
    .fromTo('.tc-name', { letterSpacing: '0.12em', filter: 'blur(16px)', opacity: 0 }, { letterSpacing: '-0.01em', filter: 'blur(0px)', opacity: 1, duration: 2.2, ease: 'power3.out', immediateRender: false }, 'street+=0.6')
    .to({}, { duration: 2.5 })
    .addLabel('exit')
    .to('#title-card', { autoAlpha: 0, y: -40, filter: 'blur(8px)', duration: 1.2 }, 'exit')
    .to(S, { exit: 1, duration: 9, ease: 'none' }, 'exit+=0.4')
    .addLabel('jeepIn')
    .to(S, { jeepIn: 1, duration: 6, ease: 'none' }, 'jeepIn')
    .addLabel('board')
    .to(S, { board: 1, duration: 7, ease: 'none' }, 'board')
    .addLabel('ride')
    .to(S, { ride: 1, duration: RIDE, ease: 'none' }, 'ride')
    .addLabel('alight')
    .fromTo('#bubble2', { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(2)', immediateRender: false }, 'alight-=2.2')
    .to('#bubble2', { autoAlpha: 0, scale: 0.8, duration: 0.5 }, 'alight+=0.8')
    .to(S, { alight: 1, duration: 7, ease: 'none' }, 'alight')
    .addLabel('walk2')
    .to(S, { walk2: 1, duration: 9, ease: 'none' }, 'walk2');
  const DOOR_X = World3D.DOOR_X;
  const capAt = (x) => tl.labels.ride + rideInv((x - 4 - JX1) / (JX2 - JX1)) * RIDE;   // when the jeepney passes x
  const captions = [['home', tl.labels.exit + 1.2, 7], ['s1', capAt(30), 7], ['s2', capAt(78), 7], ['s3', capAt(126), 7], ['s4', capAt(174), 7]];
  for (const [key, a, span] of captions) {
    const el = `.caption[data-cap="${key}"]`;
    tl.fromTo(el, { autoAlpha: 0, x: -30, clipPath: 'inset(0 100% 0 0)' }, { autoAlpha: 1, x: 0, clipPath: 'inset(0 0% 0 0)', duration: 1.2, ease: 'power3.out', immediateRender: false }, a)
      .to(el, { autoAlpha: 0, x: 20, duration: 0.9, ease: 'power2.in' }, a + span);
  }

  // ARRIVAL — turn to the door, doors open, walk into the light
  tl.addLabel('arrive', tl.labels.walk2 + 9)
    .fromTo('#bubble', { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(2)', immediateRender: false }, 'arrive+=0.3')
    .to('#bubble', { autoAlpha: 0, scale: 0.8, duration: 0.5 }, 'arrive+=2.6')
    .to(S, { enter: 1, duration: 7, ease: 'none' }, 'arrive+=0.6')
    .addLabel('hall', 'arrive+=7.6')
    .to('.lb', { scaleY: 0, duration: 1.2, ease: 'power2.inOut' }, 'hall');
  flash(tl.labels.hall, '#fff6dc', 2.2);

  // CORRIDOR — he walks in and checks his ID (profile); later he walks into his classroom
  tl.addLabel('corr', 'hall+=0.2')
    .to(S, { corrWalk: 1, duration: 5, ease: 'none' }, 'corr');
  const BEATS = {
    about: { set: { idL: 1 }, kind: 'id', focus: 0 },
    'proj-1': { set: { idL: 0, nbk: 1 }, kind: 'page0', act: 3.2, focus: 1 },
    'proj-2': { set: { page: 1 }, kind: 'page', act: 1.8 },
    'proj-3': { set: { page: 2 }, kind: 'page', act: 1.8 },
    skills: { seq: [[{ nbk: 0, bagL: 1 }, 0, 1.6], [{ lap: 1 }, 1.2, 2.8]], kind: 'bag', act: 4.2, focus: 2 },
    hobbies: { set: { bagL: 0, dream: 1 }, kind: 'dream', act: 3, focus: 3 },
    contact: { set: { dream: 0, phone: 1 }, kind: 'phone', act: 3, focus: 4 }
  };
  const mob = () => isMobile();
  const sv = (a, b) => () => (surfOn() ? a : typeof b === 'function' ? b() : b);   // surface value vs floating value
  const IN = {
    id: [{ autoAlpha: 0, y: sv(0, 140), scale: sv(1, 0.55), rotationX: sv(0, () => (mob() ? 0 : 30)), filter: sv('blur(0px) brightness(2.2)', 'blur(18px) brightness(1)'), clipPath: sv('inset(0% 0% 100% 0% round 0px)', 'inset(0% 0% 0% 0% round 0px)'), transformOrigin: '30% 100%' }],   // prints onto the badge
    page0: [{ autoAlpha: 0, rotationY: sv(0, () => (mob() ? 0 : -80)), y: sv(12, () => (mob() ? 80 : 0)), filter: 'blur(6px) brightness(1)', transformOrigin: '0% 50%' }],
    page: [{ autoAlpha: 0, rotationY: sv(0, () => (mob() ? 0 : 25)), x: sv(40, () => (mob() ? 60 : 40)), filter: sv('blur(3px) brightness(1)', 'blur(4px) brightness(1)'), transformOrigin: '0% 50%' }],
    bag: [{ autoAlpha: 0, y: sv(0, 260), scale: sv(1.02, 0.9), filter: sv('blur(6px) brightness(1.8)', 'blur(0px) brightness(1)'), clipPath: sv('inset(0% 0% 0% 0% round 0px)', 'inset(100% 0% 0% 0% round 0px)') }],
    dream: [{ autoAlpha: 0, scale: sv(1.04, 1.08), y: sv(0, -40), filter: sv('blur(16px) brightness(1.2)', 'blur(26px) brightness(1)') }],
    phone: [{ autoAlpha: 0, y: sv(0, 320), rotationX: sv(0, () => (mob() ? 0 : -25)), scale: sv(1, 0.85), filter: sv('blur(0px) brightness(0)', 'blur(0px) brightness(1)'), transformOrigin: '50% 100%' }]   // screen wakes up
  };
  const SHOWN = { autoAlpha: 1, x: 0, y: 0, scale: 1, rotationX: 0, rotationY: 0, filter: 'blur(0px) brightness(1)', clipPath: 'inset(0% 0% 0% 0% round 0px)' };
  let current = null, prevKind = null;
  const rest = [], cardInAt = [], wipeAt = [];
  cards.forEach((card, i) => {
    const beat = BEATS[card.id] || { set: {}, kind: 'dream' };
    const label = `card${i}`, act = beat.act || 2.4;
    if (card.id === 'proj-1') {
      // leave the ID, walk down the corridor into CpE 301, sit down
      tl.addLabel('toCls');
      tl.to(S, { zoom: 0, duration: 1.8, ease: 'power2.inOut' }, 'toCls')
        .to(current, { autoAlpha: 0, filter: 'blur(5px) brightness(1)', duration: 1.2, ease: 'power2.in' }, 'toCls+=0.3')
        .to(S, { idL: 0, duration: 1.4, ease: 'sine.inOut' }, 'toCls+=0.7')
        .to(S, { corrDoor: 1, duration: 4.8, ease: 'none' }, 'toCls+=1.5')
        .addLabel('cls', 'toCls+=6.5');
      flash(tl.labels.cls, '#fff6dc', 1.4);
      tl.to(S, { walkIn: 1, duration: 5, ease: 'none' }, 'cls').to(S, { sitDown: 1, duration: 1.6, ease: 'power1.inOut' }, 'cls+=5');
      current = null;
    }
    tl.addLabel(label, i === 0 ? 'corr+=5.6' : card.id === 'proj-1' ? 'cls+=6.8' : undefined);
    const ZOUT = 2.0, ZIN = 2.6, dive = beat.kind !== 'page';
    let actAt = tl.labels[label];
    if (dive && current) { tl.to(S, { zoom: 0, duration: ZOUT, ease: 'none' }, label); actAt += ZOUT * 0.8; }
    if (beat.seq) beat.seq.forEach(([v, off, dur]) => tl.to(S, { ...v, duration: dur, ease: 'sine.inOut' }, actAt + off));
    else tl.to(S, { ...beat.set, duration: act, ease: 'sine.inOut' }, actAt);
    if (dive) tl.set(S, { focus: beat.focus }, actAt).to(S, { zoom: 1, duration: ZIN, ease: 'none' }, actAt + act - 0.4);
    if (current) {
      const out = beat.kind === 'page'
        ? { autoAlpha: 0, rotationY: sv(0, () => (mob() ? 0 : -100)), x: sv(-50, () => (mob() ? -60 : 0)), filter: sv('blur(3px) brightness(1)', 'blur(0px) brightness(1)'), transformOrigin: '0% 50%', duration: 1.1, ease: 'power2.in' }
        : { autoAlpha: 0, scale: sv(1, 0.95), y: sv(0, -30), filter: sv('blur(5px) brightness(1)', 'blur(12px) brightness(1)'), duration: 1.2, ease: 'power2.in' };
      tl.to(current, out, beat.kind === 'page' ? label : tl.labels[label] + 0.25);
    }
    const inAt = dive ? actAt + act - 0.4 + ZIN * 0.62 : tl.labels[label] + 0.7;
    tl.fromTo(card, IN[beat.kind][0], { ...SHOWN, duration: beat.kind === 'page' ? 1.3 : 1.7, ease: 'power3.out', immediateRender: false }, inAt)
      .fromTo($$('.r', card), { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07, ease: 'power2.out', immediateRender: false }, inAt + 0.45)
      .fromTo(card, { '--p': 0 }, { '--p': 1, duration: i === cards.length - 1 ? HOLD + 2 : HOLD, ease: 'none', immediateRender: false });
    cardInAt.push(inAt);
    rest.push({ start: tl.labels[label], rest: inAt + 1.8, i });
    current = card; prevKind = beat.kind;
  });

  tl.to(S, { zoom: 0, duration: 1.2, ease: 'power2.inOut' });

  // POWER OFF — CRT collapse, back in the room, pull out, lamp off
  tl.addLabel('off')
    .to(current, { autoAlpha: 0, scale: 0.96, filter: 'blur(8px)', duration: 0.8 }, 'off')
    .fromTo('#crt-off', { opacity: 0 }, { opacity: 1, duration: 0.4, immediateRender: false }, 'off+=0.3')
    .fromTo('#crt-off i', { scaleY: 1, scaleX: 1, opacity: 1 }, { scaleY: 0.004, duration: 0.8, ease: 'power3.in', immediateRender: false }, 'off+=0.7')
    .to('#crt-off i', { scaleX: 0, duration: 0.5, ease: 'power3.in' }, 'off+=1.5')
    .to(S, { screenOff: 1, duration: 0.1 }, 'off+=1.6')
    .to('#crt-off', { opacity: 0, duration: 1.2 }, 'off+=2.1')
    .to(S, { pull: 1, duration: 8, ease: 'power2.inOut' }, 'off+=2.1')
    .addLabel('lampOff', 'off+=8.5')
    .to(S, { lamp: 0, duration: 0.4 }, 'lampOff')
    .fromTo('#outro', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 2, ease: 'power3.out', immediateRender: false }, 'lampOff+=0.8')
    .fromTo('.outro-title', { letterSpacing: '0.15em', filter: 'blur(10px)' }, { letterSpacing: '0em', filter: 'blur(0px)', duration: 2, ease: 'power3.out', immediateRender: false }, 'lampOff+=0.8')
    .to({}, { duration: 3 });

  const L = tl.labels;

  /* --------------------------------------------------------
     SCROLL → TIMELINE
     -------------------------------------------------------- */
  $('#track').style.height = `${Math.round(tl.duration() * VH_PER_BEAT)}vh`;
  const st = ScrollTrigger.create({ animation: tl, trigger: '#track', start: 'top top', end: 'bottom bottom', scrub: lenis ? 1.8 : 2.2 });
  const timeToY = (t) => st.start + (t / tl.duration()) * (st.end - st.start);
  const yToTime = (y) => clamp((y - st.start) / (st.end - st.start)) * tl.duration();
  function scrollToTime(t, duration = 2.5) {
    const y = timeToY(t);
    if (lenis) lenis.scrollTo(y, { duration, easing: (x) => 1 - Math.pow(1 - x, 3) });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  }

  window.__story = { labels: tl.labels, timeToY };   // handy for testing: scrollTo(__story.timeToY(__story.labels.ride))

  // gentle snap: never leave a card half-open
  let snapTimer = 0, snapping = false;
  function maybeSnap() {
    if (snapping || window.__nosnap) return;
    const t = yToTime(scrollY);
    for (const z of rest) {
      if (t > z.start + 0.05 && t < z.rest - 0.05) {
        const forward = (t - z.start) / (z.rest - z.start) > 0.3;
        snapping = true;
        scrollToTime(forward ? z.rest : z.start - 0.02, 1.2);
        setTimeout(() => { snapping = false; }, 1400);
        return;
      }
    }
  }
  const onScroll = () => { clearTimeout(snapTimer); snapTimer = setTimeout(maybeSnap, 260); };
  if (lenis) lenis.on('scroll', onScroll); else addEventListener('scroll', onScroll, { passive: true });

  /* --------------------------------------------------------
     HUD: chapters, progress, chapter nav
     -------------------------------------------------------- */
  const pad = (n) => String(n).padStart(2, '0');
  const chapters = [
    { t: 0, n: '00', name: 'THE ROOM', nav: 'The room' },
    { t: L.boot, n: '01', name: 'BOOT SEQUENCE', nav: 'Boot' },
    { t: L.street, n: '02', name: 'THE JOURNEY', nav: 'The journey' },
    ...cards.map((c, i) => ({
      t: L[`card${i}`], n: pad(i + 3),
      name: c.dataset.kicker,
      nav: c.dataset.kicker.split(' · ')[0].toLowerCase().replace(/^\w/, (m) => m.toUpperCase()),
      jump: rest[i].rest
    })),
    { t: L.off, n: pad(cards.length + 3), name: 'POWER OFF', nav: 'Power off', jump: L.lampOff + 1.5 }
  ];
  const nav = $('#chapters');
  chapters.forEach((c) => {
    const b = document.createElement('button');
    b.innerHTML = `<span>${c.nav}</span>`;
    b.setAttribute('aria-label', `Go to ${c.nav}`);
    b.addEventListener('click', () => scrollToTime(c.jump != null ? c.jump : c.t + 0.5, 3));
    nav.appendChild(b);
  });
  const navBtns = $$('button', nav);

  const cues = [
    [L.lamp, () => Sound.click()],
    [L.monitor, () => Sound.powerOn()],
    ...Array.from({ length: 7 }, (_, i) => [L.boot + 0.6 + i * 1.05, () => Sound.key()]),
    [L.street - 0.7, () => Sound.whoosh()],
    [L.street + 0.6, () => Sound.start()],
    [L.exit + 0.5, () => Sound.click()],
    [L.jeepIn + 5.2, () => Sound.horn()],
    ...[30, 78, 126, 174].map((x) => [capAt(x), () => Sound.chime()]),
    [L.alight - 2.2, () => Sound.talk()],
    [L.arrive + 0.3, () => Sound.talk()],
    [L.arrive + 1.8, () => Sound.door()],
    [L.hall - 0.7, () => Sound.whoosh()],
    ...cards.map((_, i) => [cardInAt[i], () => Sound.open()]),
    [L.cls + 5, () => Sound.click()],
    [L.off + 0.7, () => Sound.off()],
    [L.lampOff, () => Sound.click()]
  ];
  const chapterEl = $('#chapter'), progressEl = $('#progress'), barEl = $('#progress-bar i');
  let chapIdx = -1, lastT = 0;
  tl.eventCallback('onUpdate', () => {
    const t = tl.time();
    if (t > lastT) for (const [ct, fn] of cues) if (lastT < ct && t >= ct) fn();
    lastT = t;
    progressEl.textContent = `${String(Math.round(tl.progress() * 100)).padStart(3, '0')}%`;
    barEl.style.transform = `scaleX(${tl.progress()})`;
    let i = 0;
    for (let k = 0; k < chapters.length; k++) if (t >= chapters[k].t - 0.001) i = k;
    if (i !== chapIdx) {
      chapIdx = i;
      chapterEl.textContent = `CH.${chapters[i].n} — ${chapters[i].name}`;
      navBtns.forEach((b, k) => b.classList.toggle('on', k === i));
    }
  });

  /* --------------------------------------------------------
     PER-FRAME: animate the active world and render it
     -------------------------------------------------------- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const tmp = new THREE.Vector3(), tmpLook = new THREE.Vector3();
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  const C = (h) => new THREE.Color(h);
  const SKY = {
    dawn: { top: C('#2d3368'), mid: C('#f2a07e'), bottom: C('#ffd9a6'), fog: C('#f2b48e'), sun: C('#ffb27a'), hemi: C('#ffd9b8') },
    day: { top: C('#3d84d6'), mid: C('#9fd0f5'), bottom: C('#e8f5ff'), fog: C('#cfe6f7'), sun: C('#fff2df'), hemi: C('#e6f2ff') }
  };
  const BOOT_LINES = [
    'MK-1 BIOS v2.026  (C) LORICO SYSTEMS',
    'CPU ........... CURIOSITY @ 4.20GHz  [OK]',
    'MEMORY ........ 640K OF IDEAS        [OK]',
    'COFFEE ........ DETECTED             [OK]',
    'LOADING WORLD: CEBU, PH ............ [OK]',
    'SPAWNING PLAYER: SEAN .............. [OK]',
    '> RUN JOURNEY.EXE'
  ];

  // camera path inside the room (p = 0 wide shot … 1 screen fills the view)
  function roomCamera(p, out) {
    const sc = room.screenCenter, [sw, sh] = room.screenSize;
    const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
    const dFillH = (sh / 2) / Math.tan(vf), dFillW = (sw / 2) / (Math.tan(vf) * camera.aspect);
    const close = Math.min(dFillH, dFillW) * 0.93;
    const keys = [
      [0, V(0.62, 1.38, 1.35), V(0, 1.0, -0.75)],
      [0.15, V(0.38, 1.27, 0.85), V(0, 1.05, -0.78)],
      [0.75, V(0.05, 1.13, 0.12), V(0, sc.y, sc.z)],
      [1, V(sc.x, sc.y, sc.z + close), V(sc.x, sc.y, sc.z)]
    ];
    let k = 0; while (k < keys.length - 2 && p > keys[k + 1][0]) k++;
    const a = keys[k], b = keys[k + 1], u = smooth(clamp((p - a[0]) / (b[0] - a[0])));
    out.pos.lerpVectors(a[1], b[1], u); out.look.lerpVectors(a[2], b[2], u);
    const par = (1 - p) * 0.06;
    out.pos.x += look.x * par; out.pos.y += look.y * par * 0.6;
  }

  function drawScreen(now) {
    const c = room.screenCanvas, g = c.getContext('2d'), W = c.width, H = c.height;
    const on = S.monitor * (1 - S.screenOff);
    g.fillStyle = '#060a08'; g.fillRect(0, 0, W, H);
    if (on > 0.01) {
      const gr = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7);
      gr.addColorStop(0, `rgba(20,70,45,${on})`); gr.addColorStop(1, `rgba(3,14,9,${on})`);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.font = '46px VT323'; g.fillStyle = `rgba(141,255,181,${on})`; g.shadowColor = '#8dffb5'; g.shadowBlur = 14;
      const n = Math.floor(S.boot * (BOOT_LINES.length + 0.999));
      const lines = n ? BOOT_LINES.slice(0, n) : ['MK-1 READY.'];
      lines.forEach((l, i) => g.fillText(l, 60, 100 + i * 62));
      if (Math.floor(now / 500) % 2) g.fillRect(60, 100 + lines.length * 62 - 36, 22, 40);
      g.shadowBlur = 0;
    }
    g.fillStyle = 'rgba(0,0,0,.22)';
    for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 2);
    room.screenTex.needsUpdate = true;
  }

  const loc = (obj, pts, arr) => { obj.updateWorldMatrix(true, false); pts.forEach((p, i) => (arr[i] || (arr[i] = new THREE.Vector3())).set(p[0], p[1], p[2]).applyMatrix4(obj.matrixWorld)); return arr; };
  const BOOK = [[0.124, 0.026, -0.162], [0.124, 0.026, 0.162], [-0.124, 0.026, 0.162], [-0.124, 0.026, -0.162]];
  const LAPQ = [[-0.205, -0.003, -0.14], [-0.205, -0.003, 0.14], [-0.015, -0.003, 0.14], [-0.015, -0.003, -0.14]];
  const WINQ = [[-1.29, 2.73, -4.93], [1.29, 2.73, -4.93], [1.29, 1.17, -4.93], [-1.29, 1.17, -4.93]];
  const FOCUS_KIND = ['id', 'book', 'laptop', 'window', 'phone'];
  function getQuad(kind, stage, arr, rest) {
    if (kind === 'id') return (stage === 'corr' ? seanCorr : seanHall).idQuad(arr, rest);
    if (kind === 'phone') return seanHall.phoneQuad(arr);
    if (kind === 'book') return loc(hall.nb, BOOK, arr);
    if (kind === 'laptop') return loc(hall.lid, LAPQ, arr);
    WINQ.forEach((p, i) => (arr[i] || (arr[i] = new THREE.Vector3())).set(p[0], p[1], p[2]));
    return arr;
  }
  // camera placement that looks straight at a quad and fills `fill` of the screen
  function frameQuad(q, fill) {
    const c = q[0].clone().add(q[1]).add(q[2]).add(q[3]).multiplyScalar(0.25);
    const right = q[1].clone().sub(q[0]), down = q[3].clone().sub(q[0]);
    const n = down.clone().cross(right).normalize();
    const tanV = Math.tan(THREE.MathUtils.degToRad(baseFov) / 2);
    const d = Math.max(down.length() / 2 / tanV, right.length() / 2 / (tanV * camera.aspect)) / fill;
    return { pos: c.clone().addScaledVector(n, d), look: c, up: down.normalize().negate() };
  }
  const zq = [], mq = [];
  // first-person dive: cut to his eyes, then glide until the prop's surface faces the screen
  function applyZoom(out, who, stage) {
    const z = S.zoom;
    if (z <= 0.001) { zoomShade.style.opacity = '0'; return; }
    const kind = FOCUS_KIND[Math.round(S.focus)];
    const F = frameQuad(getQuad(kind, stage, zq, true), isMobile() ? 0.92 : 0.84);   // frame the resting badge so its swing reads on screen
    const eye = who.headWorld(new THREE.Vector3()); eye.y += 0.02;
    const fp = eye.clone().addScaledVector(F.look.clone().sub(eye).normalize(), kind === 'window' ? 0.5 : 0.32);   // just in front of his eyes
    const u = z < 0.5 ? 4 * z * z * z : 1 - Math.pow(-2 * z + 2, 3) / 2;          // easeInOutCubic
    const p0 = out.pos.clone(), w0 = (1 - u) * (1 - u), w1 = 2 * u * (1 - u), w2 = u * u;
    out.pos.set(0, 0, 0).addScaledVector(p0, w0).addScaledVector(fp, w1).addScaledVector(F.pos, w2);   // quadratic Bézier
    // never let the glide pass through his head
    const hc = who.headWorld(new THREE.Vector3()); hc.y += 0.03;
    const off = out.pos.clone().sub(hc), R = 0.26;
    if (off.length() < R) { if (off.lengthSq() < 1e-6) off.copy(F.pos).sub(hc); out.pos.copy(hc).addScaledVector(off.normalize(), R); }
    out.look.lerp(F.look, smooth(clamp(z / 0.7)));
    camUp.lerp(F.up, smooth(clamp((z - 0.3) / 0.7))).normalize();
    zoomShade.style.opacity = surfOn() ? '0' : (0.55 * smooth(clamp((z - 0.6) / 0.4))).toFixed(3);
  }
  // CSS matrix3d that maps a w×h box onto 4 screen points (TL, TR, BR, BL)
  function quadMatrix(w, h, p) {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = p;
    const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
    const den = dx1 * dy2 - dx2 * dy1;
    const g = (sx * dy2 - dx2 * sy) / den, hh = (dx1 * sy - sx * dy1) / den;
    const a = (x1 - x0 + g * x1) / w, b = (x3 - x0 + hh * x3) / h, d = (y1 - y0 + g * y1) / w, e = (y3 - y0 + hh * y3) / h;
    return `matrix3d(${a},${d},0,${g / w},${b},${e},0,${hh / h},0,0,1,0,${x0},${y0},0,1)`;
  }
  const _pv = new THREE.Vector3();
  function mapCards(stage) {
    const on = surfOn() && (stage === 'corr' || stage === 'hall');
    for (const c of cards) {
      const el = c._surf;
      if (!on) { if (el.style.transform) { el.style.transform = ''; el.style.visibility = ''; } continue; }
      if (c.style.visibility === 'hidden') continue;
      const q = getQuad(c.dataset.surf, stage, mq), pts = [];
      let ok = true;
      for (const v of q) { _pv.copy(v).project(camera); if (_pv.z > 1 || _pv.z < -1) { ok = false; break; } pts.push([(_pv.x + 1) / 2 * innerWidth, (1 - _pv.y) / 2 * innerHeight]); }
      if (ok) { let area = 0; for (let k = 0; k < 4; k++) { const [ax, ay] = pts[k], [bx, by] = pts[(k + 1) % 4]; area += ax * by - bx * ay; } ok = area > 0; }
      el.style.visibility = ok ? '' : 'hidden';
      if (ok) el.style.transform = quadMatrix(el._w, el._h, pts);
    }
  }

  function currentStage(t) {
    if (t < L.street) return 'room';
    if (t < L.hall) return 'street';
    if (t < L.cls) return 'corr';
    if (t < L.off + 1.6) return 'hall';
    return 'end';
  }

  let fovKick = 0;
  const bubble = $('#bubble'), bubble2 = $('#bubble2'), zoomShade = $('#zoom-shade');
  function frame() {
    if (!ready) return;
    const now = performance.now(), t = now / 1000;
    const stage = currentStage(tl.time());
    const out = { pos: camPos, look: camLook };
    camUp.set(0, 1, 0);
    let scene;
    Sound.rain(stage === 'room' || stage === 'end');
    Sound.hum(stage === 'room' && S.monitor > 0.5);
    if (stage !== 'street') Sound.engine(0, 0);

    if (stage === 'room' || stage === 'end') {
      scene = room.scene;
      roomCamera(stage === 'end' ? 1 - S.pull : S.room, out);
      room.lampLight.intensity = 2.4 * S.lamp; room.lampFill.intensity = 0.6 * S.lamp;
      room.bulb.material.color.set(S.lamp > 0.5 ? '#fff1c4' : '#3a3020');
      const mon = S.monitor * (1 - S.screenOff);
      room.screenGlow.intensity = 0.9 * mon;
      room.led.material.color.set(mon > 0.5 ? '#7dffad' : '#333');
      drawScreen(now);
      const rp = room.rain.geometry.attributes.position;
      for (let i = 0; i < rp.count; i += 2) {
        let y = rp.getY(i) - 0.02; if (y < 1.2) y += 1.1;
        rp.setY(i, y); rp.setY(i + 1, y - 0.06);
      }
      rp.needsUpdate = true;
      // the cat: slow breathing, lazy tail flicks, ear twitches, a sleepy nod
      {
        const c = room.cat;
        c.body.scale.set(1, 1 + Math.sin(t * 1.6) * 0.035, 1 + Math.sin(t * 1.6) * 0.02);
        c.head.rotation.z = Math.sin(t * 0.45) * 0.06 - 0.05; c.head.rotation.y = Math.sin(t * 0.3) * 0.12;
        const tw = Math.max(0, Math.sin(t * 0.9) - 0.94) * 12;
        c.ears[0].rotation.z = -tw * 0.4; c.ears[1].rotation.z = Math.max(0, Math.sin(t * 0.7 + 2) - 0.95) * -8;
        const flick = Math.sin(t * 1.1) * 0.5 + Math.sin(t * 2.7) * 0.2;
        const pts = c.tailPts.map((p, i) => new THREE.Vector3(p[0], p[1] + (i > 2 ? Math.max(0, flick) * 0.03 * (i - 2) : 0), p[2] + (i > 1 ? flick * 0.02 * (i - 1) : 0)));
        c.tailMesh.geometry.dispose(); c.tailMesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.014, 8, false);
        c.tailTip.position.copy(pts[pts.length - 1]);
      }
      room.steam.forEach((s, i) => { const k = ((t * 0.25 + i / 3) % 1); s.position.y = 0.9 + k * 0.18; s.material.opacity = 0.25 * Math.sin(k * Math.PI); s.position.x = -0.55 + Math.sin(t + i) * 0.015; });
      const d = new Date(), sec = d.getSeconds() + d.getMilliseconds() / 1000, min = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + min / 60;
      room.handS.rotation.z = -sec / 60 * Math.PI * 2; room.handM.rotation.z = -min / 60 * Math.PI * 2; room.handH.rotation.z = -hr / 12 * Math.PI * 2;
    } else if (stage === 'street') {
      scene = street.scene;
      const e = S.enter, mob = isMobile(), k = mob ? 1.35 : 1;
      // ---- the jeepney ----
      let jx = JX0;
      if (S.walk2 > 0) jx = JX2 + Math.pow(S.walk2, 2) * 80;
      else if (S.ride > 0) jx = lerp(JX1, JX2, rideEase(S.ride));
      else if (S.jeepIn > 0) jx = lerp(JX0, JX1, 1 - Math.pow(1 - S.jeepIn, 3));
      const dtJ = Math.max(1 / 240, (now - (frame.lastT || now)) / 1000); frame.lastT = now;
      const speed = (jx - (frame.lastJx ?? jx)) / dtJ; frame.lastJx = jx;
      const moving = clamp(Math.abs(speed) / 8);
      const J = street.jeep;
      J.group.position.set(jx, 0, LANE);
      J.wheels.forEach((w) => { w.rotation.z = -jx / 0.42; });
      J.body.position.y = Math.sin(t * 52) * 0.004 + Math.sin(jx * 1.3) * 0.012 * moving;
      J.body.rotation.x = Math.sin(t * 1.7 + jx * 0.4) * 0.012 * moving;
      J.body.rotation.z = clamp(-speed * 0.0006, -0.02, 0.02);
      street.parked.body.position.y = Math.sin(t * 50) * 0.003;
      street.puffs.forEach((p, i) => { const q = (t * 0.7 + i / 5) % 1; p.position.set(jx - 3.2 - q * (1.2 + moving * 2), 0.45 + q * 0.6, LANE + 0.8); p.scale.setScalar(0.25 + q * 1.1); p.material.opacity = 0.5 * (1 - q) * (jx > JX0 + 1 ? 1 : 0); });
      Sound.engine(jx > JX0 + 1 && jx < JX2 + 60 ? 0.5 + 0.5 * moving : 0, Math.abs(speed));

      // ---- Sean ----
      let pos, yaw, sit = 0, walked = 0;
      const bWalk = clamp(S.board / 0.72), bSit = smooth(clamp((S.board - 0.72) / 0.28));
      const aStand = smooth(clamp(S.alight / 0.25)), aWalk = clamp((S.alight - 0.25) / 0.75);
      walked = P_EXIT.L * S.exit + P_BOARD.L * bWalk + P_ALIGHT.L * aWalk + P_WALK2.L * S.walk2;
      if (S.walk2 > 0 || S.alight >= 1) { pos = P_WALK2.at(P_WALK2.L * S.walk2); yaw = pos.yaw; }
      else if (S.alight > 0.25) { pos = P_ALIGHT.at(P_ALIGHT.L * aWalk); yaw = pos.yaw; }
      else if (S.alight > 0 || S.ride > 0 || S.board >= 1 || bSit > 0) {
        const seat = { x: jx + SEAT_X, y: SEAT_Y + J.body.position.y, z: LANE + SEAT_Z };
        if (S.alight > 0) { sit = 1 - aStand; pos = { x: seat.x, y: lerp(seat.y, FLOOR, aStand), z: seat.z }; yaw = lerp(-Math.PI / 2, -Math.PI, aStand); }
        else { const end = P_BOARD.at(P_BOARD.L); sit = bSit; pos = { x: lerp(end.x, seat.x, bSit), y: lerp(FLOOR, seat.y, bSit), z: lerp(end.z, seat.z, bSit) }; yaw = -Math.PI / 2; }
      } else if (S.board > 0) { pos = P_BOARD.at(P_BOARD.L * bWalk); yaw = pos.yaw; }
      else if (S.exit > 0.12 || S.jeepIn > 0) { pos = P_EXIT.at(P_EXIT.L * clamp((S.exit - 0.12) / 0.88)); yaw = pos.yaw; }
      else { pos = P_EXIT.at(0); yaw = -Math.PI / 2; }
      // at the curb he turns to watch the jeepney arrive; at CIT-U he turns to the doors
      if (S.jeepIn > 0 && S.board === 0) yaw = lerp(-Math.PI / 2, -Math.PI * 0.85, smooth(clamp(S.jeepIn * 1.4)));
      const turn = clamp(e / 0.18), inward = smooth(clamp((e - 0.3) / 0.62));
      if (e > 0) { pos = { x: DOOR_X, y: 0.14, z: lerp(World3D.PATH_Z, street.DOOR_Z - 1.6, inward) }; yaw = (Math.PI / 2) * smooth(turn); }
      sean.root.position.set(pos.x, pos.y, pos.z);
      sean.update(walked + inward * (World3D.PATH_Z - street.DOOR_Z + 1.6), now, { onStep: Sound.step, face: yaw, sit });
      // home door opens as he steps out, campus doors open at the end
      street.homeDoor.rotation.y = smooth(clamp(S.exit / 0.12)) * 1.4;
      const open = smooth(clamp((e - 0.14) / 0.3));
      street.hingeL.rotation.y = open * 1.35; street.hingeR.rotation.y = -open * 1.35;
      street.doorLight.intensity = 2.6 * open; street.spill.material.opacity = 0.8 * open;

      // ---- camera: a sequence of shots blended by the story ----
      const shot = (px, py, pz, lx, ly, lz) => [V(px, py, pz), V(lx, ly, lz)];
      const blend = (sh, wgt) => { tmp.lerp(sh[0], wgt); tmpLook.lerp(sh[1], wgt); };
      const sx = pos.x;
      const c0 = shot(-0.4, 1.8, 7.6 * k, -2.7, 1.25, -2.9);                                   // the house
      const c1 = shot(1.8, 2.3, 15 * k, -0.2, 1.45, 2.2);                                    // waiting at the curb
      const c2 = shot(jx - 0.8, 2.1, 13.5 * k, jx - 1.4, 1.6, 3.4);                          // boarding at the rear
      const c3 = shot(jx + 0.8 + Math.sin(t * 0.4) * 0.15, 2.35 + Math.sin(t * 0.9) * 0.03, 13.8 * k, jx - 0.4, 2.3, 2.0);   // riding along
      const c4 = shot(jx - 2.2, 2.0, 13 * k, jx - 2.9, 1.45, 2.4);                           // getting off
      const c5 = shot(sx + 1.6, 1.85, 8.6 * k, sx + (mob ? 0.4 : 2.6), mob ? 1.7 : 1.6, -1);   // walking to campus
      const hero = shot(sx - 2, 1.4, 8.4, sx + 0.2, 3.2, -3);
      tmp.copy(c0[0]); tmpLook.copy(c0[1]);
      blend(c1, smooth(clamp((S.exit - 0.55) / 0.45)));
      blend(c2, smooth(clamp(S.board / 0.3)));
      blend(c3, smooth(clamp(S.ride / 0.08)));
      blend(c4, smooth(clamp(S.alight / 0.3)));
      blend(c5, smooth(clamp(S.walk2 / 0.3)));
      blend(hero, smooth(clamp((S.walk2 - 0.75) / 0.25)));
      if (e > 0) {
        const a = smooth(clamp(e / 0.3)), b = smooth(clamp((e - 0.3) / 0.7));
        blend(shot(DOOR_X + 1.4, 1.75, 4.4, DOOR_X, 1.5, street.DOOR_Z), a);
        blend(shot(DOOR_X, 1.55, street.DOOR_Z + 0.4, DOOR_X, 1.45, street.DOOR_Z - 6), b);
      }
      out.pos.copy(tmp); out.look.copy(tmpLook);
      out.pos.x += look.x * 0.25 * (1 - e); out.pos.y += look.y * 0.12 * (1 - e);

      // ---- time of day: dawn at home → bright morning at CIT-U ----
      const day = smooth(clamp(S.board * 0.15 + S.ride * 0.85 + S.alight * 0.1));
      const fx = out.pos.x;
      const u = street.sky.material.uniforms;
      u.top.value.copy(SKY.dawn.top).lerp(SKY.day.top, day); u.mid.value.copy(SKY.dawn.mid).lerp(SKY.day.mid, day); u.bottom.value.copy(SKY.dawn.bottom).lerp(SKY.day.bottom, day);
      street.fog.color.copy(SKY.dawn.fog).lerp(SKY.day.fog, day);
      street.sun.color.copy(SKY.dawn.sun).lerp(SKY.day.sun, day); street.sun.intensity = lerp(0.9, 1.45, day);
      street.hemi.color.copy(SKY.dawn.hemi).lerp(SKY.day.hemi, day); street.hemi.intensity = lerp(0.5, 0.65, day);
      street.sun.position.set(fx + lerp(30, 18, day), lerp(16, 40, day), 28); street.sun.target.position.set(fx, 0, 0);
      street.sunDisc.position.set(fx + 70, lerp(12, 70, day), -170);
      street.sunDisc.material.color.copy(SKY.dawn.sun).lerp(C('#ffffff'), day);
      street.sway.forEach((c, i) => { c.rotation.z = Math.sin(t * 0.9 + i * 1.7) * 0.025; c.rotation.x = Math.sin(t * 0.7 + i) * 0.015; });
      const fp = street.flagGeo.attributes.position;
      for (let i = 0; i < fp.count; i++) { const x = fp.getX(i) + 1.2; fp.setZ(i, Math.sin(x * 2.6 - t * 4) * 0.12 * (x / 2.4)); }
      fp.needsUpdate = true; street.flagGeo.computeVertexNormals();
      street.clouds.position.x = (t * 0.8) % 60 - 30;
      street.birds.forEach((b) => { const x = fx - 40 + ((t * 3.5 + b.off * 9) % 90); b.g.position.set(x, b.y + Math.sin(t + b.off) * 1.2, b.z); const fl = Math.sin(t * 9 + b.off) * 0.6; b.lp.rotation.z = fl; b.rp.rotation.z = -fl; });
      // speech bubbles follow his head
      sean.headWorld(tmp); tmp.y += 0.22; tmp.project(camera);
      const bx = `${((tmp.x + 1) / 2) * innerWidth + 14}px`, by = `${((1 - tmp.y) / 2) * innerHeight - 48}px`;
      bubble.style.left = bx; bubble.style.top = by; bubble2.style.left = bx; bubble2.style.top = by;
    } else if (stage === 'corr') {
      scene = corr.scene;
      const dx = corr.doors[0];
      let p, yaw, walked;
      if (S.corrDoor > 0) { p = P_CORR2.at(P_CORR2.L * S.corrDoor); yaw = p.yaw; walked = P_CORR1.L + P_CORR2.L * S.corrDoor; }
      else { p = P_CORR1.at(P_CORR1.L * S.corrWalk); yaw = S.corrWalk >= 1 ? -0.35 : p.yaw; walked = P_CORR1.L * S.corrWalk; }
      seanCorr.root.position.set(p.x, 0, p.z);
      seanCorr.update(walked, now, { onStep: Sound.step, face: yaw, pose: [{ w: smooth(S.idL), aN: 42, eN: 78, look: -20, idLift: 1 }] });
      const mobi = isMobile();
      out.pos.set(p.x + 1.4, 1.65, mobi ? 5.6 : 4.4); out.look.set(p.x + 0.5, 1.15, -0.6);
      const toDoor = smooth(clamp(S.corrDoor * 1.4));
      out.pos.lerp(V(dx + 0.9, 1.7, 3.0), toDoor); out.look.lerp(V(dx, 1.3, -1.6), toDoor);
      out.pos.x += look.x * 0.1; out.pos.y += look.y * 0.06;
      applyZoom(out, seanCorr, 'corr');
      corr.key.position.set(p.x + 4, 7, 6); corr.key.target.position.set(p.x + 2, 0, 0); corr.warm.position.set(p.x + 1, 2.6, 1.5);
    } else {
      scene = hall.scene;
      const H = hall, [SX, SZ] = H.SEAT, mobi = isMobile();
      const sit = smooth(S.sitDown);
      let p = P_CLASS.at(P_CLASS.L * S.walkIn), yaw = p.yaw;
      if (S.walkIn >= 1 || sit > 0) yaw = lerp(-Math.PI / 2, 0, smooth(clamp(sit * 1.6)));
      seanHall.root.position.set(p.x, lerp(0, -0.385, sit), p.z);
      const pose = [
        { w: smooth(S.idL), aN: 30, eN: 108, look: -24, idLift: 1 },
        { w: smooth(clamp(S.nbk * 1.4)), aN: 44, eN: 40, aF: 44, eF: 40, look: -30, lean: 8 },
        { w: smooth(S.bagL) * (1 - smooth(clamp((S.lap - 0.4) / 0.4))), turn: -0.8, look: -30, lean: 10, aN: 6, eN: 20 },
        { w: smooth(clamp((S.lap - 0.45) / 0.55)), aN: 40, eN: 55, aF: 40, eF: 55, look: -14, lean: 5 },
        { w: smooth(S.dream), turn: 0.95, look: 8, lean: -7 },
        { w: smooth(S.phone), aN: 58, eN: 120, look: -16, phone: 1 }
      ];
      seanHall.update(P_CLASS.L * S.walkIn, now, { onStep: Sound.step, face: yaw, sit, pose });
      // notebook: slide toward him, open, turn pages
      const slide = smooth(clamp(S.nbk / 0.5)), open = smooth(clamp((S.nbk - 0.45) / 0.55));
      H.nb.position.set(lerp(SX + 0.85, SX + 0.6, slide), 0.76, lerp(SZ + 0.12, SZ, slide));
      H.nb.rotation.y = lerp(0.35, 0, slide);
      H.leftHinge.rotation.x = -Math.PI * open;
      H.leftHinge.position.y = 0.034 * open;                       // flipped cover rests on top of the desk
      const pn = Math.floor(S.page + 1e-4), pf = S.page - pn;
      H.paperR.map = H.pageTexs[Math.min(2, pf > 0.001 ? pn + 1 : pn)];
      H.turnPage.material.map = H.pageTexs[Math.min(2, pn)];
      H.turnPage.visible = pf > 0.001 && pf < 0.999;
      H.pageHinge.rotation.x = -Math.PI * smooth(pf);
      // backpack opens
      H.flap.rotation.x = -1.9 * smooth(S.bagL);
      H.items.position.y = -0.14 + 0.14 * smooth(S.bagL);
      // laptop: lifted out of the bag in an arc, set on the desk, lid opens
      const lm = smooth(clamp(S.lap / 0.55)), lo = smooth(clamp((S.lap - 0.5) / 0.5));
      H.laptop.visible = S.bagL > 0.25 || S.lap > 0.001;
      const from = H.bag.localToWorld(tmpA.set(0, 0.26, 0));
      H.laptop.position.set(lerp(from.x, SX + 0.56, lm), lerp(from.y, 0.76, lm) + Math.sin(Math.PI * lm) * 0.3, lerp(from.z, SZ, lm));
      H.laptop.rotation.set(0, lerp(0.5, 0, lm), lerp(-Math.PI / 2, 0, lm));
      H.lid.rotation.z = -1.85 * lo;
      // camera: a shot per action, blended by the story
      const shot = (px, py, pz, lx, ly, lz) => [V(px, py, pz), V(lx, ly, lz)];
      const blend = (sh, wgt) => { tmp.lerp(sh[0], wgt); tmpLook.lerp(sh[1], wgt); };
      const k = mobi ? 1.3 : 1;
      tmp.set(-1.2, 2.4, 6.0); tmpLook.set(-2.4, 1.0, 1.8);
      blend(shot(p.x + 2.6, 1.7, p.z + 3.4, p.x, 1.0, p.z), smooth(clamp(S.walkIn / 0.4)) * (1 - smooth(clamp((S.walkIn - 0.6) / 0.4))));
      blend(shot(SX + 1.9, 1.45, SZ + 2.9 * k, SX + 0.1, 0.85, SZ), smooth(clamp((S.walkIn - 0.6) / 0.4)));
      blend(shot(SX + 1.7, 1.3, SZ + 1.9 * k, SX + 0.1, 0.98, SZ), smooth(S.idL));
      blend(shot(SX - 0.95, 1.85, SZ + 1.35 * k, SX + 0.45, 0.72, SZ - 0.05), smooth(clamp(S.nbk * 1.4)));
      blend(shot(SX - 1.35, 1.15, SZ + 1.65 * k, SX - 0.05, 0.38, SZ + 0.6), smooth(S.bagL));
      blend(shot(SX - 0.55, 1.45, SZ + 0.95 * k, SX + 0.62, 0.9, SZ), smooth(clamp((S.lap - 0.45) / 0.55)));
      blend(shot(SX + 0.95, 1.45, SZ + 1.25 * k, SX + 0.05, 1.4, -3.5), smooth(S.dream));   // his profile, gazing out
      blend(shot(SX - 0.3, 1.45, SZ + 1.05 * k, SX + 0.3, 1.0, SZ + 0.05), smooth(S.phone));
      out.pos.copy(tmp); out.look.copy(tmpLook);
      out.pos.x += look.x * 0.08; out.pos.y += look.y * 0.05;
      applyZoom(out, seanHall, 'hall');
    }
    // shift the frame so Sean sits beside the chapter cards (left on desktop, top on phones)
    const shift = stage === 'hall' ? smooth(clamp((S.walkIn - 0.85) / 0.15)) * (1 - smooth(clamp(S.zoom * 1.6))) : 0;
    if (shift > 0.001) {
      const W = innerWidth, Hh = innerHeight;
      if (isMobile()) camera.setViewOffset(W, Hh, 0, Hh * 0.24 * shift, W, Hh);
      else camera.setViewOffset(W, Hh, W * 0.33 * shift, 0, W, Hh);
    } else if (camera.view && camera.view.enabled) camera.clearViewOffset();

    const v = Math.abs(st.getVelocity());
    fovKick += (clamp(v / 4000) * 3 - fovKick) * 0.08;
    camera.fov = baseFov + fovKick;
    camera.updateProjectionMatrix();
    const dtc = Math.min(0.05, (now - (frame.lastCam || now)) / 1000); frame.lastCam = now;
    if (!frame.cp || frame.stage !== stage || frame.cp.distanceTo(camPos) > 4) {
      frame.cp = camPos.clone(); frame.cl = camLook.clone(); frame.cu = camUp.clone(); frame.stage = stage;
    } else {
      const k = 1 - Math.exp(-dtc * (stage === 'room' || stage === 'end' ? 14 : 9));
      frame.cp.lerp(camPos, k); frame.cl.lerp(camLook, k); frame.cu.lerp(camUp, k).normalize();
    }
    camera.position.copy(frame.cp);
    camera.up.copy(frame.cu);
    camera.lookAt(frame.cl);
    camera.updateMatrixWorld();
    mapCards(stage);
    let warp = 0, bloom = 0.5, exposure = 1.0;
    if (stage === 'room') { warp = smooth(clamp((S.room - 0.82) / 0.18)) * 0.9; bloom = 0.85; exposure = 1.15; }
    else if (stage === 'end') { warp = smooth(clamp((S.pull > 0 ? 0.18 - S.pull : 0) / 0.18)) * 0.9; bloom = 0.85; exposure = 1.15; }
    else if (stage === 'street') { warp = smooth(clamp((S.enter - 0.55) / 0.45)) * 0.8; bloom = 0.4 + 0.6 * S.enter; exposure = 0.9; }
    else { const zw = smooth(clamp((S.zoom - 0.55) / 0.45)); warp = zw * (1 - zw) * 2.4; bloom = 0.35 - 0.2 * zw; exposure = 0.86; }
    if (LITE) { renderer.toneMappingExposure = exposure; renderer.setRenderTarget(null); renderer.render(scene, camera); }
    else post.render(scene, camera, { time: t, warp, bloom, exposure });
  }
  gsap.ticker.add(frame);

  if (!reduceMotion && matchMedia('(pointer: fine)').matches) {
    addEventListener('mousemove', (e) => {
      gsap.to(look, { x: (e.clientX / innerWidth - 0.5) * 2, y: -(e.clientY / innerHeight - 0.5) * 2, duration: 1.4, ease: 'power2.out', overwrite: true });
    });
  }

  /* --------------------------------------------------------
     GATE → ENTER
     -------------------------------------------------------- */
  const soundBtn = $('#sound-toggle');
  function syncSoundBtn() { soundBtn.textContent = Sound.on ? 'SOUND ● ON' : 'SOUND ○ OFF'; soundBtn.setAttribute('aria-pressed', String(Sound.on)); }
  soundBtn.addEventListener('click', () => { Sound.setEnabled(!Sound.on); syncSoundBtn(); });

  let entered = false;
  function enter(withSound) {
    if (entered || !ready) return;
    entered = true;
    Sound.setEnabled(withSound); syncSoundBtn();
    gsap.timeline({
      onComplete() {
        $('#gate').remove();
        document.body.classList.remove('locked');
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
      }
    })
      .to('.gate-title .ln > span', { yPercent: -110, duration: 0.8, stagger: 0.08, ease: 'power3.in' })
      .to('.gate-sub, .gate-actions, .gate-note, .mini-pc, .gate .bar, .gate-foot', { autoAlpha: 0, duration: 0.5 }, 0)
      .to('#gate', { autoAlpha: 0, duration: 0.9 }, 0.6)
      .fromTo('#gl', { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 2, ease: 'power2.out' }, 0.7)
      .fromTo('#hud, #hud-bottom, .progress, .chapters', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 1.5);
  }
  $$('[data-enter]').forEach((b) => b.addEventListener('click', () => enter(b.dataset.enter === 'sound')));
  gsap.from('.gate-title .ln > span', { yPercent: 110, duration: 1.1, stagger: 0.12, ease: 'power4.out', delay: 0.15 });
  gsap.from('.mini-pc, .gate-sub, .gate-actions, .gate-note', { autoAlpha: 0, y: 16, duration: 0.9, stagger: 0.08, delay: 0.5 });

  $('#rewind').addEventListener('click', () => scrollToTime(0, 6));

  /* --------------------------------------------------------
     CUSTOM CURSOR (fine pointers only)
     -------------------------------------------------------- */
  const cur = $('#cursor');
  if (cur && matchMedia('(pointer: fine)').matches) {
    document.documentElement.classList.add('has-cursor');
    const dot = $('.c-dot', cur), ring = $('.c-ring', cur);
    const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' }), dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
    addEventListener('mousemove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); cur.classList.add('on'); });
    document.addEventListener('mouseleave', () => cur.classList.remove('on'));
    document.addEventListener('mouseover', (e) => cur.classList.toggle('hover', !!e.target.closest('a, button')));
  }
})();
