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

  const VH_PER_BEAT = 11;
  const WALK = 44;
  const HOLD = 4.5;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => innerWidth <= 760;

  /* --------------------------------------------------------
     SOUND — synthesized, no files
     -------------------------------------------------------- */
  const Sound = (() => {
    let ctx = null, master, humGain, rainGain, noiseBuf, on = false, humWanted = false, rainWanted = true, lastStep = 0;
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
    lenis = new window.Lenis({ lerp: 0.08 });
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
  const S = { room: 0, lamp: 0, monitor: 0, boot: 0, walk: 0, enter: 0, hall: -0.6, pull: 0, screenOff: 0 };
  const look = { x: 0, y: 0 };
  let room, street, hall, sean, seanHall, ready = false;
  const START_X = 1.5;
  const HALL_X0 = 4 - 1.6, HALL_GAP = 12;
  const cards = $$('.stage > .win');
  const hallLabels = cards.map((c) => c.querySelector('.win-bar span').textContent.split(' · ')[0]);

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
      hall = World3D.buildHall(hallLabels);
      sean = Sean3D.create(); sean.root.position.set(START_X, 0, World3D.PATH_Z); street.scene.add(sean.root);
      seanHall = Sean3D.create(); hall.scene.add(seanHall.root);
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
      hall.scene.environment = env('#fff3e0', '#f1e2c8', '#7a6650', 0.26);
      room.scene.environment = env('#1b2033', '#3a2a22', '#0b0b10', 0.5);
      for (const sc of [room.scene, street.scene, hall.scene]) renderer.compile(sc, camera);
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
    .addLabel('walk')
    .to('#title-card', { autoAlpha: 0, y: -40, filter: 'blur(8px)', duration: 1.2 }, 'walk')
    .to(S, { walk: 1, duration: WALK, ease: 'none' }, 'walk+=0.4');
  const WALK_AT = tl.labels.walk + 0.4;
  const DOOR_X = World3D.DOOR_X;
  const capAt = (x) => WALK_AT + clamp((x - START_X) / (DOOR_X - START_X)) * WALK;
  for (const [key, x, span] of [['home', 3, 5], ['s1', 16, 7], ['s2', 36, 7], ['s3', 52, 7], ['s4', 72, 9]]) {
    const el = `.caption[data-cap="${key}"]`, a = capAt(x) - span / 2;
    tl.fromTo(el, { autoAlpha: 0, x: -30, clipPath: 'inset(0 100% 0 0)' }, { autoAlpha: 1, x: 0, clipPath: 'inset(0 0% 0 0)', duration: 1.2, ease: 'power3.out', immediateRender: false }, a)
      .to(el, { autoAlpha: 0, x: 20, duration: 0.9, ease: 'power2.in' }, a + span);
  }

  // ARRIVAL — turn to the door, doors open, walk into the light
  tl.addLabel('arrive', WALK_AT + WALK)
    .fromTo('#bubble', { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(2)', immediateRender: false }, 'arrive+=0.3')
    .to('#bubble', { autoAlpha: 0, scale: 0.8, duration: 0.5 }, 'arrive+=2.6')
    .to(S, { enter: 1, duration: 7, ease: 'none' }, 'arrive+=0.6')
    .addLabel('hall', 'arrive+=7.6')
    .to('.lb', { scaleY: 0, duration: 1.2, ease: 'power2.inOut' }, 'hall');
  flash(tl.labels.hall, '#fff6dc', 2.2);

  // HALLWAY — walk to each door, open its card
  const offX = () => (isMobile() ? 0 : 70), offY = () => (isMobile() ? 60 : 0);
  let current = null;
  const rest = [];
  cards.forEach((card, i) => {
    const label = `card${i}`;
    tl.addLabel(label, i === 0 ? 'hall+=0.4' : undefined);
    tl.fromTo(S, { hall: i === 0 ? -0.6 : i - 1 }, { hall: i, duration: i === 0 ? 2.2 : 3.2, ease: 'sine.inOut', immediateRender: false }, label);
    if (current) {
      tl.to(current, { autoAlpha: 0, x: () => -offX() * 0.5, y: () => -offY() * 0.5 - 20, scale: 0.95, filter: 'blur(10px)', duration: 1.1, ease: 'power2.in' }, label);
    }
    const inAt = `${label}+=${i === 0 ? 1.2 : 2.2}`;
    tl.fromTo(card,
      { autoAlpha: 0, x: () => offX(), y: () => offY(), rotationY: () => (isMobile() ? 0 : -14), scale: 0.97, filter: 'blur(14px)', clipPath: 'inset(0% 0% 100% 0% round 22px)' },
      { autoAlpha: 1, x: 0, y: 0, rotationY: 0, scale: 1, filter: 'blur(0px)', clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.6, ease: 'power3.out', immediateRender: false }, inAt)
      .fromTo($$('.r', card), { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07, ease: 'power2.out', immediateRender: false }, `${inAt}+=0.45`)
      .to({}, { duration: i === cards.length - 1 ? HOLD + 2 : HOLD });
    rest.push({ start: tl.labels[label], rest: tl.labels[label] + (i === 0 ? 1.2 : 2.2) + 1.8, i });
    current = card;
  });

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
  const st = ScrollTrigger.create({ animation: tl, trigger: '#track', start: 'top top', end: 'bottom bottom', scrub: lenis ? 0.9 : 1.3 });
  const timeToY = (t) => st.start + (t / tl.duration()) * (st.end - st.start);
  const yToTime = (y) => clamp((y - st.start) / (st.end - st.start)) * tl.duration();
  function scrollToTime(t, duration = 2.5) {
    const y = timeToY(t);
    if (lenis) lenis.scrollTo(y, { duration, easing: (x) => 1 - Math.pow(1 - x, 3) });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  }

  // gentle snap: never leave a card half-open
  let snapTimer = 0, snapping = false;
  function maybeSnap() {
    if (snapping) return;
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
      name: c.querySelector('.win-bar span').textContent,
      nav: c.querySelector('.win-bar span').textContent.split(' · ')[0].toLowerCase().replace(/^\w/, (m) => m.toUpperCase()),
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
    ...[16, 36, 52, 72].map((x) => [capAt(x) - 3, () => Sound.chime()]),
    [L.arrive + 0.3, () => Sound.talk()],
    [L.arrive + 1.8, () => Sound.door()],
    [L.hall - 0.7, () => Sound.whoosh()],
    ...cards.map((_, i) => [L[`card${i}`] + (i === 0 ? 1.2 : 2.2), () => Sound.open()]),
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

  function currentStage(t) {
    if (t < L.street) return 'room';
    if (t < L.hall) return 'street';
    if (t < L.off + 1.6) return 'hall';
    return 'end';
  }

  let fovKick = 0;
  const bubble = $('#bubble');
  function frame() {
    if (!ready) return;
    const now = performance.now(), t = now / 1000;
    const stage = currentStage(tl.time());
    const out = { pos: camPos, look: camLook };
    let scene;
    Sound.rain(stage === 'room' || stage === 'end');
    Sound.hum(stage === 'room' && S.monitor > 0.5);

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
      room.steam.forEach((s, i) => { const k = ((t * 0.25 + i / 3) % 1); s.position.y = 0.9 + k * 0.18; s.material.opacity = 0.25 * Math.sin(k * Math.PI); s.position.x = -0.55 + Math.sin(t + i) * 0.015; });
      const d = new Date(), sec = d.getSeconds() + d.getMilliseconds() / 1000, min = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + min / 60;
      room.handS.rotation.z = -sec / 60 * Math.PI * 2; room.handM.rotation.z = -min / 60 * Math.PI * 2; room.handH.rotation.z = -hr / 12 * Math.PI * 2;
    } else if (stage === 'street') {
      scene = street.scene;
      const w = S.walk, e = S.enter;
      const sx = lerp(START_X, DOOR_X, w);
      // Sean: walk along the sidewalk, then turn and walk into the doorway
      const turn = clamp(e / 0.18), inward = smooth(clamp((e - 0.3) / 0.62));
      const zIn = lerp(World3D.PATH_Z, street.DOOR_Z - 1.6, inward);
      sean.root.position.set(sx, 0, zIn);
      sean.update(w * (DOOR_X - START_X) + inward * (World3D.PATH_Z - street.DOOR_Z + 1.6), now, { onStep: Sound.step, face: e > 0.02 ? (Math.PI / 2) * smooth(turn) : null });
      const open = smooth(clamp((e - 0.14) / 0.3));
      street.hingeL.rotation.y = open * 1.35; street.hingeR.rotation.y = -open * 1.35;
      street.doorLight.intensity = 2.6 * open; street.spill.material.opacity = 0.8 * open;
      // camera
      const mob = isMobile();
      const intro = smooth(clamp(w / 0.05));
      const towards = smooth(clamp((w - 0.88) / 0.12));
      const wide = { p: V(sx + 4, 4.2, 15), l: V(sx + 3.5, 2.4, -4) };
      const track = { p: V(sx + 1.6, 1.85 + Math.sin(w * 9) * 0.05, mob ? 10.5 : 8.6), l: V(sx + (mob ? 0.4 : 2.6), mob ? 1.7 : 1.6, -1) };
      const hero = { p: V(sx - 2, 1.4, 8.4), l: V(sx + 0.2, 3.2, -3) };
      tmp.lerpVectors(wide.p, track.p, intro); tmpLook.lerpVectors(wide.l, track.l, intro);
      tmp.lerp(hero.p, towards); tmpLook.lerp(hero.l, towards);
      if (e > 0) {
        const a = smooth(clamp(e / 0.3)), b = smooth(clamp((e - 0.3) / 0.7));
        const behind = { p: V(DOOR_X + 1.4, 1.75, 4.4), l: V(DOOR_X, 1.5, street.DOOR_Z) };
        const through = { p: V(DOOR_X, 1.55, street.DOOR_Z + 0.4), l: V(DOOR_X, 1.45, street.DOOR_Z - 6) };
        tmp.lerp(behind.p, a); tmpLook.lerp(behind.l, a);
        tmp.lerp(through.p, b); tmpLook.lerp(through.l, b);
      }
      out.pos.copy(tmp); out.look.copy(tmpLook);
      out.pos.x += look.x * 0.25 * (1 - e); out.pos.y += look.y * 0.12 * (1 - e);
      // time of day: dawn → morning
      const day = smooth(clamp(w * 1.3));
      const u = street.sky.material.uniforms;
      u.top.value.copy(SKY.dawn.top).lerp(SKY.day.top, day); u.mid.value.copy(SKY.dawn.mid).lerp(SKY.day.mid, day); u.bottom.value.copy(SKY.dawn.bottom).lerp(SKY.day.bottom, day);
      street.fog.color.copy(SKY.dawn.fog).lerp(SKY.day.fog, day);
      street.sun.color.copy(SKY.dawn.sun).lerp(SKY.day.sun, day); street.sun.intensity = lerp(0.9, 1.45, day);
      street.hemi.color.copy(SKY.dawn.hemi).lerp(SKY.day.hemi, day); street.hemi.intensity = lerp(0.5, 0.65, day);
      street.sun.position.set(sx + lerp(30, 18, day), lerp(16, 40, day), 28); street.sun.target.position.set(sx, 0, 0);
      street.sunDisc.position.set(sx + 70, lerp(12, 70, day), -170);
      street.sunDisc.material.color.copy(SKY.dawn.sun).lerp(C('#ffffff'), day);
      street.sway.forEach((c, i) => { c.rotation.z = Math.sin(t * 0.9 + i * 1.7) * 0.025; c.rotation.x = Math.sin(t * 0.7 + i) * 0.015; });
      const fp = street.flagGeo.attributes.position;
      for (let i = 0; i < fp.count; i++) { const x = fp.getX(i) + 1.2; fp.setZ(i, Math.sin(x * 2.6 - t * 4) * 0.12 * (x / 2.4)); }
      fp.needsUpdate = true; street.flagGeo.computeVertexNormals();
      street.jeepBody.position.y = Math.sin(t * 55) * 0.006;
      street.puffs.forEach((p, i) => { const k = (t * 0.6 + i / 4) % 1; p.position.set(57.9 - k * 1.4, 0.55 + k * 0.7, -4.4); p.scale.setScalar(0.3 + k * 1.2); p.material.opacity = 0.55 * (1 - k); });
      street.clouds.position.x = (t * 0.8) % 60 - 30;
      street.birds.forEach((b) => { const x = sx - 40 + ((t * 3.5 + b.off * 9) % 90); b.g.position.set(x, b.y + Math.sin(t + b.off) * 1.2, b.z); const f = Math.sin(t * 9 + b.off) * 0.6; b.lp.rotation.z = f; b.rp.rotation.z = -f; });
      // speech bubble follows his head
      sean.headWorld(tmp); tmp.y += 0.22; tmp.project(camera);
      bubble.style.left = `${((tmp.x + 1) / 2) * innerWidth + 14}px`;
      bubble.style.top = `${((1 - tmp.y) / 2) * innerHeight - 48}px`;
    } else {
      scene = hall.scene;
      const sx = HALL_X0 + S.hall * HALL_GAP;
      seanHall.root.position.set(sx, 0, 0.2);
      const atStop = Math.abs(S.hall - Math.round(S.hall)) < 0.003;
      seanHall.update(S.hall * HALL_GAP, now, { onStep: Sound.step, face: atStop ? -0.55 : null });
      const mob = isMobile();
      out.pos.set(sx + (mob ? 0.4 : 2.2), mob ? 2.2 : 1.6, mob ? 6.8 : 6.4);
      out.look.set(sx + (mob ? 0.4 : 3.4), mob ? -0.2 : 1.2, -0.8);
      out.pos.x += look.x * 0.15; out.pos.y += look.y * 0.08;
      hall.key.position.set(sx + 4, 7, 6); hall.key.target.position.set(sx + 2, 0, 0);
      hall.warm.position.set(sx + 1, 2.6, 1.5);
    }

    const v = Math.abs(st.getVelocity());
    fovKick += (clamp(v / 4000) * 3 - fovKick) * 0.08;
    camera.fov = baseFov + fovKick;
    camera.updateProjectionMatrix();
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    let warp = 0, bloom = 0.5, exposure = 1.0;
    if (stage === 'room') { warp = smooth(clamp((S.room - 0.82) / 0.18)) * 0.9; bloom = 0.85; exposure = 1.15; }
    else if (stage === 'end') { warp = smooth(clamp((S.pull > 0 ? 0.18 - S.pull : 0) / 0.18)) * 0.9; bloom = 0.85; exposure = 1.15; }
    else if (stage === 'street') { warp = smooth(clamp((S.enter - 0.55) / 0.45)) * 0.8; bloom = 0.4 + 0.6 * S.enter; exposure = 0.9; }
    else { bloom = 0.35; exposure = 0.86; }
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
