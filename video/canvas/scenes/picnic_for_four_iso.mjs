// "picnic_for_four_iso": a rabbit hunched over its phone on a picnic rug while a fox, a deer and a hedgehog hop in with a basket, try to
// get its attention, and win: the phone goes face down on a stump and the four of them share a carrot until golden hour. Isometric pixel
// look: a 135x240 canvas of 20 warm colours, 2:1 tiles, flat faces, no dithering, a one-pixel ink outline round every sprite, x8 nearest
// neighbour. Every frame is a pure function of t; see picnic_for_four_iso.md for the prompt and picnic_for_four_iso_style.mjs for the sheet.
import { rng } from "../ink.mjs";
import { hop } from "../toon.mjs";
import { grainPattern, endCard, CLOSING, STORE } from "../cel.mjs";
import { lowres, blit, rect, px, ell, poly, outline, bitText, bitWidth, rabbit } from "../pixel.mjs";

export const DURATION = 18, COVER = 12.8;
export const END = { from: 14.8, title: "WildFocus", lines: CLOSING, store: STORE };
// The sounds that land on the picture: a buzz as the phone vibrates, a thunk as it goes face down, a boing per hop, a sparkle.
export const SOUND = { kind: "lofi", bpm: 74, buzz: [1.2, 3], thunk: 9, hops: [9.6, 10.4, 11.2], sparkle: 12.6, done: END.from };
export const SCENES = [
  { name: "arrive", from: 0, to: 4 },
  { name: "waiting", from: 3.8, to: 8.6 },
  { name: "picnic", from: 8.4, to: 12.4 },
  { name: "golden", from: 12.2, to: 14.9 },
  { name: "card", from: 14.8, to: DURATION },
];
export const CAPTIONS = [
  { from: 0, to: 3.8, lines: [["Put the phone down."], ["Your friends are here."]] },
  { from: 4.2, to: 8, lines: [["They've been waiting."]] },
  { from: 8.4, to: 12, lines: [["Share the snack,"], ["not the screen."]] },
  { from: 12.2, to: 14.6, lines: [["Best company there is."]] },
];
// Review gate 2: the still for each beat, with the line it carries (node video/canvas/render.mjs picnic_for_four_iso --sheet OUT.png "0.5,2.5,...").
export const BEATS = [
  { t: 0.5, word: "Hook", say: "The rabbit hunched over its phone on the rug; the hook reads from frame 0." },
  { t: 2.5, word: "Friends arrive", say: "The fox, the deer and the hedgehog hop in with a basket." },
  { t: 3.1, word: "Buzz", say: "The phone buzzes and shakes; the rabbit does not look up." },
  { t: 6, word: "Friends try", say: "The hedgehog nudges, the deer peers, the fox waves, one after another." },
  { t: 8.8, word: "Looks up", say: "The rabbit looks up and tosses the phone." },
  { t: 9.2, word: "Phone down", say: "The phone lands face down on the stump with a puff." },
  { t: 10.4, word: "Picnic", say: "A carrot goes round, everyone hops, a laugh." },
  { t: 13, word: "Golden hour", say: "The four sit close as the sky warms; a sparkle." },
  { t: 15.5, word: "End card", say: "The shared closing card." },
];

const LW = 135, LH = 240, OX = 67, OY = 146, H0 = 122;
const C = {
  ink: "#3a2838", plum: "#5a3b50", dusk: "#7a5a70", ridge: "#c58a85", cream: "#fbe6c8", skyB: "#f8d4ad", pink: "#f0a29a", sun: "#ffd36b",
  grassA: "#8fbf63", grassB: "#78a85a", leaf: "#447a4a", soilL: "#b8704b", soilR: "#93563b", orange: "#e8863a", straw: "#ecb97f",
  bark: "#8a4c3c", barkR: "#66372f", fur2: "#d9bda4", deer: "#d99c66", red: "#d95f4c",
};
const PALETTE = Object.values(C);

// Where everyone sits (feet), where they start (just off the canvas, along the tile axes), and where they bunch up for the last pose.
const SEAT = { rabbit: [67, 174], fox: [35, 168], deer: [99, 168], hog: [88, 192], stump: [37, 188], basket: [82, 175] };
const CLOSE = { fox: [46, 172], deer: [88, 172], hog: [86, 188] };
const FROM = { fox: [-15, 143], deer: [149, 143], hog: [158, 160] };

export function setup(doc, W, H, { icon }) {
  const r = rng(11), tufts = [];
  for (let i = 0; i < 46; i++) {  // tufts and flowers on the meadow, never on the rug (the rug is a 48x24 diamond round the rabbit)
    const x = Math.floor(r() * LW), y = H0 + 6 + Math.floor(r() * (LH - H0 - 8)), kind = i % 3;
    if (Math.abs(x - 67) / 26 + Math.abs(y - 175) / 14 < 1) continue;
    tufts.push({ x, y, c: i % 2 ? null : [C.cream, C.pink, C.sun][kind] });
  }
  return { icon, tile: grainPattern(doc, 5), lo: lowres(doc, LW, LH, PALETTE), spr: lowres(doc, LW, LH, PALETTE), cap: lowres(doc, LW, LH, PALETTE), tufts };
}

