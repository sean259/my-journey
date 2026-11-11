/* ==========================================================
   MIND-OF-THE-MACHINE PORTFOLIO
   Scroll drives one GSAP timeline:
   room → lamp on → monitor on → zoom into screen → boot →
   hero → about → projects → skills → contact → power off → outro
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
     SOUND — everything is synthesized with Web Audio,
     so there are no audio files to host.
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
      humGain = ctx.createGain(); humGain.gain.value = humWanted ? 0.045 : 0;
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

    return {
      setEnabled,
      get on() { return on; },
      hum(v) {
        if (v === humWanted) return;
        humWanted = v;
        if (humGain) humGain.gain.setTargetAtTime(v ? 0.045 : 0, ctx.currentTime, 0.25);
      },
      click() { noise(0.03, 0.6, 3200, 2); setTimeout(() => noise(0.02, 0.3, 1400, 2), 45); },
      powerOn() { noise(0.35, 0.18, 700); tone(48, 0.7, 'sine', 0.3, 28); setTimeout(() => tone(7800, 0.6, 'sine', 0.008), 120); },
      key() { noise(0.025, 0.35, 2400 + Math.random() * 1600, 3); },
      beep() { tone(988, 0.09, 'square', 0.03); },
      chime() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'triangle', 0.05), i * 90)); },
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
     CAMERA — transforms the whole room so the monitor
     screen ends up filling the viewport.
     -------------------------------------------------------- */
  const room = $('#room');
  const screenRect = $('#scr-rect');
  const cam = { p: 0 };          // 0 = wide shot, 1 = screen fills viewport
  const look = { x: 0, y: 0 };   // mouse parallax
  let cs = { x: 0, y: 0, s: 1 }; // current applied transform
  let focus = null;              // screen centre + size in untransformed px

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
    const s = Math.exp(Math.log(target) * p);           // smooth zoom in log space
    const par = (1 - p) * 16;
    const px = focus.fx + (vw / 2 - focus.fx) * p + look.x * par;
    const py = focus.fy + (vh / 2 - focus.fy) * p + look.y * par;
    cs = { x: px - s * focus.fx, y: py - s * focus.fy, s };
    room.style.transform = `translate3d(${cs.x}px, ${cs.y}px, 0) scale(${s})`;
  }

  measure(); renderCam();
  addEventListener('resize', () => { measure(); renderCam(); });
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
     MASTER TIMELINE (time units are arbitrary "beats";
     scroll length is derived from the total)
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

  // 2 — monitor powers on
    .addLabel('monitor', 6)
    .fromTo('#scr-flash', { opacity: 0 }, { opacity: 0.9, duration: 0.25, yoyo: true, repeat: 1, immediateRender: false }, 'monitor')
    .to('#scr-on', { opacity: 1, duration: 0.8 }, 'monitor+=0.3')
    .to('#scr-glow', { opacity: 1, duration: 1.5 }, 'monitor+=0.3')
    .to('#led', { attr: { fill: '#7dffad' }, duration: 0.2 }, 'monitor');

  // 3 — fly into the screen
  c = camTween(0.12, 1, 12, 'power2.inOut');
  tl.fromTo(cam, c.from, c.to, 9)
    .addLabel('boot', 19.5)
    .to('#os', { autoAlpha: 1, duration: 1.5 }, 'boot');

  // 4 — boot sequence
  const bootLines = $$('#boot p');
  const BOOT_START = 1.5, BOOT_GAP = 0.9;
  tl.fromTo(bootLines, { autoAlpha: 0, x: -10 },
    { autoAlpha: 1, x: 0, duration: 0.3, stagger: BOOT_GAP, immediateRender: false }, `boot+=${BOOT_START}`);

  // 5 — hero
  tl.addLabel('hero', `boot+=${BOOT_START + bootLines.length * BOOT_GAP + 2}`)
    .to('#boot', { autoAlpha: 0, y: -40, duration: 1.2 }, 'hero')
    .fromTo('#hero', { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 1.6, ease: 'power2.out', immediateRender: false }, 'hero+=0.6')
    .fromTo('.hero-name .ln > span', { yPercent: 105 }, { yPercent: 0, duration: 1.4, stagger: 0.3, ease: 'power3.out', immediateRender: false }, 'hero+=0.6')
    .to({}, { duration: 4 });

  // 6 — windows, one after another
  let current = '#hero';
  function scene(label, sel, hold = 5) {
    tl.addLabel(label)
      .to(current, { autoAlpha: 0, y: -50, scale: 0.97, duration: 0.9, ease: 'power1.in' }, label)
      .fromTo(sel, { autoAlpha: 0, y: 60, scale: 0.96 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 1.6, ease: 'power2.out', immediateRender: false }, `${label}+=1`)
      .to({}, { duration: hold });
    current = sel;
  }
  const projects = $$('.win.proj');
  scene('about', '#about');
  projects.forEach((el, i) => scene(`proj${i}`, `#${el.id}`));
  scene('skills', '#skills');
  scene('contact', '#contact', 7);

  // 7 — power off + pull back out of the screen
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
     HUD, CHAPTERS & SOUND CUES (driven by timeline time)
     -------------------------------------------------------- */
  const L = tl.labels;
  const chapters = [
    { t: 0, n: '00', name: 'THE ROOM', task: 'IDLE' },
    { t: L.boot, n: '01', name: 'BOOT SEQUENCE', task: 'BOOT.SYS' },
    { t: L.hero, n: '02', name: 'HELLO', task: 'PORTFOLIO.EXE' },
    { t: L.about, n: '03', name: 'ABOUT', task: 'ABOUT_ME.TXT' },
    ...projects.map((_, i) => ({
      t: L[`proj${i}`], n: '04',
      name: `WORK ${String(i + 1).padStart(2, '0')}/${String(projects.length).padStart(2, '0')}`,
      task: `PROJECT_${String(i + 1).padStart(2, '0')}.EXE`
    })),
    { t: L.skills, n: '05', name: 'TOOLKIT', task: 'SKILLS.SH' },
    { t: L.contact, n: '06', name: 'CONTACT', task: 'CONTACT.SH' },
    { t: L.off, n: '07', name: 'POWER OFF', task: 'SHUTDOWN' }
  ];

  const cues = [
    [L.lamp, () => Sound.click()],
    [L.monitor, () => Sound.powerOn()],
    ...bootLines.map((_, i) => [L.boot + BOOT_START + i * BOOT_GAP,
      () => (i === bootLines.length - 1 ? Sound.beep() : Sound.key())]),
    [L.hero + 0.6, () => Sound.chime()],
    ...['about', ...projects.map((_, i) => `proj${i}`), 'skills', 'contact'].map((k) => [L[k] + 1,() => Sound.open()]),
    [L.off, () => Sound.off()],
    [L.lampOff, () => Sound.click()]
  ];

  const chapterEl = $('#chapter'), progressEl = $('#progress'), taskEl = $('#task-label');
  let chapIdx = -1, lastT = 0;

  tl.eventCallback('onUpdate', () => {
    const t = tl.time();
    if (t > lastT) for (const [ct, fn] of cues) if (lastT < ct && t >= ct) fn();
    lastT = t;

    Sound.hum(t >= L.monitor && t < L.off);
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
     CLOCKS (wall clock in the room + OS taskbar)
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
        measure(); renderCam();
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

  // gate intro
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
