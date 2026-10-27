// The one subject every style demo draws (scenes/style_*.mjs): a rabbit sitting beside a big 25:00 timer, 3 s, portrait, with a
// little life in it. Keeping the subject and its timing the same is what makes the styles comparable. The pure helpers here
// (timeLeft, clockText, pose) run in Node; rabbitParts is the sitting profile rabbit that the ink styles draw in their own way.
import { hop, blink } from "./toon.mjs";

export const DURATION = 3, STILLS = [0.5, 1.5, 2.5];
export const TAU = Math.PI * 2;
export const BLINKS = [1.42], HOP = { at: 2.2, dur: 0.7, h: 70 }, TWITCH = { from: 0.25, to: 0.85 };

// The timer counts down one second a second: 25:00 at the first still, 24:59 at the second, 24:58 at the third.
export const timeLeft = t => 25 * 60 - Math.floor(t + 1e-6);
export const clockText = t => {
  const s = timeLeft(t), p = n => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 60))}:${p(s % 60)}`;
};
// 1 just after each whole second, falling to 0: what the timer shakes or flashes with when it ticks.
export const tick = (t, rate = 5) => Math.exp(-(t - Math.floor(t + 1e-6)) * rate);

const bump = (t, a, b) => { const u = (t - a) / (b - a); return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u); };

// The rabbit's moments: breathe (0..1, 1.8 s cycle), lid (0 open .. 1 shut, a blink at 1.5 s), twitch (0..1, one ear flick
// at 0.55 s) and a small hop at 2.2 s: y is the lift in px (negative is up), v the squash value for toon.squash().
export function pose(t) {
  const h = hop(t, HOP.at, HOP.dur, HOP.h);
  return { breathe: 0.5 + 0.5 * Math.sin((t * TAU) / 1.8), lid: blink(t, BLINKS), twitch: bump(t, TWITCH.from, TWITCH.to), y: h.y, v: h.v };
}

// A sitting rabbit in profile facing right, feet on y = 0, about 600 px tall with the ears. Every part is an ellipse
// [cx, cy, rx, ry, rot]; ears are ellipses along an axis tilted by rot (positive leans right) from a base point.
export function rabbitParts(p) {
  const ear = (bx, by, len, rx, rot) => ({ shape: [bx + (Math.sin(rot) * len) / 2, by - (Math.cos(rot) * len) / 2, rx, len / 2, rot], rot });
  return {
    tail: [-172, -112, 36, 34, 0],
    body: [-20, -135, 155, 130 * (1 + 0.025 * p.breathe), -0.05],
    haunch: [-65, -85, 100, 82, -0.2],
    foot: [30, -22, 112, 22, 0],
    foreleg: [112, -98, 32, 98, 0.12],
    paw: [142, -22, 50, 20, 0],
    head: [112, -300, 90, 78, 0.1],
    muzzle: [190, -282, 42, 32, 0.25],
    nose: [228, -292],
    eye: [146, -314],
    earBack: ear(80, -355, 235, 36, -0.3 - 0.4 * p.twitch),
    earFront: ear(126, -365, 245, 38, 0.08),
  };
}
