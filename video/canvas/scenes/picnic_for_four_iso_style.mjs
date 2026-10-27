// Style sheet for picnic_for_four_iso (review gate 1): one frame with the characters, props, type and palette. Render it with
// `node video/canvas/render.mjs picnic_for_four_iso_style --preview DIR 0`.
// Isometric pixel look: a 135x240 canvas of 20 warm colours, 2:1 tiles, flat faces (light top, mid left, dark right), no
// dithering, a one-pixel ink outline round the sprites only, scaled x8 with nearest neighbour.
// Top: the world as the video will show it (a meadow tile with the rug, the basket, a carrot, the rabbit, and the phone face
// down on a stump). Middle: the cast on pedestals and the props. Bottom: the hook caption type and the palette.
import { rng } from "../ink.mjs";
import { lowres, blit, rect, px, ell, poly, outline, bitText, bitWidth, rabbit } from "../pixel.mjs";

export const DURATION = 1;
export const SOUND = { kind: "toon", beats: [] };
export const CAPTIONS = [], SCENES = [];

const LW = 135, LH = 240, N = 3, SLAB = 5, OX = 67, OY = 18;
const C = {
  ink: "#3a2838", plum: "#5a3b50", dusk: "#7a5a70", ridge: "#c58a85", cream: "#fbe6c8", skyB: "#f8d4ad", pink: "#f0a29a", sun: "#ffd36b",
  grassA: "#8fbf63", grassB: "#78a85a", leaf: "#447a4a", soilL: "#b8704b", soilR: "#93563b", orange: "#e8863a", straw: "#ecb97f",
  bark: "#8a4c3c", barkR: "#66372f", fur2: "#d9bda4", deer: "#d99c66", red: "#d95f4c",
};
const PALETTE = Object.values(C);

export function setup(doc) {
  return { lo: lowres(doc, LW, LH, PALETTE), spr: lowres(doc, LW, LH, PALETTE) };
}

// Grid position (gx, gy) at height z to a pixel: 2:1 iso, x runs down-right, y down-left, tiles 24x12 px.
const P = (gx, gy, z = 0) => [OX + (gx - gy) * 12, OY + (gx + gy) * 6 - z];
const quad = (g, pts, c) => poly(g, pts.map(p => P(...p)), c);

// The font in pixel.mjs has no B, G, H, U, F, W, Z, K, V, J, Q or punctuation yet, so the sheet draws those 3x5 glyphs itself and
// hands every other character to bitText. Uppercase only (txt upper-cases its input); every letter A-Z is covered. Returns the width.
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
const centred = (g, str, cx, y, s, c) => txt(g, str, cx - (txtWidth(str, s) >> 1), y, s, c);

function line(g, x0, y0, x1, y1, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) px(g, Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
}

// --- sprites --------------------------------------------------------------------------------------------------------------

const rabbitSit = (g, { x, y, k }) => rabbit(g, { x, y, k, fur: C.cream, shade: C.fur2, belly: C.cream, inner: C.pink, eye: C.ink, nose: C.red });


// The rabbit hunched over its phone: head pushed down and forward, ears flopped, both paws round a phone seen from behind.
function rabbitHunch(g, { x, y, k }) {
  const K = v => v * k, side = rx => p => (p + 0.5 - x > K(rx) ? C.fur2 : C.cream);
  for (const sx of [-1, 1]) {  // ears flopped out and down on each side of the head
    poly(g, [[x + sx * K(4), y - K(19)], [x + sx * K(9), y - K(25)], [x + sx * K(14), y - K(21)], [x + sx * K(12), y - K(18)], [x + sx * K(7), y - K(20)]], sx < 0 ? C.cream : C.fur2);
    poly(g, [[x + sx * K(6), y - K(21)], [x + sx * K(9), y - K(23)], [x + sx * K(11.5), y - K(20.5)], [x + sx * K(8), y - K(20)]], C.pink);
  }
  ell(g, x, y - K(8), K(9), K(8), side(5));                                    // rounded back
  ell(g, x, y - K(6), K(5.5), K(5.5), C.cream);                                // belly
  ell(g, x, y - K(15), K(8), K(6.5), side(6));                                 // head, low
  ell(g, x - K(6), y - K(13), K(2.4), K(1.6), C.pink);                         // cheeks
  ell(g, x + K(6), y - K(13), K(2.4), K(1.6), C.pink);
  const ew = Math.max(1, Math.round(K(1.4))), ey = Math.round(y - K(14.5));
  for (const sx of [-1, 1]) rect(g, Math.round(x + sx * K(3.6) - ew / 2), ey, ew + 1, 1, C.ink);   // eyes looking down
  rect(g, x - K(1.2), y - K(12), Math.max(2, K(2.4)), Math.max(1, K(1.2)), C.red);
  rect(g, x - K(4), y - K(11), K(8), K(11), C.plum);                           // the phone, back to us
  rect(g, x - K(3), y - K(10), K(2), K(2), C.dusk);
  ell(g, x - K(5.5), y - K(6), K(2.2), K(2.6), C.cream);                       // paws
  ell(g, x + K(5.5), y - K(6), K(2.2), K(2.6), C.fur2);
}

