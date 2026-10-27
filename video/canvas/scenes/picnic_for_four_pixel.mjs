// "picnic_for_four_pixel": a blue rabbit sits on a picnic rug hunched over its phone; a fox, a deer and a hedgehog turn up with a
// basket and try to get its attention; it puts the phone face down on a stump and the four share a carrot and sit together at
// golden hour. Side-on pixel art in the approved style sheet's look: a 135x240 palette-locked canvas scaled x8, Bayer-dithered
// sky, a one-pixel outline round every sprite. Every frame is a pure function of t; see picnic_for_four_pixel.md for the prompt.
import { rng, prog, easeOut, easeIo, lerp } from "../ink.mjs";
import { mix, endCard, grainPattern, CLOSING, STORE } from "../cel.mjs";
import { lowres, blit, snapper, rect, px, ell, poly, outline, bitText, bitWidth, shadow, bayer } from "../pixel.mjs";

export const DURATION = 18, COVER = 12.8;
// The lofi bed (lofiArgv in audio.mjs): a buzz as the phone shakes, a thunk as it goes face down, a hop sound per bounce, a sparkle.
export const SOUND = { kind: "lofi", bpm: 74, buzz: [1.2, 3], thunk: 9, hops: [9.6, 10.4, 11.2] };
export const SCENES = [{ name: "picnic", from: 0, to: 15.4 }, { name: "end", from: 14.6, to: DURATION }];
export const CAPTIONS = [
  { from: 0, to: 3.8, lines: [["Put the phone down."], ["Your friends are here."]] },
  { from: 4.2, to: 8, lines: [["They've been waiting."]] },
  { from: 8.4, to: 12, lines: [["Share the snack,"], ["not the screen."]] },
  { from: 12.2, to: 14.6, lines: [["Best company there is."]] },
];
export const END = { from: 14.8, title: "WildFocus", lines: CLOSING, store: STORE };
// Review gate 2: the still for each beat, with the line it carries (node video/canvas/render.mjs picnic_for_four_pixel --sheet OUT.png "0.5,2.5,...").
export const BEATS = [
  { t: 0.5, word: "Hook", say: "The rabbit is hunched over its phone on the rug; the hook is up from frame 0." },
  { t: 2.5, word: "Friends arrive", say: "The fox with the basket, the deer and the hedgehog walk in one by one." },
  { t: 3.2, word: "Buzz", say: "The phone buzzes and shakes; all three have settled round the rug." },
  { t: 5.2, word: "Nudge", say: "The hedgehog scoots over and nudges the rabbit." },
  { t: 7.8, word: "Wave", say: "After the deer's head tilt, the fox waves a paw." },
  { t: 9.2, word: "Phone down", say: "The rabbit looked up and the phone is face down on the stump, a puff of dust." },
  { t: 10.4, word: "Picnic", say: "A carrot goes round, hearts pop, everyone hops." },
  { t: 13, word: "Golden hour", say: "The four sit close together as the sky warms; a sparkle pop." },
  { t: 15.5, word: "End card", say: "The shared closing card." },
];

const LW = 135, LH = 240;
const P = {  // the style sheet's palette, 26 colours, unchanged
  out: "#2e2030", white: "#fff8ee", cream: "#ffecca", sky0: "#f39a8c", sky1: "#f8b48e", sky2: "#fccf98", sky3: "#ffe4ae", sun: "#ffc84c",
  g0: "#b6d66e", g1: "#7cba5c", g2: "#4e9656", g3: "#2f6a4a", fur: "#8cbaf8", furd: "#5f82d6", pink: "#fa9fb6",
  hood: "#f06e5e", hoodd: "#bf454f", pant: "#6f62ac", pantd: "#4a4282", fox: "#ee8034", foxd: "#a9492b", tan: "#d6995c",
  brown: "#8f5e3d", spine: "#5c3f35", rose: "#e2c8bc", rosed: "#c89c8c",
};
const snap = snapper(Object.values(P));

