// Shared kit for the "Paper, paint & print" and low-poly demo scenes: the one demo subject (a rabbit sitting beside a big
// 25:00 timer, 1080x1920) as plain geometry, so every style draws the same composition and the stills can be compared.
// Pure helpers, browser and Node. As in ink.mjs every random choice comes from rng(seed), so a frame is a pure function of t.
import { rng, clamp, lerp } from "./ink.mjs";
import { hop, blink, squash } from "./toon.mjs";

export const TAU = Math.PI * 2;
export const TIMER = "25:00";
// Where things sit in a 1080 x 1920 frame: ground line, rabbit (feet) x and scale, timer centre and radius.
export const LAY = { ground: 1350, rx: 350, s: 1.4, tx: 820, ty: 1125, tr: 200 };

const pulse = (t, at, w) => Math.exp(-(((t - at) / w) ** 2));

// The small life in the scene at time t: a breath, a hop at 1.2 s (so t = 1.5 catches it mid-air), blinks, two ear twitches
// (t = 0.5 catches the first) and the timer ring filling a little each second.
export function life(t) {
  return {
    breath: Math.sin(t * TAU * 0.8),
    hop: hop(t, 1.2, 0.6, 90),
    blink: blink(t, [0.95, 2.42]),
    ear: 0.3 * (pulse(t, 0.5, 0.12) + pulse(t, 2, 0.12)) * Math.cos((t - 0.5) * 30),
    ring: 0.1 + 0.12 * t,
  };
}

// The rabbit as ellipses in frame px, back to front: { id, cx, cy, rx, ry, rot }. Ears carry an `inner` ellipse. It sits
// facing right, toward the timer. Also the eye, nose, cheek, blink (0 open .. 1 shut) and the ground shadow.
export function rabbit(t, L = life(t)) {
  const { ground, rx: X, s } = LAY, { sx, sy } = squash(L.hop.v), b = L.breath;
  const P = (x, y) => [X + s * sx * x, ground + L.hop.y + s * sy * (1 + 0.012 * b) * y];
  const E = (id, x, y, rx, ry, rot = 0) => { const [cx, cy] = P(x, y); return { id, cx, cy, rx: rx * s * sx, ry: ry * s * sy, rot }; };
  const head = [70, -300 - 3 * b];
  const ear = (id, bx, by, len, w, ang) => {
    const e = E(id, bx + Math.sin(ang) * len, by - Math.cos(ang) * len, w, len, ang);
    e.inner = { ...e, rx: e.rx * 0.5, ry: e.ry * 0.78 };
    return e;
  };
  const [ex, ey] = P(head[0] + 38, head[1] - 12), [nx, ny] = P(head[0] + 100, head[1] + 12), [cx, cy] = P(head[0] + 22, head[1] + 34);
  const parts = [
    E("tail", -165, -105, 42, 40),
    ear("earB", head[0] - 36, head[1] - 70, 130, 33, -0.2 - L.ear * 0.3),
    ear("earF", head[0] + 32, head[1] - 72, 122, 31, 0.16 + L.ear),
    E("body", -5, -125, 150, 128, -0.08),
    E("haunch", -50, -85, 92, 82),
    E("head", head[0], head[1], 108, 92, 0.05),
    E("paw", 105, -32, 46, 28),
  ];
  const lift = clamp(-L.hop.y / 90);
  return {
    parts, blink: L.blink, k: s,
    eye: { x: ex, y: ey, r: 11 * s }, nose: { x: nx, y: ny, r: 10 * s }, cheek: { x: cx, y: cy, r: 24 * s },
    shadow: { x: X - 10, y: ground + 8, rx: 190 * s * (1 - 0.2 * lift), ry: 22 * s * (1 - 0.2 * lift), a: 1 - 0.4 * lift },
  };
}

// A closed outline of an ellipse whose radius drifts smoothly with the angle (amp is a fraction of the radius): a hand-made,
// slightly lumpy blob. Different seeds give different lumps.
export function wobblyPts(cx, cy, rx, ry, rot = 0, { seed = 1, amp = 0.06, n = 40 } = {}) {
  const r = rng(seed), ph = [r() * TAU, r() * TAU, r() * TAU], c = Math.cos(rot), s = Math.sin(rot), out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, k = 1 + amp * (Math.sin(a * 2 + ph[0]) * 0.6 + Math.sin(a * 3 + ph[1]) * 0.5 + Math.sin(a * 5 + ph[2]) * 0.3);
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}

// A smooth closed path through pts (quadratic curves between midpoints), ready to fill or stroke.
export function smooth(ctx, pts) {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[n - 1], pts[0]);
  ctx.beginPath();
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n]);
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  ctx.closePath();
}

// A transparent W x H canvas of tiny specks (paper fibre, grain, crayon tooth), drawn once in setup and laid over frames.
export function speckle(doc, W, H, { seed = 3, color = "#fff", n = 60000, min = 0.8, max = 2.4, alpha = [0.2, 0.7] } = {}) {
  const c = doc.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d"), r = rng(seed);
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    g.globalAlpha = lerp(alpha[0], alpha[1], r());
    const w = lerp(min, max, r()), h = lerp(min, max, r());
    g.fillRect(r() * W, r() * H, w, h);
  }
  return c;
}
