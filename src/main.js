/* ==========================================================
   JOURNEY OF SEAN — entry point.
   One Three.js canvas, four worlds, one scroll timeline.

   Where things live:
     config.js            pacing knobs (scroll length, ride length, hold time)
     story/timeline.js    the order and timing of every scene
     story/stages/*.js    what happens in each world, frame by frame
     three/world/*.js     how each world is built
     three/sean.js        the 3D character and his walk
     audio/sound.js       synthesized sound effects
     index.html           all the portfolio text, projects and links
   ========================================================== */
import './styles/index.css';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $ } from './utils.js';
import { W } from './story/state.js';
import { createRenderer } from './story/renderer.js';
import { buildWorlds } from './story/worlds.js';
import { setupCards } from './story/surfaces.js';
import { buildTimeline } from './story/timeline.js';
import { createLenis, bindScroll } from './story/scroll.js';
import { createFrameLoop } from './story/frame.js';
import { initHud } from './ui/hud.js';
import { initGate, startLoadingCounter, gateNote } from './ui/gate.js';
import { initPointer } from './ui/pointer.js';

document.documentElement.classList.remove('no-js');
gsap.registerPlugin(ScrollTrigger);
THREE.ColorManagement.legacyMode = false;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

function start() {
  const lenis = createLenis();

  let gfx;
  try {
    gfx = createRenderer($('#gl'));
  } catch {
    document.body.classList.add('no-webgl');
    gateNote.textContent = "YOUR BROWSER CAN'T RUN THE 3D WORLD (WEBGL IS OFF).";
    return;
  }

  const cards = setupCards();

  const loading = startLoadingCounter();
  buildWorlds(gfx.renderer, gfx.camera)
    .then(() => loading.done())
    .catch((e) => { console.error(e); gateNote.textContent = 'THE 3D WORLD FAILED TO LOAD. PLEASE REFRESH.'; });

  const { tl, rest, cardInAt, capAt } = buildTimeline(cards);
  const { st, scrollToTime } = bindScroll(tl, lenis, rest);
  initHud({ tl, cards, rest, cardInAt, capAt, scrollToTime });
  gsap.ticker.add(createFrameLoop({ ...gfx, tl, st, cards }));

  initGate({ lenis, isReady: () => W.ready });
  $('#rewind').addEventListener('click', () => scrollToTime(0, 6));
  initPointer();
}

start();
