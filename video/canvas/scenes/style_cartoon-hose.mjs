// Style demo: 1930s rubber-hose cartoon. Black and cream only: limbs are constant-width tubes that bend anywhere and have no
// joints (a round cream rabbit with droopy ears and a bow, heavy black outline, no gloves), eyes are pie-cut, everything squashes and stretches on one beat (80 bpm: rabbit, timer, ears and title letters), and
// the whole frame is "filmed": grain, flicker, gate weave, scratches, dust and a vignette, all redrawn at 24 frames a second.
// Every frame is a pure function of t; the film noise is seeded by the film frame number.
import { rng } from "../ink.mjs";
import { grainPattern, grain } from "../cel.mjs";
import { squash } from "../toon.mjs";
import { pose, clockText, tick, TAU, DURATION as DEMO_DURATION } from "../demo.mjs";

export const DURATION = DEMO_DURATION, COVER = 1.5;
export const SOUND = { kind: "intro", close: 2.5 };
export const CAPTIONS = [], SCENES = [];

export const PAL = { ink: "#1c1a18", cream: "#f2e9d0", ray: "#e8dcb9", floor: "#ddd0aa", shade: "#d2c49b", white: "#fbf6e6" };
const BEAT = 0.75, FEET = 1420, RABBIT = { x: 350, s: 1.28 }, TIMER = { x: 640, y: 850, w: 380, h: 510 };
const INK = PAL.ink;

export function setup(doc) { return { tile: grainPattern(doc, 9) }; }

// How squashed something is on the beat (negative is flat), with a short wobble after it. `delay` makes parts follow on.
export function bounce(t, delay = 0, amp = 0.16) {
  const u = ((((t - delay) % BEAT) + BEAT) % BEAT) / BEAT;
  return -amp * Math.exp(-u * 4) * Math.cos(u * 10);
}

// --- drawing helpers -----------------------------------------------------------------------------------------------------

