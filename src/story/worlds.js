/* ==========================================================
   BUILD THE WORLDS — after fonts load so the 3D signs use them.
   ========================================================== */
import * as THREE from 'three';
import { buildRoom, buildStreet, buildCorridor, buildClassroom } from '../three/world/index.js';
import { Sean3D } from '../three/sean.js';
import { W } from './state.js';
import { isMobile } from '../config.js';
import posterUrl from '../assets/profile.jpg';

// resolves to null instead of failing if the image is missing or would taint WebGL
function safeImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try { const c = document.createElement('canvas'); c.width = c.height = 2; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 2, 2); g.getImageData(0, 0, 1, 1); resolve(img); }
      catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// soft image-based lighting: a three-colour gradient sky baked into an environment map
function gradientEnv(pmrem, top, mid, bottom, k) {
  const sc = new THREE.Scene();
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { top: { value: new THREE.Color(top).multiplyScalar(k) }, mid: { value: new THREE.Color(mid).multiplyScalar(k) }, bottom: { value: new THREE.Color(bottom).multiplyScalar(k) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top, mid, bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.7, h)) : mix(mid, bottom, smoothstep(0.0, 0.4, -h)); gl_FragColor = vec4(c, 1.0); }'
  });
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), m));
  return pmrem.fromScene(sc, 0.03).texture;
}

export async function buildWorlds(renderer, camera) {
  const [, , , , , poster] = await Promise.all([
    document.fonts.ready,
    document.fonts.load('italic 400 80px "Instrument Serif"'),
    document.fonts.load('900 100px Archivo'),
    document.fonts.load('600 40px Inter'),
    document.fonts.load('40px VT323'),
    safeImage(posterUrl)
  ]);
  // build order matters: every builder draws from the same seeded random sequence
  W.room = buildRoom({ posterImage: poster });
  W.street = buildStreet();
  W.classroom = buildClassroom();
  W.corridor = buildCorridor(['CpE 301', 'CpE 302', 'LAB 2', 'FACULTY']);
  W.sean = Sean3D.create(); W.sean.root.position.set(-4, 0, -3.9); W.street.scene.add(W.sean.root);
  W.seanClass = Sean3D.create(); W.classroom.scene.add(W.seanClass.root);
  W.seanCorr = Sean3D.create(); W.corridor.scene.add(W.seanCorr.root);

  // phones: smaller shadow maps
  if (isMobile()) for (const w of [W.room, W.street, W.classroom, W.corridor]) w.scene.traverse((o) => { if (o.isLight && o.castShadow && o.shadow.mapSize.x > 1024) o.shadow.mapSize.set(1024, 1024); });

  const pmrem = new THREE.PMREMGenerator(renderer);
  W.street.scene.environment = gradientEnv(pmrem, '#7fa6d8', '#f3d6bf', '#5a4c3e', 0.3);
  W.classroom.scene.environment = gradientEnv(pmrem, '#fff3e0', '#f1e2c8', '#7a6650', 0.24);
  W.corridor.scene.environment = gradientEnv(pmrem, '#fff3e0', '#f1e2c8', '#7a6650', 0.26);
  W.room.scene.environment = gradientEnv(pmrem, '#1b2033', '#3a2a22', '#0b0b10', 0.5);
  for (const w of [W.room, W.street, W.classroom, W.corridor]) renderer.compile(w.scene, camera);   // no shader hitches mid-scroll
  W.ready = true;
}
