/* ==========================================================
   SHARED STORY STATE
   ========================================================== */

// Every value the scroll timeline animates (mostly 0 → 1). The frame loop reads these.
export const S = {
  room: 0, lamp: 0, monitor: 0, boot: 0, screenOff: 0, pull: 0,               // the room
  exit: 0, jeepIn: 0, board: 0, ride: 0, alight: 0, walk2: 0, enter: 0,       // the commute
  corrWalk: 0, corrDoor: 0,                                                   // the corridor
  walkIn: 0, sitDown: 0, idL: 0, nbk: 0, page: 0, bagL: 0, lap: 0, dream: 0, phone: 0,   // the classroom
  zoom: 0, focus: 0                                                           // first-person dive into a prop
};

// mouse parallax, −1 … 1 on each axis
export const look = { x: 0, y: 0 };

// the built 3D worlds (filled in by story/worlds.js once fonts + images load)
export const W = {
  ready: false,
  room: null, street: null, corridor: null, classroom: null,
  sean: null, seanCorr: null, seanClass: null     // one Sean per scene
};
