// Style sheet for picnic_for_four_pixel (review gate 1): one frame with the characters, props, type and palette. Render it with
// `node video/canvas/render.mjs picnic_for_four_pixel_style --preview DIR 0`.
// Side-on pixel art on the style_pixel_art kit: a 135x240 palette-locked canvas scaled x8, Bayer-dithered golden-hour sky,
// a one-pixel outline round every sprite (sprites on their own layer so it wraps them, not the scenery).
import { mix } from "../cel.mjs";
import { lowres, blit, snapper, rect, px, ell, poly, dither, outline, bitText, bitWidth, shadow, bayer } from "../pixel.mjs";

export const DURATION = 1;
export const SOUND = { kind: "rain", beats: [] };
export const CAPTIONS = [], SCENES = [];

const LW = 135, LH = 240;
const P = {  // the style_pixel_art palette (26 colours); nothing added for the picnic
  out: "#2e2030", white: "#fff8ee", cream: "#ffecca", sky0: "#f39a8c", sky1: "#f8b48e", sky2: "#fccf98", sky3: "#ffe4ae", sun: "#ffc84c",
  g0: "#b6d66e", g1: "#7cba5c", g2: "#4e9656", g3: "#2f6a4a", fur: "#8cbaf8", furd: "#5f82d6", pink: "#fa9fb6",
  hood: "#f06e5e", hoodd: "#bf454f", pant: "#6f62ac", pantd: "#4a4282", fox: "#ee8034", foxd: "#a9492b", tan: "#d6995c",
  brown: "#8f5e3d", spine: "#5c3f35", rose: "#e2c8bc", rosed: "#c89c8c",
};
const snap = snapper(Object.values(P));

export function setup(doc) {
  const all = Object.values(P);
  return { lo: lowres(doc, LW, LH, all), spr: lowres(doc, LW, LH, all) };
}

// --- type ----------------------------------------------------------------------------------------------------------------
// pixel.mjs has no B F G H J K Q U V W Z or punctuation beyond ".", and the captions need them (M is widened so it does not read
// as N); the rest stays bitText.
const EXTRA = Object.fromEntries(Object.entries({
  B: "110/101/110/101/110", F: "111/100/110/100/100", G: "111/100/101/101/111", H: "101/101/111/101/101", J: "001/001/001/101/111",
  K: "101/101/110/101/101", Q: "111/101/101/111/001", U: "101/101/101/101/111", V: "101/101/101/101/010", W: "101/101/111/111/101",
  Z: "111/001/010/100/111", M: "10001/11011/10101/10001/10001", "'": "1/1/0/0/0", ",": "0/0/0/1/1", "!": "1/1/1/0/1",
}).map(([k, v]) => [k, v.split("/")]));

const glyphW = (ch, s) => (EXTRA[ch] ? EXTRA[ch][0].length * s : bitWidth(ch, s, 0));
const typeW = (str, s) => [...str].reduce((a, ch) => a + glyphW(ch, s) + s, -s);

// Draw str (top-left at x, y; each font pixel s x s) in colour c; returns the width.
function type(g, str, x, y, s, c) {
  let cx = x;
  for (const ch of str) {
    if (EXTRA[ch]) EXTRA[ch].forEach((row, j) => [...row].forEach((on, i) => on === "1" && rect(g, cx + i * s, y + j * s, s, s, c)));
    else bitText(g, ch, cx, y, s, c);
    cx += glyphW(ch, s) + s;
  }
  return cx - x - s;
}

// --- layout helpers ------------------------------------------------------------------------------------------------------

// A framed panel: fn draws inside (clipped to it), then a one-pixel outline goes round.
function panel(g, x, y, w, h, fn) {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  fn();
  g.restore();
  rect(g, x - 1, y - 1, w + 2, 1, P.out); rect(g, x - 1, y + h, w + 2, 1, P.out);
  rect(g, x - 1, y, 1, h, P.out); rect(g, x + w, y, 1, h, P.out);
}

