// Flat, rounded "sticker" characters on white paper, after a playful classroom-mascot look: chunky rounded shapes, bold
// dark outlines, a flat shade block instead of gradients, 3D-lip buttons, one saturated green for progress and headings.
// The pure helpers (squash, hop, blinkTimes, blink) run in Node for tests; the drawing helpers take a ctx. As in ink.mjs
// every random choice comes from rng(seed), so a frame is a pure function of t.
import { rng, clamp, lerp, easeIo } from "./ink.mjs";

export const COLOR = {
  ink: "#3c3c3c", white: "#ffffff", charcoal: "#4b4b4b", pencil: "#777777", faded: "#afafaf", track: "#e5e5e5",
  green: "#58cc02", greenLip: "#58a700", greenHi: "#89e219", mint: "#d7ffb8", blue: "#1cb0f6", blueLip: "#1899d6",
  red: "#ff4b4b", orange: "#ff9600", orangeLip: "#d97f00", yellow: "#ffc800", purple: "#ce82ff",
  pink: "#ff86d0", fur: "#fffaf4", furShade: "#ece3da", belly: "#ffeede", blush: "#ffc2d1", earPink: "#ffb3c6", cream: "#ffe9c9",
};
// Outline width in local units (1080 px wide frames at scale 1). 0 gives the outline-free flat variant.
export const LOOK = { out: 9 };
export const ow = (k = 1) => LOOK.out * k;

export const easeBack = x => { const c = 1.9; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };  // overshoots, then settles

// Squash and stretch that keeps the area: v > 0 is taller and thinner, v < 0 is flatter and wider.
export const squash = v => ({ sx: 1 / (1 + v), sy: 1 + v });

// A hop starting at `at`: crouch (20%), the jump (60%), the landing with a damped wobble. y is the lift in px (negative is
// up) and v the squash value to feed squash(). It is back on the ground, still, once the wobble has died away.
export function hop(t, at, dur, height) {
  const u = (t - at) / dur;
  if (u < 0 || u > 1.8) return { y: 0, v: 0 };
  if (u < 0.2) return { y: 0, v: -0.3 * easeIo(u / 0.2) };
  if (u < 0.8) {
    const w = (u - 0.2) / 0.6;
    return { y: -height * 4 * w * (1 - w), v: 0.32 * Math.abs(Math.cos(Math.PI * w)) };
  }
  const w = u - 0.8;
  return { y: 0, v: -0.34 * Math.exp(-w * 7) * Math.cos(w * 32) };
}

// Blinks come at seeded, uneven gaps; blink(t, times) is how closed the lids are (0 open, 1 shut).
export const BLINK = 0.16;
export function blinkTimes(seed, until = 40) {
  const r = rng(seed), out = [];
  for (let at = 0.9 + r() * 1.4; at < until; at += 2.3 + r() * 2.4) out.push(at);
  return out;
}
export function blink(t, times) {
  for (const b of times) {
    const u = (t - b) / BLINK;
    if (u >= 0 && u <= 1) return 1 - Math.abs(2 * u - 1);
  }
  return 0;
}

// --- shapes --------------------------------------------------------------------------------------------------------------

// Fill a path, lay a flat shade block over it if asked (shade = [colour, cx, cy, rx, ry]: everything outside that ellipse
// is shaded, so a crescent is left on the far side), then give it the thick rounded outline.
export function blob(ctx, fill, build, w = ow(), shade = null) {
  ctx.beginPath();
  build(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  if (shade) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = shade[0];
    ctx.beginPath();
    ctx.rect(-1500, -1500, 3000, 3000);
    ctx.ellipse(shade[1], shade[2], shade[3], shade[4], 0, 0, Math.PI * 2);
    ctx.fill("evenodd");
    ctx.restore();
  }
  if (w) {
    ctx.beginPath();
    build(ctx);
    ctx.lineWidth = w;
    ctx.lineJoin = ctx.lineCap = "round";
    ctx.strokeStyle = COLOR.ink;
    ctx.stroke();
  }
}
export const ell = (cx, cy, rx, ry, rot = 0) => c => c.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
export const pill = (x, y, w, h, r = h / 2) => c => c.roundRect(x, y, w, h, r);

// A 3D-lip surface: a darker band under the face, which sinks into it as `press` goes 0 -> 1. With a border the face is
// outlined in the lip colour (the white secondary-button look).
export function lip(ctx, x, y, w, h, r, { fill, edge, lipH = 10, border = 0, press = 0 } = {}) {
  ctx.save();
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.roundRect(x, y + lipH, w, h, r);
  ctx.fill();
  const dy = lipH * press;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y + dy, w, h, r);
  ctx.fill();
  if (border) {
    ctx.lineWidth = border;
    ctx.strokeStyle = edge;
    ctx.beginPath();
    ctx.roundRect(x + border / 2, y + dy + border / 2, w - border, h - border, r);
    ctx.stroke();
  }
  ctx.restore();
}

