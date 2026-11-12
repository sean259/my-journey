/* ==========================================================
   CHAPTER CARDS ON 3D PROPS
   Each chapter (.stage > .win) is wrapped in a .surf box. On desktop
   the box is mapped every frame onto its prop (ID badge, notebook,
   laptop, window, phone) with a CSS matrix3d; on phones the cards float.
   ========================================================== */
import * as THREE from 'three';
import { $, $$, pad } from '../utils.js';
import { isMobile } from '../config.js';
import { W } from './state.js';

// surface size in CSS px (w) and aspect ratio (a) of each prop
const SURF = { id: { w: 600, a: 0.729 }, book: { w: 1180, a: 1.306 }, laptop: { w: 1100, a: 1.474 }, window: { w: 1150, a: 1.654 }, phone: { w: 330, a: 0.478 } };
const SURF_OF = { about: 'id', 'proj-1': 'book', 'proj-2': 'book', 'proj-3': 'book', skills: 'laptop', hobbies: 'window', contact: 'phone' };
export const surfOn = () => !isMobile();

// chapter rails (number, serif title with the last word in italics, progress line) + surface wrappers
export function setupCards() {
  const cards = $$('.stage > .win');
  cards.forEach((c, i) => {
    const bar = c.querySelector('.win-bar');
    c.dataset.kicker = bar.querySelector('span').textContent;
    const words = (c.dataset.title || c.dataset.kicker).replace(/-/g, '‑').split(' ');   // non-breaking hyphens
    const last = words.pop();
    const n = pad(i + 3);
    bar.innerHTML = '<div><span class="rail-k">CHAPTER ' + n + '</span><h2 class="rail-t">' + (words.length ? words.join(' ') + ' ' : '') + '<em>' + last + '</em></h2></div>' +
      '<span class="rail-n" aria-hidden="true">' + n + '</span><span class="rail-track" aria-hidden="true"><i></i></span>';

    c.dataset.surf = SURF_OF[c.id] || 'window';
    const w = document.createElement('div'); w.className = 'surf';
    c.before(w); w.appendChild(c); c._surf = w;
  });

  const stageEl = $('#stage');
  // size each card to its prop (desktop) or zoom it to fit the screen (phones) — never an inner scrollbar
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
  return cards;
}

// 4 corners (TL, TR, BR, BL) of each prop's surface, in the prop's local space
const BOOK = [[0.124, 0.026, -0.162], [0.124, 0.026, 0.162], [-0.124, 0.026, 0.162], [-0.124, 0.026, -0.162]];
const LAPQ = [[-0.205, -0.003, -0.14], [-0.205, -0.003, 0.14], [-0.015, -0.003, 0.14], [-0.015, -0.003, -0.14]];
const WINQ = [[-1.29, 2.73, -4.93], [1.29, 2.73, -4.93], [1.29, 1.17, -4.93], [-1.29, 1.17, -4.93]];   // already world space
const loc = (obj, pts, arr) => { obj.updateWorldMatrix(true, false); pts.forEach((p, i) => (arr[i] || (arr[i] = new THREE.Vector3())).set(p[0], p[1], p[2]).applyMatrix4(obj.matrixWorld)); return arr; };

// world-space corners of a prop's surface; stage is 'corridor' or 'classroom'
export function getQuad(kind, stage, arr, rest) {
  if (kind === 'id') return (stage === 'corridor' ? W.seanCorr : W.seanClass).idQuad(arr, rest);
  if (kind === 'phone') return W.seanClass.phoneQuad(arr);
  if (kind === 'book') return loc(W.classroom.nb, BOOK, arr);
  if (kind === 'laptop') return loc(W.classroom.lid, LAPQ, arr);
  WINQ.forEach((p, i) => (arr[i] || (arr[i] = new THREE.Vector3())).set(p[0], p[1], p[2]));
  return arr;
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

const _pv = new THREE.Vector3(), mq = [];
// pin every card onto its prop for this frame (hidden when the prop faces away or is behind the camera)
export function mapCards(cards, camera, stage) {
  const on = surfOn() && (stage === 'corridor' || stage === 'classroom');
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
