/* ==========================================================
   STAGE: CLASSROOM CpE 301 — Sean sits down, then each chapter is
   a small action: notebook (Quests), laptop from the backpack
   (Inventory), daydreaming out the window (Side quests), phone
   (Save point).
   ========================================================== */
import * as THREE from 'three';
import { clamp, lerp, smooth } from '../../utils.js';
import { isMobile } from '../../config.js';
import { Sound } from '../../audio/sound.js';
import { S, W, look } from '../state.js';
import { classPath } from '../paths.js';
import { applyZoom } from '../zoom.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3(), tmpLook = new THREE.Vector3(), tmpA = new THREE.Vector3();
let P_CLASS = null;                          // door → seat, built once the classroom exists

export function updateClassroom(out, { now, camera, baseFov }) {
  const H = W.classroom, sean = W.seanClass, [SX, SZ] = H.SEAT, mobi = isMobile();
  P_CLASS ||= classPath(H.SEAT);

  // ---- Sean: walk in, sit, then blend between the pose of each chapter ----
  const sit = smooth(S.sitDown);
  const p = P_CLASS.at(P_CLASS.L * S.walkIn);
  let yaw = p.yaw;
  if (S.walkIn >= 1 || sit > 0) yaw = lerp(-Math.PI / 2, 0, smooth(clamp(sit * 1.6)));
  sean.root.position.set(p.x, lerp(0, -0.385, sit), p.z);
  const pose = [
    { w: smooth(S.idL), aN: 30, eN: 108, look: -24, idLift: 1 },
    { w: smooth(clamp(S.nbk * 1.4)), aN: 44, eN: 40, aF: 44, eF: 40, look: -30, lean: 8 },
    { w: smooth(S.bagL) * (1 - smooth(clamp((S.lap - 0.4) / 0.4))), turn: -0.8, look: -30, lean: 10, aN: 6, eN: 20 },
    { w: smooth(clamp((S.lap - 0.45) / 0.55)), aN: 40, eN: 55, aF: 40, eF: 55, look: -14, lean: 5 },
    { w: smooth(S.dream), turn: 0.95, look: 8, lean: -7 },
    { w: smooth(S.phone), aN: 58, eN: 120, look: -16, phone: 1 }
  ];
  sean.update(P_CLASS.L * S.walkIn, now, { onStep: Sound.step, face: yaw, sit, pose });

  // ---- notebook: slide toward him, open, turn pages ----
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

  // ---- backpack opens ----
  H.flap.rotation.x = -1.9 * smooth(S.bagL);
  H.items.position.y = -0.14 + 0.14 * smooth(S.bagL);

  // ---- laptop: lifted out of the bag in an arc, set on the desk, lid opens ----
  const lm = smooth(clamp(S.lap / 0.55)), lo = smooth(clamp((S.lap - 0.5) / 0.5));
  H.laptop.visible = S.bagL > 0.25 || S.lap > 0.001;
  const from = H.bag.localToWorld(tmpA.set(0, 0.26, 0));
  H.laptop.position.set(lerp(from.x, SX + 0.56, lm), lerp(from.y, 0.76, lm) + Math.sin(Math.PI * lm) * 0.3, lerp(from.z, SZ, lm));
  H.laptop.rotation.set(0, lerp(0.5, 0, lm), lerp(-Math.PI / 2, 0, lm));
  H.lid.rotation.z = -1.85 * lo;

  // ---- camera: a shot per action, blended by the story ----
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
  applyZoom(out, sean, 'classroom', camera, baseFov);
  return H.scene;
}