// Four golden-hour bands over rows y0..y1, each dithered into the next over its lower 45%.
const SKY = [P.sky0, P.sky1, P.sky2, P.sky3];
function sky(g, x, y0, y1, w, bands = SKY) {
  const n = bands.length, h = y1 - y0;
  for (let y = y0; y < y1; y++) {
    const v = ((y - y0) / h) * (n - 0.001), i = Math.floor(v), lvl = Math.max(0, (v - i - 0.55) / 0.45);
    dither(g, x, y, w, 1, lvl, bands[i], bands[Math.min(n - 1, i + 1)]);
  }
}

// --- scenery (no outline) ------------------------------------------------------------------------------------------------

// A round tree: brown trunk, canopy lit from the upper left, dithered between its lights, dark underside.
function tree(g, tx, base) {
  rect(g, tx - 1, base - 12, 3, 12, P.brown);
  rect(g, tx + 1, base - 12, 1, 12, P.spine);
  rect(g, tx - 2, base - 1, 5, 1, P.g3);
  const cy = base - 19;
  ell(g, tx, cy, 10, 9, (x, y) => (y > cy + 5 ? P.g3 : y < cy - 2 && x < tx + 2 ? (bayer(x, y) < 0.5 ? P.g1 : P.g2) : x > tx + 3 ? (bayer(x, y) < 0.5 ? P.g3 : P.g2) : P.g2));
  ell(g, tx - 4, cy - 4, 3, 2, P.g0);
}

// A pine of three stacked triangles, shaded on its right side.
function pine(g, tx, base) {
  rect(g, tx - 1, base - 6, 3, 6, P.brown);
  for (let i = 0; i < 3; i++) {
    const top = base - 30 + i * 8, hw = 5 + i * 2;
    poly(g, [[tx, top], [tx + hw, top + 12], [tx - hw, top + 12]], x => (x > tx ? P.g3 : P.g2));
  }
}

// The vista panel: sky, sun, far ridge, mid hills with trees and the foreground slope.
function vista(g, x, y, w, h) {
  const bot = y + h;
  sky(g, x, y, y + Math.round(h * 0.78), w);
  const sx = x + 92, sy = y + 18;  // sun with a dithered halo; its mixed halo colour is snapped to the palette
  ell(g, sx, sy, 18, 18, (i, j) => (bayer(i, j) < (1 - Math.hypot(i - sx, j - sy) / 18) * 0.9 ? snap(mix(P.sky3, P.cream, 0.5)) : null));
  ell(g, sx, sy, 9, 9, P.sun);
  ell(g, sx - 2, sy - 2, 5, 3, (i, j) => (bayer(i, j) < 0.5 ? P.cream : P.sun));
  for (const [cx, cy, cw] of [[x + 24, y + 7, 22], [x + 62, y + 12, 16]]) {  // two clouds
    ell(g, cx, cy, cw / 2, 3, P.cream);
    ell(g, cx - 3, cy - 3, cw / 4, 3, P.cream);
    rect(g, cx - cw / 2 + 3, cy + 2, cw - 6, 1, P.sky3);
  }
  for (let i = 0; i < w; i++) {  // the far ridge, hazy purple, and the mid hills in front of it
    const rx = x + i, ry = y + 19 + Math.round(5 * Math.sin(i / 16 + 1) + 2 * Math.sin(i / 5.5));
    rect(g, rx, ry, 1, bot - ry, P.pant);
    dither(g, rx, ry, 1, 3, 0.5, P.pant, P.sky0);
    const hy = y + 25 + Math.round(3 * Math.sin(i / 11 + 2) + Math.sin(i / 4));
    rect(g, rx, hy, 1, bot - hy, P.g2);
    px(g, rx, hy, P.g1);
  }
  for (let i = 0; i < w; i++) {  // the foreground slope, climbing to the right
    const fy = y + 34 - Math.round(i * 0.05);
    for (let j = fy; j < bot; j++) px(g, x + i, j, bayer(x + i, j) < Math.max(0, (j - fy - 1) / 6) ? P.g1 : P.g0);
    px(g, x + i, fy, P.g1);
  }
  for (const [i, j] of [[40, 27], [48, 26], [56, 28], [122, 30]]) { ell(g, x + i, y + j - 4, 3, 4, P.g3); rect(g, x + i, y + j - 1, 1, 2, P.spine); }  // far trees
  pine(g, x + 108, y + 30);
  pine(g, x + 99, y + 32);
  tree(g, x + 20, y + 39);
  for (const [i, j] of [[8, 38], [36, 37], [60, 38], [78, 37], [92, 38]]) { px(g, x + i, y + j, P.g3); px(g, x + i - 1, y + j - 1, P.g3); px(g, x + i + 1, y + j - 1, P.g3); }
}

