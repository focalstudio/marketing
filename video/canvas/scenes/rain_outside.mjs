// The life of a raindrop, drawn as a naturalist engraving. One drop, followed by the camera: resting on the window
// (the hook), born in a cloud, falling past the roof onto a leaf, running down the glass past a quiet desk, dripping off
// the sill into a puddle, then the sun. Every frame is a pure function of t; see rain_outside.md for the prompt.
import { INK, PAPER, rng, clamp, prog, easeOut, easeIo, lerp, boil, pen, ellipsePts, tracePath, hatch, wash, dashes,
  paperGrain, ruler, caption, lightBands, teardropPts, pointAngle } from "../ink.mjs";

export const DURATION = 30.5, COVER = 0.6;
export const SOUND = { beats: [11.8, 13.7, 21.45], rumble: 6.2, easeFrom: 24 };
export const SCENES = [
  { name: "glass", from: 0, to: 3.6, ruler: "5 mm" },
  { name: "cloud", from: 3.2, to: 8.6, ruler: "1 km" },
  { name: "fall", from: 8.2, to: 13.8, ruler: "10 cm" },
  { name: "window", from: 13.4, to: 20.0, ruler: "10 cm" },
  { name: "puddle", from: 19.4, to: 30.5, ruler: "50 cm" },
];
export const CAPTIONS = [
  { from: 0, to: 3.1, lines: ["You don't have to do", "anything for 30 seconds."] },
  { from: 3.9, to: 7.7, lines: ["It's raining outside."] },
  { from: 14.6, to: 18.6, lines: ["Your phone can wait."] },
  { from: 22.0, to: 25.4, lines: ["Just focus on", "what matters."], y: 0.27 },
];
export const END = { from: 26.4, title: "WildFocus", line: "25 minutes. Phone down." };
const PAN = 0.7;  // seconds the camera takes to pan between glass->cloud (up) and window->puddle (down)

const SKY = "#93a6ae", SKY_DEEP = "#5f7480", LEAF = "#7f9b5b", LEAF_DEEP = "#4d6838", WOOD = "#b48759", CLAY = "#c4714a";
const IRID = ["#e46fb0", "#5ec8d8", "#e8c94a", "#8fd07a"];

export function setup(doc, W, H, { icon }) {
  const off = (draw) => {
    const c = doc.createElement("canvas");
    c.width = W;
    c.height = H;
    draw(c.getContext("2d"));
    return c;
  };
  return { grain: paperGrain(doc, W, H), icon, garden: off(g => garden(g, W, H)), room: off(g => room(g, W, H)) };
}