export function setup(doc, W, H, { icon }) {
  const all = Object.values(P);
  return { icon, tile: grainPattern(doc, 5), lo: lowres(doc, LW, LH, all), spr: lowres(doc, LW, LH, all) };
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

// --- sprites (each drawn on a clear layer and outlined on its own, so overlapping animals keep their edges) ---------------

// A pen for one sprite: coordinates are relative to its feet at (x, y), +x is forward, and d = 1 faces right, -1 left.
// E is an ellipse, R a rectangle, Q a polygon (all with c as a colour or fn(dx, dy)), L a line of w x 1 pixels.
function pen(g, x, y, d) {
  const fn = c => (typeof c === "function" ? (i, j) => c(d * (i - x), j - y) : c);
  const X = (a, w) => (d > 0 ? x + a : x - a - w);
  return {
    E: (cx, cy, rx, ry, c) => ell(g, x + d * cx, y + cy, rx, ry, fn(c)),
    R: (cx, cy, w, h, c) => rect(g, X(cx, w), y + cy, w, h, c),
    Q: (pts, c) => poly(g, pts.map(([a, b]) => [x + d * a, y + b]), fn(c)),
    L: (pts, w, c) => {
      for (let i = 0; i + 1 < pts.length; i++) {
        const [a, b] = [pts[i], pts[i + 1]], n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
        for (let k = 0; k <= n; k++) rect(g, X(Math.round(a[0] + ((b[0] - a[0]) * k) / n), w), y + Math.round(a[1] + ((b[1] - a[1]) * k) / n), w, 1, c);
      }
    },
  };
}
const eye = (R, cx, cy, lid) => (lid ? R(cx, cy + 1, 1, 1, P.out) : R(cx, cy, 1, 2, P.out));

// A rabbit, 41 px tall sitting up and 28 px hunched over its phone. o: hunch, lid (blink), scroll (the thumb's step), shake [dx, dy]
// and flash for the buzzing phone, arm (holding the phone out, on its way to the stump).
function rabbit(g, x, y, d, o = {}) {
  const { E, R, Q } = pen(g, x, y, d);
  E(-9, -6, 3, 3, P.cream);  // tail
  E(-2, -7, 8, 7, (i, j) => (j > -3 ? P.furd : P.fur));  // haunch
  E(4, -1.5, 6, 2, P.fur);  // hind foot, forward along the ground
  if (!o.hunch) {
    Q([[1, -24], [6, -24], [-1, -38], [-4, -37]], P.furd);  // far ear
    E(2, -13, 6.5, 8, P.fur);  // chest
    E(6, -12, 2.5, 5, P.cream);  // belly
    E(6, -21, 7, 6, P.fur);  // head
    E(11, -19, 3, 2.5, P.cream);  // muzzle
    R(13, -20, 1, 1, P.hood); eye(R, 9, -22, o.lid); R(8, -19, 1, 1, P.pink);
    Q([[3, -25], [8, -25], [2, -41], [-1, -39]], P.fur);  // near ear
    Q([[4, -27], [6, -27], [2, -38], [1, -37]], P.pink);
    if (!o.arm) return E(8, -6, 2, 4, P.fur);  // a paw on the knee
    for (let i = 0; i < 4; i++) E(8 + i * 3, -13 - i * 1.5, 2.2, 2.4, P.fur);  // the arm out, holding the phone up
    R(15, -26, 9, 9, P.pant); R(16, -25, 7, 7, P.white); R(17, -23, 5, 1, P.sky2); R(17, -21, 3, 1, P.sky2); R(23, -26, 1, 9, P.pantd);
    return E(16, -17, 2.4, 2.4, P.fur);
  }
  const [sx, sy] = o.shake || [0, 0], sc = o.scroll || 0;
  E(3, -11, 7, 7, P.fur);  // rounded back, leaning in
  E(7, -9, 3, 4, P.cream);  // belly
  E(9, -15, 6, 5.5, P.fur);  // head, tipped down over the screen
  E(14, -13, 3, 2.3, P.cream);  // muzzle
  R(16, -14, 1, 1, P.hood); eye(R, 12, -16, o.lid); R(11, -13, 1, 1, P.pink);
  Q([[6, -19], [11, -19], [0, -26], [-3, -22]], P.fur);  // ears laid back
  Q([[6, -19], [9, -19], [1, -24], [0, -22]], P.pink);
  R(14 + sx, -9 + sy, 9, 9, P.pant); R(15 + sx, -8 + sy, 7, 7, o.flash ? P.sun : P.white); R(23 + sx - 1, -9 + sy, 1, 9, P.pantd);  // the phone, lit
  for (let n = 0; n < 2; n++) R(16 + sx, -7 + sy + ((sc + n * 3) % 6), 5, 1, P.sky2);  // the feed scrolling up
  E(13 + sx, -4 + sy, 2, 2, P.fur); E(22 + sx, -3 + sy - (sc & 1), 1.5, 2, P.fur);  // paws, the thumb flicking
}

// A fox sitting, about 33 px tall: orange, pointed ears, a long snout and a bushy tail with a white tip. o: lid, wave (0 none, 1-2 the
// raised paw's two frames).
function fox(g, x, y, d, o = {}) {
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
  R(18, -21, 2, 2, P.spine); eye(R, 11, -23, o.lid);
  Q([[2, -24], [8, -25], [3, -34]], P.fox);  // near ear
  Q([[3, -26], [6, -26], [3, -31]], P.spine);
  E(-9, -3, 7, 3, P.fox);  // tail along the ground behind
  E(-14, -6, 4, 3.5, P.fox);
  E(-17, -8, 2.5, 2.5, P.cream);  // white tip
  if (o.wave) {  // the other front paw up and waving
    const w = o.wave - 1;
    for (let i = 0; i < 4; i++) E(8 + i * 3, -13 - i * 4, 2, 2.2, P.fox);  // the arm reaching forward and up, clear of the head
    E(20 + w * 3, -30 - w, 2.4, 2.4, P.spine);
  }
}

// A hedgehog, about 17 px tall: a spiky brown back and a pale face.
function hedgehog(g, x, y, d, o = {}) {
  const { E, R, Q } = pen(g, x, y, d);
  Q([[-10, -1], [-11, -5], [-9, -7], [-11, -9], [-8, -10], [-9, -13], [-5, -12], [-5, -16], [-1, -13], [1, -17], [3, -13], [6, -15], [6, -11], [9, -9], [9, -1]],
    (i, j) => ((i * 3 + j) % 4 === 0 ? P.tan : (i + j) % 3 === 0 ? P.spine : P.brown));  // spines
  E(8, -5, 4.5, 4.5, P.rose);  // face
  E(12, -4, 2.5, 2, P.rose);  // snout
  R(14, -5, 2, 2, P.spine); eye(R, 9, -7, o.lid);
  E(5, -8, 1.5, 1.5, P.rosed);  // ear
  R(1, -2, 3, 2, P.rosed); R(-5, -2, 3, 2, P.rosed);  // feet
}

// A deer sitting side-on, about 52 px tall with the antlers. o: lid, tilt (0..1: the head dips and leans forward).
function deer(g, x, y, d, o = {}) {
  const { E, R, Q, L } = pen(g, x, y, d), tl = o.tilt || 0, hx = Math.round(4 * tl), hy = Math.round(3 * tl);
  R(2, -12, 3, 12, P.brown); R(2, -2, 4, 2, P.spine);  // far front leg
  E(-12, -10, 2.5, 2.5, P.cream);  // tail
  E(-7, -8, 9, 8, (i, j) => (j > -3 ? P.brown : P.tan));  // haunch
  E(1, -1.5, 8, 1.8, P.tan);  // hind foot along the ground
  R(8, -2, 3, 2, P.spine);  // its hoof
  E(0, -14, 11, 7, P.tan);  // body
  E(5, -19, 6.5, 8.5, P.tan);  // chest
  E(2, -9, 6, 2.5, P.cream);  // belly
  R(6, -12, 3, 12, P.tan); R(6, -2, 4, 2, P.spine);  // near front leg
  Q([[2, -20], [10, -21], [17 + hx, -33 + hy], [12 + hx, -37 + hy]], P.tan);  // neck, leaning forward
  E(10 + hx / 2, -27 + hy / 2, 2, 4, P.cream);  // throat patch
  E(15 + hx, -36 + hy, 4.5, 3.5, P.tan);  // head
  E(20 + hx, -34 + hy, 3.5, 2.3, P.cream);  // muzzle
  R(22 + hx, -35 + hy, 2, 2, P.spine); eye(R, 16 + hx, -37 + hy, o.lid);
  Q([[10 + hx, -37 + hy], [13 + hx, -38 + hy], [6 + hx, -43 + hy], [4 + hx, -40 + hy]], P.tan);  // ear
  Q([[9 + hx, -39 + hy], [11 + hx, -39 + hy], [7 + hx, -42 + hy], [6 + hx, -41 + hy]], P.pink);
  const ant = ([a, b]) => [a + hx + Math.round(tl * (-b - 37) * 0.2), b + hy];
  for (const beam of [[[14, -37], [12, -44], [11, -49]], [[12, -44], [17, -46]], [[11, -47], [7, -49]], [[11, -49], [14, -52]]]) L(beam.map(ant), 2, P.rose);  // antlers
  for (const [dx, dy] of [[-5, -19], [-1, -21], [3, -20], [-8, -15], [-3, -15], [2, -14]]) R(dx, dy, 1, 1, P.cream);  // dappled back
}

// --- props -----------------------------------------------------------------------------------------------------------------

// A wicker basket with a gingham cloth over the top and a carrot's leaves poking out, base at y.
function basket(g, x, y) {
  rect(g, x + 1, y - 17, 1, 7, P.brown); rect(g, x + 14, y - 17, 1, 7, P.brown); rect(g, x + 1, y - 18, 14, 1, P.brown);  // handle
  for (let j = 0; j < 8; j++) for (let i = 0; i < 16; i++) if (i >= (j >> 2) && i < 16 - (j >> 2)) px(g, x + i, y - 8 + j, (i + j) & 1 ? P.tan : P.brown);
  for (let i = 0; i < 16; i += 2) rect(g, x + i, y - 11, 2, 3, (i >> 1) & 1 ? P.white : P.hood);  // cloth
  rect(g, x - 1, y - 9, 18, 1, P.hoodd);
  rect(g, x + 5, y - 15, 2, 4, P.g1); rect(g, x + 8, y - 14, 2, 3, P.g2);  // leaves
}

// A carrot, tip to the right, with leaves at the left; its leaves' top-left is (x, y - 6).
function carrot(g, x, y) {
  poly(g, [[x + 3, y - 6], [x + 15, y - 3.5], [x + 3, y - 1]], (i, j) => (j >= y - 3 ? P.foxd : P.fox));
  rect(g, x - 1, y - 6, 4, 2, P.g1); rect(g, x, y - 4, 3, 2, P.g2);
}

// A tree stump with its rings, base at y; with the phone on it face down: its back, a camera bump and a thin edge.
function stump(g, x, y, phone) {
  rect(g, x, y - 10, 15, 10, P.brown);
  rect(g, x + 11, y - 10, 4, 10, P.spine);
  rect(g, x + 3, y - 4, 1, 4, P.spine); rect(g, x + 7, y - 7, 1, 7, P.spine);
  ell(g, x + 7.5, y - 10, 7.5, 2.2, P.tan);
  rect(g, x + 4, y - 11, 6, 1, P.rosed); px(g, x + 6, y - 10, P.brown);
  if (!phone) return;
  rect(g, x + 3, y - 13, 10, 3, P.pant);
  rect(g, x + 3, y - 11, 10, 1, P.pantd);
  rect(g, x + 4, y - 14, 3, 1, P.pantd);
}

// A lit phone in the air (9x9), top-left at (x, y).
function phoneLit(g, x, y) {
  rect(g, x, y, 9, 9, P.pant); rect(g, x + 1, y + 1, 7, 7, P.white); rect(g, x + 2, y + 3, 5, 1, P.sky2); rect(g, x + 2, y + 5, 3, 1, P.sky2); rect(g, x + 8, y, 1, 9, P.pantd);
}

// A heart pop (7x6) and a sparkle (r = 1 or 2: a plus of 3 or 5 pixels), top-left / centre at (x, y).
function heart(g, x, y) {
  ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"].forEach((row, j) => [...row].forEach((on, i) => on === "1" && px(g, x + i, y + j, j === 0 && i < 3 ? P.white : j > 2 ? P.hoodd : P.hood)));
}
function sparkle(g, x, y, r) {
  rect(g, x, y - r, 1, 2 * r + 1, P.sun); rect(g, x - r, y, 2 * r + 1, 1, P.sun); px(g, x, y, P.white);
}

// The picnic rug, a checked mat seen from slightly above: red and white 4x3 cells, a dark outline and a darker hem along the front.
function rug(g, x, y, w, h) {
  rect(g, x - 1, y - 1, w + 2, h + 2, P.out);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, j >= h - 2 ? P.hoodd : (Math.floor(i / 4) + Math.floor(j / 3)) & 1 ? P.white : P.hood);
}

