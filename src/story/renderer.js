/* ==========================================================
   RENDERER + CAMERA (+ the film-finish post pass)
   ========================================================== */
import * as THREE from 'three';
import { Post } from '../three/post.js';
import { LITE, isMobile } from '../config.js';

// Throws if WebGL is unavailable.
export function createRenderer(canvas) {
  // the post pass has its own multisampled target, so the canvas only needs antialiasing in ?lite mode
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: LITE, powerPreference: 'high-performance' });
  const maxRatio = Math.min(devicePixelRatio, isMobile() ? 1.25 : 1.5), minRatio = Math.min(maxRatio, 0.75);
  let ratio = maxRatio;
  renderer.setPixelRatio(ratio);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = LITE ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;   // otherwise tone mapping happens in three/post.js
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;   // soft PCF costs a lot more for little visible gain here
  const post = Post.create(renderer);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.06, 600);
  const view = { baseFov: 40 };                       // FOV before the scroll-speed kick
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    view.baseFov = isMobile() ? 52 : 38;
    camera.updateProjectionMatrix();
    post.setSize();
  }
  resize();
  addEventListener('resize', resize);

  // adaptive resolution: drop the render scale while frames are slow, raise it back when there's headroom
  let avg = 16, lastF = 0, lastChange = 0;
  function adapt(now) {
    const dt = now - (lastF || now); lastF = now;
    if (dt <= 0 || dt > 250) return;                      // tab switches, first frame
    avg += (dt - avg) * 0.05;
    if (now - lastChange < 1500) return;
    let next = ratio;
    if (avg > 24 && ratio > minRatio) next = Math.max(minRatio, ratio - 0.25);
    else if (avg < 14 && ratio < maxRatio) next = Math.min(maxRatio, ratio + 0.125);
    if (next !== ratio) { ratio = next; lastChange = now; renderer.setPixelRatio(ratio); resize(); }
  }

  return { renderer, camera, post, view, adapt };
}