// --- sprites (drawn on the sprite layer; outline() wraps them) -----------------------------------------------------------

// A pen for one sprite: coordinates are relative to its feet at (x, y), +x is forward, and d = 1 faces right, -1 left.
// E is an ellipse, R a rectangle, Q a polygon (all with c as a colour or fn(dx, dy)), L a line of w x 1 pixels.
function pen(g, x, y, d) {
  const fn = c => (typeof c === "function" ? (i, j) => c(d * (i - x), j - y) : c);
  return {
    E: (cx, cy, rx, ry, c) => ell(g, x + d * cx, y + cy, rx, ry, fn(c)),
    R: (cx, cy, w, h, c) => rect(g, d > 0 ? x + cx : x - cx - w, y + cy, w, h, c),
    Q: (pts, c) => poly(g, pts.map(([a, b]) => [x + d * a, y + b]), fn(c)),
    L: (pts, w, c) => {
      for (let i = 0; i + 1 < pts.length; i++) {
        const [a, b] = [pts[i], pts[i + 1]], n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
        for (let k = 0; k <= n; k++) rect(g, d > 0 ? x + Math.round(a[0] + ((b[0] - a[0]) * k) / n) : x - Math.round(a[0] + ((b[0] - a[0]) * k) / n) - w, y + Math.round(a[1] + ((b[1] - a[1]) * k) / n), w, 1, c);
      }
    },
  };
}

// A rabbit, about 41 px tall sitting up and 28 px hunched over its phone, with its feet at (x, y).
function rabbit(g, x, y, d, hunch) {
  const { E, R, Q } = pen(g, x, y, d);
  E(-9, -6, 3, 3, P.cream);  // tail
  E(-2, -7, 8, 7, (i, j) => (j > -3 ? P.furd : P.fur));  // haunch
  E(4, -1.5, 6, 2, P.fur);  // hind foot, forward along the ground
  if (!hunch) {
    Q([[1, -24], [6, -24], [-1, -38], [-4, -37]], P.furd);  // far ear
    E(2, -13, 6.5, 8, P.fur);  // chest
    E(6, -12, 2.5, 5, P.cream);  // belly
    E(6, -21, 7, 6, P.fur);  // head
    E(11, -19, 3, 2.5, P.cream);  // muzzle
    R(13, -20, 1, 1, P.hood); R(9, -22, 1, 2, P.out); R(8, -19, 1, 1, P.pink);
    Q([[3, -25], [8, -25], [2, -41], [-1, -39]], P.fur);  // near ear
    Q([[4, -27], [6, -27], [2, -38], [1, -37]], P.pink);
    E(8, -6, 2, 4, P.fur);  // a paw on the knee
    return;
  }
  E(3, -11, 7, 7, P.fur);  // rounded back, leaning in
  E(7, -9, 3, 4, P.cream);  // belly
  E(9, -15, 6, 5.5, P.fur);  // head, tipped down over the screen
  E(14, -13, 3, 2.3, P.cream);  // muzzle
  R(16, -14, 1, 1, P.hood); R(12, -16, 1, 2, P.out); R(11, -13, 1, 1, P.pink);
  Q([[6, -19], [11, -19], [0, -26], [-3, -22]], P.fur);  // ears laid back
  Q([[6, -19], [9, -19], [1, -24], [0, -22]], P.pink);
  R(14, -9, 9, 9, P.pant); R(15, -8, 7, 7, P.white); R(16, -6, 5, 1, P.sky2); R(16, -4, 3, 1, P.sky2);  // the phone, lit, in both paws
  R(22, -9, 1, 9, P.pantd);
  E(13, -4, 2, 2, P.fur); E(22, -3, 1.5, 2, P.fur);
}

