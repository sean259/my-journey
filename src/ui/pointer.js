/* ==========================================================
   POINTER — custom cursor and mouse parallax (fine pointers only)
   ========================================================== */
import { gsap } from 'gsap';
import { $ } from '../utils.js';
import { finePointer, reduceMotion } from '../config.js';
import { look } from '../story/state.js';

export function initPointer() {
  if (!finePointer) return;

  // the camera drifts a little toward the mouse
  if (!reduceMotion) {
    addEventListener('mousemove', (e) => {
      gsap.to(look, { x: (e.clientX / innerWidth - 0.5) * 2, y: -(e.clientY / innerHeight - 0.5) * 2, duration: 1.4, ease: 'power2.out', overwrite: true });
    });
  }

  const cur = $('#cursor');
  if (!cur) return;
  document.documentElement.classList.add('has-cursor');
  const dot = $('.c-dot', cur), ring = $('.c-ring', cur);
  const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' }), dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
  addEventListener('mousemove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); cur.classList.add('on'); });
  document.addEventListener('mouseleave', () => cur.classList.remove('on'));
  document.addEventListener('mouseover', (e) => cur.classList.toggle('hover', !!e.target.closest('a, button')));
}