// --- the world -------------------------------------------------------------------------------------------------------------

const GOLD = [P.sky0, P.sky1, P.sky2, P.sky3], DAY = [P.sky1, P.sky2, P.sky3, P.cream];
const HORIZON = 140;

// Sky bands dithered into the next over their lower 45%; w (0..1) fades the afternoon bands to the golden-hour ones, dithered too.
function sky(g, w) {
  for (let y = 0; y < HORIZON; y++) {
    const v = (y / HORIZON) * 3.999, i = Math.floor(v), lvl = Math.max(0, (v - i - 0.55) / 0.45);
    for (let x = 0; x < LW; x++) {
      const b = bayer(x + 2, y + 1) < w ? GOLD : DAY;
      px(g, x, y, bayer(x, y) < lvl ? b[Math.min(3, i + 1)] : b[i]);
    }
  }
}

const RUG = { x: 3, y: 174, w: 129, h: 26 };

// Sky, drifting clouds, a sinking sun, the far ridge, hills with trees and a dithered meadow with tufts.
function world(g, t) {
  const w = easeIo(prog(t, 12, 14.4));
  sky(g, w);
  const sx = 92, sy = Math.round(88 + 14 * easeIo(prog(t, 0, 14.4)));  // the sun sinks all video; its mixed halo colour is snapped to the palette
  ell(g, sx, sy, 18, 18, (i, j) => (bayer(i, j) < (1 - Math.hypot(i - sx, j - sy) / 18) * 0.9 ? snap(mix(P.sky3, P.cream, 0.5)) : null));
  ell(g, sx, sy, 9, 9, P.sun);
  ell(g, sx - 2, sy - 2, 5, 3, (i, j) => (bayer(i, j) < 0.5 ? P.cream : P.sun));
  for (const [cx, cy, cw, sp] of [[24, 76, 22, 1.4], [62, 90, 16, 1]]) {  // two clouds drifting right, wrapping round
    const x = ((Math.round(cx + t * sp) + 30) % 195) - 30;
    ell(g, x, cy, cw / 2, 3, P.cream);
    ell(g, x - 3, cy - 3, cw / 4, 3, P.cream);
    rect(g, x - cw / 2 + 3, cy + 2, cw - 6, 1, P.sky3);
  }
  for (let i = 0; i < LW; i++) {  // the far ridge, hazy purple, and the mid hills in front of it
    const ry = 108 + Math.round(5 * Math.sin(i / 16 + 1) + 2 * Math.sin(i / 5.5));
    rect(g, i, ry, 1, LH - ry, P.pant);
    for (let j = ry; j < ry + 3; j++) px(g, i, j, bayer(i, j) < 0.5 ? P.sky0 : P.pant);
    const hy = 120 + Math.round(3 * Math.sin(i / 11 + 2) + Math.sin(i / 4));
    rect(g, i, hy, 1, LH - hy, P.g2);
    px(g, i, hy, P.g1);
  }
  for (let y = 136; y < LH; y++) {  // the meadow: light at the horizon, darker towards the viewer, with dithered joins
    const [y1, a, b] = y < 154 ? [154, P.g0, P.g1] : y < 190 ? [190, P.g1, P.g1] : y < 218 ? [218, P.g1, P.g2] : [LH, P.g2, P.g2];
    for (let x = 0; x < LW; x++) px(g, x, y, bayer(x, y) < Math.max(0, (y - (y1 - 8)) / 8) ? b : a);
  }
  for (const [i, j] of [[40, 124], [48, 123], [56, 125], [84, 124], [28, 124]]) { ell(g, i, j - 4, 3, 4, P.g3); rect(g, i, j - 1, 1, 2, P.spine); }  // far trees
  pine(g, 126, 140); pine(g, 116, 142);
  tree(g, 12, 142);
  const r = rng(7);
  for (let n = 0; n < 40; n++) {  // tufts and flowers, always in the same spots, never on the rug
    const x = Math.floor(r() * LW), y = 146 + Math.floor(r() * 92);
    if (x > RUG.x - 3 && x < RUG.x + RUG.w + 3 && y > RUG.y - 3 && y < RUG.y + RUG.h + 5) continue;
    px(g, x, y, P.g3); px(g, x - 1, y - 1, P.g3); px(g, x + 1, y - 1, P.g3);
    if (n % 5 === 0) { px(g, x + 4, y - 3, P.white); px(g, x + 3, y - 3, P.pink); px(g, x + 5, y - 3, P.pink); px(g, x + 4, y - 4, P.pink); px(g, x + 4, y - 2, P.pink); }
  }
  rug(g, RUG.x, RUG.y, RUG.w, RUG.h);
}