// --- small helpers -------------------------------------------------------------------------------------------------------

const clamp01 = u => Math.min(1, Math.max(0, u));
const ease = u => u * u * (3 - 2 * u);
const lerp = (a, b, u) => Math.round(a + (b - a) * u);
const bump = (t, a, b, f = 0.15) => clamp01((t - a) / f) * clamp01((b - t) / f);

// Grid position (gx, gy) at height z to a pixel: 2:1 iso, x runs down-right, y down-left, tiles 24x12 px.
const P = (gx, gy, z = 0) => [OX + (gx - gy) * 12, OY + (gx + gy) * 6 - z];
const quad = (g, pts, c) => poly(g, pts.map(p => P(...p)), c);

// The font in pixel.mjs has no B, G, H, U, F, W, Z, K, V, J, Q or punctuation yet, so the scene draws those 3x5 glyphs itself and hands
// every other character to bitText. Uppercase only (txt upper-cases its input). Returns the width.
const KNOWN = "0123456789:-. PLAYSRECTODMNIX";
const EXTRA = Object.fromEntries(Object.entries({
  B: "110/101/110/101/110", G: "111/100/101/101/111", H: "101/101/111/101/101", U: "101/101/101/101/111", F: "111/100/110/100/100",
  W: "101/101/111/111/101", Z: "111/001/010/100/111", K: "101/101/110/101/101", V: "101/101/101/101/010", J: "001/001/001/101/111",
  Q: "111/101/101/111/001", ",": "0/0/0/1/1", "'": "1/1/0/0/0", "!": "1/1/1/0/1", "?": "111/001/010/000/010", "/": "001/001/010/100/100",
}).map(([k, v]) => [k, v.split("/")]));
const glyphWidth = (ch, s) => {
  if (!KNOWN.includes(ch) && !EXTRA[ch]) throw new Error(`no glyph for ${ch}`);
  return KNOWN.includes(ch) ? bitWidth(ch, s) : EXTRA[ch][0].length * s;
};
function txt(g, str, x, y, s, c) {
  let cx = x;
  for (const ch of str.toUpperCase()) {
    if (KNOWN.includes(ch)) bitText(g, ch, cx, y, s, c);
    else EXTRA[ch].forEach((row, j) => [...row].forEach((on, i) => on === "1" && rect(g, cx + i * s, y + j * s, s, s, c)));
    cx += glyphWidth(ch, s) + s;
  }
  return cx - x - s;
}
const txtWidth = (str, s) => [...str.toUpperCase()].reduce((a, ch) => a + glyphWidth(ch, s) + s, -s);

function line(g, x0, y0, x1, y1, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) px(g, Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
}

// Run fn mirrored about the vertical line through x, so a sprite drawn facing left faces right.
function mirror(g, x, on, fn) {
  if (!on) return fn();
  g.save();
  g.translate(2 * x, 0);
  g.scale(-1, 1);
  fn();
  g.restore();
}

// --- sprites (the same as the style sheet, with poses) --------------------------------------------------------------------

const rabbitSit = (g, { x, y, k, blink = 0 }) => rabbit(g, { x, y, k, fur: C.cream, shade: C.fur2, belly: C.cream, inner: C.pink, eye: C.ink, nose: C.red, blink });

// A phone seen from the front: plum body, a bright amber screen scrolling a feed (rows of dusk bars), pink when it buzzes.
function phoneFront(g, x, y, scroll, flash) {
  rect(g, x, y, 11, 14, C.plum);
  rect(g, x + 1, y + 1, 9, 11, flash ? C.pink : C.sun);
  for (let j = 0; j < 11; j++) {
    const m = (j + scroll) % 4;
    if (m === 0) rect(g, x + 2, y + 1 + j, 7, 1, C.dusk);
    else if (m === 1) rect(g, x + 2, y + 1 + j, 4, 1, C.dusk);
  }
}

