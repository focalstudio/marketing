// Style demo: Japanese brush ink (sumi-e). The same rabbit and timer, but made of few things: tapered brush strokes drawn as
// filled polygons (swelling, thinning, dry at the tail), grey washes with soft feathered edges, a lot of empty paper and one
// small red seal. The timer is an open brush circle with the time written inside; it closes a little more each second.
// Every frame is a pure function of t: the stroke wobble comes from rng(seed), never Math.random.
import { rng, wash, paperGrain, ellipsePts, clamp } from "../ink.mjs";
import { mix } from "../cel.mjs";
import { squash } from "../toon.mjs";
import { pose, rabbitParts, clockText, TAU, DURATION as DEMO_DURATION } from "../demo.mjs";

export const DURATION = DEMO_DURATION, COVER = 1.5;
export const SOUND = { kind: "intro", close: 2.5 };
export const CAPTIONS = [], SCENES = [];

export const PAL = { paper: "#f1ece0", ink: "#1d1b19", wash: "#8a8478", mist: "#a8a395", seal: "#c8372d" };
const FEET = 1350, RABBIT = { x: 370, s: 1.1 }, RING = { x: 752, y: 490, r: 240 };

export function setup(doc, W, H) { return { paper: paperGrain(doc, W, H, 17) }; }

// --- the brush -----------------------------------------------------------------------------------------------------------

// Catmull-Rom through pts, resampled about every `step` px.
function smooth(pts, step = 5) {
  const out = [], n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [pts[Math.max(i - 1, 0)], pts[i], pts[i + 1], pts[Math.min(i + 2, n - 1)]];
    const m = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < m; j++) {
      const u = j / m, u2 = u * u, u3 = u2 * u;
      out.push([0, 1].map(k => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * u3)));
    }
  }
  out.push(pts[n - 1]);
  return out;
}

