// Style demo: Victorian wood-engraving. A rabbit beside a 25:00 timer drawn only with paper and ink: form is modelled by line
// density (parallel hatching, cross-hatching on the dark side, short fur flicks), a ruled border and a serif plate caption.
// Light comes from the upper left on every shape. Every frame is a pure function of t; the pen lines "boil" six times a second.
import { pen, hatch, dashes, ellipsePts, paperGrain, boil, rng, PAPER, INK } from "../ink.mjs";
import { squash } from "../toon.mjs";
import { pose, rabbitParts, clockText, tick, TAU, DURATION as DEMO_DURATION } from "../demo.mjs";

export const DURATION = DEMO_DURATION, COVER = 1.5;
export const SOUND = { kind: "intro", close: 2.5 };
export const CAPTIONS = [], SCENES = [];

const SERIF = '"IM Fell DW Pica", serif';
const PLATE = [80, 160, 1000, 1470], HORIZON = 900, FEET = 1330, RABBIT_X = 330;
const TIMER = { x: 610, y: 780, w: 380, h: 520 };
const LIGHT = [-0.6, -0.7];  // direction the light comes from, in shape-size units

export function setup(doc, W, H) { return { paper: paperGrain(doc, W, H, 11) }; }

// --- helpers -------------------------------------------------------------------------------------------------------------

const ellPath = ([cx, cy, rx, ry, rot = 0], dx = 0, dy = 0, s = 1) => c => {
  c.moveTo(cx + dx + Math.cos(rot) * rx * s, cy + dy + Math.sin(rot) * rx * s);
  c.ellipse(cx + dx, cy + dy, rx * s, ry * s, rot, 0, TAU);
};
const shape = path => c => { c.beginPath(); path(c); };
const BIG = [-4000, -4000, 8000, 8000];
// The part of `path` the light misses: clip to the path, then to everything outside `lit`.
const shadow = (path, lit) => c => {
  c.beginPath(); path(c); c.clip();
  c.beginPath(); c.rect(...BIG); lit(c); c.clip("evenodd");
  c.beginPath(); c.rect(...BIG);
};
const roundRectPts = (x, y, w, h, r) => [
  ...ellipsePts(x + r, y + r, r, r, 10, 0, Math.PI, Math.PI * 1.5), ...ellipsePts(x + w - r, y + r, r, r, 10, 0, Math.PI * 1.5, TAU),
  ...ellipsePts(x + w - r, y + h - r, r, r, 10, 0, 0, Math.PI / 2), ...ellipsePts(x + r, y + h - r, r, r, 10, 0, Math.PI / 2, Math.PI),
];
const closed = pts => [...pts, pts[0]];

// One shape of the engraving: paper, fur flicks, a first pass of hatching on the shadow side, cross-hatching on the darkest
// part, then the outline (heavier on the shadow side).
function engrave(ctx, t, part, { angle = -0.8, seed = 1, fur = 60, gap = 4.6, cross = true } = {}) {
  const [cx, cy, rx, ry, rot = 0] = part, R = Math.max(rx, ry) + 4, box = [cx - R, cy - R, cx + R, cy + R];
  const path = ellPath(part), lit = k => ellPath(part, LIGHT[0] * rx * k, LIGHT[1] * ry * k);
  ctx.fillStyle = PAPER;
  ctx.beginPath(); path(ctx); ctx.fill();
  if (fur) dashes(ctx, shape(path), { box, n: Math.round((rx * ry) / fur), len: 15, angle: angle + 0.5, alpha: 0.5, w: 1.3, seed: seed + 100 });
  hatch(ctx, shadow(path, lit(0.5)), { angle, gap, w: 1.8, alpha: 0.9, seed, box, broken: 0.12 });
  if (cross) hatch(ctx, shadow(path, lit(0.95)), { angle: angle + 0.85, gap: gap + 0.6, w: 1.5, alpha: 0.9, seed: seed + 1, box, broken: 0.1 });
  pen(ctx, ellipsePts(cx, cy, rx, ry, 64, rot), { w: 3.1, jit: 1.6, seed: boil(t, seed) });
  pen(ctx, ellipsePts(cx, cy, rx, ry, 24, rot, -0.2, 1.9), { w: 3.6, jit: 1.2, seed: boil(t, seed + 7) });
}