// The rabbit hunched over its phone: head low and forward, ears flopped, both paws round a bright phone held up in front of its belly.
// `buzz` shakes the phone and flashes the screen, `jolt` lifts the whole rabbit a pixel.
function rabbitHunch(g, { x, y, k, scroll = 0, buzz = 0, thumb = 0 }) {
  const K = v => v * k, side = rx => p => (p + 0.5 - x > K(rx) ? C.fur2 : C.cream);
  for (const sx of [-1, 1]) {  // long ears standing up, the tips folded outward
    poly(g, [[x + sx * K(3), y - K(19)], [x + sx * K(7), y - K(19)], [x + sx * K(7.5), y - K(29)], [x + sx * K(11), y - K(33)], [x + sx * K(8.5), y - K(35)], [x + sx * K(4), y - K(29)]], sx < 0 ? C.cream : C.fur2);
    poly(g, [[x + sx * K(4.6), y - K(20)], [x + sx * K(6.4), y - K(20)], [x + sx * K(6.6), y - K(28)], [x + sx * K(5), y - K(27)]], C.pink);
  }
  ell(g, x, y - K(8), K(9), K(8), side(5));
  ell(g, x, y - K(15), K(8), K(6.5), side(6));
  ell(g, x - K(6), y - K(13), K(2.4), K(1.6), C.pink);
  ell(g, x + K(6), y - K(13), K(2.4), K(1.6), C.pink);
  const ew = Math.max(1, Math.round(K(1.4))), ey = Math.round(y - K(14.5));
  for (const sx of [-1, 1]) rect(g, Math.round(x + sx * K(3.6) - ew / 2), ey, ew + 1, 1, C.ink);  // eyes looking down at the phone
  const dx = buzz ? (Math.floor(buzz * 40) & 1 ? 1 : -1) : 0, px0 = Math.round(x - 5) + dx, py0 = Math.round(y - 14);
  phoneFront(g, px0, py0, scroll, buzz && (Math.floor(buzz * 30) & 1));
  ell(g, x - 7 + dx, y - 3, 2.2, 2.6, C.cream);  // paws
  ell(g, x + 7 + dx, y - 3, 2.2, 2.6, C.fur2);
  ell(g, x + 2 + dx, y - 3 - thumb, 1.6, 1.8, C.cream);  // the scrolling thumb
  if (buzz) for (const sx of [-1, 1]) for (const [a, b] of [[7, -9], [8.5, -8], [9, -6.5], [8.5, -5], [7, -4]]) px(g, x + sx * a + (sx > 0 ? 0 : -1) + dx, y + b, C.red);  // buzz marks
}

// The fox sitting up in profile, facing left: orange, white chest and cheek, dark stockings and ear tips, a big bushy tail that curls up
// behind with a white tip. `wave` > 0 raises a front paw and waves it.
function fox(g, { x, y, k = 1, wave = 0 }) {
  const K = v => v * k, at = (dx, dy) => [Math.round(x + K(dx)), Math.round(y - K(dy))], shade = rx => p => (p + 0.5 > x + K(rx) ? C.soilL : C.orange);
  ell(g, x + K(12), y - K(3.5), K(8), K(3.5), C.orange);
  ell(g, x + K(18), y - K(8.5), K(4.5), K(6.5), p => (p + 0.5 > x + K(19) ? C.soilL : C.orange));
  ell(g, x + K(19), y - K(16), K(3.2), K(3.8), C.cream);
  ell(g, x + K(3), y - K(5), K(8), K(5), shade(7));
  ell(g, x - K(2), y - K(13), K(6.5), K(10), shade(2));
  ell(g, x - K(6.5), y - K(12), K(3), K(7.5), C.cream);
  if (!wave) rect(g, x - K(9), y - K(7), K(3), K(7), C.barkR);
  rect(g, x - K(11), y - K(2), K(5), K(2), C.barkR);
  ell(g, x - K(5), y - K(25), K(5.5), K(4.5), C.orange);
  poly(g, [[x - K(8), y - K(27)], [x - K(16.5), y - K(23.5)], [x - K(8), y - K(21)]], C.orange);
  ell(g, x - K(9), y - K(22.5), K(3.2), K(1.8), C.cream);
  poly(g, [[x - K(8.5), y - K(28)], [x - K(7.5), y - K(37)], [x - K(2.5), y - K(29)]], C.orange);
  poly(g, [[x - K(3), y - K(29)], [x - K(0.5), y - K(37)], [x + K(3), y - K(28)]], C.orange);
  px(g, ...at(-7.5, 36), C.barkR);
  px(g, ...at(-0.5, 36), C.barkR);
  px(g, ...at(-16.5, 23.5), C.ink);
  px(g, ...at(-6.5, 26), C.ink);
  if (wave) {  // the front paw up and out, swinging side to side
    const sw = Math.round(2.5 * Math.sin(wave * 18)), [hx, hy] = at(-15, 31);
    poly(g, [[x - K(7), y - K(14)], [x - K(10), y - K(16)], [hx + sw, hy + 1], [hx + sw + 3, hy + 2]], C.orange);
    rect(g, hx + sw - 1, hy - 1, 4, 3, C.barkR);
  }
}

