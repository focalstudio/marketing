// Style demo: iso-pixel. A cosy isometric room (2:1 pixel tiles, no dithering) on a 135x240 canvas of 20 warm colours,
// scaled x8 with nearest neighbour: the rabbit on a cushion, a plant, and a big 25:00 on the desk monitor.
// Render the stills with `node scripts/gallery.mjs previews --only iso-pixel`.
import { rng } from "../ink.mjs";
import { lowres, blit, rect, px, ell, poly, outline, bitText, clock, life, rabbit } from "../pixel.mjs";

export const DURATION = 3, COVER = 1.5;
export const SOUND = { kind: "intro", close: 2.5 };
export const CAPTIONS = [], SCENES = [];

const LW = 135, LH = 240, N = 4, WH = 96, OX = 67, OY = 130;
const C = {
  bg: "#3a2838", bg2: "#5a3b50", wallL: "#f4cfa8", wallL2: "#ebbd93", wallR: "#dc9a74", wallR2: "#d08a68", cream: "#fbe6c8",
  floorA: "#d99c66", floorB: "#c88854", slabL: "#8a4c3c", slabR: "#66372f", rug: "#d95f4c", deskT: "#ecb97f", deskL: "#b8704b",
  deskR: "#93563b", amber: "#ffd36b", leaf: "#78a85a", leaf2: "#447a4a", pink: "#f0a29a", fur2: "#d9bda4",
};
const PALETTE = Object.values(C);

export function setup(doc) {
  return { lo: lowres(doc, LW, LH, PALETTE), spr: lowres(doc, LW, LH, PALETTE) };
}

// Grid position (gx, gy) at height z to a pixel: 2:1 iso, x runs down-right, y down-left, tiles 32x16 px.
const P = (gx, gy, z = 0) => [OX + (gx - gy) * 16, OY + (gx + gy) * 8 - z];
const quad = (g, pts, c) => poly(g, pts.map(p => P(...p)), c);

// A box from (x0, y0) to (x1, y1) on the floor, z0 to z1 tall: the top and the two faces the camera sees.
function box(g, x0, y0, x1, y1, z0, z1, top, left, right) {
  quad(g, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], left);
  quad(g, [[x1, y1, z0], [x1, y0, z0], [x1, y0, z1], [x1, y1, z1]], right);
  quad(g, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], top);
}

