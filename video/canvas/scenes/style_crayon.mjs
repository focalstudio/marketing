// Style demo: waxy children's crayon drawing. Thick wobbly outlines, fills made of side-by-side streaks that slop over
// the line, paper tooth showing through the wax, saturated primaries and a scribbled sun. The rabbit and the timer
// (video/canvas/paint.mjs) are the shared demo subject. Render: `node scripts/gallery.mjs previews --only crayon`.
import { rng, paperGrain } from "../ink.mjs";
import { mix } from "../cel.mjs";
import { LAY, TIMER, TAU, life, rabbit, wobblyPts, speckle } from "../paint.mjs";

export const DURATION = 3, COVER = 1.5;
export const SOUND = { kind: "intro", close: 2.5 };
export const CAPTIONS = [], SCENES = [];

const PAPER = "#fbf5e6", C = { red: "#e8362f", blue: "#2b57c8", sky: "#6fb8f0", yellow: "#ffd21f", orange: "#ff9a1f", green: "#3aa845", grass: "#2b8a3a", ink: "#2b2220" };

export function setup(doc, W, H) {
  return { tooth: speckle(doc, W, H, { seed: 17, color: PAPER, n: 230000, min: 1.2, max: 3.4, alpha: [0.45, 1] }), paper: paperGrain(doc, W, H, 29) };
}

const poly = pts => g => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
const bounds = pts => pts.reduce(([a, b, c, d], [x, y]) => [Math.min(a, x), Math.min(b, y), Math.max(c, x), Math.max(d, y)], [1e9, 1e9, -1e9, -1e9]);
// A rectangle whose edges wander, as a hand colouring a block would leave them.
const sloppyRect = (x0, y0, x1, y1, seed) => {
  const r = rng(seed), out = [];
  const edge = (ax, ay, bx, by) => { const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 70); for (let i = 0; i < n; i++) out.push([ax + ((bx - ax) * i) / n + (r() - 0.5) * 14, ay + ((by - ay) * i) / n + (r() - 0.5) * 14]); };
  edge(x0, y0, x1, y0); edge(x1, y0, x1, y1); edge(x1, y1, x0, y1); edge(x0, y1, x0, y0);
  return out;
};