// The hedgehog in profile, facing left: a stripy brown dome of spines with pale tips, a tan face and a small pointed snout.
function hog(g, { x, y, k = 1 }) {
  const K = v => v * k, at = (dx, dy) => [Math.round(x + K(dx)), Math.round(y - K(dy))], cx = x + K(2), cy = y - K(8), rx = K(11), ry = K(8.5);
  ell(g, cx, cy, rx, ry, (i, j) => (((i + (j >> 1)) >> 1) & 1 ? C.bark : C.barkR));
  for (let a = -175; a <= 5; a += 11) {
    const r = (a * Math.PI) / 180, ox = Math.cos(r), oy = Math.sin(r);
    px(g, cx + ox * (rx + 0.6), cy + oy * (ry + 0.6), C.bark);
    px(g, cx + ox * (rx + 1.8), cy + oy * (ry + 1.8), C.soilL);
  }
  ell(g, x - K(2), y - K(2.5), K(9), K(2.5), C.fur2);
  ell(g, x - K(9), y - K(5), K(5), K(3.6), C.deer);
  poly(g, [[x - K(11), y - K(7)], [x - K(18), y - K(3.5)], [x - K(11), y - K(2.5)]], C.deer);
  ell(g, x - K(5), y - K(1), K(2.5), K(1.4), C.soilL);
  ell(g, x + K(5), y - K(1), K(2.5), K(1.4), C.soilL);
  px(g, ...at(-18, 3.5), C.ink);
  px(g, ...at(-10.5, 6.5), C.ink);
  px(g, ...at(-6.5, 8), C.pink);
}

// The deer sitting in profile, facing left. `tilt` (0-2 px) pushes the head forward and down: a peering, head-tilting deer.
function deer(g, { x, y, k = 1, tilt = 0 }) {
  const K = v => v * k, side = (p, rx) => (p + 0.5 > x + rx ? C.soilL : C.deer), at = (dx, dy) => [Math.round(x + K(dx)), Math.round(y - K(dy))];
  const hx = -tilt, hy = Math.round(tilt * 0.6), hat = (dx, dy) => { const [a, b] = at(dx, dy); return [a + hx, b + hy]; };
  ell(g, x + K(15), y - K(10), K(2.2), K(2.6), C.cream);
  ell(g, x + K(2), y - K(9), K(12), K(7.5), p => side(p, K(6)));
  ell(g, x + K(8), y - K(6.5), K(6.5), K(6), C.soilL);
  ell(g, x + K(7), y - K(8), K(5), K(4.5), C.deer);
  ell(g, x - K(3), y - K(2.5), K(9), K(2.5), C.cream);
  poly(g, [[x - K(4), y - K(13)], [x - K(11), y - K(12)], [x - K(14) + hx, y - K(27) + hy], [x - K(9) + hx, y - K(28) + hy]], C.deer);
  ell(g, x - K(8.5), y - K(15), K(3.5), K(4.5), C.cream);
  ell(g, x - K(12) + hx, y - K(29) + hy, K(4.2), K(3.4), C.deer);
  ell(g, x - K(16.5) + hx, y - K(27.5) + hy, K(3.6), K(2.3), C.deer);
  ell(g, x - K(18) + hx, y - K(26.5) + hy, K(2.2), K(1.5), C.cream);
  poly(g, [[x - K(9) + hx, y - K(30) + hy], [x - K(2.5) + hx, y - K(31.5) + hy], [x - K(7.5) + hx, y - K(26.5) + hy]], C.deer);
  ell(g, x - K(13), y - K(12), K(7), K(3), C.deer);
  ell(g, x - K(8), y - K(2.5), K(5), K(2.5), C.deer);
  for (const [dx, dy] of [[-1, 15], [3, 16], [7, 13], [1, 11.5], [5, 10], [-3.5, 12.5]]) px(g, ...at(dx, dy), C.cream);
  px(g, ...hat(-13.5, 30.5), C.ink);
  px(g, ...hat(-20, 28), C.ink);
  px(g, ...hat(-6.5, 29.5), C.pink);
  for (const pts of [[[-14, 32], [-16, 38], [-18, 43]], [[-16, 38], [-20, 38]], [[-9, 32], [-8, 38], [-6, 43]], [[-8, 38], [-4, 38]]]) {
    for (let i = 0; i + 1 < pts.length; i++) line(g, ...hat(...pts[i]), ...hat(...pts[i + 1]), C.bark);
  }
}

// A round tree: bark trunk with a dark side, a dark-green crown with a mid-green face and a light highlight.
function tree(g, { x, y, k = 1 }) {
  const K = v => v * k;
  rect(g, x - K(2), y - K(12), K(2), K(12), C.bark);
  rect(g, x, y - K(12), K(2), K(12), C.barkR);
  ell(g, x - K(6), y - K(20), K(6), K(5), C.leaf);
  ell(g, x + K(6), y - K(21), K(6), K(5), C.leaf);
  ell(g, x, y - K(27), K(11), K(9), p => (p > x + K(3) ? C.leaf : C.grassB));
  ell(g, x - K(4), y - K(31), K(5), K(4), C.grassA);
}

