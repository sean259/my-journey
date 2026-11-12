/* ==========================================================
   HUD — chapter label, progress %, chapter nav, and sound cues
   fired as the timeline plays forward.
   ========================================================== */
import { $, $$, pad } from '../utils.js';
import { Sound } from '../audio/sound.js';

export function initHud({ tl, cards, rest, cardInAt, capAt, scrollToTime }) {
  const L = tl.labels;
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

  // [timeline time, sound] — played once each time the playhead crosses it going forward
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
    progressEl.textContent = `${pad(Math.round(tl.progress() * 100), 3)}%`;
    barEl.style.transform = `scaleX(${tl.progress()})`;
    let i = 0;
    for (let k = 0; k < chapters.length; k++) if (t >= chapters[k].t - 0.001) i = k;
    if (i !== chapIdx) {
      chapIdx = i;
      chapterEl.textContent = `CH.${chapters[i].n} — ${chapters[i].name}`;
      navBtns.forEach((b, k) => b.classList.toggle('on', k === i));
    }
  });
}
