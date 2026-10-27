// Style demo: pixel-art. A canvas port of video/styles/pixel.py: a 135x240 palette-locked canvas (the same palette), golden-hour
// sky bands joined by Bayer dithering, a one-pixel outline round every sprite, scaled up with nearest neighbour.
// Render the stills with `node scripts/gallery.mjs previews --only pixel-art`.
import { rng } from "../ink.mjs";
import { mix } from "../cel.mjs";
import { lowres, blit, snapper, rect, px, ell, poly, dither, outline, bitText, clock, life, rabbit, shadow, bayer } from "../pixel.mjs";

export const DURATION = 3, COVER = 1.5;
export const SOUND = { kind: "intro", close: 2.5 };
export const CAPTIONS = [], SCENES = [];

const LW = 135, LH = 240;
const P = {  // the Pillow palette (video/styles/pixel.py)
  out: "#2e2030", white: "#fff8ee", cream: "#ffecca", sky0: "#f39a8c", sky1: "#f8b48e", sky2: "#fccf98", sky3: "#ffe4ae", sun: "#ffc84c",
  g0: "#b6d66e", g1: "#7cba5c", g2: "#4e9656", g3: "#2f6a4a", fur: "#8cbaf8", furd: "#5f82d6", pink: "#fa9fb6",
  hood: "#f06e5e", hoodd: "#bf454f", pant: "#6f62ac", pantd: "#4a4282", fox: "#ee8034", foxd: "#a9492b", tan: "#d6995c",
  brown: "#8f5e3d", spine: "#5c3f35", rose: "#e2c8bc", rosed: "#c89c8c",
};
const snap = snapper(Object.values(P));  // any computed colour lands on the palette

export function setup(doc) {
  const all = Object.values(P);
  return { lo: lowres(doc, LW, LH, all), spr: lowres(doc, LW, LH, all) };
}

// Four sky bands, each dithered into the next over its lower 40%.
const SKY = [P.sky0, P.sky1, P.sky2, P.sky3], HORIZON = 168;
function sky(g) {
  for (let y = 0; y < HORIZON; y++) {
    const v = (y / HORIZON) * 3.999, i = Math.floor(v), lvl = Math.max(0, (v - i - 0.55) / 0.45);
    dither(g, 0, y, LW, 1, lvl, SKY[i], SKY[Math.min(3, i + 1)]);
  }
}

// The meadow: light at the horizon, darker towards the viewer, with dithered joins.
function meadow(g) {
  const bands = [[172, 190, P.g0, P.g1], [190, 224, P.g1, P.g2], [224, LH, P.g2, P.g2]];
  for (let y = 170; y < LH; y++) {
    const [y0, y1, a, b] = bands.find(([, e]) => y < e) || bands[2];
    dither(g, 0, y, LW, 1, Math.max(0, (y - (y1 - 8)) / 8), a, b);
  }
}

export function draw(ctx, t, W, H, st) {
  const { lo, spr } = st, { text, colon, bar } = clock(t), pose = life(t, 14), r = rng(7);
  sky(lo);

  // sun with a dithered halo, sinking a little; its halo colours are mixed, then snapped to the palette
  const sy = 150 + Math.floor(t * 2);
  ell(lo, 68, sy, 34, 34, (x, y) => (bayer(x, y) < (1 - Math.hypot(x - 68, y - sy) / 34) * 0.9 ? snap(mix(P.sky3, P.cream, 0.5)) : null));
  ell(lo, 68, sy, 14, 14, P.sun);
  ell(lo, 66, sy - 3, 8, 6, (x, y) => (bayer(x, y) < 0.5 ? P.cream : P.sun));

  // two drifting clouds
  for (const [cx, cy, w] of [[20, 34, 24], [96, 24, 30]]) {
    const x = Math.round(cx + t * 2);
    ell(lo, x, cy, w / 2, 3, P.cream);
    ell(lo, x - 4, cy - 3, w / 4, 3, P.cream);
    rect(lo, x - w / 2 + 3, cy + 2, w - 6, 1, P.sky3);
  }

  // hills, the sun setting behind them
  for (let x = 0; x < LW; x++) {
    const hy = 160 + Math.round(5 * Math.sin(x / 15 + 0.6) + 2 * Math.sin(x / 5.5 + 1));
    rect(lo, x, hy, 1, HORIZON + 8 - hy, P.g2);
    px(lo, x, hy, P.g1);
  }
  meadow(lo);
  for (let i = 0; i < 26; i++) {  // tufts and flowers, always in the same spots
    const x = Math.floor(r() * LW), y = 178 + Math.floor(r() * 58);
    px(lo, x, y, P.g3); px(lo, x - 1, y - 1, P.g3); px(lo, x + 1, y - 1, P.g3);
    if (i % 5 === 0) { px(lo, x + 4, y - 3, P.white); px(lo, x + 3, y - 3, P.pink); px(lo, x + 5, y - 3, P.pink); px(lo, x + 4, y - 4, P.pink); px(lo, x + 4, y - 2, P.pink); }
  }

  // the timer on a signboard: posts, wooden frame, dark face, 5x amber digits and a bar
  for (const x of [26, 106]) { rect(lo, x, 106, 5, 68, P.brown); rect(lo, x + 4, 106, 1, 68, P.spine); rect(lo, x - 2, 172, 9, 2, P.g3); }
  rect(lo, 10, 54, 115, 54, P.out);
  rect(lo, 11, 55, 113, 52, P.brown);
  rect(lo, 11, 55, 113, 1, P.tan);
  rect(lo, 15, 59, 105, 44, P.out);
  const digits = colon ? text : text.replace(":", " ");
  bitText(lo, digits, 25, 63, 5, P.sun);
  rect(lo, 22, 94, 91, 5, P.spine);
  rect(lo, 23, 95, Math.round(89 * bar), 3, P.g0);

  // sprites on their own layer so the outline wraps them and not the scenery
  spr.clearRect(0, 0, LW, LH);
  const rx = 46, ry = 216 + pose.y;
  rabbit(spr, { x: rx, y: ry, k: 1.8, fur: P.fur, shade: P.furd, belly: P.cream, inner: P.pink, eye: P.out, nose: P.hood, hi: P.white, blink: pose.blink, ear: pose.ear });
  poly(spr, [[96, 198], [105, 198], [100.5, 214]], P.fox);  // a carrot
  poly(spr, [[101, 198], [105, 198], [101.5, 213]], P.foxd);
  rect(spr, 97, 193, 2, 5, P.g1); rect(spr, 100, 191, 2, 7, P.g2); rect(spr, 103, 193, 2, 5, P.g1);
  ell(spr, 114, 224, 9, 6, (x) => (x > 117 ? P.rosed : P.rose));  // a rock
  outline(spr, P.out);
  shadow(lo, rx, 217, 19, P.g3);
  shadow(lo, 100, 216, 7, P.g3);
  shadow(lo, 114, 230, 11, P.g3);
  lo.drawImage(spr.canvas, 0, 0);
  blit(ctx, lo, W, H);
}
