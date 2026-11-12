/* ==========================================================
   PACING KNOBS + ENVIRONMENT FLAGS
   ========================================================== */

export const VH_PER_BEAT = 15;   // scroll distance per timeline beat — bigger = slower everything
export const RIDE = 56;          // beats spent riding the jeepney (bigger = slower ride)
export const HOLD = 4.5;         // beats each chapter stays fully open

export const LITE = /[?&]lite/.test(location.search);   // ?lite = skip the film finish (low-end devices)
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = matchMedia('(pointer: fine)').matches;
export const isMobile = () => innerWidth <= 760;
