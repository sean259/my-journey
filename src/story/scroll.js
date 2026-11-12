/* ==========================================================
   SCROLL — Lenis smooth scrolling, scroll → timeline binding,
   and a gentle snap so a chapter card is never left half-open.
   ========================================================== */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { $, clamp } from '../utils.js';
import { VH_PER_BEAT, reduceMotion } from '../config.js';

// heavy, slow, smooth; stopped until the visitor powers on (null with reduced motion)
export function createLenis() {
  if (reduceMotion) return null;
  const lenis = new Lenis({ lerp: 0.045, wheelMultiplier: 0.55, touchMultiplier: 1.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
  return lenis;
}

export function bindScroll(tl, lenis, rest) {
  $('#track').style.height = `${Math.round(tl.duration() * VH_PER_BEAT)}vh`;
  const st = ScrollTrigger.create({ animation: tl, trigger: '#track', start: 'top top', end: 'bottom bottom', scrub: lenis ? 1.8 : 2.2 });
  const timeToY = (t) => st.start + (t / tl.duration()) * (st.end - st.start);
  const yToTime = (y) => clamp((y - st.start) / (st.end - st.start)) * tl.duration();
  function scrollToTime(t, duration = 2.5) {
    const y = timeToY(t);
    if (lenis) lenis.scrollTo(y, { duration, easing: (x) => 1 - Math.pow(1 - x, 3) });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  }

  window.__story = { labels: tl.labels, timeToY };   // handy for testing: scrollTo(0, __story.timeToY(__story.labels.ride))

  // gentle snap: never leave a card half-open (window.__nosnap = true turns it off)
  let snapTimer = 0, snapping = false;
  function maybeSnap() {
    if (snapping || window.__nosnap) return;
    const t = yToTime(scrollY);
    for (const z of rest) {
      if (t > z.start + 0.05 && t < z.rest - 0.05) {
        const forward = (t - z.start) / (z.rest - z.start) > 0.3;
        snapping = true;
        scrollToTime(forward ? z.rest : z.start - 0.02, 1.2);
        setTimeout(() => { snapping = false; }, 1400);
        return;
      }
    }
  }
  const onScroll = () => { clearTimeout(snapTimer); snapTimer = setTimeout(maybeSnap, 260); };
  if (lenis) lenis.on('scroll', onScroll); else addEventListener('scroll', onScroll, { passive: true });

  return { st, scrollToTime };
}