// The fox sitting up in profile, facing left: orange, white chest and cheek, dark stockings and ear tips, a big bushy tail that
// curls up behind with a white tip.
function fox(g, { x, y, k = 1 }) {
  const K = v => v * k, at = (dx, dy) => [Math.round(x + K(dx)), Math.round(y - K(dy))], shade = rx => p => (p + 0.5 > x + K(rx) ? C.soilL : C.orange);
  ell(g, x + K(12), y - K(3.5), K(8), K(3.5), C.orange);                       // tail, low sweep
  ell(g, x + K(18), y - K(8.5), K(4.5), K(6.5), p => (p + 0.5 > x + K(19) ? C.soilL : C.orange));
  ell(g, x + K(19), y - K(16), K(3.2), K(3.8), C.cream);                       // white tip
  ell(g, x + K(3), y - K(5), K(8), K(5), shade(7));                            // haunch
  ell(g, x - K(2), y - K(13), K(6.5), K(10), shade(2));                        // upright body
  ell(g, x - K(6.5), y - K(12), K(3), K(7.5), C.cream);                        // white chest
  rect(g, x - K(9), y - K(7), K(3), K(7), C.barkR);                            // front leg and paw
  rect(g, x - K(11), y - K(2), K(5), K(2), C.barkR);
  ell(g, x - K(5), y - K(25), K(5.5), K(4.5), C.orange);                       // head
  poly(g, [[x - K(8), y - K(27)], [x - K(16.5), y - K(23.5)], [x - K(8), y - K(21)]], C.orange);  // pointed muzzle
  ell(g, x - K(9), y - K(22.5), K(3.2), K(1.8), C.cream);                      // white cheek
  poly(g, [[x - K(8.5), y - K(28)], [x - K(7.5), y - K(37)], [x - K(2.5), y - K(29)]], C.orange);  // ears
  poly(g, [[x - K(3), y - K(29)], [x - K(0.5), y - K(37)], [x + K(3), y - K(28)]], C.orange);
  px(g, ...at(-7.5, 36), C.barkR);
  px(g, ...at(-0.5, 36), C.barkR);
  px(g, ...at(-16.5, 23.5), C.ink);                                            // nose
  px(g, ...at(-6.5, 26), C.ink);                                               // eye
}

