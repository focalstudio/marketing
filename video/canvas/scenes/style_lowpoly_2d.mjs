// Style demo: low poly in plain canvas 2D. Sky, mountains, meadow and rabbit are built from flat-shaded triangles with no
// outlines: each facet's normal is lit by one fixed upper-left light, plus a little seeded jitter per facet. The 2D sibling
// of the Pillow `lowpoly` style (video/styles/lowpoly.py) and the planned Blender one. The rabbit and the timer
// (video/canvas/paint.mjs) are the shared demo subject. Render: `node scripts/gallery.mjs previews --only lowpoly-2d`.
import { rng, clamp } from "../ink.mjs";
import { mix } from "../cel.mjs";
import { LAY, TIMER, TAU, life, rabbit } from "../paint.mjs";

export const DURATION = 3, COVER = 1.5;
export const SOUND = { kind: "intro", close: 2.5 };
export const CAPTIONS = [], SCENES = [];

const LIGHT = (() => { const v = [-0.5, -0.55, 0.67], l = Math.hypot(...v); return v.map(c => c / l); })();
const SKY = [[0, "#4a5fc1"], [0.4, "#8f8ee0"], [0.78, "#f0a6b8"], [1, "#fbd6a2"]];
const skyAt = u => { for (let i = 1; i < SKY.length; i++) if (u <= SKY[i][0]) return mix(SKY[i - 1][1], SKY[i][1], (u - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0])); return SKY.at(-1)[1]; };

export function setup() { return {}; }

// One flat triangle. A hair of stroke in its own colour closes the anti-aliasing seams between neighbours (it is not an outline).
function facet(ctx, a, b, c, col) {
  ctx.fillStyle = ctx.strokeStyle = col;
  ctx.lineWidth = 1;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(c[0], c[1]);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// How lit a triangle of 3D points [x, y, z] is: its normal (turned to face the viewer) against the fixed light, 0..1.
function lit(a, b, c) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  if (n[2] < 0) n = n.map(x => -x);
  const l = Math.hypot(...n) || 1;
  return clamp((n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / l);
}
const tone = (dark, light, lam, jit, r) => mix(dark, light, clamp(0.12 + 0.95 * lam + (r() - 0.5) * jit));
function paintTris(ctx, tris, dark, light, seed, jit = 0.14) {
  const r = rng(seed);
  for (const [a, b, c] of tris) facet(ctx, a, b, c, tone(dark, light, lit(a, b, c), jit, r));
}

// A dome of triangles over an ellipse (centre fan, a mid ring, an outer ring, all jittered): bulging toward the viewer, so
// the facets turn from lit (upper left) to dark (lower right).
function dome(cx, cy, rx, ry, rot, { seed = 1, n = 12, depth = 0.9 } = {}) {
  const r = rng(seed), c = Math.cos(rot), s = Math.sin(rot), zs = depth * Math.min(rx, ry);
  const V = (u, v, rad) => { const x = u * rx, y = v * ry; return [cx + x * c - y * s, cy + x * s + y * c, zs * Math.sqrt(Math.max(0, 1 - rad * rad))]; };
  const outer = [], mid = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (r() - 0.5) * 0.25, k = 1 + (r() - 0.5) * 0.08, a2 = ((i + 0.5) / n) * TAU + (r() - 0.5) * 0.25, q = 0.6 + (r() - 0.5) * 0.15;
    outer.push(V(Math.cos(a) * k, Math.sin(a) * k, 1));
    mid.push(V(Math.cos(a2) * q, Math.sin(a2) * q, q));
  }
  const mid0 = V((r() - 0.5) * 0.1, (r() - 0.5) * 0.1, 0), out = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    out.push([mid0, mid[i], mid[j]], [outer[i], outer[j], mid[i]], [mid[i], mid[j], outer[j]]);
  }
  return out;
}

