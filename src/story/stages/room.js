/* ==========================================================
   STAGE: THE ROOM — lamp, CRT boot screen, rain, the cat, the
   wall clock, and the camera's slow push into the monitor.
   ========================================================== */
import * as THREE from 'three';
import { clamp, smooth } from '../../utils.js';
import { S, W, look } from '../state.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const BOOT_LINES = [
  'MK-1 BIOS v2.026  (C) LORICO SYSTEMS',
  'CPU ........... CURIOSITY @ 4.20GHz  [OK]',
  'MEMORY ........ 640K OF IDEAS        [OK]',
  'COFFEE ........ DETECTED             [OK]',
  'LOADING WORLD: CEBU, PH ............ [OK]',
  'SPAWNING PLAYER: SEAN .............. [OK]',
  '> RUN JOURNEY.EXE'
];

// camera path inside the room (p = 0 wide shot … 1 screen fills the view)
function roomCamera(p, out, camera) {
  const room = W.room;
  const sc = room.screenCenter, [sw, sh] = room.screenSize;
  const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
  const dFillH = (sh / 2) / Math.tan(vf), dFillW = (sw / 2) / (Math.tan(vf) * camera.aspect);
  const close = Math.min(dFillH, dFillW) * 0.93;
  const keys = [
    [0, V(0.62, 1.38, 1.35), V(0, 1.0, -0.75)],
    [0.15, V(0.38, 1.27, 0.85), V(0, 1.05, -0.78)],
    [0.75, V(0.05, 1.13, 0.12), V(0, sc.y, sc.z)],
    [1, V(sc.x, sc.y, sc.z + close), V(sc.x, sc.y, sc.z)]
  ];
  let k = 0; while (k < keys.length - 2 && p > keys[k + 1][0]) k++;
  const a = keys[k], b = keys[k + 1], u = smooth(clamp((p - a[0]) / (b[0] - a[0])));
  out.pos.lerpVectors(a[1], b[1], u); out.look.lerpVectors(a[2], b[2], u);
  const par = (1 - p) * 0.06;
  out.pos.x += look.x * par; out.pos.y += look.y * par * 0.6;
}

// the CRT's canvas texture: green phosphor boot log + scanlines
function drawScreen(now) {
  const room = W.room;
  const c = room.screenCanvas, g = c.getContext('2d'), w = c.width, h = c.height;
  const on = S.monitor * (1 - S.screenOff);
  g.fillStyle = '#060a08'; g.fillRect(0, 0, w, h);
  if (on > 0.01) {
    const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.7);
    gr.addColorStop(0, `rgba(20,70,45,${on})`); gr.addColorStop(1, `rgba(3,14,9,${on})`);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.font = '46px VT323'; g.fillStyle = `rgba(141,255,181,${on})`; g.shadowColor = '#8dffb5'; g.shadowBlur = 14;
    const n = Math.floor(S.boot * (BOOT_LINES.length + 0.999));
    const lines = n ? BOOT_LINES.slice(0, n) : ['MK-1 READY.'];
    lines.forEach((l, i) => g.fillText(l, 60, 100 + i * 62));
    if (Math.floor(now / 500) % 2) g.fillRect(60, 100 + lines.length * 62 - 36, 22, 40);
    g.shadowBlur = 0;
  }
  g.fillStyle = 'rgba(0,0,0,.22)';
  for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2);
  room.screenTex.needsUpdate = true;
}

// stage is 'room' (start) or 'end' (after power-off)
export function updateRoom(out, { now, t, stage, camera }) {
  const room = W.room;
  roomCamera(stage === 'end' ? 1 - S.pull : S.room, out, camera);
  room.lampLight.intensity = 2.4 * S.lamp; room.lampFill.intensity = 0.6 * S.lamp;
  room.bulb.material.color.set(S.lamp > 0.5 ? '#fff1c4' : '#3a3020');
  const mon = S.monitor * (1 - S.screenOff);
  room.screenGlow.intensity = 0.9 * mon;
  room.led.material.color.set(mon > 0.5 ? '#7dffad' : '#333');
  drawScreen(now);

  // rain streaks slide down the window
  const rp = room.rain.geometry.attributes.position;
  for (let i = 0; i < rp.count; i += 2) {
    let y = rp.getY(i) - 0.02; if (y < 1.2) y += 1.1;
    rp.setY(i, y); rp.setY(i + 1, y - 0.06);
  }
  rp.needsUpdate = true;

  // the cat: slow breathing, lazy tail flicks, ear twitches, a sleepy nod
  const c = room.cat;
  c.body.scale.set(1, 1 + Math.sin(t * 1.6) * 0.035, 1 + Math.sin(t * 1.6) * 0.02);
  c.head.rotation.z = Math.sin(t * 0.45) * 0.06 - 0.05; c.head.rotation.y = Math.sin(t * 0.3) * 0.12;
  const tw = Math.max(0, Math.sin(t * 0.9) - 0.94) * 12;
  c.ears[0].rotation.z = -tw * 0.4; c.ears[1].rotation.z = Math.max(0, Math.sin(t * 0.7 + 2) - 0.95) * -8;
  const flick = Math.sin(t * 1.1) * 0.5 + Math.sin(t * 2.7) * 0.2;
  const pts = c.tailPts.map((p, i) => new THREE.Vector3(p[0], p[1] + (i > 2 ? Math.max(0, flick) * 0.03 * (i - 2) : 0), p[2] + (i > 1 ? flick * 0.02 * (i - 1) : 0)));
  c.tailMesh.geometry.dispose(); c.tailMesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.014, 8, false);
  c.tailTip.position.copy(pts[pts.length - 1]);

  // mug steam + a wall clock that shows the visitor's real time
  room.steam.forEach((s, i) => { const k = ((t * 0.25 + i / 3) % 1); s.position.y = 0.9 + k * 0.18; s.material.opacity = 0.25 * Math.sin(k * Math.PI); s.position.x = -0.55 + Math.sin(t + i) * 0.015; });
  const d = new Date(), sec = d.getSeconds() + d.getMilliseconds() / 1000, min = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + min / 60;
  room.handS.rotation.z = -sec / 60 * Math.PI * 2; room.handM.rotation.z = -min / 60 * Math.PI * 2; room.handH.rotation.z = -hr / 12 * Math.PI * 2;
  return room.scene;
}
