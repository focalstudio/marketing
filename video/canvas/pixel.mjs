// Pixel-art kit for canvas 2D, shared by the pixel and retro styles: small palette-locked canvases drawn with whole-pixel
// fills, Bayer dithering, a one-pixel outline pass, a 3x5 bitmap font and a small rabbit. Draw into a lowres() canvas,
// then blit it up with smoothing off. Every function is a pure function of its arguments; the scenes drive it with t.
import { hop, blink } from "./toon.mjs";

export const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
export const bayer = (x, y) => (BAYER[y & 3][x & 3] + 0.5) / 16;  // threshold in (0, 1) for the pixel at x, y

// --- canvases and palette ------------------------------------------------------------------------------------------------

// A low-res canvas context. With a palette ("#rrggbb" strings) every colour drawn through this kit is checked against it,
// so a stray colour throws instead of quietly breaking the lock.
export function lowres(doc, w, h, palette) {
  const cv = doc.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d", { willReadFrequently: true });
  g.imageSmoothingEnabled = false;
  g.pal = palette && new Set(palette.map(c => c.toLowerCase()));
  return g;
}

// The low-res canvas scaled to fill (W, H) with nearest neighbour.
export function blit(ctx, g, W, H) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(g.canvas, 0, 0, W, H);
  ctx.restore();
}

const rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));

// snapper(palette) is a function that snaps any "#rrggbb" to the nearest palette colour (squared RGB distance).
export function snapper(palette) {
  const pal = palette.map(c => [c, rgb(c)]);
  return c => {
    const v = rgb(c);
    let best = pal[0], bd = Infinity;
    for (const p of pal) {
      const d = (p[1][0] - v[0]) ** 2 + (p[1][1] - v[1]) ** 2 + (p[1][2] - v[2]) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    return best[0];
  };
}

// --- primitives ----------------------------------------------------------------------------------------------------------

function paint(g, c) {
  if (g.pal && !g.pal.has(c)) throw new Error(`colour ${c} is not in the palette`);
  g.fillStyle = c;
}

export function rect(g, x, y, w, h, c) {
  w = Math.round(w);
  h = Math.round(h);
  if (w <= 0 || h <= 0) return;
  paint(g, c);
  g.fillRect(Math.floor(x), Math.floor(y), w, h);
}
export const px = (g, x, y, c) => rect(g, x, y, 1, 1, c);

// A run of pixels along a row; c is a colour, or fn(x, y) giving a colour or null to skip the pixel.
function run(g, x, y, len, c) {
  if (typeof c === "string") return rect(g, x, y, len, 1, c);
  for (let i = 0; i < len; i++) { const col = c(x + i, y); if (col) px(g, x + i, y, col); }
}

// An ellipse covering the pixels whose centre lies inside it. c as in run().
export function ell(g, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const dy = (y + 0.5 - cy) / ry, f = 1 - dy * dy;
    if (f < 0) continue;
    const hw = rx * Math.sqrt(f), x0 = Math.ceil(cx - hw - 0.5), x1 = Math.floor(cx + hw - 0.5);
    if (x1 >= x0) run(g, x0, y, x1 - x0 + 1, c);
  }
}

// A filled polygon (scanline, pixel centres). c as in run().
export function poly(g, pts, c) {
  const ys = pts.map(p => p[1]);
  for (let y = Math.ceil(Math.min(...ys) - 0.5); y <= Math.floor(Math.max(...ys) - 0.5); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.ceil(xs[i] - 0.5), x1 = Math.floor(xs[i + 1] - 0.5);
      if (x1 >= x0) run(g, x0, y, x1 - x0 + 1, c);
    }
  }
}

// Bayer-dither a rectangle between colours a and b; level is 0..1 (share of b), or fn(x, y) giving it per pixel.
export function dither(g, x, y, w, h, level, a, b) {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) px(g, i, j, bayer(i, j) < (typeof level === "number" ? level : level(i, j)) ? b : a);
  }
}

// Wrap every opaque pixel of g in a one-pixel outline (4-neighbour), drawn into the transparent pixels around it.
export function outline(g, color) {
  const { width: w, height: h } = g.canvas, img = g.getImageData(0, 0, w, h), d = img.data, [r, gr, b] = rgb(color);
  if (g.pal && !g.pal.has(color)) throw new Error(`colour ${color} is not in the palette`);
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0, edge = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) edge.push((y * w + x) * 4);
  for (const i of edge) { d[i] = r; d[i + 1] = gr; d[i + 2] = b; d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
}

// --- bitmap font ---------------------------------------------------------------------------------------------------------

// 3x5 glyphs (the colon is one column wide), rows joined by "/".
const GLYPHS = Object.fromEntries(Object.entries({
  0: "111/101/101/101/111", 1: "010/110/010/010/111", 2: "111/001/111/100/111", 3: "111/001/111/001/111",
  4: "101/101/111/001/001", 5: "111/100/111/001/111", 6: "111/100/111/101/111", 7: "111/001/001/001/001",
  8: "111/101/111/101/111", 9: "111/101/111/001/111", ":": "0/1/0/1/0", "-": "000/000/111/000/000", ".": "0/0/0/0/1",
  " ": "00/00/00/00/00", P: "111/101/111/100/100", L: "100/100/100/100/111", A: "010/101/111/101/101",
  Y: "101/101/010/010/010", S: "111/100/111/001/111", R: "110/101/110/101/101", E: "111/100/110/100/111",
  C: "111/100/100/100/111", T: "111/010/010/010/010", O: "111/101/101/101/111", D: "110/101/101/101/110",
  M: "101/111/111/101/101", N: "110/101/101/101/101", I: "111/010/010/010/111", X: "101/101/010/101/101",
}).map(([k, v]) => [k, v.split("/")]));