// A fox sitting, about 33 px tall: orange, pointed ears, a long snout and a bushy tail with a white tip curled round its feet.
function fox(g, x, y, d) {
  const { E, R, Q } = pen(g, x, y, d);
  Q([[7, -25], [12, -25], [11, -33]], P.foxd);  // far ear
  E(-4, -6, 7, 6, (i, j) => (j > -3 ? P.foxd : P.fox));  // haunch
  E(2, -1.5, 6, 1.8, P.fox);
  E(2, -12, 6, 8, P.fox);  // chest
  E(5, -11, 3, 6, P.cream);  // white bib
  R(4, -9, 3, 9, P.fox);  // front leg
  R(4, -4, 3, 4, P.spine);  // dark sock
  E(7, -21, 6, 5, P.fox);  // head
  E(8, -18, 4.5, 2.3, P.cream);  // cheek
  Q([[11, -23], [19, -20], [11, -17]], P.fox);  // snout
  Q([[11, -20], [19, -20], [11, -17]], P.cream);
  R(18, -21, 2, 2, P.spine); R(11, -23, 1, 2, P.out);
  Q([[2, -24], [8, -25], [3, -34]], P.fox);  // near ear
  Q([[3, -26], [6, -26], [3, -31]], P.spine);
  E(-9, -3, 7, 3, P.fox);  // tail along the ground behind
  E(-14, -6, 4, 3.5, P.fox);
  E(-17, -8, 2.5, 2.5, P.cream);  // white tip
}

// A hedgehog, about 17 px tall: a spiky brown back and a pale face.
function hedgehog(g, x, y, d) {
  const { E, R, Q } = pen(g, x, y, d);
  Q([[-10, -1], [-11, -5], [-9, -7], [-11, -9], [-8, -10], [-9, -13], [-5, -12], [-5, -16], [-1, -13], [1, -17], [3, -13], [6, -15], [6, -11], [9, -9], [9, -1]],
    (i, j) => ((i * 3 + j) % 4 === 0 ? P.tan : (i + j) % 3 === 0 ? P.spine : P.brown));  // spines
  E(8, -5, 4.5, 4.5, P.rose);  // face
  E(12, -4, 2.5, 2, P.rose);  // snout
  R(14, -5, 2, 2, P.spine); R(9, -7, 1, 2, P.out);
  E(5, -8, 1.5, 1.5, P.rosed);  // ear
  R(1, -2, 3, 2, P.rosed); R(-5, -2, 3, 2, P.rosed);  // feet
}

// A deer sitting side-on, about 52 px tall with the antlers: tan with a dappled back, a long neck and a pale muzzle.
function deer(g, x, y, d) {
  const { E, R, Q, L } = pen(g, x, y, d);
  R(2, -12, 3, 12, P.brown); R(2, -2, 4, 2, P.spine);  // far front leg
  E(-12, -10, 2.5, 2.5, P.cream);  // tail
  E(-7, -8, 9, 8, (i, j) => (j > -3 ? P.brown : P.tan));  // haunch
  E(1, -1.5, 8, 1.8, P.tan);  // hind foot along the ground
  R(8, -2, 3, 2, P.spine);  // its hoof
  E(0, -14, 11, 7, P.tan);  // body
  E(5, -19, 6.5, 8.5, P.tan);  // chest
  E(2, -9, 6, 2.5, P.cream);  // belly
  R(6, -12, 3, 12, P.tan); R(6, -2, 4, 2, P.spine);  // near front leg
  Q([[2, -20], [10, -21], [17, -33], [12, -37]], P.tan);  // neck, leaning forward
  E(10, -27, 2, 4, P.cream);  // throat patch
  E(15, -36, 4.5, 3.5, P.tan);  // head
  E(20, -34, 3.5, 2.3, P.cream);  // muzzle
  R(22, -35, 2, 2, P.spine); R(16, -37, 1, 2, P.out);
  Q([[10, -37], [13, -38], [6, -43], [4, -40]], P.tan);  // ear
  Q([[9, -39], [11, -39], [7, -42], [6, -41]], P.pink);
  for (const beam of [[[14, -37], [12, -44], [11, -49]], [[12, -44], [17, -46]], [[11, -47], [7, -49]], [[11, -49], [14, -52]]]) L(beam, 2, P.rose);  // antlers
  for (const [dx, dy] of [[-5, -19], [-1, -21], [3, -20], [-8, -15], [-3, -15], [2, -14]]) R(dx, dy, 1, 1, P.cream);  // dappled back
}