// The dark inside of an ear: dense hatching along its axis.
function innerEar(ctx, ear, seed) {
  const [cx, cy, rx, ry, rot] = ear.shape, part = [cx, cy, rx * 0.5, ry * 0.8, rot], R = ry;
  ctx.fillStyle = "rgba(47,41,36,0.28)";
  ctx.beginPath(); ellPath(part)(ctx); ctx.fill();
  hatch(ctx, shape(ellPath(part)), { angle: rot - Math.PI / 2, gap: 3.2, w: 1.7, alpha: 0.95, seed, box: [cx - R, cy - R, cx + R, cy + R], broken: 0.05 });
}

// --- the plate -----------------------------------------------------------------------------------------------------------

function frame(ctx, W, H) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7; ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.lineWidth = 1.8; ctx.strokeRect(60, 60, W - 120, H - 120);
  ctx.lineWidth = 2.6; ctx.strokeRect(PLATE[0], PLATE[1], PLATE[2] - PLATE[0], PLATE[3] - PLATE[1]);
  for (const [x, y] of [[40, 40], [W - 40, 40], [40, H - 40], [W - 40, H - 40]]) {  // a small diamond on each corner of the rule
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = INK; ctx.fillRect(-14, -14, 28, 28); ctx.fillStyle = PAPER; ctx.fillRect(-7, -7, 14, 14); ctx.restore();
  }
  ctx.restore();
}

function text(ctx, s, x, y, size, spacing = 0) {
  ctx.save();
  ctx.font = `${size}px ${SERIF}`;
  ctx.letterSpacing = `${spacing}px`;
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(s, x, y);
  ctx.restore();
}

function cloud(ctx, t, x, y, s, seed) {
  const parts = [[0, 0, 130, 46], [-90, 14, 84, 36], [100, 16, 96, 38], [10, -30, 76, 44]].map(([dx, dy, rx, ry]) => [x + dx * s, y + dy * s, rx * s, ry * s, 0]);
  ctx.fillStyle = PAPER;
  for (const p of parts) { ctx.beginPath(); ellPath(p)(ctx); ctx.fill(); }
  const whole = c => parts.forEach(q => ellPath(q)(c)), up = c => parts.forEach(q => ellPath(q, -16 * s, -20 * s)(c));
  hatch(ctx, shadow(whole, up), { angle: 0.35, gap: 4.4, w: 1.5, alpha: 0.8, seed, box: [x - 220 * s, y - 80 * s, x + 220 * s, y + 70 * s], broken: 0.15 });
  for (const q of parts.slice(0, 3)) pen(ctx, ellipsePts(q[0], q[1], q[2], q[3], 20, 0, 0.3, Math.PI - 0.3), { w: 2.4, jit: 1.5, seed: boil(t, seed + q[0]) });
}