// Wax colouring: parallel streaks at `angle` across the area, each a little wavy, a little paler or darker, so the paper
// shows in the slits between them.
function colour(ctx, area, color, { angle = 0.5, gap = 9, w = 9.5, seed = 1, alpha = 0.9 } = {}) {
  const r = rng(seed), [x0, y0, x1, y1] = bounds(area), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  ctx.save();
  poly(area)(ctx);
  ctx.clip();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let o = -R; o <= R; o += gap * (0.85 + 0.3 * r())) {
    ctx.strokeStyle = mix(color, r() < 0.5 ? "#ffffff" : "#000000", r() * 0.14);
    ctx.globalAlpha = alpha * (0.8 + 0.2 * r());
    ctx.lineWidth = w * (0.8 + 0.4 * r());
    ctx.beginPath();
    for (let s = -R; s <= R; s += 45) {
      const j = (r() - 0.5) * 4, x = cx - dy * o + dx * s - dy * j, y = cy + dx * o + dy * s + dx * j;
      s === -R ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// A crayon line through pts: uneven width and pressure, jittered, drawn twice with the second pass a little off, and
// overshooting where it closes.
function line(ctx, pts, { w = 11, color = C.ink, seed = 1, closed = true, passes = 2, jit = 2.4, alpha = 0.92 } = {}) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  for (let p = 0; p < passes; p++) {
    const r = rng(seed * 31 + p), n = pts.length, from = closed ? Math.floor(r() * n) : 0, count = closed ? n + 3 : n - 1, ox = (r() - 0.5) * 5, oy = (r() - 0.5) * 5;
    for (let i = 0; i < count; i++) {
      const a = pts[(from + i) % n], b = pts[(from + i + 1) % n];
      ctx.globalAlpha = alpha * (0.78 + 0.22 * r());
      ctx.lineWidth = w * (p ? 0.65 : 1) * (0.7 + 0.5 * r());
      ctx.beginPath();
      ctx.moveTo(a[0] + ox + (r() - 0.5) * jit, a[1] + oy + (r() - 0.5) * jit);
      ctx.lineTo(b[0] + ox + (r() - 0.5) * jit, b[1] + oy + (r() - 0.5) * jit);
      ctx.stroke();
    }
  }
  ctx.restore();
}

const blob = (cx, cy, rx, ry, rot, seed, amp = 0.035) => wobblyPts(cx, cy, rx, ry, rot, { seed, amp, n: 44 });
// One drawn-and-coloured shape: wax fill clipped to a sloppier copy of the outline, then the outline itself.
function shape(ctx, g, color, seed, { outline = C.ink, w = 11, angle = 0.5, fillAlpha = 0.92 } = {}) {
  if (color) colour(ctx, blob(g.cx + 2, g.cy + 3, g.rx * 1.03, g.ry * 1.03, g.rot || 0, seed + 1, 0.05), color, { angle, seed, alpha: fillAlpha, gap: 8.5, w: 9.5 });
  line(ctx, blob(g.cx, g.cy, g.rx, g.ry, g.rot || 0, seed), { w, color: outline, seed });
}
// Scribble: a zigzag of back-and-forth strokes inside a circle.
function scribble(ctx, cx, cy, rad, color, seed, { n = 26, w = 8 } = {}) {
  const r = rng(seed);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * rad;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

export function draw(ctx, t, W, H, st) {
  const k = W / 1080, L = life(t), R = rabbit(t, L), r = rng(53), { tx, ty, tr, ground } = LAY;
  ctx.save();
  ctx.scale(k, k);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, 1080, 1920);

  // sky: a strip of blue colouring at the top, then the sun and a looped cloud
  const sky = sloppyRect(40, 40, 1040, 420, 3);
  colour(ctx, sky, C.sky, { angle: 0.12, seed: 4, gap: 8, w: 9.5 });
  colour(ctx, sky.map(([x, y]) => [x, y * 0.6 + 20]), "#3d93e0", { angle: -0.1, seed: 5, gap: 14, w: 7, alpha: 0.5 });
  const sun = blob(850, 245, 100, 98, 0, 6, 0.04);
  colour(ctx, sun, C.yellow, { angle: 0.7, seed: 7, gap: 8, w: 9 });
  scribble(ctx, 850, 245, 78, C.orange, 8, { n: 30, w: 7 });
  line(ctx, sun, { w: 9, color: C.orange, seed: 9 });
  for (let i = 0; i < 11; i++) {  // rays, a little different each time
    const a = (i / 11) * TAU + 0.2 + 0.05 * Math.sin(t * 2 + i), l0 = 125, l1 = 165 + (i % 3) * 14;
    line(ctx, [[850 + Math.cos(a) * l0, 245 + Math.sin(a) * l0], [850 + Math.cos(a) * l1, 245 + Math.sin(a) * l1]], { w: 12, color: i % 2 ? C.orange : C.yellow, seed: 10 + i, closed: false, passes: 1, jit: 3 });
  }
  const cloud = [[0, 0, 62], [78, -20, 52], [-70, 12, 46], [140, 14, 44]];
  cloud.forEach(([dx, dy, rad], i) => line(ctx, wobblyPts(190 + dx + 50 * t, 280 + dy, rad, rad * 0.85, 0, { seed: 20 + i, amp: 0.04, n: 30 }).filter((p, j, a) => Math.sin((j / a.length) * TAU - 1.5) < 0.9), { w: 8, color: C.blue, seed: 20 + i, closed: false, passes: 1 }));

  // meadow: green colouring in two directions, the horizon a ragged crayon edge
  const meadow = sloppyRect(30, ground, 1050, 1890, 11);
  colour(ctx, meadow, C.green, { angle: 0.25, seed: 12, gap: 9, w: 10 });
  colour(ctx, meadow, C.grass, { angle: -0.35, seed: 13, gap: 22, w: 8, alpha: 0.55 });
  for (let i = 0; i < 40; i++) {
    const x = 50 + r() * 980, y = ground + 6 + r() * 520, h = 22 + r() * 24;
    line(ctx, [[x, y], [x + (r() - 0.5) * 16, y - h]], { w: 6, color: C.grass, seed: 100 + i, closed: false, passes: 1, jit: 2 });
  }
  [[140, 1530, C.red], [930, 1640, C.yellow], [260, 1760, C.yellow], [760, 1800, C.red]].forEach(([x, y, c], i) => {  // flowers
    line(ctx, [[x, y + 20], [x + 6, y + 110]], { w: 7, color: C.grass, seed: 200 + i, closed: false, passes: 1 });
    for (let p = 0; p < 5; p++) { const a = (p / 5) * TAU + i; shape(ctx, { cx: x + Math.cos(a) * 32, cy: y + Math.sin(a) * 32, rx: 21, ry: 21 }, c, 210 + i * 7 + p, { w: 6, angle: 0.3, outline: c === C.red ? "#a01e1a" : C.orange }); }
    shape(ctx, { cx: x, cy: y, rx: 20, ry: 20 }, c === C.red ? C.yellow : C.orange, 230 + i, { w: 6, outline: C.orange });
  });

  // the rabbit: a scribbled shadow, blue wax, red inner ears, thick dark outlines
  const sh = R.shadow;
  scribble(ctx, sh.x, sh.y, sh.rx * 0.9, C.grass, 61, { n: 22, w: 6 });
  for (const p of R.parts) {
    const tail = p.id === "tail";
    shape(ctx, p, tail ? "#cfe4fb" : C.blue, 300 + p.id.length * 13 + (Math.round(p.cx) % 7), { angle: tail ? 0.2 : 0.9 });
    if (p.inner) shape(ctx, p.inner, C.red, 340 + p.id.length, { w: 5, angle: 1.2, outline: C.red });
  }
  shape(ctx, { cx: R.cheek.x, cy: R.cheek.y, rx: R.cheek.r, ry: R.cheek.r * 0.8 }, C.red, 351, { w: 4, outline: C.red, angle: 0.4 });
  if (R.blink > 0.5) line(ctx, [[R.eye.x - 14, R.eye.y - 2], [R.eye.x, R.eye.y + 5], [R.eye.x + 14, R.eye.y - 2]], { w: 7, color: C.ink, seed: 352, closed: false, passes: 1 });
  else { shape(ctx, { cx: R.eye.x, cy: R.eye.y, rx: R.eye.r * 1.1, ry: R.eye.r * (1.1 - 0.7 * R.blink) }, C.ink, 353, { w: 5, outline: C.ink }); }
  shape(ctx, { cx: R.nose.x, cy: R.nose.y, rx: R.nose.r, ry: R.nose.r * 0.8 }, C.red, 354, { w: 5, outline: C.ink });
  [-12, 6, 24].forEach((dy, i) => line(ctx, [[R.nose.x + 8, R.nose.y + dy * 0.5], [R.nose.x + 64, R.nose.y + dy * 1.4 - 8]], { w: 4, color: C.ink, seed: 360 + i, closed: false, passes: 1, jit: 1.6 }));

  // the timer: red wax dial, a blank paper face, a yellow ring that fills, digits in dark wax
  [-82, 82].forEach((dx, i) => shape(ctx, { cx: tx + dx, cy: ty + tr + 8, rx: 30, ry: 22 }, C.red, 400 + i, { w: 9, angle: 0.3 }));
  shape(ctx, { cx: tx, cy: ty - tr - 18, rx: 32, ry: 24 }, C.yellow, 403, { w: 9 });
  shape(ctx, { cx: tx, cy: ty, rx: tr, ry: tr * 0.99 }, C.red, 404, { w: 12, angle: -0.5 });
  const face = blob(tx, ty, tr * 0.8, tr * 0.8, 0, 405, 0.03);
  ctx.fillStyle = PAPER;
  poly(face)(ctx);
  ctx.fill();
  line(ctx, face, { w: 8, color: C.ink, seed: 406 });
  const arc = [];
  for (let i = 0; i <= 40; i++) { const a = -TAU / 4 + (L.ring * TAU * i) / 40; arc.push([tx + Math.cos(a) * tr * 0.9, ty + Math.sin(a) * tr * 0.9]); }
  line(ctx, arc, { w: 22, color: C.yellow, seed: 407, closed: false, passes: 2, jit: 3, alpha: 1 });
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle = C.ink;
  ctx.font = "900 112px Nunito";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.95;
  ctx.fillText(TIMER, tx, ty + 8);
  ctx.globalAlpha = 0.6;
  ctx.strokeText(TIMER, tx + 2, ty + 10);
  ctx.restore();

  // the paper's tooth shows through the wax everywhere, plus a few fibres
  ctx.drawImage(st.tooth, 0, 0, 1080, 1920);
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.5;
  ctx.drawImage(st.paper, 0, 0, 1080, 1920);
  ctx.restore();
}