// --- the cast's movement ---------------------------------------------------------------------------------------------------

const BUZZ = [1.2, 3], HOPS = [9.6, 10.4, 11.2];
const STUMP = 70, BACK = 182, FRONT = 198;  // the stump's left edge, the back row's and the front row's feet on the rug
const BLINKS = { rabbit: [2.1, 4.9, 7.7, 10.1], fox: [3.6, 6.2, 9.4], deer: [2.8, 5.6, 8.1, 10.9], hog: [3.9, 6.8, 9.9] };
const lid = (t, list) => t < 12 && list.some(b => t >= b && t < b + 0.14);
const hopY = (t, h) => { for (const a of HOPS) { const u = (t - a) / 0.4; if (u >= 0 && u < 1) return -Math.round(h * Math.sin(Math.PI * u)); } return 0; };
const bob = (t, u) => (u > 0 && u < 1 ? -(Math.floor(t * 10) & 1) : 0);  // a two-step walk

// The carrot's rounds: it leaves the basket at 9.2 s and passes fox, rabbit, hedgehog and deer, then lies on the rug.
const ROUND = [[9.2, 38, 181], [9.8, 30, 170], [10.5, 55, 170], [11.1, 86, 184], [11.7, 90, 148], [12.3, 62, 194]];
function carrotAt(t) {
  if (t < ROUND[0][0]) return null;
  for (let i = 0; i + 1 < ROUND.length; i++) {
    const [a, ax, ay] = ROUND[i], [b, bx, by] = ROUND[i + 1];
    if (t < b) { const u = easeIo(prog(t, a, b)); return [lerp(ax, bx, u), lerp(ay, by, u) - (i < ROUND.length - 2 ? 10 * 4 * u * (1 - u) : 0)]; }
  }
  return ROUND.at(-1).slice(1);
}