// A wicker basket (vertical weave) with a bark handle, a red cloth and a carrot top poking out.
function basket(g, { x, y, k = 1 }) {
  const K = v => v * k;
  for (let a = -180; a <= 0; a += 12) px(g, x + Math.cos((a * Math.PI) / 180) * K(6), y - K(10) + Math.sin((a * Math.PI) / 180) * K(8), C.bark);
  poly(g, [[x - K(6), y - K(10)], [x - K(4), y - K(14)], [x - K(1), y - K(11)], [x + K(1), y - K(15)], [x + K(5), y - K(10)]], C.red);
  ell(g, x + K(3), y - K(13), K(1.6), K(1.4), C.grassA);
  poly(g, [[x - K(7), y - K(10)], [x + K(7), y - K(10)], [x + K(5), y], [x - K(5), y]], C.straw);
  for (let dx = -4; dx <= 4; dx += 3) rect(g, x + K(dx), y - K(9), 1, K(8), C.soilL);
  rect(g, x - K(8), y - K(11), K(16), K(2), C.soilL);
}

// A carrot lying along the iso x axis, tip to the left, with a green top. (x, y) is its middle.
function carrot(g, { x, y }) {
  for (let i = 0; i < 12; i++) {
    const cx = x - 9 + i, cy = y - 4 + Math.round(i * 0.5), h = 1 + Math.round(i / 5);
    rect(g, cx, cy, 1, h, C.orange);
    px(g, cx, cy + h - 1, C.soilL);
  }
  ell(g, x + 4, y + 2, 2.5, 1.6, C.grassA);
  px(g, x + 6, y + 3, C.grassB);
}

// A tree stump with a pale top showing its rings. Its top is at y - h, h = 7k.
function stump(g, { x, y, k = 1 }) {
  const K = v => v * k, hw = K(9), hh = K(4.5), h = K(7);
  ell(g, x, y, hw + 2, hh + 1, p => (p + 0.5 > x ? C.barkR : C.bark));
  ell(g, x, y, hw, hh, p => (p + 0.5 > x ? C.barkR : C.bark));
  rect(g, x - hw, y - h, hw, h, C.bark);
  rect(g, x, y - h, hw, h, C.barkR);
  ell(g, x, y - h, hw, hh, C.straw);
  ell(g, x, y - h, hw * 0.66, hh * 0.66, C.deer);
  ell(g, x, y - h, hw * 0.33, hh * 0.33, C.straw);
}

// A phone lying face down: plum back with a lens, a dark edge, laid along the iso axes. (x, y) is its middle.
function phoneDown(g, x, y) {
  const c = [x - 2, y - 2.25], a = [7, 3], b = [-3, 1.5], pt = (u, v, dz = 0) => [c[0] + a[0] * u + b[0] * v, c[1] + a[1] * u + b[1] * v - dz];
  poly(g, [pt(0, 1, -1), pt(1, 1, -1), pt(1, 0, -1), pt(0, 0, -1)], C.ink);
  poly(g, [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)], C.plum);
  px(g, ...pt(0.8, 0.5).map(Math.round), C.dusk);
}

// A phone tumbling through the air, back to us.
function phoneFly(g, x, y, u) {
  rect(g, x - 2, y - 3, 5, 7, C.plum);
  px(g, x + (u < 0.5 ? 1 : -1), y - 2, C.dusk);
}

// A five-pixel heart.
function heart(g, x, y, c) {
  [[1, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2], [2, 3]].forEach(([i, j]) => px(g, x + i - 2, y + j, c));
}

// Text with a one-pixel ink shadow, centred on cx, for the pops over the animals' heads.
function say(g, str, cx, y, c) {
  const x = cx - (txtWidth(str, 2) >> 1);
  txt(g, str, x + 1, y + 1, 2, C.ink);
  txt(g, str, x, y, 2, c);
}

// A sparkle: a four-point star of radius r, with a pale core.
function star(g, x, y, r, c) {
  rect(g, x - r, y, 2 * r + 1, 1, c);
  rect(g, x, y - r, 1, 2 * r + 1, c);
  if (r > 3) for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) rect(g, x + dx * 2 - (dx > 0 ? 0 : 0), y + dy * 2, 1, 1, c);
  px(g, x, y, C.cream);
}

// --- the story ------------------------------------------------------------------------------------------------------------

const HOPS = [9.6, 10.4, 11.2];
// A hop-walk: (x, y) along a straight line from `from` to `to` over t0..t1 in n small hops; lift is how far up the hop has taken it.
function walk(t, t0, t1, from, to, n) {
  const u = clamp01((t - t0) / (t1 - t0));
  return { x: lerp(from[0], to[0], u), y: lerp(from[1], to[1], u), lift: u > 0 && u < 1 ? Math.round(4 * Math.abs(Math.sin(Math.PI * n * u))) : 0 };
}
const picnicLift = (t, h) => Math.round(HOPS.reduce((a, at) => a - hop(t, at, 0.5, h).y, 0));  // px up