// The hedgehog in profile, facing left: a stripy brown dome of spines with pale tips, a tan face and a small pointed snout.
function hog(g, { x, y, k = 1 }) {
  const K = v => v * k, at = (dx, dy) => [Math.round(x + K(dx)), Math.round(y - K(dy))], cx = x + K(2), cy = y - K(8), rx = K(11), ry = K(8.5);
  ell(g, cx, cy, rx, ry, (i, j) => (((i + (j >> 1)) >> 1) & 1 ? C.bark : C.barkR));
  for (let a = -175; a <= 5; a += 11) {  // spines: two pixels sticking out round the top of the dome, tipped pale
    const r = (a * Math.PI) / 180, ox = Math.cos(r), oy = Math.sin(r);
    px(g, cx + ox * (rx + 0.6), cy + oy * (ry + 0.6), C.bark);
    px(g, cx + ox * (rx + 1.8), cy + oy * (ry + 1.8), C.soilL);
  }
  ell(g, x - K(2), y - K(2.5), K(9), K(2.5), C.fur2);                          // belly
  ell(g, x - K(9), y - K(5), K(5), K(3.6), C.deer);                            // face
  poly(g, [[x - K(11), y - K(7)], [x - K(18), y - K(3.5)], [x - K(11), y - K(2.5)]], C.deer);  // snout
  ell(g, x - K(5), y - K(1), K(2.5), K(1.4), C.soilL);                         // feet
  ell(g, x + K(5), y - K(1), K(2.5), K(1.4), C.soilL);
  px(g, ...at(-18, 3.5), C.ink);                                               // nose
  px(g, ...at(-10.5, 6.5), C.ink);                                             // eye
  px(g, ...at(-6.5, 8), C.pink);                                               // ear
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

// A carrot lying along the iso x axis, tip to the left, with a green top.
function carrot(g, { x, y }) {
  for (let i = 0; i < 12; i++) {
    const cx = x - 9 + i, cy = y - 4 + Math.round(i * 0.5), h = 1 + Math.round(i / 5);
    rect(g, cx, cy, 1, h, C.orange);
    px(g, cx, cy + h - 1, C.soilL);
  }
  ell(g, x + 4, y + 2, 2.5, 1.6, C.grassA);
  px(g, x + 6, y + 3, C.grassB);
}

// A tree stump with a pale top showing its rings, and a phone lying face down on it: plum back with a lens, dark edge.
function stump(g, { x, y, k = 1, phone = true }) {
  const K = v => v * k, hw = K(9), hh = K(4.5), h = K(7);
  ell(g, x, y, hw + 2, hh + 1, p => (p + 0.5 > x ? C.barkR : C.bark));       // flared base
  ell(g, x, y, hw, hh, p => (p + 0.5 > x ? C.barkR : C.bark));
  rect(g, x - hw, y - h, hw, h, C.bark);
  rect(g, x, y - h, hw, h, C.barkR);
  ell(g, x, y - h, hw, hh, C.straw);
  ell(g, x, y - h, hw * 0.66, hh * 0.66, C.deer);
  ell(g, x, y - h, hw * 0.33, hh * 0.33, C.straw);
  if (!phone) return;
  const c = [x - 2, y - h - 2.5], a = [7, 3], b = [-3, 1.5];  // corners along the iso grid axes
  const pt = (u, v, dz = 0) => [c[0] + a[0] * u + b[0] * v, c[1] + a[1] * u + b[1] * v - dz];
  poly(g, [pt(0, 1, -1), pt(1, 1, -1), pt(1, 0, -1), pt(0, 0, -1)], C.ink);
  poly(g, [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)], C.plum);
  px(g, ...pt(0.8, 0.5).map(Math.round), C.dusk);
}