// --- picnic props ---------------------------------------------------------------------------------------------------------

// The rug seen side-on: four rows of red and white check with a darker hem. Its top edge is at y.
function rug(g, x, y, w) {
  for (let j = 0; j < 3; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, (Math.floor(i / 3) + j) & 1 ? P.white : P.hood);
  rect(g, x, y + 3, w, 1, P.hoodd);
}

// A wicker basket with a gingham cloth over the top and a carrot's leaves poking out, base at y.
function basket(g, x, y) {
  rect(g, x + 1, y - 17, 1, 7, P.brown); rect(g, x + 14, y - 17, 1, 7, P.brown); rect(g, x + 1, y - 18, 14, 1, P.brown);  // handle
  for (let j = 0; j < 8; j++) for (let i = 0; i < 16; i++) if (i >= (j >> 2) && i < 16 - (j >> 2)) px(g, x + i, y - 8 + j, (i + j) & 1 ? P.tan : P.brown);
  for (let i = 0; i < 16; i += 2) { rect(g, x + i, y - 11, 2, 3, (i >> 1) & 1 ? P.white : P.hood); }  // cloth
  rect(g, x - 1, y - 9, 18, 1, P.hoodd);
  rect(g, x + 5, y - 15, 2, 4, P.g1); rect(g, x + 8, y - 14, 2, 3, P.g2);  // leaves
}

// A carrot lying on the rug, tip to the right, with leaves at the left.
function carrot(g, x, y) {
  poly(g, [[x + 3, y - 6], [x + 15, y - 3.5], [x + 3, y - 1]], (i, j) => (j >= y - 3 ? P.foxd : P.fox));
  rect(g, x - 1, y - 6, 4, 2, P.g1); rect(g, x, y - 4, 3, 2, P.g2);
}

// A tree stump with its rings, base at y; a phone lies on it face down: its back, a camera bump and a thin edge.
function stump(g, x, y) {
  rect(g, x, y - 10, 15, 10, P.brown);
  rect(g, x + 11, y - 10, 4, 10, P.spine);
  rect(g, x + 3, y - 4, 1, 4, P.spine); rect(g, x + 7, y - 7, 1, 7, P.spine);
  ell(g, x + 7.5, y - 10, 7.5, 2.2, P.tan);
  rect(g, x + 4, y - 11, 6, 1, P.rosed); px(g, x + 6, y - 10, P.brown);
  rect(g, x + 3, y - 13, 10, 3, P.pant);  // the phone, face down
  rect(g, x + 3, y - 11, 10, 1, P.pantd);
  rect(g, x + 4, y - 14, 3, 1, P.pantd);
}

// A heart pop (7x6) and a sparkle (5x5), top-left at (x, y).
function heart(g, x, y) {
  ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"].forEach((row, j) => [...row].forEach((on, i) => on === "1" && px(g, x + i, y + j, j === 0 && i < 3 ? P.white : j > 2 ? P.hoodd : P.hood)));
}
function sparkle(g, x, y) {
  rect(g, x + 2, y, 1, 5, P.sun); rect(g, x, y + 2, 5, 1, P.sun); px(g, x + 2, y + 2, P.white);
}