const HEARTS = [[9.8, 26, 142], [10.5, 50, 132], [11.1, 88, 166], [11.7, 94, 122]];  // when, x, y: above fox, rabbit, hedgehog, deer
const SPARKLES = [[20, 150, 0], [38, 140, 0.1], [66, 128, 0.2], [98, 118, 0.05], [122, 140, 0.15], [80, 150, 0.3]];

// One sprite on its own clear layer, outlined, then onto the scene.
function layer(st, fn) {
  st.spr.clearRect(0, 0, LW, LH);
  fn(st.spr);
  outline(st.spr, P.out);
  st.lo.drawImage(st.spr.canvas, 0, 0);
}

// The caption, in the bitmap font blown up straight onto the 1080 canvas (2 low-res pixels per font pixel), wrapped, dark on the sky with a cream shadow.
function caption(ctx, W, c, t) {
  const k = W / 1080, s = Math.max(1, Math.round(16 * k)), off = Math.max(1, Math.round(8 * k)), maxW = W * 0.9;
  ctx.save();
  ctx.globalAlpha = c.from === 0 ? 1 - prog(t, c.to - 0.2, c.to) : prog(t, c.from, c.from + 0.15) * (1 - prog(t, c.to - 0.2, c.to));
  let y = Math.round(112 * k);
  c.lines.forEach(([text], n) => {
    const rows = [];
    for (const word of text.toUpperCase().split(" ")) {
      const cur = rows.at(-1);
      if (cur !== undefined && typeW(`${cur} ${word}`, s) <= maxW) rows[rows.length - 1] = `${cur} ${word}`;
      else rows.push(word);
    }
    for (const row of rows) {
      const x = Math.round((W - typeW(row, s)) / 2);
      type(ctx, row, x + off, y + off, s, P.cream);
      type(ctx, row, x, y, s, n && c.lines.length > 1 ? P.pantd : P.out);
      y += 6 * s;
    }
  });
  ctx.restore();
}