// The deer sitting in profile, facing left: tan body with a darker haunch, cream chest, spots, big ear and two antlers. 34 px tall
// with the antlers at k = 0.8.
function deer(g, { x, y, k = 1 }) {
  const K = v => v * k, side = (p, rx) => (p + 0.5 > x + rx ? C.soilL : C.deer), at = (dx, dy) => [Math.round(x + K(dx)), Math.round(y - K(dy))];
  ell(g, x + K(15), y - K(10), K(2.2), K(2.6), C.cream);                      // tail
  ell(g, x + K(2), y - K(9), K(12), K(7.5), p => side(p, K(6)));              // body
  ell(g, x + K(8), y - K(6.5), K(6.5), K(6), C.soilL);                        // haunch
  ell(g, x + K(7), y - K(8), K(5), K(4.5), C.deer);
  ell(g, x - K(3), y - K(2.5), K(9), K(2.5), C.cream);                        // belly
  poly(g, [[x - K(4), y - K(13)], [x - K(11), y - K(12)], [x - K(14), y - K(27)], [x - K(9), y - K(28)]], C.deer);  // neck
  ell(g, x - K(8.5), y - K(15), K(3.5), K(4.5), C.cream);                     // chest
  ell(g, x - K(12), y - K(29), K(4.2), K(3.4), C.deer);                       // head
  ell(g, x - K(16.5), y - K(27.5), K(3.6), K(2.3), C.deer);                   // snout
  ell(g, x - K(18), y - K(26.5), K(2.2), K(1.5), C.cream);                    // muzzle
  poly(g, [[x - K(9), y - K(30)], [x - K(2.5), y - K(31.5)], [x - K(7.5), y - K(26.5)]], C.deer);  // ear, laid back
  ell(g, x - K(13), y - K(12), K(7), K(3), C.deer);                           // folded front leg
  ell(g, x - K(8), y - K(2.5), K(5), K(2.5), C.deer);
  for (const [dx, dy] of [[-1, 15], [3, 16], [7, 13], [1, 11.5], [5, 10], [-3.5, 12.5]]) px(g, ...at(dx, dy), C.cream);  // spots
  px(g, ...at(-13.5, 30.5), C.ink);                                           // eye
  px(g, ...at(-20, 28), C.ink);                                               // nose
  px(g, ...at(-6.5, 29.5), C.pink);                                             // inside the ear
  // antlers: a stem leaning outward from each side of the head, with a brow tine and a fork at the top
  for (const pts of [[[-14, 32], [-16, 38], [-18, 43]], [[-16, 38], [-20, 38]], [[-9, 32], [-8, 38], [-6, 43]], [[-8, 38], [-4, 38]]]) {
    for (let i = 0; i + 1 < pts.length; i++) line(g, ...at(...pts[i]), ...at(...pts[i + 1]), C.bark);
  }
}


// A grass tile as a pedestal: 2:1 diamond top, soil sides, a flat shadow where the sprite stands.
function pedestal(g, cx, cy, hw) {
  const hh = hw / 2, T = 3;
  poly(g, [[cx - hw, cy], [cx, cy + hh], [cx, cy + hh + T], [cx - hw, cy + T]], C.soilL);
  poly(g, [[cx, cy + hh], [cx + hw, cy], [cx + hw, cy + T], [cx, cy + hh + T]], C.soilR);
  poly(g, [[cx - hw, cy], [cx, cy - hh], [cx + hw, cy], [cx, cy + hh]], C.grassA);
  ell(g, cx, cy + 1, hw * 0.6, hh * 0.5, C.grassB);
}


