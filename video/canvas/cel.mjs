// The anime-cel drawing kit: flat cel bands with one hard shadow, tapered ink as filled polygons, seeded grain, speed lines
// and an inverted-palette impact. General traits only (no series, characters or marks). Plain canvas 2D, no dependencies.
// Every function is a pure function of its arguments; the scenes drive it with t.
import { rng, clamp, lerp, prog, easeOut } from "./ink.mjs";

export const PAL = { paper: "#d9d2c3", ink: "#26211e", case: "#8a8478", face: "#ece5d3", shade: "#b9b09c", red: "#c8372d" };
export const TAU = Math.PI * 2;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const mix = (a, b, u) => "#" + hex(a).map((v, i) => Math.round(lerp(v, hex(b)[i], u)).toString(16).padStart(2, "0")).join("");

// Second hand: a snap with a small overshoot at each whole second (the spike's secondAngle).
export function snap(t) {
  const f = clamp((t % 1) / 0.15), e = f * f * (3 - 2 * f);
  return (Math.floor(t) + e + 0.12 * Math.sin(f * Math.PI) * (1 - f)) * 6;
}

// A ring whose outer edge swells towards the lower right: the tapered ink line.
export function inkRing(ctx, cx, cy, r, base, swell, color) {
  const n = 120, w = a => base + swell * (0.5 + 0.5 * Math.cos(a - Math.PI / 4));
  ctx.beginPath();
  for (let i = 0; i <= n; i++) { const a = (i / n) * TAU; ctx.lineTo(cx + Math.cos(a) * (r + w(a)), cy + Math.sin(a) * (r + w(a))); }
  ctx.closePath();
  for (let i = n; i >= 0; i--) { const a = (i / n) * TAU; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill("evenodd");
}

// A hand from the origin: a tapered blade with a tail; `grow` fattens it for the ink pass behind the fill.
function blade(ctx, deg, len, tail, w, grow = 0) {
  ctx.save();
  ctx.rotate((deg * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(-(w + grow), tail + grow);
  ctx.lineTo(w + grow, tail + grow);
  ctx.lineTo(w * 0.25, -len - grow);
  ctx.lineTo(-w * 0.25, -len - grow);
  ctx.closePath();
  ctx.restore();
}

// The pocket watch at 10:08 in cel: case, bezel, face with one hard shadow, marks and three hands. R is the case radius in
// px, z the camera zoom (it thickens the ink), hands are in degrees.
export function watch(ctx, { cx, cy, R, k, z = 1, hands }) {
  const c = PAL;
  ctx.fillStyle = c.ink;
  ctx.fillRect(cx - 0.14 * R - 5 * k, cy - 1.2 * R - 5 * k, 0.28 * R + 10 * k, 0.24 * R + 10 * k);
  ctx.fillStyle = c.case;
  ctx.fillRect(cx - 0.14 * R, cy - 1.2 * R, 0.28 * R, 0.24 * R);
  ctx.fillStyle = c.red;
  ctx.fillRect(cx - 0.14 * R, cy - 1.2 * R, 0.28 * R, 0.07 * R);
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = c.case; ctx.fill();
  inkRing(ctx, cx, cy, R, 4 * k, 18 * k * z, c.ink);
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.86, 0, TAU); ctx.fillStyle = c.face; ctx.fill();
  ctx.save();  // the one hard cel shadow: the face minus a circle shifted towards the light
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.86, 0, TAU); ctx.clip();
  ctx.beginPath();
  ctx.rect(cx - R, cy - R, 2 * R, 2 * R);
  ctx.arc(cx - 0.16 * R, cy - 0.2 * R, R * 0.86, 0, TAU, true);
  ctx.fillStyle = c.shade; ctx.fill("evenodd");
  ctx.restore();
  inkRing(ctx, cx, cy, R * 0.86, 3 * k, 6 * k * z, c.ink);
  ctx.fillStyle = c.ink;
  for (let i = 0; i < 12; i++) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate((i * TAU) / 12);
    ctx.fillRect(-R * (i % 3 ? 0.012 : 0.022), -R * 0.8, R * (i % 3 ? 0.024 : 0.044), R * (i % 3 ? 0.07 : 0.12));
    ctx.restore();
  }
  ctx.save(); ctx.translate(cx, cy);
  for (const [deg, len, w, tail] of [[hands.hour, 0.45, 0.06, 0.07], [hands.min, 0.7, 0.04, 0.08]]) {
    blade(ctx, deg, len * R, tail * R, w * R, 5 * k); ctx.fillStyle = c.ink; ctx.fill();
    blade(ctx, deg, len * R, tail * R, w * R); ctx.fillStyle = c.case; ctx.fill();
  }
  blade(ctx, hands.sec, 0.78 * R, 0.18 * R, 0.014 * R, 4 * k); ctx.fillStyle = c.ink; ctx.fill();
  blade(ctx, hands.sec, 0.78 * R, 0.18 * R, 0.014 * R); ctx.fillStyle = c.red; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, 0.05 * R, 0, TAU); ctx.fillStyle = c.red; ctx.fill();
  ctx.restore();
}