// One brush stroke along pts, as a filled polygon: it presses in over `head` of its length, holds a swelling and thinning
// width and lifts over `tail`. `dry` (0..1) scratches paper-coloured bristle lines through the second half.
function brush(ctx, pts, { w = 20, seed = 1, color = PAL.ink, alpha = 0.94, head = 0.1, tail = 0.45, dry = 0 } = {}) {
  const r = rng(seed), P = smooth(pts), n = P.length, ph = [r() * TAU, r() * TAU, r() * TAU];
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), a = P[Math.max(i - 1, 0)], b = P[Math.min(i + 1, n - 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
    const press = clamp(0.5 + 0.5 * (u / head), 0, 1) ** 0.7 * clamp((1 - u) / tail, 0, 1) ** 0.8;
    const wob = 0.86 + 0.14 * Math.sin(u * 9 + ph[0]) + 0.08 * Math.sin(u * 23 + ph[1]), hw = (w * press * wob) / 2;
    L.push([P[i][0] + nx * hw + (r() - 0.5) * w * 0.07, P[i][1] + ny * hw + (r() - 0.5) * w * 0.07]);
    R.push([P[i][0] - nx * hw + (r() - 0.5) * w * 0.07, P[i][1] - ny * hw + (r() - 0.5) * w * 0.07]);
  }
  const poly = c => { c.beginPath(); L.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); for (let i = n - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]); c.closePath(); };
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  poly(ctx); ctx.fill();
  if (dry) {
    ctx.clip();
    ctx.strokeStyle = PAL.paper;
    ctx.lineCap = "round";
    for (let j = 0; j < 14; j++) {
      const f = (r() - 0.5) * 0.8, i0 = Math.floor(n * (0.3 + r() * 0.5)), i1 = Math.min(n - 1, i0 + Math.floor(n * (0.1 + r() * 0.3)));
      ctx.globalAlpha = dry * (0.5 + r() * 0.5);
      ctx.lineWidth = 1 + r() * 2.2;
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) {
        const a = P[Math.max(i - 1, 0)], b = P[Math.min(i + 1, n - 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const x = P[i][0] - ((b[1] - a[1]) / d) * w * f, y = P[i][1] + ((b[0] - a[0]) / d) * w * f;
        i === i0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

const arc = ([cx, cy, rx, ry, rot = 0], a0, a1, n = 12) => ellipsePts(cx, cy, rx, ry, n, rot, a0, a1);
const ellShape = ([cx, cy, rx, ry, rot = 0], dx = 0, dy = 0, s = 1) => c => { c.beginPath(); c.ellipse(cx + dx, cy + dy, rx * s, ry * s, rot, 0, TAU); };
const PI = Math.PI;

// --- the rabbit ----------------------------------------------------------------------------------------------------------

function rabbit(ctx, p) {
  const P = rabbitParts(p), { sx, sy } = squash(p.v);
  ctx.save();
  ctx.translate(RABBIT.x, FEET + p.y);
  ctx.scale(RABBIT.s * sx, RABBIT.s * sy);
  // washes first: pale grey for the fur, a darker crescent on the side away from the light, a deeper grey inside the ears
  for (const q of [P.body, P.haunch, P.head, P.earBack.shape, P.earFront.shape, P.foreleg, P.muzzle]) wash(ctx, ellShape(q), { color: PAL.wash, alpha: 0.22, blur: 9, edge: 0.1 });
  for (const q of [P.body, P.haunch, P.head]) {
    ctx.save();
    ellShape(q)(ctx); ctx.clip();
    const [cx, cy, rx, ry, rot] = q;
    ctx.beginPath(); ctx.rect(-600, -900, 1200, 1000); ctx.ellipse(cx - rx * 0.32, cy - ry * 0.3, rx * 0.98, ry * 0.98, rot, 0, TAU, true);
    ctx.filter = "blur(10px)"; ctx.fillStyle = PAL.wash; ctx.globalAlpha = 0.38; ctx.fill();
    ctx.restore();
  }
  for (const e of [P.earBack, P.earFront]) {
    const [cx, cy, rx, ry, rot] = e.shape;
    wash(ctx, ellShape([cx, cy + ry * 0.08, rx * 0.5, ry * 0.8, rot]), { color: mix(PAL.wash, PAL.ink, 0.4), alpha: 0.5, blur: 7, edge: 0.05 });
  }
  // strokes: the back in one long swelling line, the thigh, the head, ears, ground and face
  brush(ctx, [...arc(P.body, PI * 0.88, PI * 1.78)], { w: 24, seed: 3, tail: 0.5, dry: 0.5 });
  brush(ctx, arc(P.haunch, PI * 1.02, PI * 1.62, 8), { w: 12, seed: 4, alpha: 0.8, head: 0.2 });
  brush(ctx, arc(P.haunch, PI * 0.05, PI * 0.6, 8), { w: 10, seed: 5, alpha: 0.7 });
  brush(ctx, arc(P.head, PI * 1.12, PI * 1.9, 10), { w: 17, seed: 6, tail: 0.4 });
  brush(ctx, arc(P.head, PI * 0.18, PI * 0.62, 8), { w: 11, seed: 7, alpha: 0.75 });
  for (const [e, s] of [[P.earBack, 8], [P.earFront, 9]]) {
    brush(ctx, arc(e.shape, PI * 0.55, PI * 1.5, 14), { w: 15, seed: s, tail: 0.3 });
    brush(ctx, arc(e.shape, PI * 1.55, PI * 2.3, 10), { w: 9, seed: s + 10, alpha: 0.8, head: 0.2 });
  }
  brush(ctx, [[126, -205], [132, -120], [128, -34]], { w: 12, seed: 12, alpha: 0.85 });
  brush(ctx, [[-180, -130], [-198, -112], [-182, -92], [-160, -108]], { w: 9, seed: 13, alpha: 0.7, tail: 0.2 });
  brush(ctx, [[-95, -8], [20, -3], [170, -9]], { w: 20, seed: 14, tail: 0.5, alpha: 0.9 });
  const [ex, ey] = P.eye, [nx, ny] = P.nose, open = 1 - p.lid;
  if (open > 0.25) {
    ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.ellipse(ex, ey, 13, 16 * open, 0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = PAL.paper; ctx.beginPath(); ctx.arc(ex - 4, ey - 5 * open, 3.4, 0, TAU); ctx.fill();
  } else brush(ctx, [[ex - 16, ey + 2], [ex, ey + 9], [ex + 16, ey + 1]], { w: 7, seed: 15, head: 0.3, tail: 0.3 });
  ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.ellipse(nx, ny, 10, 8, 0.3, 0, TAU); ctx.fill();
  for (const [dx, dy, i] of [[70, -16, 0], [78, 6, 1], [66, 26, 2]]) brush(ctx, [[nx - 14, ny + 4 + dy * 0.2], [nx + dx * 0.5, ny + dy * 0.6], [nx + dx, ny + dy]], { w: 3.2, seed: 20 + i, alpha: 0.7, head: 0.1, tail: 0.8 });
  ctx.restore();
}

// --- the timer: an open brush circle, the time written inside --------------------------------------------------------------

function timer(ctx, t) {
  const { x, y, r } = RING, a0 = -2.1, sweep = TAU * (0.8 + 0.05 * t);
  const pts = Array.from({ length: 28 }, (_, i) => { const u = i / 27, a = a0 + sweep * u, rr = r + 12 - 26 * u; return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]; });
  wash(ctx, c => { c.beginPath(); c.arc(x, y, r - 10, 0, TAU); }, { color: PAL.wash, alpha: 0.08, blur: 22, edge: 0 });
  brush(ctx, pts, { w: 40, seed: 31, head: 0.06, tail: 0.5, dry: 0.75 });
  ctx.save();
  ctx.font = "300 142px Nunito";
  ctx.letterSpacing = "6px";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = PAL.ink;
  ctx.filter = "blur(3px)"; ctx.globalAlpha = 0.25;  // ink bleeding into the paper under the written digits
  ctx.fillText(clockText(t), x, y - 10);
  ctx.filter = "none"; ctx.globalAlpha = 0.93;
  ctx.fillText(clockText(t), x, y - 10);
  ctx.font = "400 34px Nunito"; ctx.letterSpacing = "14px"; ctx.fillStyle = PAL.wash; ctx.globalAlpha = 0.9;
  ctx.fillText("MINUTES", x, y + 96);
  ctx.restore();
}

// --- the seal ------------------------------------------------------------------------------------------------------------

// A small red seal with two carved ears: the stone's edges are a little uneven and the ink is patchy.
function seal(ctx, x, y, s) {
  const r = rng(77), P = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.05);
  ctx.fillStyle = PAL.seal;
  ctx.beginPath();
  P.forEach(([cx, cy], i) => { const px = cx * s / 2 + (r() - 0.5) * 3, py = cy * s / 2 + (r() - 0.5) * 3; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = PAL.paper; ctx.fillStyle = PAL.paper; ctx.lineCap = "round";
  ctx.lineWidth = s * 0.08;
  for (const [dx, lean] of [[-0.14, -0.1], [0.1, 0.1]]) { ctx.beginPath(); ctx.ellipse(dx * s, -0.17 * s, s * 0.06, s * 0.2, lean, 0, TAU); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(0, 0.13 * s, s * 0.22, s * 0.2, 0, 0, TAU); ctx.stroke();
  ctx.fillRect(-s * 0.09, 0.1 * s, s * 0.04, s * 0.05); ctx.fillRect(s * 0.05, 0.1 * s, s * 0.04, s * 0.05);
  for (let i = 0; i < 40; i++) { ctx.globalAlpha = 0.25 + r() * 0.4; ctx.fillRect((r() - 0.5) * s, (r() - 0.5) * s, 1 + r() * 2.5, 1 + r() * 2.5); }
  ctx.restore();
}

// --- frame ---------------------------------------------------------------------------------------------------------------

export function draw(ctx, t, W, H, st) {
  const k = W / 1080, p = pose(t);
  ctx.fillStyle = PAL.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.scale(k, k);
  // far mountains and a band of mist, only washes
  for (const [peaks, a] of [[[[620, 1300], [760, 1170], [820, 1200], [950, 1060], [1090, 1300]], 0.24], [[[480, 1300], [600, 1220], [700, 1300]], 0.14]]) {
    wash(ctx, c => { c.beginPath(); peaks.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }, { color: PAL.mist, alpha: a, blur: 18, edge: 0 });
  }
  wash(ctx, c => { c.beginPath(); c.ellipse(660, 1318, 620, 40, 0, 0, TAU); }, { color: PAL.paper, alpha: 0.95, blur: 26, edge: 0 });
  timer(ctx, t);
  brush(ctx, [[70, FEET + 14], [420, FEET + 6], [800, FEET + 10], [1020, FEET + 2]], { w: 14, seed: 41, head: 0.04, tail: 0.6, dry: 0.7, alpha: 0.85 });
  wash(ctx, c => { c.beginPath(); c.ellipse(RABBIT.x + 40, FEET + 16, 250, 14, 0, 0, TAU); }, { color: PAL.ink, alpha: 0.16, blur: 10, edge: 0 });
  rabbit(ctx, p);
  for (const [x, y, h, lean, s] of [[880, FEET + 6, 70, 18, 51], [904, FEET + 6, 46, -10, 52], [930, FEET + 4, 56, 14, 53]]) brush(ctx, [[x, y], [x + lean * 0.4, y - h * 0.5], [x + lean, y - h]], { w: 7, seed: s, head: 0.1, tail: 0.8, alpha: 0.85 });
  ctx.save();
  ctx.font = "300 46px Nunito"; ctx.letterSpacing = "10px"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = PAL.ink; ctx.globalAlpha = 0.85;
  ctx.fillText("twenty-five minutes", 110, 1650);
  ctx.font = "300 32px Nunito"; ctx.letterSpacing = "6px"; ctx.fillStyle = PAL.wash; ctx.globalAlpha = 1;
  ctx.fillText("sit, and let the time pass", 110, 1716);
  ctx.restore();
  seal(ctx, 925, 1668, 104);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(st.paper, 0, 0, W, H);
  ctx.restore();
}
