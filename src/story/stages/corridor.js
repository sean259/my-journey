/* ==========================================================
   STAGE: THE CIT-U CORRIDOR — Sean walks in, stops to lift his ID
   (Profile chapter), then heads through the door of CpE 301.
   ========================================================== */
import * as THREE from 'three';
import { clamp, smooth } from '../../utils.js';
import { isMobile } from '../../config.js';
import { Sound } from '../../audio/sound.js';
import { S, W, look } from '../state.js';
import { P_CORR1, P_CORR2 } from '../paths.js';
import { applyZoom } from '../zoom.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function updateCorridor(out, { now, camera, baseFov }) {
  const corr = W.corridor, sean = W.seanCorr;
  const dx = corr.doors[0];
  let p, yaw, walked;
  if (S.corrDoor > 0) { p = P_CORR2.at(P_CORR2.L * S.corrDoor); yaw = p.yaw; walked = P_CORR1.L + P_CORR2.L * S.corrDoor; }
  else { p = P_CORR1.at(P_CORR1.L * S.corrWalk); yaw = S.corrWalk >= 1 ? -0.35 : p.yaw; walked = P_CORR1.L * S.corrWalk; }
  sean.root.position.set(p.x, 0, p.z);
  sean.update(walked, now, { onStep: Sound.step, face: yaw, pose: [{ w: smooth(S.idL), aN: 42, eN: 78, look: -20, idLift: 1 }] });

  out.pos.set(p.x + 1.4, 1.65, isMobile() ? 5.6 : 4.4); out.look.set(p.x + 0.5, 1.15, -0.6);
  const toDoor = smooth(clamp(S.corrDoor * 1.4));
  out.pos.lerp(V(dx + 0.9, 1.7, 3.0), toDoor); out.look.lerp(V(dx, 1.3, -1.6), toDoor);
  out.pos.x += look.x * 0.1; out.pos.y += look.y * 0.06;
  applyZoom(out, sean, 'corridor', camera, baseFov);

  // the key light follows him so his shadow stays crisp
  corr.key.position.set(p.x + 4, 7, 6); corr.key.target.position.set(p.x + 2, 0, 0); corr.warm.position.set(p.x + 1, 2.6, 1.5);
  return corr.scene;
}