export function draw(ctx, t, W, H, st) {
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  const pan = (at, dir) => easeIo(prog(t, at, at + PAN)) * H * dir;  // dir +1: camera rises (world moves down)
  if (t < 3.2 + PAN) layer(ctx, () => glass(ctx, t, W, H, st), pan(3.2, 1));
  if (t >= 3.2 && t < 8.6) layer(ctx, () => cloud(ctx, t, W, H), pan(3.2, 1) - H, prog(t, 8.2, 8.6) ? 1 - prog(t, 8.2, 8.6) : 1);
  if (t >= 8.2 && t < 13.8) layer(ctx, () => fall(ctx, t, W, H, st), 0, Math.min(prog(t, 8.2, 8.6), 1 - prog(t, 13.5, 13.8)));
  if (t >= 13.5 && t < 19.4 + PAN) layer(ctx, () => windowPane(ctx, t, W, H, st), -pan(19.4, 1), Math.max(prog(t, 13.5, 13.62), t > 13.8 ? 1 : 0));
  if (t >= 19.4) layer(ctx, () => puddle(ctx, t, W, H), H - pan(19.4, 1));
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(st.grain, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  const sc = [...SCENES].reverse().find(s => t >= s.from + (s.name === "glass" ? 0 : 0.4)) || SCENES[0];
  const into = s => (s.name === "glass" ? 1 : clamp((t - s.from - 0.4) / 0.5));
  const endFade = prog(t, END.from - 0.6, END.from);
  ruler(ctx, H, sc.name === "puddle" && t > 25 ? "1 m" : sc.ruler, { alpha: 0.6 * into(sc) * (1 - endFade) });
  for (const c of CAPTIONS) {
    if (t < c.from || t >= c.to) continue;
    const a = (c.from === 0 ? 1 : prog(t, c.from, c.from + 0.35)) * (1 - prog(t, c.to - 0.35, c.to));
    caption(ctx, W, H * (c.y ?? 0.145), c.lines, { size: 66, alpha: a });
  }
  if (t >= END.from) endCard(ctx, t, W, H, st);
  ctx.restore();
}

function layer(ctx, fn, dy = 0, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(0, dy);
  ctx.globalAlpha = alpha;
  fn();
  ctx.restore();
}

// --- shared pieces ---------------------------------------------------------------------------------------------------

// A water drop: refracted inside (optional `inner` painter), dark rim, caustic, window highlight, oil-sheen contours, ink.
function drop(ctx, x, y, r, { t = 0, seed = 1, inner, irid = true, w = 2.4, tip = 0.4, angle = 0 } = {}) {
  const pts = teardropPts(x, y, r, { tip, angle, n: 60 });
  ctx.save();
  tracePath(ctx, pts);
  ctx.clip();
  if (inner) inner(ctx);
  else {
    const g = ctx.createLinearGradient(x, y - r, x, y + r);
    g.addColorStop(0, "rgba(120,140,150,0.25)");
    g.addColorStop(1, "rgba(200,215,220,0.5)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2.4);
  }
  const rim = ctx.createRadialGradient(x, y, r * 0.55, x, y, r * 1.08);
  rim.addColorStop(0, "rgba(40,50,55,0)");
  rim.addColorStop(1, "rgba(35,45,52,0.6)");
  ctx.fillStyle = rim;
  ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.6);
  if (r > 30) {  // engraved shading: the dark lower-left of the lens, hatched and cross-hatched
    const crescent = c => { c.beginPath(); c.ellipse(x - r * 0.25, y + r * 0.1, r * 0.95, r * 1.05, 0, 0, Math.PI * 2); c.ellipse(x + r * 0.1, y - r * 0.12, r * 0.92, r * 0.95, 0, 0, Math.PI * 2, true); };
    const box = [x - r, y - r, x + r, y + r * 1.2], g = Math.max(3, r / 40);
    hatch(ctx, crescent, { box, angle: -0.75, gap: g, w: Math.max(0.8, r / 220), alpha: 0.55, seed: seed + 11 });
    hatch(ctx, crescent, { box, angle: 0.75, gap: g * 1.6, w: Math.max(0.7, r / 260), alpha: 0.35, seed: seed + 12 });
    for (let i = 1; i <= 3; i++) {  // contour lines following the curve of the lens
      const k = 1 - i * 0.07;
      pen(ctx, ellipsePts(x, y + r * 0.04 * i, r * k, r * k * 0.92, 50, 0, 0.35, Math.PI - 0.2), { w: Math.max(0.8, r / 260), jit: 0.5, alpha: 0.45, seed: seed + 20 + i });
    }
  }
  ctx.filter = `blur(${Math.max(1, r * 0.05)}px)`;
  ctx.fillStyle = "rgba(255,252,240,0.55)";
  ctx.beginPath();
  ctx.ellipse(x + r * 0.08, y + r * 0.62, r * 0.55, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.filter = "none";
  if (irid && r > 18) {
    IRID.forEach((c, i) => {
      const k = 0.62 + i * 0.07;
      pen(ctx, ellipsePts(x + r * 0.05, y + r * 0.04, r * k, r * k * 0.86, 48, 0.3, 3.4 + i * 0.2, 5.6 + i * 0.3), { w: 1.1, jit: 0.6, color: c, alpha: 0.55, seed: seed + i });
    });
  }
  ctx.restore();
  // the window, reflected small and curved in the top-left
  ctx.save();
  ctx.fillStyle = "rgba(255,253,245,0.92)";
  const hx = x - r * 0.5, hy = y - r * 0.58, hw = r * 0.26, hh = r * 0.2;
  if (r > 26) {
    ctx.translate(hx + hw / 2, hy + hh / 2);
    ctx.rotate(-0.35);
    for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      ctx.beginPath();
      ctx.roundRect(-hw / 2 + ox * hw * 0.55, -hh / 2 + oy * hh * 0.56, hw * 0.45, hh * 0.44, r * 0.02);
      ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.ellipse(hx + r * 0.1, hy + r * 0.1, r * 0.2, r * 0.13, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  pen(ctx, pts, { w, jit: Math.min(1.4, r * 0.05), seed: boil(t, seed) });
  if (r > 30) pen(ctx, pts.slice(8, 34), { w: w * 1.8, jit: 0.8, seed: boil(t, seed + 1), alpha: 0.8 });  // heavier line on the shadow side
}

// Small static drops scattered on glass.
function beads(ctx, W, H, n, seed, t, { skip = () => false, minR = 5, maxR = 26 } = {}) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H, rr = minR + r() ** 2.4 * (maxR - minR);
    if (!skip(x, y, rr, i)) drop(ctx, x, y, rr, { t, seed: seed + i, w: rr > 12 ? 1.8 : 1.2, irid: rr > 20, tip: 0.25 + (i % 3) * 0.1 });
  }
}

function puff(ctx, x, y, r, seed, { tone = SKY, under = 0.7 } = {}) {
  const shape = c => {
    c.beginPath();
    c.ellipse(x, y, r, r * 0.78, 0, 0, Math.PI * 2);
  };
  wash(ctx, shape, { color: tone, alpha: 0.42, blur: r * 0.06 });
  hatch(ctx, c => {
    c.beginPath();
    c.ellipse(x + r * 0.08, y + r * 0.35, r * 0.95, r * 0.5, 0, 0, Math.PI * 2);
  }, { box: [x - r, y - r * 0.2, x + r, y + r], angle: -0.65, gap: 8, w: 1.1, alpha: 0.5 * under, seed });
  pen(ctx, ellipsePts(x, y, r, r * 0.78, 40, 0, Math.PI * 1.08, Math.PI * 1.95), { w: 2, jit: 1.6, seed, alpha: 0.85 });
}

// --- the drop on the window ----------------------------------------------------------------------------------

function garden(g, W, H) {
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#c9d3d2");
  sky.addColorStop(0.5, "#dfe2d8");
  sky.addColorStop(1, "#cfcdb5");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  const r = rng(5);
  g.fillStyle = "#b4ad86";  // lawn
  g.fillRect(0, H * 0.58, W, H * 0.42);
  dashes(g, c => c.rect(0, H * 0.58, W, H * 0.42), { box: [0, H * 0.58, W, H], n: 2600, len: 18, angle: -1.45, color: "#5d6b3c", alpha: 0.45, w: 1.4, seed: 8 });
  for (let i = 0; i < 11; i++) {  // trees: trunk, a washed crown, leaf strokes, a hatched shadow side, an ink edge
    const x = (i + 0.2 + r() * 0.6) * (W / 10), y = H * (0.36 + r() * 0.1), rr = 110 + r() * 120;
    g.fillStyle = "#6b5843";
    g.fillRect(x - 10, y + rr * 0.6, 20, H * 0.58 - y - rr * 0.6);
    hatch(g, c => c.rect(x - 10, y + rr * 0.6, 20, H), { box: [x - 10, y, x + 10, H * 0.6], angle: Math.PI / 2, gap: 4, alpha: 0.5, seed: 60 + i });
    const crown = c => { c.beginPath(); c.ellipse(x, y, rr, rr * 1.1, 0, 0, Math.PI * 2); };
    wash(g, crown, { color: i % 3 ? LEAF : LEAF_DEEP, alpha: 0.9, blur: 3 });
    dashes(g, crown, { box: [x - rr, y - rr * 1.1, x + rr, y + rr * 1.1], n: 900, len: 10, angle: -0.8, color: "#2f4224", alpha: 0.5, w: 1.6, seed: 40 + i });
    dashes(g, crown, { box: [x - rr, y - rr * 1.1, x, y], n: 260, len: 8, angle: -0.8, color: "#e7efc9", alpha: 0.45, w: 1.4, seed: 80 + i });
    hatch(g, c => { c.beginPath(); c.ellipse(x + rr * 0.35, y + rr * 0.35, rr * 0.8, rr * 0.8, 0, 0, Math.PI * 2); crown(c); }, { box: [x - rr, y - rr, x + rr, y + rr * 1.2], gap: 6, alpha: 0.45, seed: 100 + i });
    pen(g, ellipsePts(x, y, rr, rr * 1.1, 60), { w: 2.4, jit: 5, seed: 120 + i, alpha: 0.8 });
  }
  for (let i = 0; i < 10; i++) {  // a picket fence
    const x = 20 + i * (W / 9.3), y = H * 0.55, h = H * 0.1;
    g.fillStyle = "#efe8d6";
    g.fillRect(x, y, 30, h);
    hatch(g, c => c.rect(x + 18, y, 12, h), { box: [x, y, x + 30, y + h], angle: Math.PI / 2, gap: 4, alpha: 0.6, seed: 140 + i });
    pen(g, [[x, y + h], [x, y + 8], [x + 15, y - 6], [x + 30, y + 8], [x + 30, y + h]], { w: 2.2, seed: 160 + i });
  }
  g.fillStyle = "#efe8d6";
  g.fillRect(0, H * 0.575, W, 14);
  pen(g, [[0, H * 0.575], [W, H * 0.575]], { w: 2, seed: 180 });
  pen(g, [[0, H * 0.575 + 14], [W, H * 0.575 + 14]], { w: 2, seed: 181 });
}

function glass(ctx, t, W, H, st) {
  const zoom = lerp(1.14, 1, easeOut(prog(t, 0, 3.4)));
  ctx.save();
  ctx.translate(W / 2, H * 0.53);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H * 0.53);
  ctx.save();
  ctx.filter = "blur(6px)";
  ctx.drawImage(st.garden, -40, -40, W + 80, H + 80);
  ctx.restore();
  ctx.fillStyle = "rgba(225,228,222,0.42)";  // the glass, a cool film over the garden
  ctx.fillRect(0, 0, W, H);
  lightBands(ctx, W, H, { alpha: 0.18, color: "rgba(250,240,215,1)" });
  dashes(ctx, c => c.rect(0, 0, W, H), { box: [0, 0, W, H], n: 900, len: 26, angle: 1.4, color: "#fffdf4", alpha: 0.35, w: 1.2, seed: 21 });
  dashes(ctx, c => c.rect(0, 0, W, H), { box: [0, 0, W, H], n: 220, len: 70, angle: 1.47, alpha: 0.14, w: 1, seed: 22 });
  const cx = W / 2, cy = H * 0.53, R = 300 * (W / 1080);
  const tremble = 1 + 0.018 * Math.sin(t * 21) * Math.exp(-t * 0.9);
  // its shadow on the glass, hatched
  hatch(ctx, c => { c.beginPath(); c.ellipse(cx + R * 0.22, cy + R * 0.3, R * 1.02, R * 0.95, 0, 0, Math.PI * 2); }, {
    box: [cx - R, cy - R, cx + R * 1.3, cy + R * 1.4], angle: -0.7, gap: 6, w: 1.1, alpha: 0.45, seed: 31 });
  beads(ctx, W, H, 70, 77, t, { maxR: 44, skip: (x, y, rr) => Math.hypot(x - cx, y - cy) < R + rr + 20 || (y < H * 0.24 && x > 120 && x < W - 120) });
  drop(ctx, cx, cy, R * tremble, { t, seed: 3, w: 3.4, tip: 0.45, inner: c => {
    c.save();
    c.translate(cx, cy);
    c.scale(0.62, -0.62 * tremble);
    c.drawImage(st.garden, -W / 2, -H / 2);
    c.restore();
  } });
  ctx.restore();
}

// --- the cloud ------------------------------------------------------------------------------------------------

function cloud(ctx, t, W, H) {
  const u = t - 3.2;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#c3ccce");
  sky.addColorStop(1, PAPER);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const flash = Math.exp(-(((t - 6.05) / 0.09) ** 2)) + 0.5 * Math.exp(-(((t - 6.3) / 0.07) ** 2));
  const cx = W / 2, cy = H * 0.5, push = lerp(1, 1.3, easeIo(prog(t, 3.2, 8.4)));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(push, push);
  ctx.translate(-cx, -cy);
  const r = rng(12);
  for (let i = 0; i < 26; i++) {  // the cloud mass, back to front
    const x = r() * W * 1.3 - W * 0.15 + Math.sin(u * 0.2 + i) * 12, y = H * (0.18 + r() * 0.7), rr = 160 + r() * 220;
    puff(ctx, x, y, rr, 100 + i, { tone: i % 4 ? SKY : SKY_DEEP, under: 0.6 + r() * 0.5 });
  }
  // droplets drifting in and joining the one in the middle
  const grow = easeOut(prog(t, 3.6, 7.8)), dr = rng(14);
  for (let i = 0; i < 70; i++) {
    const a = dr() * Math.PI * 2, d0 = 120 + dr() * 520, when = 3.6 + dr() * 4.2, rr = 2 + dr() * 5;
    const k = easeIo(prog(t, when - 1.6, when));
    if (t > when) continue;
    const d = d0 * (1 - k);
    drop(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 1.2, rr, { t, seed: 300 + i, w: 1, irid: false, tip: 0.5, angle: pointAngle(Math.cos(a), Math.sin(a)) });
  }
  const fallY = H * 0.6 * easeIo(prog(t, 7.9, 8.6)) ** 2;
  drop(ctx, cx, cy + fallY, lerp(8, 64, grow), { t, seed: 5, w: 2.4, tip: 0.3 + 0.5 * prog(t, 7.9, 8.6) });
  ctx.restore();
  for (let i = 0; i < 4; i++) {  // nearer, darker puffs drifting across
    const x = ((i * 380 + u * 40) % (W + 600)) - 300, y = H * (0.82 + (i % 2) * 0.1);
    puff(ctx, x, y, 260, 200 + i, { tone: SKY_DEEP, under: 1 });
  }
  if (flash > 0.01) {
    ctx.fillStyle = `rgba(255,250,235,${0.45 * flash})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// --- the fall --------------------------------------------------------------------------------------------------

function leafShape(c, L) {
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(L * 0.25, -L * 0.32, L * 0.75, -L * 0.28, L, 0);
  c.bezierCurveTo(L * 0.75, L * 0.26, L * 0.25, L * 0.3, 0, 0);
  c.closePath();
}

function leafPts(L) {  // the outline of leafShape, sampled
  const cub = (p0, p1, p2, p3, u) => (1 - u) ** 3 * p0 + 3 * (1 - u) ** 2 * u * p1 + 3 * (1 - u) * u * u * p2 + u ** 3 * p3;
  const out = [];
  for (let i = 0; i <= 30; i++) out.push([cub(0, L * 0.25, L * 0.75, L, i / 30), cub(0, -L * 0.32, -L * 0.28, 0, i / 30)]);
  for (let i = 0; i <= 30; i++) out.push([cub(L, L * 0.75, L * 0.25, 0, i / 30), cub(0, L * 0.26, L * 0.3, 0, i / 30)]);
  return out;
}

function fall(ctx, t, W, H, st) {
  const u = t - 8.2, k = W / 1080;
  // the camera falls with the drop: world y scrolls up, slowing as the leaf takes the drop
  const scroll = 900 * Math.min(t, 11.8) - 900 * 8.2 + 120 * clamp(t - 11.8, 0, 0.6) + 900 * Math.max(0, t - 12.4);
  ctx.save();  // the garden far below, out of focus, rising slowly
  ctx.filter = "blur(9px)";
  ctx.drawImage(st.garden, -60, H * 0.55 - scroll * 0.12, W + 120, H + 120);
  ctx.restore();
  ctx.fillStyle = "rgba(227,226,214,0.55)";
  ctx.fillRect(0, 0, W, H);
  lightBands(ctx, W, H, { alpha: 0.12, color: "rgba(250,240,215,1)", offset: scroll * 0.05 });
  // cloud underside leaving the top
  const r = rng(40);
  for (let i = 0; i < 8; i++) puff(ctx, r() * W, -200 - scroll * 0.6 + r() * 260, 200 + r() * 140, 400 + i, { tone: SKY_DEEP });
  // rain in three depths
  [[0.5, 0.25, 1, 26], [0.8, 0.45, 1.6, 40], [1.3, 0.7, 2.6, 70]].forEach(([speed, alpha, w, len], j) => {
    const rr = rng(50 + j);
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (let i = 0; i < 70; i++) {
      const x = rr() * W, y = (((rr() * H * 2 - scroll * speed * 0.6) % (H * 1.2)) + H * 1.2) % (H * 1.2) - H * 0.1;
      ctx.moveTo(x, y);
      ctx.lineTo(x + len * 0.1, y + len);
    }
    ctx.stroke();
    ctx.restore();
  });
  // the roof edge: tiles and a gutter, passing on the right
  const roofY = 1700 - scroll;
  if (roofY > -400 && roofY < H + 200) {
    ctx.save();
    ctx.translate(W * 0.58, roofY);
    wash(ctx, c => c.rect(0, -260, W, 260), { color: CLAY, alpha: 0.7, blur: 3 });
    for (let row = 0; row < 4; row++) for (let i = 0; i < 9; i++) {
      pen(ctx, ellipsePts(i * 70 + (row % 2) * 35, -row * 62, 36, 22, 16, 0, 0, Math.PI), { w: 1.8, seed: 500 + row * 10 + i });
    }
    hatch(ctx, c => c.rect(0, -260, W, 260), { box: [0, -260, W, 0], angle: -0.9, gap: 10, alpha: 0.35, seed: 61 });
    ctx.fillStyle = "#8a8d86";
    ctx.fillRect(-10, 0, W, 34);
    pen(ctx, [[-10, 0], [W, 0]], { w: 2.4, seed: 62 });
    pen(ctx, [[-10, 34], [W, 34]], { w: 2.4, seed: 63 });
    ctx.restore();
  }
  // the leaf: it takes the drop at 11.8, sags, then springs back
  // placed so its surface is under the drop (W/2, H*0.4 + its radius) at the hit
  const L = 900 * k, ang0 = -0.22, lx = -60, hit = t - 11.8;
  const leafY = H * 0.4 + 96 * k + (W / 2 - lx) * Math.tan(-ang0) + 0.24 * L + 900 * 3.6 - scroll;
  const bend = hit > 0 ? 0.3 * Math.exp(-hit * 1.6) * Math.cos(hit * 7.5) + 0.05 * Math.exp(-hit) : 0;
  const ang = ang0 + bend;
  ctx.save();
  ctx.translate(lx, leafY);
  ctx.rotate(ang);
  pen(ctx, [[-200, 30], [-120, 18], [0, 0]], { w: 5, seed: 70 });
  wash(ctx, c => leafShape(c, L), { color: LEAF, alpha: 0.85, blur: 3 });
  hatch(ctx, c => leafShape(c, L), { box: [0, 0, L, L * 0.32], angle: 0.9, gap: 7, alpha: 0.55, color: "#2f3d22", seed: 71 });
  dashes(ctx, c => leafShape(c, L), { box: [0, -L * 0.3, L, 0], n: 220, len: 12, angle: -0.4, color: "#f2efd8", alpha: 0.35, seed: 72 });
  pen(ctx, [[0, 0], [L * 0.5, -L * 0.02], [L, 0]], { w: 2.4, seed: boil(t, 73) });
  for (let i = 1; i < 7; i++) {
    const x = (L * i) / 7.2;
    pen(ctx, [[x, 0], [x + 60, -L * 0.17 * Math.sin((Math.PI * i) / 7.2)]], { w: 1.4, seed: 80 + i });
    pen(ctx, [[x, 0], [x + 60, L * 0.17 * Math.sin((Math.PI * i) / 7.2)]], { w: 1.4, seed: 90 + i });
  }
  pen(ctx, leafPts(L), { w: 2.6, seed: boil(t, 74) });
  ctx.restore();
  // splash at the hit
  if (hit > 0 && hit < 0.6) {
    const sr = rng(75);
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * (0.15 + sr() * 0.7), v = 260 + sr() * 300;
      drop(ctx, W / 2 + Math.cos(a) * v * hit, H * 0.4 + Math.sin(a) * v * hit + 900 * hit * hit, 4 + sr() * 6, { t, seed: 600 + i, w: 1, irid: false, tip: 0.6, angle: pointAngle(-Math.cos(a), -(Math.sin(a) + 1800 * hit / v)) });
    }
  }
  // the drop, held by the camera; it slides along the leaf after the hit, and grows as it nears the glass
  const slide = easeIo(prog(t, 11.8, 12.4)) * 260 * k, near = easeIo(prog(t, 12.9, 13.75));
  drop(ctx, W / 2 + slide * (1 - near) + Math.sin(u * 3) * 6, H * 0.4 + near * H * 0.08, lerp(96, 420, near) * k, { t, seed: 5, w: 3, tip: hit > 0 && hit < 0.6 ? 0.35 : lerp(0.75, 0.45, near), angle: hit > 0 && hit < 0.6 ? ang : 0 });
}

// --- down the window ----------------------------------------------------------------------------------------

function room(g, W, H) {
  g.fillStyle = "#e8dcc4";
  g.fillRect(0, 0, W, H);
  hatch(g, c => c.rect(0, 0, W, H * 0.66), { box: [0, 0, W, H * 0.66], angle: Math.PI / 2, gap: 34, alpha: 0.12, broken: 0.05, seed: 1 });
  // desk
  wash(g, c => c.rect(0, H * 0.66, W, H * 0.34), { color: WOOD, alpha: 0.8, blur: 2 });
  for (let i = 0; i < 18; i++) pen(g, [[0, H * 0.68 + i * 30], [W * 0.4, H * 0.685 + i * 30 + 6], [W, H * 0.68 + i * 30]], { w: 1, alpha: 0.35, seed: 10 + i });
  pen(g, [[0, H * 0.66], [W, H * 0.66]], { w: 3, seed: 2 });
  // books
  [[110, "#6d8a96"], [150, "#c9a35a"], [125, "#9b5b4a"]].forEach(([w, col], i) => {
    const y = H * 0.66 - (i + 1) * 46;
    wash(g, c => c.rect(90 + i * 8, y, w * 2.2, 44), { color: col, alpha: 0.85, blur: 1.5 });
    pen(g, [[90 + i * 8, y], [90 + i * 8 + w * 2.2, y], [90 + i * 8 + w * 2.2, y + 44], [90 + i * 8, y + 44], [90 + i * 8, y]], { w: 2, seed: 20 + i });
  });
  // mug
  const mx = W * 0.64, my = H * 0.66;
  wash(g, c => c.rect(mx, my - 190, 160, 190), { color: CLAY, alpha: 0.9, blur: 2 });
  hatch(g, c => c.rect(mx + 100, my - 190, 60, 190), { box: [mx, my - 190, mx + 160, my], angle: 1.3, gap: 6, alpha: 0.5, seed: 30 });
  pen(g, [[mx, my - 190], [mx, my], [mx + 160, my], [mx + 160, my - 190]], { w: 2.6, seed: 31 });
  pen(g, ellipsePts(mx + 80, my - 190, 80, 16, 30), { w: 2.4, seed: 32 });
  pen(g, ellipsePts(mx + 182, my - 110, 36, 48, 24, 0, -Math.PI / 2, Math.PI / 2), { w: 6, seed: 33 });
  // the phone, face-down and dark
  const px = W * 0.2, py = H * 0.75;
  g.save();
  g.translate(px, py);
  g.rotate(-0.12);
  g.fillStyle = "#3a3b3d";
  g.beginPath();
  g.roundRect(0, 0, 330, 160, 30);
  g.fill();
  hatch(g, c => { c.beginPath(); c.roundRect(0, 0, 330, 160, 30); }, { box: [0, 0, 330, 160], gap: 5, color: "#000", alpha: 0.4, seed: 34 });
  pen(g, ellipsePts(270, 50, 24, 24, 20), { w: 2, color: "#8a8b8e", seed: 35 });
  g.restore();
  // a plant
  wash(g, c => c.rect(W * 0.82, H * 0.66 - 130, 120, 130), { color: "#d8c9a5", alpha: 0.9, blur: 1.5 });
  const r = rng(36);
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 1.8, len = 160 + r() * 140;
    g.save();
    g.translate(W * 0.82 + 60, H * 0.66 - 130);
    g.rotate(a);
    wash(g, c => leafShape(c, len), { color: i % 2 ? LEAF : LEAF_DEEP, alpha: 0.85, blur: 1.5 });
    pen(g, [[0, 0], [len, 0]], { w: 1.2, seed: 40 + i });
    g.restore();
  }
}

function heroPath(t, W, H) {  // stick-slip down the glass
  const u = prog(t, 13.75, 19.6);
  const steps = [0, 0.1, 0.12, 0.3, 0.34, 0.55, 0.6, 0.82, 0.85, 1];
  let y = 0;
  for (let i = 1; i < steps.length; i++) y += (i % 2 ? 0.02 : 0.24) * easeIo(clamp((u - steps[i - 1]) / (steps[i] - steps[i - 1])));
  return [W * 0.56 + Math.sin(y * 9) * 34, H * (0.24 + y * 0.9)];
}

function windowPane(ctx, t, W, H, st) {
  ctx.save();
  ctx.filter = "blur(2.5px)";
  ctx.drawImage(st.room, 0, 0);
  ctx.restore();
  // steam off the mug
  for (let j = 0; j < 3; j++) {
    const p = [];
    for (let i = 0; i < 30; i++) {
      const s = i / 29;
      p.push([W * 0.64 + 60 + j * 24 + Math.sin(s * 7 + t * 2.2 + j) * 18 * s, H * 0.66 - 200 - s * 300]);
    }
    pen(ctx, p, { w: 2, alpha: 0.4, color: "#fff", seed: 900 + j });
  }
  ctx.fillStyle = "rgba(200,212,214,0.28)";  // the glass
  ctx.fillRect(0, 0, W, H);
  dashes(ctx, c => c.rect(0, 0, W, H), { box: [0, 0, W, H], n: 180, len: 80, angle: 1.48, alpha: 0.1, seed: 901 });
  const [hx, hy] = heroPath(t, W, H);
  // the trail it leaves: a wet streak and beads
  const trail = [];
  for (let s = 13.75; s <= t; s += 0.05) trail.push(heroPath(s, W, H));
  pen(ctx, trail, { w: 14, alpha: 0.18, color: "#fff", jit: 0, seed: 902 });
  trail.forEach(([x, y], i) => { if (i % 9 === 4 && y < hy - 50) drop(ctx, x + 3, y, 5, { t, seed: 950 + i, w: 1, irid: false, tip: 0.25 }); });
  let grown = 62;
  beads(ctx, W, H, 60, 903, t, { minR: 6, maxR: 40, skip: (x, y, rr, i) => {
    const near = Math.abs(x - (W * 0.56 + Math.sin((y / H - 0.24) / 0.9 * 9) * 34)) < 50 && y > H * 0.24;
    if (near && y < hy) { grown += rr * 0.35; return true; }  // swallowed by the hero on its way down
    return false;
  } });
  if (t >= 13.7) drop(ctx, hx, hy, Math.min(96, grown) * (1 + 0.15 * Math.exp(-(t - 13.7) * 6)), { t, seed: 5, w: 2.6, tip: 0.6 });
  // the splat on impact
  if (t > 13.7 && t < 14.3) {
    const s = rng(904), k = easeOut(prog(t, 13.7, 14.0));
    for (let i = 0; i < 12; i++) {
      const a = s() * Math.PI * 2, d = (50 + s() * 70) * k;
      drop(ctx, W * 0.56 + Math.cos(a) * d, H * 0.24 + Math.sin(a) * d, 3 + s() * 6, { t, seed: 960 + i, w: 1, irid: false, tip: 0.6, angle: pointAngle(-Math.cos(a), -Math.sin(a)) });
    }
  }
  // the window frame
  ctx.fillStyle = "#e9e1cd";
  ctx.fillRect(0, 0, 56, H);
  ctx.fillRect(W - 56, 0, 56, H);
  hatch(ctx, c => { c.rect(0, 0, 56, H); c.rect(W - 56, 0, 56, H); }, { box: [0, 0, W, H], angle: Math.PI / 2, gap: 9, alpha: 0.3, seed: 905 });
  pen(ctx, [[56, 0], [56, H]], { w: 3, seed: 906 });
  pen(ctx, [[W - 56, 0], [W - 56, H]], { w: 3, seed: 907 });
}

// --- the sill, the puddle, the sun ----------------------------------------------------------------------

function puddle(ctx, t, W, H) {
  const sun = easeIo(prog(t, 24.4, 27.4)), k = W / 1080;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#d9dcd2");
  sky.addColorStop(1, "#cdc6b0");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // wet earth, then flagstones: irregular quads in perspective, washed, hatched, inked
  ctx.fillStyle = "#8f8670";
  ctx.fillRect(0, H * 0.4, W, H * 0.6);
  dashes(ctx, c => c.rect(0, H * 0.4, W, H * 0.6), { box: [0, H * 0.4, W, H], n: 1400, len: 6, angle: 0.2, color: "#3b342a", alpha: 0.5, w: 1.6, seed: 999 });
  const r = rng(1000);
  for (let row = 0; row < 6; row++) {
    const y0 = H * 0.42 + row * row * 9 + row * H * 0.06, h = H * 0.05 + row * 22;
    for (let i = -1; i < 4; i++) {
      const w = W / 2.9, x = i * w + (row % 2) * w * 0.5 + r() * 18;
      const q = [[x + 10 + r() * 14, y0 + 8 + r() * 8], [x + w - 10 - r() * 14, y0 + 8 + r() * 8], [x + w - 6 - r() * 10, y0 + h - r() * 8], [x + 6 + r() * 10, y0 + h - r() * 8]];
      const shape = c => tracePath(c, q);
      wash(ctx, shape, { color: (row + i) % 3 ? "#b9b29c" : "#a59f8a", alpha: 0.95, blur: 1.5 });
      hatch(ctx, shape, { box: [x, y0, x + w, y0 + h], angle: -0.5, gap: 7, alpha: 0.3, seed: 1100 + row * 5 + i });
      dashes(ctx, shape, { box: [x, y0, x + w, y0 + h], n: 60, len: 5, angle: 0.1, color: "#fff", alpha: 0.35, seed: 1150 + row * 5 + i });
      pen(ctx, [...q, q[0]], { w: 2, alpha: 0.85, jit: 1.5, seed: 1200 + row * 5 + i });
    }
  }
  // the puddle: sky above it, then blue and bright when the sun comes
  const px = W / 2, py = H * 0.7, prx = 430 * k, pry = 150 * k;
  const pshape = c => { c.beginPath(); c.ellipse(px, py, prx, pry, 0, 0, Math.PI * 2); };
  wash(ctx, pshape, { color: sun > 0 ? `rgb(${lerp(140, 120, sun)},${lerp(156, 168, sun)},${lerp(162, 196, sun)})` : "#8c9ca2", alpha: 0.9, blur: 4 });
  ctx.save();
  pshape(ctx);
  ctx.clip();
  ctx.fillStyle = "rgba(60,48,36,0.55)";  // the sill, reflected
  ctx.fillRect(px - prx, py - pry, prx * 2, pry * 0.35);
  hatch(ctx, pshape, { box: [px - prx, py - pry, px + prx, py + pry], angle: 0, gap: 11, alpha: 0.25, seed: 1300 });
  // ripples: the hero at 21.45, rain easing off until 25
  const rings = [[21.45, px, py - 10, 1.6]];
  const rr = rng(1301);
  for (let i = 0; i < 40; i++) {
    const at = 19.4 + rr() * 5.6 * rr(), x = px + (rr() - 0.5) * prx * 1.7, y = py + (rr() - 0.5) * pry * 1.5;
    rings.push([at, x, y, 0.5 + rr() * 0.5]);
  }
  for (const [at, x, y, size] of rings) {
    const age = t - at;
    if (age < 0 || age > 2.8) continue;
    for (let j = 0; j < 3; j++) {
      const rad = (age * 120 - j * 26) * size * k;
      if (rad <= 0) continue;
      const a = (1 - age / 2.8) * (j === 0 ? 1 : 0.6);
      pen(ctx, ellipsePts(x, y, rad, rad * 0.32, 48), { w: 1.6, alpha: a, jit: 0.6, seed: 1400 + j });
      pen(ctx, ellipsePts(x, y, rad * 0.94, rad * 0.3, 48), { w: 1, alpha: a * 0.7, color: IRID[j], jit: 0.4, seed: 1410 + j });
    }
  }
  ctx.restore();
  pen(ctx, ellipsePts(px, py, prx, pry, 90), { w: 2.8, seed: boil(t, 1302) });
  // falling rain, thinning as it stops
  const rain = 1 - prog(t, 22.5, 25.5), fr = rng(1500);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.4 * rain;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < 60; i++) {
    const x = fr() * W, y = ((fr() * H + t * 1400) % (H * 1.1)) - H * 0.05;
    ctx.moveTo(x, y);
    ctx.lineTo(x + 4, y + 46);
  }
  ctx.stroke();
  ctx.restore();
  // the sill at the top, with the drop hanging, swelling and letting go at 21
  const sy = H * 0.2;
  wash(ctx, c => c.rect(0, sy - 120, W, 120), { color: WOOD, alpha: 0.9, blur: 2 });
  hatch(ctx, c => c.rect(0, sy - 120, W, 120), { box: [0, sy - 120, W, sy], angle: 0.02, gap: 9, alpha: 0.5, seed: 1600 });
  pen(ctx, [[0, sy], [W, sy]], { w: 3.2, seed: boil(t, 1601) });
  const hang = easeIo(prog(t, 19.6, 20.95)), drip = prog(t, 20.95, 21.45);
  if (t < 21.45) {
    const dy = sy + 30 + hang * 30 + drip * drip * (py - sy - 40);
    drop(ctx, W / 2, dy, lerp(40, 70, hang) * k, { t, seed: 5, w: 2.4, tip: drip > 0 ? 0.8 : lerp(0.4, 1.3, hang) });
  }
  // the sun: bands of light, warmth, steam rising off the puddle
  if (sun > 0) {
    lightBands(ctx, W, H, { alpha: 0.4 * sun, offset: (t - 24.4) * 30 });
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgba(250,226,170,${0.35 * sun})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    for (let j = 0; j < 7; j++) {
      const p = [], x0 = px + (j - 3) * 110 * k, rise = prog(t, 25.6 + j * 0.25, 30.5);
      for (let i = 0; i < 26; i++) {
        const s = i / 25;
        p.push([x0 + Math.sin(s * 6 + t * 1.6 + j) * 22 * s, py - s * 420 * rise]);
      }
      if (rise > 0) pen(ctx, p, { w: 2, alpha: 0.45 * sun, color: "#fffaf0", jit: 0.5, seed: 1700 + j });
    }
  }
}

function endCard(ctx, t, W, H, st) {
  const a = easeOut(prog(t, END.from, END.from + 0.6)), out = prog(t, DURATION - 1.4, DURATION);
  ctx.save();
  ctx.fillStyle = `rgba(239,231,214,${0.55 * a + 0.45 * out})`;
  ctx.fillRect(0, 0, W, H);
  const cy = H * 0.4, s = 210 * (W / 1080);
  if (st.icon) {
    ctx.globalAlpha = a;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(W / 2 - s / 2, cy - s - 40 + (1 - a) * 30, s, s, s * 0.225);
    ctx.clip();
    ctx.drawImage(st.icon, W / 2 - s / 2, cy - s - 40 + (1 - a) * 30, s, s);
    ctx.restore();
  }
  caption(ctx, W, cy + 40, [END.title], { size: 92, alpha: a, weight: 900 });
  caption(ctx, W, cy + 150, [END.line], { size: 50, alpha: prog(t, END.from + 0.4, END.from + 1), weight: 700 });
  ctx.restore();
}