export function draw(ctx, t, W, H, st) {
  const { lo } = st, settle = easeIo(prog(t, 12, 12.8)), k = W / 1080;
  world(lo, t);

  // where everyone is
  const fu = prog(t, 1, 2.4), du = prog(t, 1.7, 3.1), hu = prog(t, 2.2, 3.4), bu = easeOut(prog(t, 2.4, 3));
  const walkX = lerp(-34, 20, fu);
  const fx = Math.round(walkX + 4 * settle), fy = BACK + bob(t, fu) + hopY(t, 5);
  const dx = Math.round(lerp(170, 112, du) - 2 * settle), dy = BACK + bob(t, du) + hopY(t, 5);
  const slide = easeIo(prog(t, 4.4, 4.9)) - easeIo(prog(t, 5.7, 6.3));
  let bump = 0, jolt = 0;
  for (const a of [5, 5.35]) { const u = (t - a) / 0.18; if (u >= 0 && u < 1) bump = 4 * Math.sin(Math.PI * u); if (t >= a + 0.08 && t < a + 0.2) jolt = 1; }
  const hx = Math.round(lerp(170, 98, hu) - 30 * slide - bump - 6 * settle), hy = FRONT + bob(t, hu) + hopY(t, 4);
  let shake = [0, 0], flash = false, vib = false;
  for (const b of BUZZ) { const dt = t - b; if (dt >= 0 && dt < 0.45) { shake = [(Math.floor(dt * 30) & 1) * 2 - 1, 0]; flash = (Math.floor(dt * 10) & 1) === 0; vib = true; } }
  const rx = 44 + Math.round(2 * settle) + jolt, up = prog(t, 8.3, 8.5) * (1 - prog(t, 8.5, 8.7));
  const ry = BACK + hopY(t, 6) - Math.round(2 * up) - (vib ? 1 : 0) * (Math.floor(t * 30) & 1);
  const sit = t >= 8.3;

  // shadows: a checker under each, on the rug in a darker red, on the grass in green
  for (const [x, y, r] of [[fx, BACK, 14], [rx, BACK, 13], [dx, BACK, 15], [hx, FRONT, 11]]) shadow(lo, x, y + 1, r, x > RUG.x && x < RUG.x + RUG.w ? P.hoodd : P.g3);

  layer(st, g => stump(g, STUMP, BACK, t >= 9));
  layer(st, g => rabbit(g, rx, ry, 1, { hunch: !sit, lid: lid(t, BLINKS.rabbit), scroll: Math.floor(t * 5), shake, flash, arm: t >= 8.35 && t < 8.75 }));
  layer(st, g => fox(g, fx, fy, 1, { lid: lid(t, BLINKS.fox), wave: t >= 7.3 && t < 8.3 ? 1 + (Math.floor(t * 7) & 1) : 0 }));
  layer(st, g => deer(g, dx, dy, -1, { lid: lid(t, BLINKS.deer), tilt: easeIo(prog(t, 6.3, 6.7)) * (1 - easeIo(prog(t, 7, 7.4))) }));
  layer(st, g => basket(g, Math.round(lerp(walkX + 14, 30, bu)), Math.round(lerp(BACK - 2, FRONT, bu) - 4 * Math.sin(Math.PI * bu))));
  layer(st, g => hedgehog(g, hx, hy, -1, { lid: lid(t, BLINKS.hog) }));
  const cp = carrotAt(t);
  if (cp) layer(st, g => carrot(g, Math.round(cp[0]) - 7, Math.round(cp[1]) + 3));
  if (t >= 8.75 && t < 9) {  // the phone on its way to the stump
    const u = easeIo(prog(t, 8.75, 9));
    layer(st, g => phoneLit(g, Math.round(lerp(rx + 15, STUMP + 3, u)), Math.round(lerp(ry - 26, BACK - 22, u) - 6 * 4 * u * (1 - u))));
  }
  for (const [a, x, y] of HEARTS) {
    const u = (t - a) / 0.9;
    if (u >= 0 && u < 1 && (u < 0.75 || (Math.floor(t * 15) & 1))) layer(st, g => heart(g, x, y - Math.round(8 * easeOut(u))));
  }

  // pops drawn straight on the scene: the buzz marks, the dust puff as the phone lands, "ha ha!", the sparkles
  if (vib && !sit && (Math.floor(t * 30) & 1)) for (const x of [rx + 11, rx + 25]) rect(lo, x, ry - 8, 1, 3, P.sun);
  const pu = prog(t, 9, 9.5);
  if (pu > 0 && pu < 1) for (const [ox, oy] of [[-6, 0], [6, 0], [0, -3], [-3, 2], [3, 2]]) ell(lo, STUMP + 8 + ox * (0.5 + pu), BACK - 9 + oy - pu * 3, 2 + pu * 3, 2 + pu * 2, (i, j) => (bayer(i, j) < 1 - pu ? P.cream : null));
  if (t >= 10.3 && t < 11.1) {
    const y = 116 - Math.floor((t - 10.3) * 4);
    type(lo, "HA HA!", 25, y + 1, 2, P.out);
    type(lo, "HA HA!", 24, y, 2, P.white);
  }
  for (const [x, y, d] of SPARKLES) {
    const a = t - 12.6 - d;
    if (a >= 0 && a < 0.9) sparkle(lo, x, y - Math.round(4 * a), a < 0.15 || a > 0.8 ? 0 : a < 0.3 || a > 0.65 ? 1 : 2);
  }

  blit(ctx, lo, W, H);
  for (const c of CAPTIONS) if (t >= c.from && t < c.to) caption(ctx, W, c, t);
  endCard(ctx, t, W, H, { icon: st.icon, from: END.from, tile: st.tile });
}