// --- the sheet -----------------------------------------------------------------------------------------------------------

// The ground of a panel: sky bands above, a dithered meadow from y0 down to the panel bottom.
function meadow(g, x, y, w, h, y0, bands) {
  sky(g, x, y, y0, w, bands);
  for (let j = y0; j < y + h; j++) for (let i = x; i < x + w; i++) px(g, i, j, bayer(i, j) < Math.max(0, (j - y0 - 1) / 4) ? P.g2 : P.g1);
  rect(g, x, y0, w, 1, P.g0);
}

export function draw(ctx, t, W, H, st) {
  const { lo, spr } = st, X = 7, PW = 121;
  rect(lo, 0, 0, LW, LH, P.cream);
  spr.clearRect(0, 0, LW, LH);
  const label = (s, y) => type(lo, s, X, y, 1, P.out);
  let y = 3;

  // the vista: sky bands, sun, ridge, trees
  label("THE VISTA", y);
  y += 7;
  panel(lo, X, y, PW, 40, () => vista(lo, X, y, PW, 40));
  y += 40 + 4;

  // the friends: fox, deer, hedgehog (the rabbit sits in the picnic below)
  label("FOX DEER HEDGEHOG", y);
  y += 7;
  const fh = 58, feet = y + fh - 4;
  panel(lo, X, y, PW, fh, () => {
    meadow(lo, X, y, PW, fh, feet, [P.sky1, P.sky2, P.sky3]);
    for (const i of [14, 36, 62, 84, 104]) { px(lo, X + i, feet + 2, P.g3); px(lo, X + i - 1, feet + 1, P.g3); px(lo, X + i + 1, feet + 1, P.g3); }
  });
  fox(spr, 31, feet, 1);
  deer(spr, 70, feet, 1);
  hedgehog(spr, 114, feet, -1);
  shadow(lo, 32, feet + 1, 14, P.g3);
  shadow(lo, 68, feet + 1, 14, P.g3);
  shadow(lo, 112, feet + 1, 11, P.g3);
  y += fh + 4;

  // the picnic: rug, rabbit hunched over its phone, basket, carrot, rabbit sitting, stump with the phone face down, pops
  label("THE PICNIC", y);
  y += 7;
  const ph = 48, rt = y + ph - 5;
  panel(lo, X, y, PW, ph, () => meadow(lo, X, y, PW, ph, rt, [P.sky2, P.sky3]));
  rug(spr, X + 3, rt, 96);
  rabbit(spr, 22, rt, 1, true);
  basket(spr, 47, rt);
  carrot(spr, 69, rt);
  rabbit(spr, 94, rt, 1, false);
  stump(spr, 109, rt);
  heart(spr, 103, y + 7);
  sparkle(spr, 119, y + 9);
  y += ph + 4;

  // sample of the caption type: the hook, white then amber, with a one-pixel dark shadow
  const dh = 46;
  panel(lo, X, y, PW, dh, () => {
    sky(lo, X, y, y + dh, PW, [P.sky0, P.sky1, P.sky2]);
    [["PUT THE PHONE", P.white], ["DOWN.", P.white], ["YOUR FRIENDS", P.sun], ["ARE HERE.", P.sun]].forEach(([s, c], i) => {
      const tx = X + Math.floor((PW - typeW(s, 2)) / 2), ty = y + 2 + i * 11;
      type(lo, s, tx + 1, ty + 1, 2, P.out);
      type(lo, s, tx, ty, 2, c);
    });
  });
  y += dh + 4;

  // the palette, one swatch per colour
  const cols = Object.values(P), sw = 4, x0 = X + Math.floor((PW - cols.length * sw) / 2);
  rect(lo, x0 - 1, y - 1, cols.length * sw + 2, 8, P.out);
  cols.forEach((c, i) => rect(lo, x0 + i * sw, y, sw, 6, c));

  outline(spr, P.out);
  lo.drawImage(spr.canvas, 0, 0);
  blit(ctx, lo, W, H);
}