// A tube: one constant-width stroke through pts, bending smoothly (quadratic through the midpoints), round at both ends.
function hose(ctx, pts, w, color = INK) {
  ctx.save();
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(...pts[i], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
  ctx.lineTo(...pts.at(-1));
  ctx.stroke();
  ctx.restore();
}

// A limb: a cream tube inside a heavy black outline, constant width, no joints. Draw it behind the body it grows from.
function tube(ctx, pts, w) { hose(ctx, pts, w + 22); hose(ctx, pts, w, PAL.cream); }

// Several shapes drawn as one: every outline first, then every fill, so overlaps leave no seam.
function merged(ctx, fill, builds, w = 10) {
  ctx.save();
  ctx.lineJoin = ctx.lineCap = "round";
  ctx.fillStyle = ctx.strokeStyle = INK;
  ctx.lineWidth = w * 2;
  for (const b of builds) { ctx.beginPath(); b(ctx); ctx.stroke(); ctx.fill(); }
  ctx.fillStyle = fill;
  for (const b of builds) { ctx.beginPath(); b(ctx); ctx.fill(); }
  ctx.restore();
}
const ell = (cx, cy, rx, ry, rot = 0) => c => { c.moveTo(cx + Math.cos(rot) * rx, cy + Math.sin(rot) * rx); c.ellipse(cx, cy, rx, ry, rot, 0, TAU); };

// A big round shoe with a cap line.
function shoe(ctx, x, y, rx, ry, rot) {
  merged(ctx, PAL.cream, [ell(x, y, rx, ry, rot)], 8);
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(rx * 0.12, 0, ry * 0.8, -1.2, 1.2); ctx.stroke();
  ctx.restore();
}

// A pie-cut eye: a cream oval with a black pupil that has a wedge missing, looking along `look` (radians).
function eye(ctx, x, y, rx, ry, look, lid, cut) {
  const open = 1 - lid;
  if (open < 0.2) {
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(x, y - ry * 0.25, rx * 0.8, 0.25, Math.PI - 0.25); ctx.stroke();
    ctx.restore();
    return;
  }
  merged(ctx, PAL.white, [ell(x, y, rx, ry * open)], 7);
  const px = x + Math.cos(look) * rx * 0.38, py = y + Math.sin(look) * ry * 0.3 * open, r = rx * 0.62;
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry * open, 0, 0, TAU); ctx.clip();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.arc(px, py, r, cut + 0.5, cut - 0.5 + TAU);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// --- the rabbit ----------------------------------------------------------------------------------------------------------

// The hard shade on a cream shape: its lower right, outside an ellipse pushed towards the light.
function shade(ctx, [cx, cy, rx, ry]) {
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.clip();
  ctx.beginPath(); ctx.rect(cx - rx * 2, cy - ry * 2, rx * 4, ry * 4); ctx.ellipse(cx - rx * 0.2, cy - ry * 0.22, rx, ry, 0, 0, TAU, true);
  ctx.fillStyle = PAL.shade; ctx.fill();
  ctx.restore();
}

// A round cream rabbit: a big head on a round body, short droopy ears, a black bow, tube arms and legs (no gloves, no joints).
function rabbit(ctx, t, p) {
  const b = bounce(t), lag = bounce(t, 0.1, 0.5) * 0.9, wob = k => Math.sin(t * 5 + k) * 8;
  const { sx, sy } = squash(b + p.v), tilt = 0.03 * Math.sin((t * Math.PI * 2) / (BEAT * 2)), hy = -335;
  ctx.save();
  ctx.translate(RABBIT.x, FEET + p.y);
  ctx.scale(RABBIT.s * sx, RABBIT.s * sy);
  ctx.rotate(tilt);
  // behind the body: the tail, both legs, the waving arm, the arm that rests on the timer
  merged(ctx, PAL.cream, [ell(-152, -112, 54, 52)], 10);
  tube(ctx, [[20, -60], [100, -30], [170, -50]], 40);
  tube(ctx, [[-30, -50], [60, -16], [150, -24]], 40);
  tube(ctx, [[-95, -215], [-165, -240 + wob(1)], [-185, -300 + wob(3)], [-160, -352]], 34);
  tube(ctx, [[70, -215], [150, -170 + wob(0)], [215, -205 + wob(2)], [262, -196]], 34);
  // ears: short and droopy, hanging from the top of the head, swinging a little late on the beat
  for (const [bx, by, rot] of [[-40, -430, 0.3 - lag - p.twitch * 0.9], [90, -436, -0.38 - lag]]) {
    ctx.save(); ctx.translate(bx, by); ctx.rotate(rot);
    merged(ctx, PAL.cream, [ell(0, 110, 36, 124)], 10);
    ctx.fillStyle = PAL.shade; ctx.beginPath(); ctx.ellipse(8, 126, 18, 84, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // body and head, each with its own heavy outline and one hard shade
  merged(ctx, PAL.cream, [ell(0, -130, 142, 132)], 11);
  shade(ctx, [0, -130, 142, 132]);
  ctx.strokeStyle = INK; ctx.lineWidth = 11; ctx.beginPath(); ctx.ellipse(0, -130, 142, 132, 0, 0, TAU); ctx.stroke();
  merged(ctx, PAL.cream, [ell(-6, hy, 128, 108), ell(118, hy + 22, 52, 40)], 11);
  shade(ctx, [-6, hy, 128, 108]);
  // feet: plain cream ovals on the ends of the legs
  merged(ctx, PAL.cream, [ell(186, -34, 46, 30, -0.1), ell(158, -26, 40, 26, -0.05)], 9);
  // face: pie-cut eyes, nose, smile, cheek dots and whiskers
  const look = 0.25 + 0.2 * Math.sin(t * 3), cut = -0.9 + 0.5 * Math.sin(t * 2);
  eye(ctx, 2, hy - 22, 30, 38, look, p.lid, cut);
  eye(ctx, 68, hy - 24, 28, 36, look, p.lid, cut);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(150, hy + 4, 18, 13, 0.2, 0, TAU); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(146, hy + 16); ctx.quadraticCurveTo(142, hy + 52, 96, hy + 48); ctx.stroke();
  merged(ctx, PAL.white, [c => c.roundRect(100, hy + 40, 24, 34, 7)], 5);  // two front teeth
  ctx.beginPath(); ctx.moveTo(112, hy + 42); ctx.lineTo(112, hy + 74); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(92, hy + 18); ctx.lineTo(56, hy + 8); ctx.moveTo(94, hy + 32); ctx.lineTo(58, hy + 34); ctx.stroke();
  for (const [cx, cy] of [[-60, hy + 36], [-42, hy + 52]]) { ctx.beginPath(); ctx.arc(cx, cy, 5, 0, TAU); ctx.fill(); }
  // a black bow on top of the head
  ctx.save();
  ctx.translate(-8, hy - 104); ctx.rotate(-0.3 + lag * 0.4);
  ctx.fillStyle = INK; ctx.lineJoin = "round"; ctx.lineWidth = 8; ctx.strokeStyle = INK;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(d * 62, -34); ctx.lineTo(d * 62, 34); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
  ctx.strokeStyle = PAL.cream; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-44, -14); ctx.lineTo(-24, -6); ctx.moveTo(44, -14); ctx.lineTo(24, -6); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// --- the timer: a clock with legs, bells and a black window ------------------------------------------------------------------

function timer(ctx, t) {
  const { x, y, w, h } = TIMER, cx = x + w / 2, v = bounce(t, 0.04, 0.2), { sx, sy } = squash(v);
  ctx.save();
  ctx.translate(cx, FEET);
  ctx.scale(sx, sy);
  ctx.translate(-cx, -FEET);
  const ring = Math.sin(t * 70) * 0.16 * tick(t, 3);
  // legs and shoes
  for (const [lx, dir] of [[x + 100, -1], [x + w - 100, 1]]) { hose(ctx, [[lx, y + h - 20], [lx + dir * 26, y + h + 30], [lx + dir * 8, FEET - 34]], 28); shoe(ctx, lx + dir * 24, FEET - 22, 42, 24, dir * -0.08); }
  // bells: two black domes with a cream shine, rocking on the tick
  for (const [bx, dir] of [[x + 96, -1], [x + w - 96, 1]]) {
    ctx.save();
    ctx.translate(bx, y + 14); ctx.rotate(dir * (0.32 + ring));
    ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(0, 0, 70, 56, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PAL.cream; ctx.beginPath(); ctx.ellipse(-22, -26, 18, 8, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  hose(ctx, [[cx, y + 6], [cx + ring * 40, y - 28]], 14);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx + ring * 40, y - 34, 14, 0, TAU); ctx.fill();
  // case with a hard cream shadow on the right, then the black window with the digits
  const casePath = c => c.roundRect(x, y, w, h, 84);
  ctx.fillStyle = PAL.cream; ctx.beginPath(); casePath(ctx); ctx.fill();
  ctx.save(); ctx.beginPath(); casePath(ctx); ctx.clip();
  ctx.fillStyle = PAL.shade; ctx.beginPath(); ctx.rect(x - 10, y - 10, w + 20, h + 20); ctx.roundRect(x - 36, y - 24, w - 20, h + 30, 84); ctx.fill("evenodd");
  ctx.restore();
  ctx.lineWidth = 13; ctx.lineJoin = "round"; ctx.strokeStyle = INK; ctx.beginPath(); casePath(ctx); ctx.stroke();
  const wx = x + 34, wy = y + 100, ww = w - 68, wh = 180;
  ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(wx, wy, ww, wh, 34); ctx.fill();
  ctx.save();
  ctx.fillStyle = PAL.cream; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = '100px "Titan One"';
  const label = clockText(t), size = (100 * (ww - 44)) / ctx.measureText(label).width, pop = 1 + 0.5 * -bounce(t, 0.02);
  ctx.translate(wx + ww / 2, wy + wh / 2 + 4); ctx.scale(pop, pop);
  ctx.font = `${size}px "Titan One"`;
  ctx.fillText(label, 0, 0);
  ctx.restore();
  // a dial below: five dots and a start button
  ctx.fillStyle = INK;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(wx + 24 + (i * (ww - 48)) / 4, y + 330, 7, 0, TAU); ctx.fill(); }
  merged(ctx, PAL.cream, [ell(cx, y + 420, 40, 40)], 9);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, y + 420, 12, 0, TAU); ctx.fill();
  ctx.restore();
}

// --- scenery, title, film ------------------------------------------------------------------------------------------------

function backdrop(ctx, W, H) {
  ctx.fillStyle = PAL.cream;
  ctx.fillRect(-40, -40, W + 80, H + 80);
  ctx.save();
  ctx.translate(540, 1000);
  ctx.fillStyle = PAL.ray;
  for (let i = 0; i < 28; i += 2) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 2600, (i * TAU) / 28, ((i + 1) * TAU) / 28); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = PAL.floor;
  ctx.fillRect(-40, FEET, W + 80, H - FEET + 40);
  ctx.fillStyle = INK;
  ctx.fillRect(-40, FEET - 5, W + 80, 10);
  for (const [x, y, w] of [[90, FEET + 70, 150], [420, FEET + 120, 220], [800, FEET + 60, 170], [200, FEET + 190, 260], [700, FEET + 220, 200]]) ctx.fillRect(x, y, w, 7);
}

function title(ctx, t, W) {
  const s = "TICK TOCK!", size = 168;
  ctx.save();
  ctx.font = `${size}px "Titan One"`;
  ctx.textBaseline = "alphabetic"; ctx.lineJoin = "round";
  const widths = [...s].map(ch => ctx.measureText(ch).width), total = widths.reduce((a, b) => a + b, 0);
  let x = (W - total) / 2;
  [...s].forEach((ch, i) => {
    const v = bounce(t, i * 0.05, 0.2), cx = x + widths[i] / 2, rot = (i % 2 ? 1 : -1) * 0.07;
    ctx.save();
    ctx.translate(cx, 380 + v * 200); ctx.rotate(rot); ctx.scale(1 - v * 0.5, 1 + v * 0.8);
    ctx.lineWidth = 30; ctx.strokeStyle = INK; ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.strokeText(ch, 12, 14); ctx.fillText(ch, 12, 14);
    ctx.strokeText(ch, 0, 0);
    ctx.fillStyle = PAL.white; ctx.fillText(ch, 0, 0);
    ctx.restore();
    x += widths[i];
  });
  ctx.restore();
}

// The old film: a weaving gate, flicker, grain, scratches, dust and darker corners. Redrawn every 24th of a second.
function film(ctx, t, W, H, st) {
  const f = Math.floor(t * 24 + 1e-6), r = rng(f * 131 + 7);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  const g = Math.round(255 * (1 - 0.06 * r())), vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72);
  ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(0, 0, W, H);
  vg.addColorStop(0, "rgb(255,255,255)"); vg.addColorStop(1, "rgb(168,152,128)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  grain(ctx, t, W, H, st.tile, 0.16);
  ctx.save();
  for (let i = 0; i < 2; i++) if (r() < 0.8) {
    const x = r() * W; ctx.globalAlpha = 0.18 + r() * 0.25; ctx.fillStyle = r() < 0.5 ? "#fff" : INK;
    ctx.fillRect(x, 0, 1 + r() * 2.2, H);
  }
  ctx.fillStyle = INK;
  for (let i = 0; i < 14; i++) { ctx.globalAlpha = 0.3 + r() * 0.5; ctx.beginPath(); ctx.arc(r() * W, r() * H, 1 + r() * 3.2, 0, TAU); ctx.fill(); }
  ctx.restore();
}

export function draw(ctx, t, W, H, st) {
  const k = W / 1080, p = pose(t), f = Math.floor(t * 24 + 1e-6), r = rng(f * 977 + 3);
  ctx.save();
  ctx.scale(k, k);
  ctx.translate((r() - 0.5) * 7, (r() - 0.5) * 5);  // gate weave
  backdrop(ctx, 1080, H / k);
  title(ctx, t, 1080);
  ctx.save();
  ctx.fillStyle = INK; ctx.globalAlpha = 0.18;  // hard shadows on the floor, away from the light
  for (const [x, w] of [[RABBIT.x + 70, 270], [TIMER.x + TIMER.w / 2 + 30, 220]]) { ctx.beginPath(); ctx.ellipse(x, FEET + 22, w, 20, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
  timer(ctx, t);
  rabbit(ctx, t, p);
  ctx.restore();
  film(ctx, t, W, H, st);
}