// A jittered grid of vertices triangulated into facets; z comes from height(x, y).
function grid(x0, y0, x1, y1, cols, rows, { seed = 1, jit = 0.3, height = () => 0 } = {}) {
  const r = rng(seed), dx = (x1 - x0) / cols, dy = (y1 - y0) / rows, V = [];
  for (let j = 0; j <= rows; j++) {
    V.push([]);
    for (let i = 0; i <= cols; i++) {
      const x = x0 + i * dx + (r() - 0.5) * dx * jit * 2, y = y0 + j * dy + (r() - 0.5) * dy * jit * 2;
      V[j].push([x, y, height(x, y)]);
    }
  }
  const out = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = V[j][i], b = V[j][i + 1], c = V[j + 1][i], d = V[j + 1][i + 1];
    out.push(r() < 0.5 ? [[a, b, c], [b, d, c]] : [[a, b, d], [a, d, c]]);
  }
  return out.flat();
}

// A peaked mountain from 7 facets: lit on its left, shaded on its right, jittered per facet.
function mountain(ctx, cx, baseY, w, h, seed, dark, light) {
  const r = rng(seed), j = () => (r() - 0.5) * w * 0.06;
  const P = [cx + j(), baseY - h], A = [cx - w / 2, baseY], B = [cx + w / 2, baseY], D1 = [cx - w * 0.12, baseY], D2 = [cx + w * 0.1, baseY];
  const L = [cx - w * 0.22 + j(), baseY - h * 0.45], Rr = [cx + w * 0.2 + j(), baseY - h * 0.42], M = [cx - w * 0.02 + j(), baseY - h * 0.3];
  for (const [a, b, c] of [[P, L, M], [P, M, Rr], [L, A, D1], [L, D1, M], [M, D1, D2], [M, D2, Rr], [Rr, D2, B]]) {
    const lam = 0.62 - (((a[0] + b[0] + c[0]) / 3 - P[0]) / w) * 1.6 + (r() - 0.5) * 0.16;
    facet(ctx, a, b, c, mix(dark, light, clamp(lam)));
  }
  facet(ctx, P, L, [P[0] - w * 0.03, P[1] + h * 0.22], mix(light, "#ffffff", 0.7));  // a bright cap
}

