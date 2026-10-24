// Naturalist-engraving drawing kit for canvas 2D: paper, pen lines, hatching, washes. Browser and Node (pure parts).
// Every random choice comes from rng(seed), so a frame is a pure function of t. Lines "boil" a little: their seed
// changes BOIL times a second, the way a redrawn ink line shifts between drawings.

export const PAPER = "#efe7d6", INK = "#2f2924", BOIL = 6;

export function rng(seed) {  // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const easeOut = x => 1 - (1 - x) ** 3;
export const easeIo = x => x * x * (3 - 2 * x);
export const lerp = (a, b, u) => a + (b - a) * u;
export const boil = (t, seed) => seed * 7919 + Math.floor(t * BOIL);

// A pen stroke through pts: each point nudged by up to `jit` px and the width swelling along the line.
export function pen(ctx, pts, { w = 2, jit = 1.2, color = INK, seed = 1, alpha = 1 } = {}) {
  const r = rng(seed);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineCap = ctx.lineJoin = "round";
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    ctx.lineWidth = w * (0.7 + 0.6 * Math.sin((i / pts.length) * Math.PI) * (0.8 + 0.4 * r()));
    ctx.beginPath();
    ctx.moveTo(x0 + (r() - 0.5) * jit, y0 + (r() - 0.5) * jit);
    ctx.lineTo(x1 + (r() - 0.5) * jit, y1 + (r() - 0.5) * jit);
    ctx.stroke();
  }
  ctx.restore();
}

export function ellipsePts(cx, cy, rx, ry, n = 72, rot = 0, a0 = 0, a1 = Math.PI * 2) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return out;
}

// A water drop's outline: a round belly of radius r centred near (x, y) and a point `tip` radii beyond it (0 is a
// circle). angle 0 puts the point straight up; pointAngle(dx, dy) turns a direction into that angle.
export function teardropPts(x, y, r, { tip = 0.4, angle = 0, n = 72 } = {}) {
  const m = tip * 2.5, raw = [];
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * 2 * i) / n;
    raw.push([Math.sin(a) * Math.abs(Math.sin(a / 2)) ** m, -Math.cos(a)]);
  }
  const wMax = Math.max(...raw.map(([px]) => Math.abs(px))), c = Math.cos(angle), s = Math.sin(angle);
  return raw.map(([px, py]) => {
    const dx = (px / wMax) * r, dy = r - ((1 - py) / 2) * (2 * r + tip * r);
    return [x + dx * c - dy * s, y + dx * s + dy * c];
  });
}

export const pointAngle = (dx, dy) => Math.atan2(dx, -dy);

export function tracePath(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

// Parallel pen lines at `angle` inside the clip set by shape(ctx), broken into dashes with gaps like an engraving.
export function hatch(ctx, shape, { angle = -0.6, gap = 9, w = 1.2, color = INK, alpha = 0.7, seed = 2, box, broken = 0.25 } = {}) {
  const r = rng(seed);
  const [x0, y0, x1, y1] = box;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2;
  ctx.save();
  shape(ctx);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  const dx = Math.cos(angle), dy = Math.sin(angle), nx = -dy, ny = dx;
  ctx.beginPath();
  for (let o = -R; o <= R; o += gap * (0.8 + 0.4 * r())) {
    let s = -R;
    while (s < R) {
      const len = 20 + r() * 90, e = Math.min(R, s + len);
      const px = cx + nx * o, py = cy + ny * o, wob = (r() - 0.5) * 1.5;
      ctx.moveTo(px + dx * s + nx * wob, py + dy * s + ny * wob);
      ctx.lineTo(px + dx * e - nx * wob, py + dy * e - ny * wob);
      s = e + (r() < broken ? 4 + r() * 14 : 0);
    }
  }
  ctx.stroke();
  ctx.restore();
}

// A watercolour wash: a soft blurred fill, a second offset layer, and the darker pooled edge watercolour dries to.
export function wash(ctx, shape, { color, alpha = 0.55, blur = 5, edge = 0.35 } = {}) {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  shape(ctx);
  ctx.fill();
  ctx.globalAlpha = alpha * 0.5;
  ctx.translate(3, 2);
  shape(ctx);
  ctx.fill();
  ctx.filter = `blur(${blur * 0.4}px)`;
  ctx.globalAlpha = edge;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  shape(ctx);
  ctx.stroke();
  ctx.restore();
}

// Short strokes scattered along a direction: the fine "fur" texture on the fly's orange.
export function dashes(ctx, shape, { box, n = 400, len = 14, angle = -1.1, color = INK, alpha = 0.35, w = 1.2, seed = 3 } = {}) {
  const r = rng(seed);
  const [x0, y0, x1, y1] = box;
  ctx.save();
  shape(ctx);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r()), y = lerp(y0, y1, r()), a = angle + (r() - 0.5) * 0.5, l = len * (0.5 + r());
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
  }
  ctx.stroke();
  ctx.restore();
}

// Paper: flat colour, fibres and specks, drawn once into an offscreen canvas and laid over every frame (multiply).
export function paperGrain(doc, W, H, seed = 11) {
  const c = doc.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d"), r = rng(seed);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < (W * H) / 90; i++) {
    g.fillStyle = `rgba(90,70,50,${0.02 + r() * 0.06})`;
    g.fillRect(r() * W, r() * H, 1 + r() * 1.6, 1 + r() * 1.6);
  }
  g.lineWidth = 0.7;
  for (let i = 0; i < 260; i++) {
    const x = r() * W, y = r() * H, a = r() * Math.PI, l = 8 + r() * 30;
    g.strokeStyle = `rgba(120,95,70,${0.05 + r() * 0.08})`;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  return c;
}

// The specimen ruler in the left margin, labelled with the scale of the shot.
export function ruler(ctx, H, label, { alpha = 0.6 } = {}) {
  const x = 46, y0 = H * 0.36, y1 = H * 0.64;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y1);
  for (let i = 0; i <= 10; i++) {
    const y = lerp(y0, y1, i / 10), l = i % 5 ? 8 : 16;
    ctx.moveTo(x, y);
    ctx.lineTo(x + l, y);
  }
  ctx.stroke();
  ctx.translate(x - 12, (y0 + y1) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = INK;
  ctx.font = "500 24px Nunito";
  ctx.textAlign = "center";
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

// Caption lines in brand ink, on a soft paper halo so they read over any scene.
export function caption(ctx, W, y, lines, { size = 64, alpha = 1, weight = 800 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px Nunito`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((ln, i) => {
    const yy = y + i * size * 1.22;
    ctx.shadowColor = "rgba(239,231,214,0.95)";
    ctx.shadowBlur = 26;
    ctx.fillStyle = INK;
    for (let k = 0; k < 3; k++) ctx.fillText(ln, W / 2, yy);
  });
  ctx.restore();
}

// Diagonal bands of window light, as in the fly video.
export function lightBands(ctx, W, H, { alpha = 0.3, offset = 0, color = "rgba(244,205,110,1)" } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = color;
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.62);
  for (let i = -6; i <= 6; i++) ctx.fillRect(i * 260 + offset, -H, 120, H * 2);
  ctx.restore();
}