// Where an animal is at t: its feet (x, y) on the ground and how high it is off it (lift, in px, positive is up).
function animal(id, t) {
  let p;
  if (id === "rabbit") p = { x: SEAT.rabbit[0], y: SEAT.rabbit[1], lift: 0 };
  else {
    const [t0, t1, n] = { fox: [0, 1.5, 5], deer: [0.6, 2.0, 5], hog: [1.5, 3.0, 6] }[id];
    p = walk(t, t0, t1, FROM[id], SEAT[id], n);
  }
  if (id === "hog" && t >= 4.3 && t < 5.4) {  // the nudge: hop up to the rabbit, bump it, hop back
    const near = [SEAT.rabbit[0] - 15, SEAT.rabbit[1] + 5], s = SEAT.hog;
    if (t < 4.7) { const u = (t - 4.3) / 0.4; p = { x: lerp(s[0], near[0], u), y: lerp(s[1], near[1], u), lift: Math.round(4 * Math.sin(Math.PI * u)) }; }
    else if (t < 4.95) p = { x: near[0] - Math.round(2 * Math.sin(Math.PI * (t - 4.7) / 0.25)), y: near[1] - Math.round(1 * Math.sin(Math.PI * (t - 4.7) / 0.25)), lift: 0 };
    else { const u = (t - 4.95) / 0.45; p = { x: lerp(near[0], s[0], u), y: lerp(near[1], s[1], u), lift: Math.round(4 * Math.sin(Math.PI * u)) }; }
  }
  if (t >= 12 && id !== "rabbit") {  // shuffle in close for the last pose, two small hops
    const u = clamp01((t - 12) / 0.9), a = SEAT[id], b = CLOSE[id];
    p = { x: lerp(a[0], b[0], ease(u)), y: lerp(a[1], b[1], ease(u)), lift: u < 1 ? Math.round(3 * Math.abs(Math.sin(Math.PI * 2 * u))) : 0 };
  }
  const h = id === "hog" ? 4 : 6;
  return { x: p.x, y: p.y, lift: p.lift + picnicLift(t, h) };
}

// The carrot's journey from the basket: a pass (arc) and a hold at each step, ending in the rabbit's paws.
const CARROT = [
  { from: "basket", to: "rabbit", a: 9.3, b: 9.7 }, { from: "rabbit", to: "deer", a: 10.0, b: 10.4 }, { from: "deer", to: "hog", a: 10.7, b: 11.1 },
  { from: "hog", to: "fox", a: 11.4, b: 11.8 }, { from: "fox", to: "rabbit", a: 12.1, b: 12.6 },
];
function anchor(id, t) {
  if (id === "basket") return [SEAT.basket[0], SEAT.basket[1] - 12];
  const p = animal(id, t);
  return [p.x, p.y - p.lift - (id === "hog" ? 8 : 12)];
}
function carrotAt(t) {
  if (t < CARROT[0].a) return null;
  for (const s of CARROT) {
    if (t >= s.a && t < s.b) {
      const u = (t - s.a) / (s.b - s.a), [x0, y0] = anchor(s.from, t), [x1, y1] = anchor(s.to, t);
      return [lerp(x0, x1, u), lerp(y0, y1, u) - Math.round(10 * 4 * u * (1 - u))];
    }
  }
  const last = [...CARROT].reverse().find(s => t >= s.b);
  return anchor(last.to, t);
}

// --- drawing --------------------------------------------------------------------------------------------------------------