// A green (or any colour) uppercase button with the 3D lip. Label tracking is +0.053em as on the real thing.
export function button(ctx, cx, cy, w, h, label, { fill = COLOR.green, edge = COLOR.greenLip, color = COLOR.white, size = 44, press = 0, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  lip(ctx, cx - w / 2, cy - h / 2, w, h, h * 0.3, { fill, edge, lipH: h * 0.1, press });
  ctx.font = `900 ${size}px Nunito`;
  ctx.letterSpacing = `${size * 0.053}px`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(label.toUpperCase(), cx, cy + h * 0.05 * press + 3);
  ctx.restore();
}

// The lesson progress bar: a gray track, a green fill with a lighter highlight stripe.
export function progressBar(ctx, cx, cy, w, h, frac, { glow = 0 } = {}) {
  const x = cx - w / 2, y = cy - h / 2;
  ctx.save();
  ctx.fillStyle = COLOR.track;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    const fw = Math.max(h, w * frac);
    ctx.fillStyle = glow ? COLOR.greenHi : COLOR.green;
    ctx.beginPath();
    ctx.roundRect(x, y, fw, h, h / 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    ctx.beginPath();
    ctx.roundRect(x + h * 0.4, y + h * 0.2, Math.max(0, fw - h * 0.8), h * 0.26, h * 0.13);
    ctx.fill();
  }
  ctx.restore();
}

// Display text from runs: each run is a string (charcoal) or { t, c } (an accent colour). Centred on W/2, no outline or
// halo: this style lives on white. It pops in with a little overshoot (pop 0..1) unless it is the hook, full size from frame 0.
export function heading(ctx, W, y, lines, { size = 84, alpha = 1, pop = 1, color = COLOR.charcoal } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `900 ${size}px Nunito`;
  ctx.letterSpacing = `${-0.02 * size}px`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const k = lerp(0.84, 1, easeBack(pop));
  ctx.translate(W / 2, y);
  ctx.scale(k, k);
  lines.forEach((runs, i) => {
    const parts = runs.map(r => (typeof r === "string" ? { t: r, c: color } : r));
    const widths = parts.map(p => ctx.measureText(p.t).width);
    let x = -widths.reduce((a, b) => a + b, 0) / 2;
    parts.forEach((p, j) => {
      ctx.fillStyle = p.c;
      ctx.fillText(p.t, x, i * size * 1.2);
      x += widths[j];
    });
  });
  ctx.restore();
}

// --- characters ----------------------------------------------------------------------------------------------------------

// --- characters -------------------------------------------------------------------------------------------------------
// Three friendlier takes on the rabbit, all with small dot eyes: a (line-art bunny: round head on a small round body, "w"
// mouth, whiskers, pink cheeks), b (classic drawing: pear body, brows, smile, front legs), c (kawaii: tiny wide-set eyes, "x"
// mouth, one ear up and one flopped, brown outline). Same pose API as the bean: pass design: "a" | "b" | "c".

// A small solid eye with one highlight. Blinking squashes it to a line, `happy` is an arch, `startled` grows it, `focus`
// is a flat half lid (never angled brows, which is what made the big eyes look cross).
export function dotEye(ctx, x, y, { r = 16, look = [0, 0], lid = 0, mood = "idle" } = {}) {
  const line = Math.max(ow(0.7), 5);
  ctx.save();
  ctx.strokeStyle = COLOR.ink;
  ctx.lineWidth = line;
  ctx.lineCap = "round";
  if (mood === "happy") {
    ctx.beginPath();
    ctx.arc(x, y + r * 0.5, r * 1.1, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    ctx.restore();
    return;
  }
  let rx = r * 0.9, ry = r * 1.1, cy = y;
  if (mood === "startled") { rx *= 1.3; ry *= 1.3; }
  if (mood === "focus") { ry *= 0.6; cy += ry * 0.5; }
  const open = 1 - lid, px = x + look[0] * r * 0.5, py = cy + look[1] * r * 0.4;
  if (open < 0.15) {
    ctx.beginPath();
    ctx.moveTo(px - rx, cy);
    ctx.lineTo(px + rx, cy);
    ctx.stroke();
  } else {
    ctx.fillStyle = COLOR.ink;
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry * open, 0, 0, Math.PI * 2);
    ctx.fill();
    if (open > 0.5) {
      ctx.fillStyle = COLOR.white;
      ctx.beginPath();
      ctx.arc(px - rx * 0.3, py - ry * open * 0.34, rx * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function mouth(ctx, mood, x, y, k = 1) {
  ctx.save();
  ctx.strokeStyle = COLOR.ink;
  ctx.lineWidth = Math.max(ow(0.6), 5);
  ctx.lineCap = ctx.lineJoin = "round";
  if (mood === "startled") {
    blob(ctx, COLOR.red, ell(x, y + 16, 11, 15), ow(0.5));
  } else if (mood === "happy") {
    blob(ctx, COLOR.red, c => { c.moveTo(x - 26, y); c.quadraticCurveTo(x, y + 50, x + 26, y); c.closePath(); }, ow(0.6));
  } else {
    ctx.beginPath();
    ctx.arc(x - 13 * k, y, 13 * k, 0, Math.PI);
    ctx.arc(x + 13 * k, y, 13 * k, 0, Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

function ear(ctx, side, bx, by, len, rx, rot) {
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(rot);
  blob(ctx, COLOR.fur, ell(0, -len / 2, rx, len / 2), ow(), [COLOR.furShade, -side * rx * 0.3, -len / 2 - 6, rx, len / 2 + 2]);
  blob(ctx, COLOR.earPink, ell(0, -len / 2 + 12, rx * 0.5, len / 2 - 36), 0);
  ctx.restore();
}

// Several shapes drawn as one: all outlines first, then all fills, so no seam shows where they overlap.
function merge(ctx, fill, builds, w = ow()) {
  ctx.save();
  ctx.lineJoin = ctx.lineCap = "round";
  if (w) {
    ctx.fillStyle = ctx.strokeStyle = COLOR.ink;
    ctx.lineWidth = w * 2;
    for (const b of builds) { ctx.beginPath(); b(ctx); ctx.stroke(); ctx.fill(); }
  }
  ctx.fillStyle = fill;
  for (const b of builds) { ctx.beginPath(); b(ctx); ctx.fill(); }
  ctx.restore();
}

// A paw: a soft rounded mitt with a thumb bump and two short toe strokes, pointing along `dir`. Animals here have paws
// only, sitting straight on the body, no arms.
function paw(ctx, x, y, r, dir) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(dir);
  merge(ctx, COLOR.fur, [ell(0, 0, r * 1.05, r * 0.9), ell(-r * 0.2, r * 0.78, r * 0.42, r * 0.34)]);
  ctx.strokeStyle = COLOR.ink;
  ctx.lineWidth = Math.max(ow(0.45), 4);
  ctx.lineCap = "round";
  for (const dy of [-0.3, 0.2]) {
    ctx.beginPath();
    ctx.moveTo(r * 0.55, r * dy);
    ctx.lineTo(r * 0.98, r * dy);
    ctx.stroke();
  }
  ctx.restore();
}

// A pointed ear (fox): a rounded triangle with a lighter inside.
function triEar(ctx, side, bx, by, h, w, rot, inner) {
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(rot);
  blob(ctx, COLOR.fur, c => { c.moveTo(-w / 2, 0); c.lineTo(side * w * 0.1, -h); c.lineTo(w / 2, 0); c.closePath(); });
  blob(ctx, inner, c => { c.moveTo(-w * 0.26, -4); c.lineTo(side * w * 0.08, -h * 0.66); c.lineTo(w * 0.26, -4); c.closePath(); }, 0);
  ctx.restore();
}

// The animals: one chibi look, a tinted outline, no shade block, tiny wide-set eyes. Paws only, sitting straight on the body,
// no arms. Each is a few plain shapes: ears, one fluffy head-and-body silhouette, feet, face.
const SPECIES = {
  rabbit: {
    pal: { ink: "#5b2a57", fur: "#ffffff", furShade: "#f3e8f4", blush: "#ffb7cf" }, paws: [[-34, -98], [34, -98]],
    body(ctx, { look, lid, ears, mood }) {
      const hy = -250;
      for (const side of [-1, 1]) ear(ctx, side, side * 62, hy - 90, 205, 44, side * (0.2 + 0.5 * ears));
      merge(ctx, COLOR.fur, [ell(0, -112, 142, 112), ell(-118, -66, 58, 54), ell(118, -66, 58, 54), ell(0, hy, 152, 116)]);
      for (const side of [-1, 1]) {
        blob(ctx, COLOR.fur, ell(side * 74, -14, 50, 18));
        blob(ctx, COLOR.blush, ell(side * 104, hy + 32, 30, 22), 0);
        dotEye(ctx, side * 62, hy + 2, { r: 11, look, lid, mood });
      }
      mouth(ctx, mood, 0, hy + 34, 0.7);
    },
  },
  duck: {
    pal: { ink: "#7a4a00", fur: "#ffc800", blush: "#ff9fb8" }, paws: [[-38, -98], [38, -98]],
    body(ctx, { look, lid, mood }) {
      const hy = -246;
      for (const side of [-1, 1]) blob(ctx, COLOR.orange, ell(side * 58, -12, 48, 17));
      blob(ctx, COLOR.fur, ell(0, -124, 150, 118));
      blob(ctx, COLOR.fur, ell(0, hy, 128, 108));
      blob(ctx, COLOR.fur, ell(6, hy - 108, 26, 14, -0.5), ow(0.8));
      blob(ctx, COLOR.orange, ell(0, hy + 26, 44, 24), ow(0.8));
      for (const side of [-1, 1]) {
        blob(ctx, COLOR.blush, ell(side * 86, hy + 30, 22, 15), 0);
        dotEye(ctx, side * 56, hy - 14, { r: 11, look, lid, mood });
      }
    },
  },
  fox: {
    pal: { ink: "#6b2d12", fur: "#ff9600", blush: "#ff9fb8" }, paws: [[-34, -94], [34, -94]],
    body(ctx, { look, lid, ears, mood }) {
      const hy = -246;
      blob(ctx, COLOR.fur, ell(150, -86, 76, 46, -0.7), ow(), [COLOR.white, 136, -74, 54, 54]);
      for (const side of [-1, 1]) triEar(ctx, side, side * 96, hy - 92, 108, 96, side * (0.18 + 0.3 * ears), COLOR.cream);
      blob(ctx, COLOR.fur, ell(0, -112, 128, 108));
      blob(ctx, COLOR.white, ell(0, -92, 66, 80), 0);
      for (const side of [-1, 1]) blob(ctx, COLOR.fur, ell(side * 68, -14, 50, 19));
      blob(ctx, COLOR.fur, ell(0, hy, 152, 112));
      blob(ctx, COLOR.white, ell(0, hy + 34, 86, 54), 0);
      for (const side of [-1, 1]) {
        blob(ctx, COLOR.blush, ell(side * 104, hy + 30, 24, 17), 0);
        dotEye(ctx, side * 70, hy - 10, { r: 11, look, lid, mood });
      }
      blob(ctx, COLOR.ink, ell(0, hy + 14, 16, 11), 0);
      mouth(ctx, mood, 0, hy + 32, 0.75);
    },
  },
};

// One animal, sitting, feet at (x, y) in a frame 1080 wide. pose: v squash, look, lid, ears (-1 perked .. 1 flopped), mood (idle,
// focus, startled, happy), tilt (radians), handL / handR (local paw positions; default resting together on the belly), onlyPaws
// (redraw just the paws, so a desk can sit between the body and them).
export function critter(ctx, { species, x, y, s = 1, v = 0, look = [0, 0], lid = 0, ears = 0.15, mood = "idle", tilt = 0,
  handL, handR, onlyPaws = false }) {
  const S = SPECIES[species], { sx, sy } = squash(v), saved = { ...COLOR };
  Object.assign(COLOR, S.pal);
  try {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * sx, s * sy);
    ctx.rotate(tilt * 0.6);
    const hl = handL || S.paws[0], hr = handR || S.paws[1];
    if (!onlyPaws) S.body(ctx, { look, lid, ears, mood });
    paw(ctx, hl[0], hl[1], 28, -Math.PI / 2 + 0.35);
    paw(ctx, hr[0], hr[1], 28, -Math.PI / 2 - 0.35);
    ctx.restore();
  } finally {
    Object.assign(COLOR, saved);
  }
}

// A butterfly at (x, y), wings flapping with time t.
export function butterfly(ctx, x, y, t, s = 1) {
  const flap = 0.25 + 0.75 * Math.abs(Math.sin(t * 17));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  for (const [dy, rx, ry, col] of [[-22, 40, 34, COLOR.purple], [24, 30, 26, COLOR.pink]]) {
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(flap * side, 1);
      blob(ctx, col, ell(30 * 0.9, dy, rx * 0.9, ry), ow(0.7));
      ctx.restore();
    }
  }
  blob(ctx, COLOR.ink, pill(-8, -42, 16, 92, 8), 0);
  ctx.restore();
}

// Confetti thrown from (x0, y0) at time `born`: seeded pieces on a gravity arc that fade after ~1.6 s.
export function confetti(ctx, t, born, x0, y0, n = 46, seed = 5) {
  const age = t - born;
  if (age < 0 || age > 2.2) return;
  const r = rng(seed), cols = [COLOR.green, COLOR.blue, COLOR.yellow, COLOR.red, COLOR.purple, COLOR.orange];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.4, sp = 500 + r() * 700, spin = (r() - 0.5) * 14, col = cols[i % cols.length], w = 14 + r() * 14;
    const x = x0 + Math.cos(a) * sp * age, y = y0 + Math.sin(a) * sp * age + 0.5 * 1500 * age * age;
    ctx.save();
    ctx.globalAlpha = 1 - clamp((age - 1.5) / 0.7);
    ctx.translate(x, y);
    ctx.rotate(spin * age + i);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -w / 4, w, w / 2, 4);
    ctx.fill();
    ctx.restore();
  }
}
