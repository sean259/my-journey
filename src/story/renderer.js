/* ==========================================================
   RENDERER + CAMERA (+ the film-finish post pass)
   ========================================================== */
import * as THREE from 'three';
import { Post } from '../three/post.js';
import { LITE, isMobile } from '../config.js';

// Throws if WebGL is unavailable.
export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile() ? 1.5 : 1.75));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = LITE ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;   // otherwise tone mapping happens in three/post.js
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

  return { renderer, camera, post, view };
}