export function draw(ctx, t, W, H, st) {
  const { lo, spr, cap } = st, g = ease(clamp01((t - 12) / 2.6));
  const rabbitUp = t >= 8.5, lookT = t - 8.5;

  // --- the sky warms to golden hour: more pink, a lower sun, a shorter pale band ---------------------------------------
  for (let gx = -8; gx <= 16; gx++) for (let gy = -8; gy <= 16; gy++) {  // the meadow: checkered iso tiles over everything below the horizon
    const [x, y] = P(gx, gy);
    if (y < H0 - 12 || y > LH + 6 || x < -26 || x > LW + 26) continue;
    poly(lo, [[x, y], [x + 12, y + 6], [x, y + 12], [x - 12, y + 6]], (gx + gy) & 1 ? C.grassB : C.grassA);
  }
  const h1 = 8 + Math.round(g * 40);
  rect(lo, 0, 0, LW, H0, C.cream);
  rect(lo, 0, 0, LW, h1 + 24, C.skyB);
  rect(lo, 0, 0, LW, h1, C.pink);
  ell(lo, 101, 82 + Math.round(g * 26), 7 + Math.round(g * 2), 7 + Math.round(g * 2), C.sun);
  poly(lo, [[0, H0], [0, 98], [20, 88], [40, 98], [54, 91], [74, 101], [96, 90], [LW, 104], [LW, H0]], C.ridge);
  poly(lo, [[0, H0 + 3], [0, 108], [18, 101], [34, 109], [58, 113], [90, 111], [112, 105], [LW, 110], [LW, H0 + 3]], C.leaf);
  poly(lo, [[LW, 113], [118, 109], [104, 114], [LW, 120]], C.grassB);

  for (const f of st.tufts) {  // tufts and flowers
    if (f.c) px(lo, f.x, f.y, f.c);
    else { px(lo, f.x, f.y, C.leaf); px(lo, f.x, f.y - 1, C.leaf); }
  }
  // the rug: cream border, red field, three cream stripes
  const rug = (x0, x1, y0, y1, c) => quad(lo, [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]], c);
  rug(1.4, 3.4, 1.4, 3.4, C.cream);
  rug(1.55, 3.25, 1.55, 3.25, C.red);
  rug(1.85, 2.05, 1.55, 3.25, C.cream);
  rug(2.35, 2.55, 1.55, 3.25, C.cream);
  rug(2.85, 3.05, 1.55, 3.25, C.cream);

  // --- the cast, back to front, each on its own layer so each gets its own outline --------------------------------------
  const draws = [], add = (y, fn) => draws.push({ y, fn });
  const place = fn => { spr.clearRect(0, 0, LW, LH); fn(spr); outline(spr, C.ink); lo.drawImage(spr.canvas, 0, 0); };
  const blinkAt = 1 - Math.min(1, Math.abs(((t + 0.7) % 3.4) - 3.25) / 0.08);
  const lids = blinkAt > 0.5 ? 1 : 0;

  add(128, g2 => { tree(g2, { x: 15, y: 132, k: 1 }); });
  add(127, g2 => { tree(g2, { x: 120, y: 130, k: 0.9 }); });
  ell(lo, SEAT.stump[0], SEAT.stump[1] + 1, 12, 3, C.leaf);
  add(SEAT.stump[1], g2 => stump(g2, { x: SEAT.stump[0], y: SEAT.stump[1], k: 0.9 }));

  // the basket is carried in by the hedgehog (on its right), then hops down onto the rug at 3.3
  const hogP = animal("hog", t), bk = SEAT.basket;
  let bkPos = [bk[0], bk[1]];
  if (t < 3.3) bkPos = [hogP.x + 14, hogP.y - hogP.lift - 1];
  else if (t < 3.6) { const u = (t - 3.3) / 0.3, from = [animal("hog", 3.3).x + 14, animal("hog", 3.3).y - 1]; bkPos = [lerp(from[0], bk[0], u), lerp(from[1], bk[1], u) - Math.round(8 * 4 * u * (1 - u))]; }
  add(bkPos[1], g2 => basket(g2, { x: bkPos[0], y: bkPos[1], k: 0.9 }));

  // the rabbit: hunched and scrolling, then upright from 8.5; the picnic hops
  const rp = animal("rabbit", t), rLift = (t >= 4.75 && t < 4.9 ? 1 : 0) + (rabbitUp && lookT < 0.3 ? Math.round(2 * Math.sin(Math.PI * lookT / 0.3)) : 0) + rp.lift;
  const buzzing = [1.2, 3].map(b => (t >= b && t < b + 0.35 ? t - b : 0)).find(v => v > 0) || 0;
  ell(lo, rp.x, rp.y + 1, 10, 2.5, C.leaf);
  add(rp.y, g2 => {
    if (!rabbitUp) rabbitHunch(g2, { x: rp.x, y: rp.y - rLift, k: 0.95, scroll: Math.floor(t * 7) % 4, buzz: buzzing, thumb: Math.floor(t * 7) % 2 });
    else {
      rabbitSit(g2, { x: rp.x, y: rp.y - rLift, k: 0.95, blink: lids });
      if (t < 8.7) phoneFront(g2, rp.x + 5, rp.y - rLift - 18, 0, 0);
    }
  });

  const fp = animal("fox", t), dp = animal("deer", t);
  for (const [p, rx] of [[fp, 11], [dp, 11], [hogP, 10]]) if (t >= 0.3) ell(lo, p.x, p.y + 1, rx, 2.5, C.leaf);
  const wave = t >= 6.9 && t < 8.3 ? t - 6.9 : 0, tilt = Math.round(2 * bump(t, 5.6, 6.9, 0.25));
  add(fp.y, g2 => mirror(g2, fp.x, true, () => fox(g2, { x: fp.x, y: fp.y - fp.lift, k: 0.88, wave })));
  add(dp.y, g2 => deer(g2, { x: dp.x, y: dp.y - dp.lift, k: 0.8, tilt }));
  add(hogP.y, g2 => mirror(g2, hogP.x, t >= 4.65 && t < 5.4, () => hog(g2, { x: hogP.x, y: hogP.y - hogP.lift, k: 1.05 })));

  // the carrot, once it is out of the basket
  const cp = carrotAt(t);
  if (cp) add(900, g2 => carrot(g2, { x: cp[0], y: cp[1] }));
  // the phone in flight from the rabbit's paws to the stump, 8.7 to 9.0
  const sx = SEAT.stump[0], sy = SEAT.stump[1], top = [sx, sy - 6];
  if (t >= 8.7 && t < 9) {
    const u = (t - 8.7) / 0.3, from = [rp.x + 7, rp.y - 12];
    add(901, g2 => phoneFly(g2, lerp(from[0], top[0], u), lerp(from[1], top[1], u) - Math.round(14 * 4 * u * (1 - u)), u));
  }
  draws.sort((a, b) => a.y - b.y).forEach(d => place(d.fn));
  if (t >= 9) place(g2 => phoneDown(g2, top[0], top[1] - 1));

  // --- effects: dust, pops, hearts, sparkles --------------------------------------------------------------------------------
  if (t >= 9 && t < 9.5) {  // the dust puff as the phone lands
    const u = (t - 9) / 0.5;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, r = 2 + u * 8;
      ell(lo, top[0] + Math.cos(a) * r * 1.3, top[1] + Math.sin(a) * r * 0.6 - u * 3, 2.2 - u * 1.6, 2.2 - u * 1.6, u < 0.55 ? C.cream : C.fur2);
    }
  }
  if (t >= 4.7 && t < 5) for (const d of [-1, 1]) { px(lo, rp.x + d * 12, rp.y - 17, C.ink); px(lo, rp.x + d * 13, rp.y - 18, C.ink); px(lo, rp.x + d * 13, rp.y - 16, C.ink); }  // the bump
  if (t >= 5.7 && t < 6.9) say(lo, "?", dp.x - 13, dp.y - 54 - Math.round(2 * ease(clamp01((t - 5.7) / 0.3))), C.sun);
  if (t >= 7.1 && t < 8.3) say(lo, "HEY!", fp.x - 4, fp.y - 54 - Math.round(2 * ease(clamp01((t - 7.1) / 0.3))), C.sun);
  if (t >= 8.5 && t < 9.1) say(lo, "!", rp.x, rp.y - 61 - Math.round(2 * Math.sin(Math.PI * clamp01((t - 8.5) / 0.6))), C.red);
  if (t >= 10.45 && t < 11.15) say(lo, "HA HA!", 67, 112 - Math.floor((t - 10.45) / 0.12), C.sun);
  for (const [i, id] of ["deer", "hog", "fox"].entries()) {  // hearts rise from the friends, one after another
    const a = 11.3 + i * 0.25, p = animal(id, t);
    if (t >= a && t < a + 0.8) heart(lo, p.x - 2, p.y - (id === "hog" ? 32 : 52) - Math.floor((t - a) * 14), (Math.floor(t * 12) & 1) ? C.red : C.pink);
  }
  if (t >= 12.6 && t < 13.5) {  // the sparkle pop over the group
    const u = (t - 12.6) / 0.9, r = Math.max(1, Math.round(9 * Math.sin(Math.PI * Math.min(1, u * 1.15))));
    star(lo, 67, 126, r, C.sun);
    for (const [dx, dy, d] of [[-24, 18, 0.05], [24, 14, 0.1], [-12, -4, 0.15], [14, -8, 0.2], [-34, 34, 0.25], [34, 30, 0.3]]) {
      const v = clamp01((u - d) / 0.5), rr = Math.round(3 * Math.sin(Math.PI * v));
      if (rr > 0) star(lo, 67 + dx, 126 + dy, rr, C.cream);
    }
  }
  blit(ctx, lo, W, H);

  // --- the caption, in the bitmap font on a plum plate, faded in and out -------------------------------------------------
  for (const c of CAPTIONS) {
    if (t < c.from || t >= c.to) continue;
    cap.clearRect(0, 0, LW, LH);
    const rows = [];
    c.lines.forEach((l, i) => {
      let cur = "";
      for (const w of l.join("").split(" ")) {
        if (cur && txtWidth(`${cur} ${w}`, 2) > 121) { rows.push([cur, i]); cur = w; } else cur = cur ? `${cur} ${w}` : w;
      }
      rows.push([cur, i]);
    });
    const wmax = Math.max(...rows.map(([s]) => txtWidth(s, 2))), h = rows.length * 12 - 1, x0 = 67 - (wmax >> 1) - 3;
    rect(cap, x0, 7, wmax + 6, h + 6, C.ink);
    rows.forEach(([s, i], r) => txt(cap, s, 67 - (txtWidth(s, 2) >> 1), 10 + r * 12, 2, i ? C.sun : C.cream));
    ctx.save();
    ctx.globalAlpha = (c.from === 0 ? 1 : clamp01((t - c.from) / 0.15)) * clamp01((c.to - t) / 0.2);
    blit(ctx, cap, W, H);
    ctx.restore();
  }
  endCard(ctx, t, W, H, { icon: st.icon, from: END.from, tile: st.tile });
}
