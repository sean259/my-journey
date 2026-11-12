/* ==========================================================
   STAGE: THE STREET — Sean leaves home, rides the jeepney past
   each school, gets off at CIT-U and walks through the doors.
   Dawn turns into a bright morning along the way.
   ========================================================== */
import * as THREE from 'three';
import { $, clamp, lerp, smooth } from '../../utils.js';
import { isMobile } from '../../config.js';
import { Sound } from '../../audio/sound.js';
import { DOOR_X, PATH_Z } from '../../three/world/index.js';
import { S, W, look } from '../state.js';
import { JX0, JX1, JX2, LANE, SEAT_X, SEAT_Y, SEAT_Z, FLOOR, P_EXIT, P_BOARD, P_ALIGHT, P_WALK2, rideEase } from '../paths.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);
const SKY = {
  dawn: { top: C('#2d3368'), mid: C('#f2a07e'), bottom: C('#ffd9a6'), fog: C('#f2b48e'), sun: C('#ffb27a'), hemi: C('#ffd9b8') },
  day: { top: C('#3d84d6'), mid: C('#9fd0f5'), bottom: C('#e8f5ff'), fog: C('#cfe6f7'), sun: C('#fff2df'), hemi: C('#e6f2ff') }
};
const WHITE = C('#ffffff');
const tmp = new THREE.Vector3(), tmpLook = new THREE.Vector3();
const bubble = $('#bubble'), bubble2 = $('#bubble2');
let lastT = 0, lastJx = null;                // for the jeepney's speed (engine sound, body sway)

export function updateStreet(out, { now, t, camera }) {
  const street = W.street, sean = W.sean;
  const e = S.enter, mob = isMobile(), k = mob ? 1.35 : 1;

  // ---- the jeepney ----
  let jx = JX0;
  if (S.walk2 > 0) jx = JX2 + Math.pow(S.walk2, 2) * 80;
  else if (S.ride > 0) jx = lerp(JX1, JX2, rideEase(S.ride));
  else if (S.jeepIn > 0) jx = lerp(JX0, JX1, 1 - Math.pow(1 - S.jeepIn, 3));
  const dtJ = Math.max(1 / 240, (now - (lastT || now)) / 1000); lastT = now;
  const speed = (jx - (lastJx ?? jx)) / dtJ; lastJx = jx;
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
  let pos, yaw, sit = 0;
  const bWalk = clamp(S.board / 0.72), bSit = smooth(clamp((S.board - 0.72) / 0.28));
  const aStand = smooth(clamp(S.alight / 0.25)), aWalk = clamp((S.alight - 0.25) / 0.75);
  const walked = P_EXIT.L * S.exit + P_BOARD.L * bWalk + P_ALIGHT.L * aWalk + P_WALK2.L * S.walk2;
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
  if (e > 0) { pos = { x: DOOR_X, y: 0.14, z: lerp(PATH_Z, street.DOOR_Z - 1.6, inward) }; yaw = (Math.PI / 2) * smooth(turn); }
  sean.root.position.set(pos.x, pos.y, pos.z);
  sean.update(walked + inward * (PATH_Z - street.DOOR_Z + 1.6), now, { onStep: Sound.step, face: yaw, sit });
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
  street.sunDisc.material.color.copy(SKY.dawn.sun).lerp(WHITE, day);

  // ---- ambient life: swaying trees, waving flag, clouds, birds ----
  street.sway.forEach((c, i) => { c.rotation.z = Math.sin(t * 0.9 + i * 1.7) * 0.025; c.rotation.x = Math.sin(t * 0.7 + i) * 0.015; });
  const fp = street.flagGeo.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i) + 1.2; fp.setZ(i, Math.sin(x * 2.6 - t * 4) * 0.12 * (x / 2.4)); }
  fp.needsUpdate = true; street.flagGeo.computeVertexNormals();
  street.clouds.position.x = (t * 0.8) % 60 - 30;
  street.birds.forEach((b) => { const x = fx - 40 + ((t * 3.5 + b.off * 9) % 90); b.g.position.set(x, b.y + Math.sin(t + b.off) * 1.2, b.z); const fl = Math.sin(t * 9 + b.off) * 0.6; b.lp.rotation.z = fl; b.rp.rotation.z = -fl; });

  // speech bubbles follow his head (uses the camera from the previous frame, as before)
  sean.headWorld(tmp); tmp.y += 0.22; tmp.project(camera);
  const bx = `${((tmp.x + 1) / 2) * innerWidth + 14}px`, by = `${((1 - tmp.y) / 2) * innerHeight - 48}px`;
  bubble.style.left = bx; bubble.style.top = by; bubble2.style.left = bx; bubble2.style.top = by;
  return street.scene;
}
