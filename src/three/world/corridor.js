import * as T from 'three';
import { MAROON, GOLD, rnd, mat, mesh, box, canvasTex, label, materials } from './helpers.js';

/* ==========================================================
   THE CIT-U CORRIDOR — Sean stops to check his ID, then walks
   through the first door into classroom CpE 301
   ========================================================== */
export function buildCorridor(labels) {
  const m = materials();
  const scene = new T.Scene();
  scene.background = new T.Color('#e9dfcb');
  scene.fog = new T.Fog('#e9dfcb', 12, 40);
  const L = 12 * labels.length + 30;
  const floorTex = canvasTex(256, 256, (g) => { g.fillStyle = '#e3d8c3'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#c9bca2'; g.fillRect(128, 0, 128, 128); g.fillRect(0, 128, 128, 128); }, [L / 1.6, 6]);
  mesh(scene, new T.PlaneGeometry(L, 10), mat('#fff', 0.28, 0.05, { map: floorTex }), L / 2 - 10, 0, 2, { r: [-Math.PI / 2, 0, 0], cast: false });
  mesh(scene, new T.PlaneGeometry(L, 10), mat('#f3ecdf', 0.9), L / 2 - 10, 3.3, 2, { r: [Math.PI / 2, 0, 0], cast: false });
  const wallTex = canvasTex(512, 512, (g) => { g.fillStyle = '#f4ecdc'; g.fillRect(0, 0, 512, 512); g.fillStyle = MAROON; g.fillRect(0, 300, 512, 18); g.fillStyle = GOLD; g.fillRect(0, 318, 512, 6); g.fillStyle = '#e7dcc6'; g.fillRect(0, 324, 512, 188); }, [L / 4, 1]);
  mesh(scene, new T.PlaneGeometry(L, 3.3), mat('#fff', 0.9, 0, { map: wallTex }), L / 2 - 10, 1.65, -1.6, { cast: false });
  box(scene, L, 0.12, 0.05, m.woodDark, L / 2 - 10, 0.06, -1.57);

  const lockerM = mat('#8a1c2b', 0.45, 0.35), ventM = mat('#3d0a12', 0.8);
  const corkM = mat('#c08a54', 0.95), paperM = [mat('#fffaf0'), mat('#ffe38a'), mat('#cfe8ff'), mat('#ffc9d3')];
  const doors = [];
  labels.forEach((name, i) => {
    const x = 4 + i * 12;
    // door + frame + room sign
    box(scene, 1.5, 2.6, 0.1, m.woodDark, x, 1.3, -1.55);
    box(scene, 1.3, 2.45, 0.08, m.wood, x, 1.23, -1.5);
    box(scene, 0.55, 0.5, 0.09, m.glass, x, 1.75, -1.49, { cast: false, receive: false });
    box(scene, 0.06, 0.22, 0.06, m.gold, x + 0.48, 1.15, -1.44);
    const tex = label(name, { w: 1024, h: 220, bg: '#fffaf0', fg: MAROON, font: '900 104px Archivo', border: MAROON, radius: 18 });
    mesh(scene, new T.PlaneGeometry(1.7, 0.36), mat('#fff', 0.6, 0, { map: tex }), x, 2.85, -1.54, { cast: false });
    doors.push(x);
    // lockers
    for (let k = 0; k < 8; k++) {
      const lx = x + 2.4 + k * 0.62;
      box(scene, 0.6, 1.95, 0.42, lockerM, lx, 0.975, -1.38);
      for (let v = 0; v < 4; v++) box(scene, 0.34, 0.02, 0.01, ventM, lx, 1.75 - v * 0.05, -1.165, { cast: false });
      box(scene, 0.03, 0.18, 0.03, m.gold, lx + 0.2, 1.05, -1.16);
    }
    // bulletin board + notes, high windows, ceiling light
    box(scene, 1.8, 1.1, 0.06, corkM, x - 3.2, 1.6, -1.56);
    for (let n = 0; n < 5; n++) box(scene, 0.32, 0.3, 0.01, paperM[n % 4], x - 3.85 + (n % 3) * 0.55, 1.78 - Math.floor(n / 3) * 0.42, -1.52, { r: [0, 0, (rnd() - 0.5) * 0.2], cast: false });
    mesh(scene, new T.PlaneGeometry(2.4, 0.7), new T.MeshBasicMaterial({ color: '#dff1ff', toneMapped: false }), x + 4.6, 2.75, -1.58, { cast: false });
    box(scene, 1.6, 0.05, 0.5, new T.MeshBasicMaterial({ color: '#fffbe6', toneMapped: false }), x + 1, 3.27, 0.4, { cast: false });
  });

  scene.add(new T.HemisphereLight('#fff6e6', '#b9a888', 0.75));
  const key = new T.DirectionalLight('#fff1d6', 0.8);
  key.position.set(4, 7, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -10, right: 10, top: 6, bottom: -3, near: 1, far: 30 });
  key.shadow.bias = -0.0004;
  scene.add(key, key.target);
  const warm = new T.PointLight('#ffe0b0', 0.5, 10, 2); scene.add(warm);
  return { scene, doors, key, warm };
}