export function draw(ctx, t, W, H, st) {
  const { lo, spr } = st, { text, colon, bar } = clock(t), pose = life(t, 8), r = rng(3);

  // backdrop: a plum night, a bigger disc behind the room, a few twinkles
  rect(lo, 0, 0, LW, LH, C.bg);
  ell(lo, 67, 134, 80, 92, C.bg2);
  ell(lo, 112, 24, 8, 8, C.cream);
  ell(lo, 116, 21, 7, 7, C.bg);
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(r() * LW), y = Math.floor(r() * LH), on = (i + Math.floor(t * 3)) % 4 !== 0;
    if (on && Math.hypot((x - 67) * 0.87, y - 134) > 90 && Math.hypot(x - 113, y - 24) > 12) px(lo, x, y, i % 3 ? C.cream : C.amber);
  }

  // the slab under the floor, then the floor tiles in two tones
  quad(lo, [[0, N, 0], [N, N, 0], [N, N, -8], [0, N, -8]], C.slabL);
  quad(lo, [[N, N, 0], [N, 0, 0], [N, 0, -8], [N, N, -8]], C.slabR);
  for (let gx = 0; gx < N; gx++) for (let gy = 0; gy < N; gy++) quad(lo, [[gx, gy, 0], [gx + 1, gy, 0], [gx + 1, gy + 1, 0], [gx, gy + 1, 0]], (gx + gy) & 1 ? C.floorB : C.floorA);

  // the two back walls in half-tile stripes, with a baseboard and a pale top edge
  for (let i = 0; i < N * 2; i++) {
    const a = i / 2, b = (i + 1) / 2;
    quad(lo, [[a, 0, 0], [b, 0, 0], [b, 0, WH], [a, 0, WH]], i & 1 ? C.wallR2 : C.wallR);
    quad(lo, [[0, a, 0], [0, b, 0], [0, b, WH], [0, a, WH]], i & 1 ? C.wallL2 : C.wallL);
  }
  quad(lo, [[0, 0, 0], [N, 0, 0], [N, 0, 4], [0, 0, 4]], C.slabL);
  quad(lo, [[0, 0, 0], [0, N, 0], [0, N, 4], [0, 0, 4]], C.slabL);
  quad(lo, [[0, 0, WH], [N, 0, WH], [N, 0, WH - 2], [0, 0, WH - 2]], C.cream);
  quad(lo, [[0, 0, WH], [0, N, WH], [0, N, WH - 2], [0, 0, WH - 2]], C.cream);

  // a window on the left wall: frame, glass, cross bars
  quad(lo, [[0, 0.9, 28], [0, 2.7, 28], [0, 2.7, 68], [0, 0.9, 68]], C.cream);
  quad(lo, [[0, 1.0, 31], [0, 2.6, 31], [0, 2.6, 65], [0, 1.0, 65]], C.amber);
  quad(lo, [[0, 1.77, 31], [0, 1.83, 31], [0, 1.83, 65], [0, 1.77, 65]], C.cream);
  quad(lo, [[0, 1.0, 47], [0, 2.6, 47], [0, 2.6, 49], [0, 1.0, 49]], C.cream);

  // a shelf with three books on the left wall, a framed picture of a sunset on the right one
  box(lo, 0, 0.7, 0.45, 2.9, 74, 76, C.deskT, C.deskL, C.deskR);
  [[0.9, 1.15, 12, C.rug], [1.2, 1.5, 15, C.leaf2], [1.55, 1.85, 10, C.amber]].forEach(([a, b, h, c]) => box(lo, 0.05, a, 0.4, b, 76, 76 + h, c, c, C.slabR));
  quad(lo, [[1.3, 0, 60], [2.8, 0, 60], [2.8, 0, 90], [1.3, 0, 90]], C.cream);
  quad(lo, [[1.4, 0, 63], [2.7, 0, 63], [2.7, 0, 87], [1.4, 0, 87]], C.bg2);
  quad(lo, [[1.4, 0, 63], [2.7, 0, 63], [2.7, 0, 72], [1.4, 0, 72]], C.leaf2);
  quad(lo, [[1.85, 0, 75], [2.2, 0, 75], [2.2, 0, 80], [1.85, 0, 80]], C.amber);

  // a rug under the rabbit: terracotta with a cream border
  quad(lo, [[1.0, 1.7, 0], [3.7, 1.7, 0], [3.7, 3.7, 0], [1.0, 3.7, 0]], C.cream);
  quad(lo, [[1.15, 1.85, 0], [3.55, 1.85, 0], [3.55, 3.55, 0], [1.15, 3.55, 0]], C.rug);

  // the desk against the right wall, a drawer line on it, and the monitor with the timer
  box(lo, 0.2, 0, 3.8, 1.5, 0, 14, C.deskT, C.deskL, C.deskR);
  quad(lo, [[0.35, 1.5, 7], [3.65, 1.5, 7], [3.65, 1.5, 8], [0.35, 1.5, 8]], C.deskR);
  box(lo, 1.6, 0.2, 2.4, 0.45, 14, 18, C.deskL, C.slabR, C.slabR);
  box(lo, 0.25, 0.1, 3.75, 0.5, 18, 48, C.deskL, C.slabR, C.slabR);
  quad(lo, [[0.375, 0.5, 20], [3.625, 0.5, 20], [3.625, 0.5, 46], [0.375, 0.5, 46]], C.bg);
  const [tx, ty] = P(0.375, 0.5, 43);
  bitText(lo, colon ? text : text.replace(":", " "), tx, ty, 3, C.amber, { slope: 0.5 });
  const [bx, by] = P(0.375, 0.5, 25);
  quad(lo, [[0.375, 0.5, 21], [3.625, 0.5, 21], [3.625, 0.5, 25], [0.375, 0.5, 25]], C.slabR);
  for (let d = 0; d < Math.round(52 * bar); d++) rect(lo, bx + d, by + Math.round(d * 0.5), 1, 4, C.amber);
  box(lo, 1.0, 0.9, 3.0, 1.3, 14, 15, C.cream, C.fur2, C.fur2);  // keyboard
  box(lo, 3.25, 0.8, 3.55, 1.1, 14, 21, C.cream, C.fur2, C.fur2);  // mug
  quad(lo, [[3.25, 0.8, 21], [3.55, 0.8, 21], [3.55, 1.1, 21], [3.25, 1.1, 21]], C.slabR);

  // the plant in a pot, leaves swaying a pixel
  box(lo, 0.35, 3.0, 0.95, 3.6, 0, 9, C.rug, C.rug, C.slabR);
  const [lx, ly] = P(0.65, 3.3, 9);
  [[-9, 17, C.leaf2], [9, 19, C.leaf2], [-4, 24, C.leaf], [4, 26, C.leaf], [0, 20, C.leaf]].forEach(([dx, dy, c], i) => {
    const sway = Math.round(Math.sin(t * 2.2 + i));
    poly(lo, [[lx - 2.5, ly + 1], [lx + 2.5, ly + 1], [lx + dx + sway, ly - dy]], c);
  });

  // sprites on their own layer for the outline: a cushion, then the rabbit on it (it hops off and lands back)
  spr.clearRect(0, 0, LW, LH);
  const [cx, cy] = P(2.1, 3.0, 0);
  ell(lo, cx, cy + 2, 11, 5, C.slabR);
  ell(lo, cx, cy, 11, 5, C.rug);
  ell(lo, cx, cy - 1, 8, 3, C.pink);
  rabbit(spr, { x: cx, y: cy - 1 + pose.y, k: 0.9, fur: C.cream, shade: C.fur2, belly: C.cream, inner: C.pink, eye: C.bg, nose: C.rug, blink: pose.blink, ear: pose.ear });
  outline(spr, C.bg);
  lo.drawImage(spr.canvas, 0, 0);
  blit(ctx, lo, W, H);
}