export function draw(ctx, t, W, H, st) {
  const k = W / 1080, L = life(t), R = rabbit(t, L), { tx, ty, tr, ground } = LAY;
  ctx.save();
  ctx.scale(k, k);
  ctx.fillStyle = "#8f8ee0";
  ctx.fillRect(0, 0, 1080, 1920);

  // sky: a soft gradient laid in facets, then the sun, stars and drifting low-poly clouds
  const r = rng(5);
  for (const [a, b, c] of grid(-80, -80, 1160, ground + 40, 8, 10, { seed: 3, jit: 0.28 })) {
    const u = clamp(((a[1] + b[1] + c[1]) / 3) / ground), col = skyAt(u);
    facet(ctx, a, b, c, mix(col, r() < 0.5 ? "#ffffff" : "#2a2a6a", r() * 0.07));
  }
  for (const [rad, dark, light, seed] of [[200, "#ffd1a0", "#ffe3b8", 31], [160, "#ffbf80", "#ffe7a8", 32]]) {
    ctx.save();
    ctx.globalAlpha = rad > 180 ? 0.35 : 1;
    paintTris(ctx, dome(830, 300, rad * 0.75, rad * 0.75, 0, { seed, n: 10, depth: 0.15 }), dark, light, seed, 0.1);
    ctx.restore();
  }
  for (let i = 0; i < 16; i++) {  // stars that twinkle
    const x = 40 + r() * 1000, y = 30 + r() * 520, s = 4 + r() * 5, a = clamp(0.5 + 0.5 * Math.sin(t * 4 + i * 1.7)) * (1 - y / 600);
    ctx.globalAlpha = 0.25 + 0.75 * a;
    facet(ctx, [x, y - s * 1.6], [x + s * 0.7, y], [x - s * 0.7, y], "#fff6d8");
    facet(ctx, [x, y + s * 1.6], [x - s * 0.7, y], [x + s * 0.7, y], "#fff6d8");
    ctx.globalAlpha = 1;
  }
  const cloud = (cx, cy, w, seed) => {
    const q = rng(seed), top = [[-w / 2, 0], [-w * 0.3, -w * 0.16], [-w * 0.1, -w * 0.3], [w * 0.12, -w * 0.2], [w * 0.32, -w * 0.28], [w / 2, 0]];
    ctx.globalAlpha = 0.92;
    for (let i = 0; i < top.length - 1; i++) {
      const a = [cx + top[i][0], cy + top[i][1]], b = [cx + top[i + 1][0], cy + top[i + 1][1]], base = [cx + (top[i][0] + top[i + 1][0]) / 2, cy + w * 0.06];
      facet(ctx, a, b, [cx + top[i][0], cy + w * 0.06], mix("#ffffff", "#c9bfee", 0.1 + q() * 0.25));
      facet(ctx, b, [cx + top[i][0], cy + w * 0.06], [cx + top[i + 1][0], cy + w * 0.06], mix("#ffffff", "#c9bfee", 0.25 + q() * 0.3));
      void base;
    }
    ctx.globalAlpha = 1;
  };
  cloud(250 + 50 * t, 420, 300, 8);
  cloud(560 + 30 * t, 640, 220, 9);

  // mountains in two ranges, hazier behind
  [[130, 1330, 620, 560], [500, 1330, 700, 640], [930, 1330, 600, 500]].forEach(([x, y, w, h], i) => mountain(ctx, x, y, w, h, 40 + i, "#9a82c8", "#e2c4e6"));
  [[-10, 1360, 560, 400], [350, 1360, 600, 300], [800, 1360, 640, 360]].forEach(([x, y, w, h], i) => mountain(ctx, x, y, w, h, 50 + i, "#3f6fa0", "#9fd0d8"));

  // meadow: a lumpy facet mesh, lit from the upper left
  paintTris(ctx, grid(-60, ground - 70, 1140, 1990, 8, 6, { seed: 7, jit: 0.2, height: (x, y) => 70 * Math.sin(x * 0.011 + y * 0.007) + 45 * Math.sin(x * 0.02 - y * 0.013 + 1) }), "#2c6b5a", "#b9e27e", 12, 0.12);
  const g = rng(70);
  for (let i = 0; i < 26; i++) {  // grass blades: thin facet pairs
    const x = 30 + g() * 1020, y = ground + 70 + g() * 520, h = 36 + g() * 36, w = 7 + g() * 5;
    facet(ctx, [x - w, y], [x, y - h], [x, y], mix("#5fb06a", "#d6f09a", 0.5 + g() * 0.4));
    facet(ctx, [x, y - h], [x + w, y], [x, y], mix("#2f7f5a", "#7fcf7a", g() * 0.4));
  }
  [[150, 1690, 55], [940, 1600, 42]].forEach(([x, y, s], i) => paintTris(ctx, dome(x, y, s * 1.5, s, 0, { seed: 90 + i, n: 7, depth: 1.1 }), "#6a5f9a", "#d8cfe8", 90 + i, 0.1));  // rocks

  // the rabbit: a faceted shadow, then each part as a lit dome of triangles
  const sh = R.shadow;
  paintTris(ctx, dome(sh.x, sh.y, sh.rx, sh.ry, 0, { seed: 14, n: 9, depth: 0.05 }), "#1d5a3f", mix("#1d5a3f", "#3f8a58", 1 - sh.a), 14, 0.5);
  for (const p of R.parts) {
    const seed = 100 + p.id.length * 11 + (Math.round(p.cx) % 9), tail = p.id === "tail";
    paintTris(ctx, dome(p.cx, p.cy, p.rx, p.ry, p.rot || 0, { seed, n: tail ? 9 : 13, depth: tail ? 1 : 0.85 }), tail ? "#b9b4d6" : "#a2879f", tail ? "#ffffff" : "#ffeede", seed, 0.12);
    if (p.inner) paintTris(ctx, dome(p.inner.cx, p.inner.cy, p.inner.rx, p.inner.ry, p.inner.rot, { seed: seed + 5, n: 9, depth: 0.7 }), "#c4708a", "#ffb7c5", seed + 5, 0.1);
  }
  paintTris(ctx, dome(R.cheek.x, R.cheek.y, R.cheek.r, R.cheek.r * 0.8, 0, { seed: 150, n: 6, depth: 0.5 }), "#e48aa0", "#ffc2cf", 150, 0.1);
  if (R.blink > 0.5) {
    const { x, y, r: e } = R.eye;
    facet(ctx, [x - e * 1.2, y], [x + e * 1.2, y], [x, y + e * 0.6], "#3b2f4a");
    facet(ctx, [x - e * 1.2, y], [x + e * 1.2, y], [x, y - e * 0.25], "#3b2f4a");
  } else {
    paintTris(ctx, dome(R.eye.x, R.eye.y, R.eye.r * 1.1, R.eye.r * (1.2 - 0.8 * R.blink), 0, { seed: 151, n: 6, depth: 1 }), "#1c1630", "#4a3c6a", 151, 0.1);
    facet(ctx, [R.eye.x - 3, R.eye.y - 5], [R.eye.x + 3, R.eye.y - 4], [R.eye.x - 1, R.eye.y], "#ffffff");
  }
  paintTris(ctx, dome(R.nose.x, R.nose.y, R.nose.r, R.nose.r * 0.8, 0, { seed: 152, n: 5, depth: 1 }), "#c4506c", "#ff93aa", 152, 0.1);

  // the timer: a bevelled teal rim of 48 facets (the first stretch in amber is the elapsed ring), a faceted pale face
  const feet = (dx, i) => paintTris(ctx, dome(tx + dx, ty + tr + 8, 32, 24, 0, { seed: 160 + i, n: 7, depth: 1 }), "#0f5f6a", "#4fd0c4", 160 + i, 0.1);
  feet(-82, 0); feet(82, 1);
  paintTris(ctx, dome(tx, ty - tr - 16, 34, 26, 0, { seed: 162, n: 8, depth: 1 }), "#c47a22", "#ffd77a", 162, 0.1);
  const N = 48, rim = [], rj = rng(170), lit0 = Math.round(L.ring * N);
  for (let i = 0; i < N; i++) {
    const a = -TAU / 4 + (i / N) * TAU, q = 1 + (rj() - 0.5) * 0.015;
    rim.push([[tx + Math.cos(a) * tr * q, ty + Math.sin(a) * tr * q, 0], [tx + Math.cos(a) * tr * 0.82, ty + Math.sin(a) * tr * 0.82, 70]]);
  }
  for (let i = 0; i < N; i++) {
    const [o0, i0] = rim[i], [o1, i1] = rim[(i + 1) % N], amber = i < lit0, jr = rng(300 + i);
    const [dk, lt] = amber ? ["#c47a22", "#ffd77a"] : ["#0f5f6a", "#5ae0cf"];
    facet(ctx, o0, o1, i0, tone(dk, lt, lit(o0, o1, i0), 0.1, jr));
    facet(ctx, o1, i1, i0, tone(dk, lt, lit(o1, i1, i0), 0.1, jr));
  }
  paintTris(ctx, dome(tx, ty, tr * 0.82, tr * 0.82, 0, { seed: 180, n: 16, depth: 0.3 }), "#d9c6ea", "#fffaf0", 180, 0.08);
  ctx.fillStyle = "#2b3a6e";
  ctx.font = "900 112px Nunito";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(TIMER, tx, ty + 8);
  ctx.restore();
}
