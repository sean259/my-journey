/* ==========================================================
   MASTER TIMELINE — the whole story on one GSAP timeline.
   Scroll position drives its playhead (story/scroll.js); the frame
   loop reads the values it animates from S (story/state.js).

     ROOM      lamp on → CRT boots → camera dives into the screen
     STREET    title → Sean leaves home → rides the jeepney past each school → CIT-U
     CORRIDOR  he checks his ID (Profile)
     CLASSROOM notebook (Quests) → laptop (Inventory) → window (Side quests) → phone (Save point)
     ROOM      CRT powers off → camera pulls back → outro
   ========================================================== */
import { gsap } from 'gsap';
import { $$ } from '../utils.js';
import { RIDE, HOLD, isMobile } from '../config.js';
import { S } from './state.js';
import { JX1, JX2, rideInv } from './paths.js';
import { surfOn } from './surfaces.js';

// what Sean does before each chapter appears, and how the card arrives
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
const sv = (a, b) => () => (surfOn() ? a : typeof b === 'function' ? b() : b);   // value on a 3D surface vs. floating card
// card entrances: 'from' states per beat kind
const IN = {
  id: { autoAlpha: 0, y: sv(0, 140), scale: sv(1, 0.55), rotationX: sv(0, () => (mob() ? 0 : 30)), filter: sv('blur(0px) brightness(2.2)', 'blur(18px) brightness(1)'), clipPath: sv('inset(0% 0% 100% 0% round 0px)', 'inset(0% 0% 0% 0% round 0px)'), transformOrigin: '30% 100%' },   // prints onto the badge
  page0: { autoAlpha: 0, rotationY: sv(0, () => (mob() ? 0 : -80)), y: sv(12, () => (mob() ? 80 : 0)), filter: 'blur(6px) brightness(1)', transformOrigin: '0% 50%' },
  page: { autoAlpha: 0, rotationY: sv(0, () => (mob() ? 0 : 25)), x: sv(40, () => (mob() ? 60 : 40)), filter: sv('blur(3px) brightness(1)', 'blur(4px) brightness(1)'), transformOrigin: '0% 50%' },
  bag: { autoAlpha: 0, y: sv(0, 260), scale: sv(1.02, 0.9), filter: sv('blur(6px) brightness(1.8)', 'blur(0px) brightness(1)'), clipPath: sv('inset(0% 0% 0% 0% round 0px)', 'inset(100% 0% 0% 0% round 0px)') },
  dream: { autoAlpha: 0, scale: sv(1.04, 1.08), y: sv(0, -40), filter: sv('blur(16px) brightness(1.2)', 'blur(26px) brightness(1)') },
  phone: { autoAlpha: 0, y: sv(0, 320), rotationX: sv(0, () => (mob() ? 0 : -25)), scale: sv(1, 0.85), filter: sv('blur(0px) brightness(0)', 'blur(0px) brightness(1)'), transformOrigin: '50% 100%' }   // screen wakes up
};
const SHOWN = { autoAlpha: 1, x: 0, y: 0, scale: 1, rotationX: 0, rotationY: 0, filter: 'blur(0px) brightness(1)', clipPath: 'inset(0% 0% 0% 0% round 0px)' };

export function buildTimeline(cards) {
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

  // STREET — title, then the commute (cinema bars in)
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

  // CHAPTERS — one beat per card: Sean acts, the camera dives into the prop, the card arrives
  let current = null;
  const rest = [], cardInAt = [];
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
    tl.fromTo(card, IN[beat.kind], { ...SHOWN, duration: beat.kind === 'page' ? 1.3 : 1.7, ease: 'power3.out', immediateRender: false }, inAt)
      .fromTo($$('.r', card), { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07, ease: 'power2.out', immediateRender: false }, inAt + 0.45)
      .fromTo(card, { '--p': 0 }, { '--p': 1, duration: i === cards.length - 1 ? HOLD + 2 : HOLD, ease: 'none', immediateRender: false });
    cardInAt.push(inAt);
    rest.push({ start: tl.labels[label], rest: inAt + 1.8 });   // the card is fully open at `rest`
    current = card;
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

  return { tl, rest, cardInAt, capAt };
}
