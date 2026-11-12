/* ==========================================================
   WALKING PATHS — where Sean goes in each scene.
   Points are [x, y, z] in metres; a path is sampled by distance.
   ========================================================== */
import { clamp, lerp } from '../utils.js';
import { DOOR_X } from '../three/world/index.js';

export function makePath(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]));
  const L = cum[cum.length - 1];
  return {
    L,
    at(d) {
      d = clamp(d, 0, L);
      let i = 1; while (i < pts.length - 1 && cum[i] < d) i++;
      const a = pts[i - 1], b = pts[i], u = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
      return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), z: lerp(a[2], b[2], u), yaw: Math.atan2(-(b[2] - a[2]), b[0] - a[0]) };
    }
  };
}

// the commute: home → curb → jeepney → CIT-U
export const JX0 = -40, JX1 = 3.0, JX2 = DOOR_X - 6;            // jeepney: off-screen start, pick-up stop, drop-off stop
export const LANE = 4.2, SEAT_X = -1.2, SEAT_Z = -0.62, SEAT_Y = 0.425, FLOOR = 0.84;
export const P_EXIT = makePath([[-4.0, 0, -3.9], [-4.0, 0, -3.2], [-2.9, 0, -2.85], [-1.2, 0.03, -2.6], [-1.0, 0.14, -1.6], [-0.6, 0.14, 1.2]]);
export const P_BOARD = makePath([[-0.6, 0.14, 1.2], [-0.9, 0.14, 1.7], [-1.1, 0, 2.6], [JX1 - 3.8, 0, LANE], [JX1 - 2.9, 0.55, LANE], [JX1 - 2.4, FLOOR, LANE], [JX1 - 1.5, FLOOR, LANE - 0.1], [JX1 + SEAT_X, FLOOR, LANE + SEAT_Z + 0.05]]);
export const P_ALIGHT = makePath([[JX2 + SEAT_X, FLOOR, LANE + SEAT_Z], [JX2 - 1.5, FLOOR, LANE], [JX2 - 2.4, FLOOR, LANE], [JX2 - 2.9, 0.55, LANE], [JX2 - 3.7, 0, LANE], [JX2 - 3.8, 0, 2.6], [JX2 - 3.6, 0.14, 1.4], [JX2 - 3.4, 0.14, 0.3]]);
export const P_WALK2 = makePath([[JX2 - 3.4, 0.14, 0.3], [DOOR_X, 0.14, 0.3]]);
export const rideEase = (r) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(r));   // jeepney position along the ride
export const rideInv = (u) => Math.acos(1 - 2 * clamp(u)) / Math.PI;       // …and back: ride progress at a position

// the CIT-U corridor: walk in, stop (ID check), then into classroom CpE 301 (door at x = 4)
export const P_CORR1 = makePath([[-7, 0, 0.2], [0.6, 0, 0.2]]);
export const P_CORR2 = makePath([[0.6, 0, 0.2], [3.3, 0, 0.35], [4, 0, -0.3], [4, 0, -1.5]]);

// the classroom: from the back door to his seat
export const classPath = ([sx, sz]) => makePath([[-5.6, 0, 3.6], [-4.4, 0, 3.2], [-1.6, 0, 1.9], [sx, 0, 1.3], [sx, 0, sz]]);
