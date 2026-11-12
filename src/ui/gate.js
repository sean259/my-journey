/* ==========================================================
   GATE — the "power on" intro screen: loading counter, the two
   enter buttons, the sound toggle in the HUD.
   ========================================================== */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$, pad } from '../utils.js';
import { Sound } from '../audio/sound.js';

export const gateNote = $('#gate-note');

// eases toward 88% while loading; call done() to finish the count and enable the buttons
export function startLoadingCounter() {
  const p = { v: 0, target: 88, ready: false };
  (function count() {
    p.v += (p.target - p.v) * (p.target === 100 ? 0.12 : 0.02);
    const n = Math.min(100, Math.round(p.v));
    if (p.ready && n >= 100) { gateNote.textContent = "SYSTEM IDLE — POWER'S ON WHEN YOU ARE"; return; }
    gateNote.textContent = `LOADING THE WORLD — ${pad(n, 3)}%`;
    requestAnimationFrame(count);
  })();
  return {
    done() {
      p.target = 100; p.ready = true;
      $$('[data-enter]').forEach((b) => { b.disabled = false; });
    }
  };
}

export function initGate({ lenis, isReady }) {
  const soundBtn = $('#sound-toggle');
  const syncSoundBtn = () => { soundBtn.textContent = Sound.on ? 'SOUND ● ON' : 'SOUND ○ OFF'; soundBtn.setAttribute('aria-pressed', String(Sound.on)); };
  soundBtn.addEventListener('click', () => { Sound.setEnabled(!Sound.on); syncSoundBtn(); });

  let entered = false;
  function enter(withSound) {
    if (entered || !isReady()) return;
    entered = true;
    Sound.setEnabled(withSound); syncSoundBtn();
    gsap.timeline({
      onComplete() {
        $('#gate').remove();
        document.body.classList.remove('locked');
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
      }
    })
      .to('.gate-title .ln > span', { yPercent: -110, duration: 0.8, stagger: 0.08, ease: 'power3.in' })
      .to('.gate-sub, .gate-actions, .gate-note, .mini-pc, .gate .bar, .gate-foot', { autoAlpha: 0, duration: 0.5 }, 0)
      .to('#gate', { autoAlpha: 0, duration: 0.9 }, 0.6)
      .fromTo('#gl', { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 2, ease: 'power2.out' }, 0.7)
      .fromTo('#hud, #hud-bottom, .progress, .chapters', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 1.5);
  }
  $$('[data-enter]').forEach((b) => b.addEventListener('click', () => enter(b.dataset.enter === 'sound')));

  // intro animation
  gsap.from('.gate-title .ln > span', { yPercent: 110, duration: 1.1, stagger: 0.12, ease: 'power4.out', delay: 0.15 });
  gsap.from('.mini-pc, .gate-sub, .gate-actions, .gate-note', { autoAlpha: 0, y: 16, duration: 0.9, stagger: 0.08, delay: 0.5 });
}
