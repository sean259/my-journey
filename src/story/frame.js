/* ==========================================================
   PER-FRAME — pick the active scene from the timeline, let it
   pose its world and propose a camera shot, then smooth the
   camera, pin the chapter cards onto their props and render.
   ========================================================== */
import * as THREE from 'three';
import { clamp, smooth } from '../utils.js';
import { LITE, isMobile } from '../config.js';
import { Sound } from '../audio/sound.js';
import { S, W } from './state.js';
import { mapCards } from './surfaces.js';
import { updateRoom } from './stages/room.js';
import { updateStreet } from './stages/street.js';
import { updateCorridor } from './stages/corridor.js';
import { updateClassroom } from './stages/classroom.js';

export function createFrameLoop({ renderer, camera, post, view, adapt, tl, st, cards }) {
  const L = tl.labels;
  const stageAt = (t) => {
    if (t < L.street) return 'room';
    if (t < L.hall) return 'street';
    if (t < L.cls) return 'corridor';
    if (t < L.off + 1.6) return 'classroom';
    return 'end';
  };

  const out = { pos: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3() };   // the shot this frame asks for
  const cam = { pos: null, look: null, up: null, stage: null, lastT: 0 };                          // the damped camera that follows it
  let fovKick = 0;

  return function frame() {
    if (!W.ready) return;
    const now = performance.now(), t = now / 1000;
    adapt(now);
    const stage = stageAt(tl.time());
    out.up.set(0, 1, 0);
    Sound.rain(stage === 'room' || stage === 'end');
    Sound.hum(stage === 'room' && S.monitor > 0.5);
    if (stage !== 'street') Sound.engine(0, 0);

    const ctx = { now, t, stage, camera, baseFov: view.baseFov };
    const scene =
      stage === 'street' ? updateStreet(out, ctx)
        : stage === 'corridor' ? updateCorridor(out, ctx)
          : stage === 'classroom' ? updateClassroom(out, ctx)
            : updateRoom(out, ctx);

    // shift the frame so Sean sits beside the chapter cards (left on desktop, top on phones)
    const shift = stage === 'classroom' ? smooth(clamp((S.walkIn - 0.85) / 0.15)) * (1 - smooth(clamp(S.zoom * 1.6))) : 0;
    if (shift > 0.001) {
      const w = innerWidth, h = innerHeight;
      if (isMobile()) camera.setViewOffset(w, h, 0, h * 0.24 * shift, w, h);
      else camera.setViewOffset(w, h, w * 0.33 * shift, 0, w, h);
    } else if (camera.view && camera.view.enabled) camera.clearViewOffset();

    // widen the lens a little when scrolling fast
    const v = Math.abs(st.getVelocity());
    fovKick += (clamp(v / 4000) * 3 - fovKick) * 0.08;
    camera.fov = view.baseFov + fovKick;
    camera.updateProjectionMatrix();

    // damped follow; snap on scene changes and big jumps
    const dtc = Math.min(0.05, (now - (cam.lastT || now)) / 1000); cam.lastT = now;
    if (!cam.pos || cam.stage !== stage || cam.pos.distanceTo(out.pos) > 4) {
      cam.pos = out.pos.clone(); cam.look = out.look.clone(); cam.up = out.up.clone(); cam.stage = stage;
    } else {
      const k = 1 - Math.exp(-dtc * (stage === 'room' || stage === 'end' ? 14 : 9));
      cam.pos.lerp(out.pos, k); cam.look.lerp(out.look, k); cam.up.lerp(out.up, k).normalize();
    }
    camera.position.copy(cam.pos);
    camera.up.copy(cam.up);
    camera.lookAt(cam.look);
    camera.updateMatrixWorld();
    mapCards(cards, camera, stage);

    // film finish: lens warp during the dives, bloom, exposure per scene
    let warp = 0, bloom = 0.5, exposure = 1.0;
    if (stage === 'room') { warp = smooth(clamp((S.room - 0.82) / 0.18)) * 0.9; bloom = 0.85; exposure = 1.15; }
    else if (stage === 'end') { warp = smooth(clamp((S.pull > 0 ? 0.18 - S.pull : 0) / 0.18)) * 0.9; bloom = 0.85; exposure = 1.15; }
    else if (stage === 'street') { warp = smooth(clamp((S.enter - 0.55) / 0.45)) * 0.8; bloom = 0.4 + 0.6 * S.enter; exposure = 0.9; }
    else { const zw = smooth(clamp((S.zoom - 0.55) / 0.45)); warp = zw * (1 - zw) * 2.4; bloom = 0.35 - 0.2 * zw; exposure = 0.86; }
    if (LITE) { renderer.toneMappingExposure = exposure; renderer.setRenderTarget(null); renderer.render(scene, camera); }
    else post.render(scene, camera, { time: t, warp, bloom, exposure });
  };
}