export function draw(ctx, t, W, H, st) {
  const { lo, spr } = st, r = rng(5);
  rect(lo, 0, 0, LW, LH, C.plum);

  // --- the world: a window onto a golden-hour sky, ridges and a floating meadow tile -------------------------------------
  const wx = 3, wy = 3, ww = 129, wh = 57;
  rect(lo, wx, wy, ww, 10, C.pink);
  rect(lo, wx, wy + 10, ww, 15, C.skyB);
  rect(lo, wx, wy + 25, ww, wh - 25, C.cream);
  ell(lo, 109, 28, 7, 7, C.sun);
  poly(lo, [[wx, 44], [wx, 33], [20, 25], [40, 35], [54, 28], [74, 38], [96, 27], [wx + ww, 40], [wx + ww, wy + wh], [wx, wy + wh]], C.ridge);
  poly(lo, [[wx, 56], [wx, 45], [18, 38], [32, 45], [wx + ww, 50], [wx + ww, wy + wh], [wx, wy + wh]], C.leaf);
  poly(lo, [[wx + ww, 46], [112, 41], [100, 47], [wx + ww, 53]], C.grassB);

  // the meadow tile: soil slab with a grass lip, checkered grass, and a picnic rug in a cream border with red and cream stripes
  quad(lo, [[0, N, 0], [N, N, 0], [N, N, -SLAB], [0, N, -SLAB]], C.soilL);
  quad(lo, [[N, N, 0], [N, 0, 0], [N, 0, -SLAB], [N, N, -SLAB]], C.soilR);
  quad(lo, [[0, N, 0], [N, N, 0], [N, N, -2], [0, N, -2]], C.grassB);
  quad(lo, [[N, N, 0], [N, 0, 0], [N, 0, -2], [N, N, -2]], C.leaf);
  for (let gx = 0; gx < N; gx++) for (let gy = 0; gy < N; gy++) quad(lo, [[gx, gy, 0], [gx + 1, gy, 0], [gx + 1, gy + 1, 0], [gx, gy + 1, 0]], (gx + gy) & 1 ? C.grassB : C.grassA);
  for (let i = 0; i < 12; i++) {  // tufts and flowers off the rug
    const gx = 0.2 + r() * 2.6, gy = 0.2 + r() * 2.6, [x, y] = P(gx, gy);
    if (gx > 0.3 && gx < 2.5 && gy > 0.8 && gy < 2.5) continue;
    if (i % 2) { px(lo, x, y, C.leaf); px(lo, x, y - 1, C.leaf); } else px(lo, x, y, [C.cream, C.pink, C.sun][i % 3]);
  }
  const rug = (x0, x1, y0, y1, c) => quad(lo, [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]], c);
  rug(0.3, 2.5, 0.8, 2.5, C.cream);
  rug(0.45, 2.35, 0.95, 2.35, C.red);
  rug(0.85, 1.05, 0.95, 2.35, C.cream);
  rug(1.35, 1.55, 0.95, 2.35, C.cream);
  rug(1.85, 2.05, 0.95, 2.35, C.cream);

  // sprites go on their own layer so one outline pass wraps them all
  spr.clearRect(0, 0, LW, LH);
  const [rx, ry] = P(1.0, 1.7), [bx, by] = P(1.65, 0.95), [kx, ky] = P(1.4, 2.1), [sx, sy] = P(2.55, 0.45);
  ell(lo, rx, ry + 1, 7, 2, C.soilL);
  rabbitSit(spr, { x: rx, y: ry, k: 0.6 });
  basket(spr, { x: bx, y: by + 2, k: 0.8 });
  carrot(spr, { x: kx + 2, y: ky + 1 });
  stump(spr, { x: sx, y: sy + 3, k: 0.8 });

  // --- the cast and the props on pedestals, on a warm panel ------------------------------------------------------------
  const cols = [22, 67, 112], hw = 17, panelTop = 63, row1 = 99, row2 = 153;
  rect(lo, 3, panelTop, 129, 110, C.skyB);
  const cast = [
    [cols[0], row1, "RABBIT"], [cols[1], row1, "HUNCHED"], [cols[2], row1, "HEDGEHOG"],
    [cols[0], row2, "FOX"], [cols[1], row2, "DEER"], [cols[2], row2, "PROPS"],
  ];
  for (const [cx, feet, label] of cast) {
    pedestal(lo, cx, feet, hw);
    centred(lo, label, cx, feet + hw / 2 + 6, 1, C.plum);
  }
  rabbitSit(spr, { x: cols[0], y: row1, k: 0.75 });
  rabbitHunch(spr, { x: cols[1], y: row1, k: 0.8 });
  hog(spr, { x: cols[2] + 2, y: row1, k: 1.0 });
  fox(spr, { x: cols[0] - 3, y: row2, k: 0.78 });
  deer(spr, { x: cols[1] + 3, y: row2, k: 0.72 });
  stump(spr, { x: cols[2] + 8, y: row2 - 2, k: 0.8 });
  basket(spr, { x: cols[2] - 8, y: row2 - 1, k: 0.8 });
  carrot(spr, { x: cols[2] + 1, y: row2 + 4 });

  outline(spr, C.ink);
  lo.drawImage(spr.canvas, 0, 0);

  // --- the hook caption type and the palette ----------------------------------------------------------------------------
  rect(lo, 3, 176, 129, 47, C.ink);
  [["PUT THE", C.cream], ["PHONE DOWN.", C.cream], ["YOUR FRIENDS", C.sun], ["ARE HERE.", C.sun]].forEach(([str, c], i) => centred(lo, str, 67, 178 + i * 11, 2, c));
  rect(lo, 7, 226, 122, 10, C.cream);
  PALETTE.forEach((c, i) => rect(lo, 8 + i * 6, 227, 6, 8, c));

  blit(ctx, lo, W, H);
}
