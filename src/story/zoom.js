/* ==========================================================
   FIRST-PERSON DIVE — cut to Sean's eyes, then glide until the
   prop he's holding (ID, notebook, laptop, window, phone) fills
   the screen face-on. Driven by S.zoom (0 → 1) and S.focus.
   ========================================================== */
import * as THREE from 'three';
import { $, clamp, smooth } from '../utils.js';
import { isMobile } from '../config.js';
import { S } from './state.js';
import { getQuad, surfOn } from './surfaces.js';

const FOCUS_KIND = ['id', 'book', 'laptop', 'window', 'phone'];   // indexed by S.focus
const zoomShade = $('#zoom-shade');
const zq = [];

// camera placement that looks straight at a quad and fills `fill` of the screen
function frameQuad(q, fill, camera, baseFov) {
  const c = q[0].clone().add(q[1]).add(q[2]).add(q[3]).multiplyScalar(0.25);
  const right = q[1].clone().sub(q[0]), down = q[3].clone().sub(q[0]);
  const n = down.clone().cross(right).normalize();
  const tanV = Math.tan(THREE.MathUtils.degToRad(baseFov) / 2);
  const d = Math.max(down.length() / 2 / tanV, right.length() / 2 / (tanV * camera.aspect)) / fill;
  return { pos: c.clone().addScaledVector(n, d), look: c, up: down.normalize().negate() };
}

// bends the camera shot in `out` ({ pos, look, up }) toward the prop; `who` is the Sean in this scene
export function applyZoom(out, who, stage, camera, baseFov) {
  const z = S.zoom;
  if (z <= 0.001) { zoomShade.style.opacity = '0'; return; }
  const kind = FOCUS_KIND[Math.round(S.focus)];
  const F = frameQuad(getQuad(kind, stage, zq, true), isMobile() ? 0.92 : 0.84, camera, baseFov);   // frame the resting badge so its swing reads on screen
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
  out.up.lerp(F.up, smooth(clamp((z - 0.3) / 0.7))).normalize();
  zoomShade.style.opacity = surfOn() ? '0' : (0.55 * smooth(clamp((z - 0.6) / 0.4))).toFixed(3);
}