export const makeLines = (seed = 5, n = 28) => { const r = rng(seed); return Array.from({ length: n }, () => ({ a: r() * TAU, w: 0.01 + r() * 0.035, in: 0.5 + r() * 0.3 })); };

// Radial wedges from outside the watch to past the frame edge.
export function speedLines(ctx, lines, cx, cy, R, H, color) {
  ctx.fillStyle = color;
  for (const l of lines) {
    const r0 = R * l.in * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(l.a - l.w) * r0, cy + Math.sin(l.a - l.w) * r0);
    ctx.lineTo(cx + Math.cos(l.a) * H, cy + Math.sin(l.a) * H);
    ctx.lineTo(cx + Math.cos(l.a + l.w) * r0, cy + Math.sin(l.a + l.w) * r0);
    ctx.closePath();
    ctx.fill();
  }
}

// Grain: a seeded 256 px black-and-white noise tile, laid over the frame and moved every 6th frame (5 a second, like the
// boil in ink.mjs). Strong grain that moves every frame is noise the encoder cannot compress: 91 MB at 18 s, against the
// 50 MB limit in push-media.mjs. This level is a trade.
export function grainPattern(doc, seed = 5) {
  const g = doc.createElement("canvas");
  g.width = g.height = 256;
  const gx = g.getContext("2d"), img = gx.createImageData(256, 256), r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) { img.data[i] = img.data[i + 1] = img.data[i + 2] = r() < 0.5 ? 0 : 255; img.data[i + 3] = 255 * r(); }
  gx.putImageData(img, 0, 0);
  return g;
}
export function grain(ctx, t, W, H, tile, alpha = 0.05) {
  const r = rng(Math.floor((t * 30 + 1e-6) / 6) + 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(tile, "repeat");
  ctx.translate(Math.floor(r() * 256), Math.floor(r() * 256));
  ctx.fillRect(-256, -256, W + 256, H + 256);
  ctx.restore();
}

export function letterbox(ctx, W, H, h, color = PAL.ink) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, h);
  ctx.fillRect(0, H - h, W, h);
}

// Every pixel inverted: the impact frame.
export function invert(ctx, W, H) {
  ctx.save();
  ctx.globalCompositeOperation = "difference";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Bold Nunito caption lines: paper fill, thick ink stroke, red for `{ t, c }` words. A line is an array of strings or { t, c }.
export function cel(ctx, W, y, lines, { size = 88, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `900 ${size}px Nunito`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  lines.forEach((ln, i) => {
    const segs = ln.map(s => (typeof s === "string" ? { t: s, c: PAL.face } : s)), yy = y + i * size * 1.2;
    let x = (W - segs.reduce((a, s) => a + ctx.measureText(s.t).width, 0)) / 2;
    for (const s of segs) {
      ctx.lineWidth = size * 0.16;
      ctx.strokeStyle = PAL.ink;
      ctx.strokeText(s.t, x, yy);
      ctx.fillStyle = s.c;
      ctx.fillText(s.t, x, yy);
      x += ctx.measureText(s.t).width;
    }
  });
  ctx.restore();
}

// The end card of every video (see "How a story should end" in video/STORIES.md): the real app icon as a sticker, the name,
// the closing line and the store line, on a night page that fades in over the last scene. `from` is when it starts; it holds
// at least 3 s. The grain goes over it.
export const CLOSING = [["Just focus on"], ["what matters."]];
export const STORE = "Available on iOS";
export const NIGHT = "#0f1424";

export function endCard(ctx, t, W, H, { icon, from, tile, title = "WildFocus" }) {
  const k = W / 1080, a = easeOut(prog(t, from, from + 0.5)), s = 260 * k, cy = H * 0.36;
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = NIGHT;
  ctx.fillRect(0, 0, W, H);
  const pop = 0.85 + 0.15 * easeOut(prog(t, from + 0.1, from + 0.6));
  ctx.translate(W / 2, cy);
  ctx.scale(pop, pop);
  if (icon) {
    ctx.fillStyle = PAL.ink;
    ctx.beginPath(); ctx.roundRect(-s / 2 + 8 * k, -s / 2 + 14 * k, s, s, s * 0.225); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.225); ctx.clip();
    ctx.drawImage(icon, -s / 2, -s / 2, s, s);
    ctx.restore();
    ctx.lineWidth = 6 * k;
    ctx.strokeStyle = PAL.face;
    ctx.beginPath(); ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.225); ctx.stroke();
  }
  ctx.restore();
  cel(ctx, W, cy + s / 2 + 130 * k, [[title]], { size: 120 * k, alpha: a });
  const bar = prog(t, from + 0.4, from + 0.9);
  ctx.fillStyle = PAL.red;
  ctx.fillRect(W / 2 - 160 * k * bar, cy + s / 2 + 220 * k, 320 * k * bar, 10 * k);
  cel(ctx, W, cy + s / 2 + 300 * k, CLOSING, { size: 72 * k, alpha: prog(t, from + 0.7, from + 1.2) });
  cel(ctx, W, cy + s / 2 + 520 * k, [[STORE]], { size: 46 * k, alpha: prog(t, from + 1.2, from + 1.7) });
  ctx.restore();
  grain(ctx, t, W, H, tile);
}