export const bitWidth = (str, s, gap = 1) => [...str].reduce((a, ch) => a + (GLYPHS[ch][0].length + gap) * s, -gap * s);

// Draw str with its top-left at (x, y), each font pixel s x s. slope shears the text (pixels down per pixel across), for
// isometric walls. Works on any 2d context. Returns the width.
export function bitText(g, str, x, y, s, c, { slope = 0, gap = 1 } = {}) {
  let cx = x;
  for (const ch of str) {
    const rows = GLYPHS[ch];
    rows.forEach((row, j) => [...row].forEach((on, i) => {
      if (on !== "1") return;
      const X = cx + i * s, Y = y + j * s;
      if (!slope) return rect(g, X, Y, s, s, c);
      for (let d = 0; d < s; d++) rect(g, X + d, Y + Math.round((X + d - x) * slope), 1, s, c);
    }));
    cx += (rows[0].length + gap) * s;
  }
  return cx - x - gap * s;
}

// --- the demo subject ----------------------------------------------------------------------------------------------------

// The countdown the demo styles show: 25:00 at t=0, one second less each second. `colon` blinks, `bar` is the demo's progress.
export function clock(t) {
  const left = 1500 - Math.floor(t + 1e-6), mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  return { text: `${mm}:${ss}`, colon: t % 1 < 0.65, bar: 0.25 + 0.6 * (t / 3) };
}

const twitch = (t, at) => { const u = (t - at) / 0.4; return u >= 0 && u <= 1 ? Math.sin(u * Math.PI * 2) * (1 - 0.4 * u) : 0; };

// The rabbit's life over the 3 s: an ear flick (0.4 s and 1.95 s), a blink at 1.42 s and a hop at 2.3 s. y is the lift in
// px (negative is up) for a hop `hopH` high.
export function life(t, hopH) {
  const h = hop(t, 2.3, 0.6, hopH);
  return { blink: blink(t, [1.42]), ear: twitch(t, 0.4) + twitch(t, 1.95), y: Math.round(h.y), v: h.v };
}

// A rabbit sitting front-on with its feet at (x, y), about 45k px tall with the ears. Colours are roles (fur, shade, belly,
// inner, eye, nose, hi) so each style can map them onto its own palette; leave the outline to outline().
export function rabbit(g, { x, y, k = 1, fur, shade, belly, inner, eye, nose, hi, blink: lid = 0, ear = 0 }) {
  const K = v => v * k, side = (px_, rx) => (px_ + 0.5 - x > rx ? shade : fur);
  const earAt = (bx, lean) => {
    const len = Math.round(K(17)), hw = K(2.9);
    for (let d = 0; d < len; d++) {
      const u = d / len, cx = bx + lean * u * u, w = Math.max(0.6, hw * (u < 0.4 ? 1 : Math.sqrt(1 - ((u - 0.4) / 0.6) ** 2))), yy = Math.round(y - K(27) - d);
      rect(g, cx - w, yy, w * 2, 1, fur);
      if (u > 0.12 && u < 0.8 && inner) rect(g, cx - w * 0.45, yy, w * 0.9, 1, inner);
    }
  };
  ell(g, x + K(8.5), y - K(4), K(3), K(3), belly);
  earAt(x - K(4.2), -K(2.2));
  earAt(x + K(4.2), K(2.2) + ear * K(5));
  ell(g, x, y - K(9), K(8.5), K(9.5), p => side(p, K(5.2)));
  ell(g, x, y - K(7), K(5), K(6.5), belly);
  ell(g, x - K(4.8), y - K(1.6), K(3.8), K(2), fur);
  ell(g, x + K(4.8), y - K(1.6), K(3.8), K(2), shade);
  ell(g, x, y - K(23), K(9), K(7.5), p => side(p, K(6)));
  if (inner) { ell(g, x - K(6), y - K(20.5), K(2.4), K(1.6), inner); ell(g, x + K(6), y - K(20.5), K(2.4), K(1.6), inner); }
  const ew = Math.max(1, Math.round(K(1.4))), eh = Math.max(2, Math.round(K(2.8))), ey = Math.round(y - K(25.5));
  for (const sx of [-1, 1]) {
    const ex = Math.round(x + sx * K(3.8) - ew / 2);
    if (lid > 0.5) rect(g, ex - (ew > 1 ? 0 : 1), ey + eh - 1, ew + (ew > 1 ? 0 : 2), 1, eye);
    else { rect(g, ex, ey, ew, eh, eye); if (hi && k >= 1) px(g, ex, ey, hi); }
  }
  rect(g, x - K(1.2), y - K(21), Math.max(2, K(2.4)), Math.max(1, K(1.2)), nose);
}

// A checkerboard shadow under a sprite, for palettes with no room for a translucent one.
export const shadow = (g, x, y, rx, c) => ell(g, x, y, rx, Math.max(1, rx * 0.26), (i, j) => ((i + j) & 1 ? c : null));