function scenery(ctx, t) {
  const [x0, y0, x1, y1] = PLATE, r = rng(5);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  // sky: ruled lines, heavier at the top, fading to the horizon
  ctx.strokeStyle = INK;
  for (let y = y0 + 3; y < HORIZON; y += 6.5) {
    const u = (y - y0) / (HORIZON - y0);
    ctx.lineWidth = 2.5 - 1.9 * u; ctx.globalAlpha = 0.92 - 0.3 * u;
    ctx.beginPath(); ctx.moveTo(x0, y + (r() - 0.5) * 0.9); ctx.lineTo(x1, y + (r() - 0.5) * 0.9); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  cloud(ctx, t, 330, 380, 1.15, 31);
  cloud(ctx, t, 790, 560, 0.9, 32);
  // distant hills: paper with slanted hatching
  const hill = c => {
    c.moveTo(x0, HORIZON + 4);
    for (let x = x0; x <= x1; x += 10) c.lineTo(x, HORIZON - 60 - 38 * Math.sin(x / 160 + 1) - 22 * Math.sin(x / 63));
    c.lineTo(x1, HORIZON + 4);
    c.closePath();
  };
  ctx.fillStyle = PAPER; ctx.beginPath(); hill(ctx); ctx.fill();
  hatch(ctx, shape(hill), { angle: -0.55, gap: 6, w: 1.4, alpha: 0.75, seed: 41, box: [x0, HORIZON - 150, x1, HORIZON + 4], broken: 0.3 });
  pen(ctx, Array.from({ length: 93 }, (_, i) => { const x = x0 + i * 10; return [x, HORIZON - 60 - 38 * Math.sin(x / 160 + 1) - 22 * Math.sin(x / 63)]; }), { w: 2.8, jit: 1.4, seed: 42 });
  // ground: broken horizontal lines that open out towards the viewer
  for (let y = HORIZON + 4, i = 0; y < y1; y += 4 + (y - HORIZON) / 55, i++) {
    const u = (y - HORIZON) / (y1 - HORIZON);
    ctx.lineWidth = 1 + 0.9 * u; ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let x = x0; x < x1;) { const len = 30 + r() * 120; ctx.moveTo(x, y + (r() - 0.5)); ctx.lineTo(Math.min(x1, x + len), y + (r() - 0.5)); x += len + (r() < 0.35 ? 6 + r() * 20 : 0); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // grass flicks along the ground line of the picture
  for (let i = 0; i < 46; i++) {
    const x = x0 + 30 + r() * (x1 - x0 - 60), y = FEET + 20 + r() * 90, h = 18 + r() * 24, lean = (r() - 0.5) * 16;
    pen(ctx, [[x, y], [x + lean * 0.5, y - h * 0.55], [x + lean, y - h]], { w: 2.2, jit: 1, seed: 600 + i });
  }
  ctx.restore();
}

// The dense hatched patch on the ground the light does not reach.
function groundShadow(ctx, cx, cy, rx, ry, seed) {
  const part = [cx, cy, rx, ry, 0], R = rx + 4;
  ctx.fillStyle = PAPER; ctx.globalAlpha = 0.55;
  ctx.beginPath(); ellPath(part)(ctx); ctx.fill();
  ctx.globalAlpha = 1;
  hatch(ctx, shape(ellPath(part)), { angle: 0.03, gap: 3.4, w: 1.9, alpha: 0.95, seed, box: [cx - R, cy - R, cx + R, cy + R], broken: 0.08 });
  hatch(ctx, shape(ellPath(part, -rx * 0.15, 0, 0.7)), { angle: -0.3, gap: 4, w: 1.5, alpha: 0.9, seed: seed + 1, box: [cx - R, cy - R, cx + R, cy + R], broken: 0.08 });
}

// --- the rabbit ----------------------------------------------------------------------------------------------------------

function rabbit(ctx, t, p) {
  const P = rabbitParts(p), { sx, sy } = squash(p.v);
  ctx.save();
  ctx.translate(RABBIT_X, FEET + p.y);
  ctx.scale(sx, sy);
  for (const e of [P.earBack, P.earFront]) { engrave(ctx, t, e.shape, { angle: e.rot - Math.PI / 2 + 0.15, seed: 51 + e.rot * 3, fur: 90, gap: 4 }); innerEar(ctx, e, 57); }
  engrave(ctx, t, P.tail, { angle: -0.4, seed: 61, fur: 25 });
  engrave(ctx, t, P.body, { angle: -0.75, seed: 62 });
  engrave(ctx, t, P.haunch, { angle: -0.95, seed: 63 });
  engrave(ctx, t, P.foot, { angle: -0.2, seed: 64, fur: 0, gap: 4 });
  engrave(ctx, t, P.foreleg, { angle: 1.4, seed: 65, fur: 70 });
  engrave(ctx, t, P.paw, { angle: -0.2, seed: 66, fur: 0, gap: 4 });
  engrave(ctx, t, P.head, { angle: -0.6, seed: 67, fur: 70 });
  engrave(ctx, t, P.muzzle, { angle: -0.3, seed: 68, fur: 0, gap: 6, cross: false });
  // face: eye (a blink closes it to a line), brow, nose, mouth and whiskers
  const [ex, ey] = P.eye, [nx, ny] = P.nose, open = 1 - p.lid;
  ctx.fillStyle = INK;
  if (open > 0.2) {
    ctx.beginPath(); ctx.ellipse(ex, ey, 14, 16 * open, 0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(ex - 4, ey - 5 * open, 3.6, 0, TAU); ctx.fill();
  } else pen(ctx, ellipsePts(ex, ey + 4, 15, 8, 12, 0.1, 0.15, Math.PI - 0.15), { w: 3.4, jit: 0.6, seed: 71 });
  pen(ctx, ellipsePts(ex, ey - 2, 24, 22, 14, 0.2, Math.PI * 1.15, Math.PI * 1.75), { w: 3, jit: 0.8, seed: boil(t, 72) });
  ctx.beginPath(); ctx.ellipse(nx, ny, 10, 8, 0.3, 0, TAU); ctx.fillStyle = INK; ctx.fill();
  pen(ctx, [[nx - 2, ny + 8], [nx - 4, ny + 26], [nx - 18, ny + 34], [nx - 36, ny + 30]], { w: 2.6, jit: 0.8, seed: 73 });
  for (const [dx, dy, ex2, ey2] of [[-22, -2, 70, -22], [-22, 4, 80, 4], [-22, 10, 70, 28]]) pen(ctx, [[nx + dx, ny + dy], [nx + (dx + ex2) / 2, ny + (dy + ey2) / 2 - 2], [nx + ex2, ny + ey2]], { w: 1.4, jit: 0.5, seed: 74 + dy });
  ctx.restore();
}

// --- the timer -----------------------------------------------------------------------------------------------------------

function bell(ctx, t, cx, cy, rot, seed) {
  ctx.save();
  ctx.translate(cx, cy + 6);
  ctx.rotate(rot);
  const dome = [0, 0, 62, 50, 0], path = c => { c.moveTo(-62, 0); c.ellipse(0, 0, 62, 50, 0, Math.PI, TAU); c.closePath(); };
  ctx.fillStyle = PAPER; ctx.beginPath(); path(ctx); ctx.fill();
  hatch(ctx, shadow(path, c => c.ellipse(-32, -18, 62, 50, 0, 0, TAU)), { angle: 1.25, gap: 4, w: 1.7, alpha: 0.9, seed, box: [-70, -56, 70, 8], broken: 0.1 });
  pen(ctx, ellipsePts(0, 0, 62, 50, 30, 0, Math.PI, TAU), { w: 3.2, jit: 1.3, seed: boil(t, seed) });
  pen(ctx, [[-66, 2], [66, 2]], { w: 4, jit: 0.6, seed: seed + 1 });
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, -56, 8, 0, TAU); ctx.fill();
  ctx.restore();
  return dome;
}

function timer(ctx, t) {
  const { x, y, w, h } = TIMER, shake = Math.sin(t * 90) * 0.05 * tick(t, 3);
  // twin bells, feet and the case (a little hammer between the bells shakes on each tick)
  for (const fx of [x + 56, x + w - 56]) { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(fx, y + h + 4, 40, 15, 0, 0, TAU); ctx.fill(); }
  bell(ctx, t, x + 82, y + 4, -0.32 + shake, 81);
  bell(ctx, t, x + w - 82, y + 4, 0.32 - shake, 82);
  pen(ctx, [[x + w / 2, y + 4], [x + w / 2 + 6 * Math.sign(shake || 1), y - 40]], { w: 4, jit: 0.4, seed: 83 });
  const casePath = c => c.roundRect(x, y, w, h, 64), litCase = c => c.roundRect(x - 120, y - 80, w, h, 64);
  ctx.fillStyle = PAPER; ctx.beginPath(); casePath(ctx); ctx.fill();
  const box = [x, y, x + w, y + h];
  hatch(ctx, shape(casePath), { angle: Math.PI / 2 + 0.03, gap: 17, w: 1.1, alpha: 0.55, seed: 84, box, broken: 0.35 });
  hatch(ctx, shadow(casePath, litCase), { angle: Math.PI / 2 + 0.03, gap: 4.4, w: 1.8, alpha: 0.92, seed: 85, box, broken: 0.08 });
  hatch(ctx, shadow(casePath, c => c.roundRect(x - 300, y - 200, w, h, 64)), { angle: -0.6, gap: 5.2, w: 1.5, alpha: 0.9, seed: 86, box, broken: 0.08 });
  pen(ctx, closed(roundRectPts(x, y, w, h, 64)), { w: 4.2, jit: 1.8, seed: boil(t, 87) });
  pen(ctx, closed(roundRectPts(x + 14, y + 14, w - 28, h - 28, 52)), { w: 1.8, jit: 1.2, seed: boil(t, 88), alpha: 0.9 });
  // the window: glass lines, a double rule and the digits
  const wx = x + 40, wy = y + 90, ww = w - 80, wh = 190;
  ctx.fillStyle = PAPER; ctx.fillRect(wx, wy, ww, wh);
  hatch(ctx, c => { c.beginPath(); c.rect(wx, wy, ww, wh); }, { angle: -0.02, gap: 6.5, w: 1, alpha: 0.4, seed: 89, box: [wx, wy, wx + ww, wy + wh], broken: 0.25 });
  hatch(ctx, c => { c.beginPath(); c.rect(wx, wy + wh * 0.62, ww, wh * 0.4); c.clip(); c.beginPath(); c.rect(wx, wy, ww, wh); }, { angle: -0.02, gap: 3.8, w: 1.1, alpha: 0.5, seed: 90, box: [wx, wy, wx + ww, wy + wh], broken: 0.2 });
  pen(ctx, closed(roundRectPts(wx, wy, ww, wh, 12)), { w: 4.4, jit: 1.2, seed: boil(t, 91) });
  pen(ctx, closed(roundRectPts(wx - 8, wy - 8, ww + 16, wh + 16, 18)), { w: 1.8, jit: 1, seed: boil(t, 92) });
  ctx.font = `100px ${SERIF}`;
  const label = clockText(t), size = Math.min(150, 100 * (ww - 36) / ctx.measureText(label).width);
  text(ctx, label, wx + ww / 2, wy + wh / 2 + 6, size);
  // a minute scale under the window and a knob that turns
  const sy0 = y + 340;
  for (let i = 0; i <= 25; i++) pen(ctx, [[wx + (ww * i) / 25, sy0], [wx + (ww * i) / 25, sy0 + (i % 5 ? 14 : 28)]], { w: i % 5 ? 1.8 : 2.8, jit: 0.4, seed: 100 + i });
  pen(ctx, [[wx, sy0], [wx + ww, sy0]], { w: 2.4, jit: 0.6, seed: 95 });
  text(ctx, "MINUTES", x + w / 2, sy0 + 62, 26, 7);
  const kx = x + w / 2, ky = y + h - 72, kr = 46, a = t * 0.7 - 1.2;
  const knob = [kx, ky, kr, kr, 0];
  ctx.fillStyle = PAPER; ctx.beginPath(); ellPath(knob)(ctx); ctx.fill();
  hatch(ctx, shadow(ellPath(knob), ellPath(knob, -16, -14)), { angle: 0.9, gap: 4, w: 1.7, alpha: 0.9, seed: 96, box: [kx - kr, ky - kr, kx + kr, ky + kr], broken: 0.1 });
  pen(ctx, ellipsePts(kx, ky, kr, kr, 40), { w: 3.4, jit: 1.2, seed: boil(t, 97) });
  pen(ctx, [[kx, ky], [kx + Math.cos(a) * kr * 0.85, ky + Math.sin(a) * kr * 0.85]], { w: 5, jit: 0.4, seed: 98 });
}

// --- frame ---------------------------------------------------------------------------------------------------------------

export function draw(ctx, t, W, H, st) {
  const k = W / 1080, p = pose(t);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.scale(k, k);
  scenery(ctx, t);
  ctx.save();
  ctx.beginPath(); ctx.rect(PLATE[0], PLATE[1], PLATE[2] - PLATE[0], PLATE[3] - PLATE[1]); ctx.clip();
  const lift = Math.min(1, -p.y / 90);  // the shadow shrinks and thins while the rabbit is in the air
  groundShadow(ctx, RABBIT_X + 50, FEET + 8, 250 * (1 - 0.25 * lift), 24, 111);
  groundShadow(ctx, TIMER.x + TIMER.w / 2 + 40, FEET + 12, 230, 24, 113);
  timer(ctx, t);
  rabbit(ctx, t, p);
  ctx.restore();
  frame(ctx, W, H);
  text(ctx, "PLATE XXV.", W / 2, 112, 34, 9);
  pen(ctx, [[W / 2 - 230, 1530], [W / 2 + 230, 1530]], { w: 2.2, jit: 0.6, seed: 120 });
  text(ctx, "Twenty-five Minutes of Quiet.", W / 2, 1610, 76);
  text(ctx, "A Rabbit at Rest beside its Timer.", W / 2, 1700, 40, 1);
  pen(ctx, [[W / 2 - 230, 1760], [W / 2 + 230, 1760]], { w: 1.4, jit: 0.6, seed: 121 });
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(st.paper, 0, 0, W, H);
  ctx.restore();
}
