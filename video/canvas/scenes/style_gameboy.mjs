// Style demo: gameboy. A 160x144 four-shade green LCD (dithered clouds and hills, 8x8 tiles, a HUD timer) scaled x6 with a
// dot-matrix grid on it, letterboxed 10:9 in the middle of a dark handheld shell so the 9:16 frame stays filled.
// Render the stills with `node scripts/gallery.mjs previews --only gameboy`.
import { lowres, blit, rect, px, ell, dither, outline, bitText, clock, life, rabbit, shadow } from "../pixel.mjs";

export const DURATION = 3, COVER = 1.5;
export const SOUND = { kind: "intro", close: 2.5 };
export const CAPTIONS = [], SCENES = [];

const LW = 160, LH = 144, S = 6, SX = 60, SY = 360;  // the screen: 960x864 at (60, 360) in the 1080x1920 frame
const D0 = "#0f380f", D1 = "#306230", D2 = "#8bac0f", D3 = "#9bbc0f";
const SHADES = [D0, D1, D2, D3];

// 8x8 tiles, one char per pixel: the digit is the shade.
const TILES = {
  grass: ["32322323", "22222222", "11211121", "11111111", "10111011", "11111111", "11011101", "11111111"],
  earth: ["11111111", "11011111", "11111101", "10111111", "11111011", "11011111", "11111101", "11111111"],
  brick: ["11111110", "11111110", "11111110", "00000000", "11101111", "11101111", "11101111", "00000000"],
};
const tile = (g, name, x, y) => TILES[name].forEach((row, j) => [...row].forEach((c, i) => px(g, x + i, y + j, SHADES[+c])));

export function setup(doc) {
  // the dot-matrix grid: a faint dark line between every pixel of the LCD
  const grid = doc.createElement("canvas");
  grid.width = LW * S;
  grid.height = LH * S;
  const gx = grid.getContext("2d");
  gx.fillStyle = "rgba(15,56,15,0.16)";
  for (let i = 0; i < LW; i++) gx.fillRect(i * S, 0, 1, LH * S);
  for (let j = 0; j < LH; j++) gx.fillRect(0, j * S, LW * S, 1);
  return { lo: lowres(doc, LW, LH, SHADES), spr: lowres(doc, LW, LH, SHADES), grid };
}

function lcd(g, t, { text, colon, bar }, pose) {
  rect(g, 0, 0, LW, LH, D2);
  dither(g, 0, 0, LW, 48, (x, y) => Math.max(0, 0.45 - y / 100), D2, D1);  // the sky darkens towards the top

  // clouds drift: two light puffs
  for (const [cx, cy, w] of [[26, 62, 28], [128, 76, 32]]) {
    const x = Math.round(cx + t * 3);
    ell(g, x, cy, w / 2, 4, D3);
    ell(g, x - 5, cy - 4, w / 4, 4, D3);
  }

  // far hills: a checker of two shades, so they read as a silhouette against the sky
  for (let x = 0; x < LW; x++) {
    const hy = 98 + Math.round(8 * Math.sin(x / 19 + 1) + 3 * Math.sin(x / 6));
    for (let y = hy; y < 112; y++) px(g, x, y, (x + y) & 1 ? D1 : D2);
  }

  // the HUD: a double-bordered panel holding the timer with a drop shadow, and a bar of blocks under it
  rect(g, 14, 3, 132, 36, D0);
  rect(g, 15, 4, 130, 34, D3);
  rect(g, 17, 6, 126, 30, D0);
  rect(g, 18, 7, 124, 28, D3);
  const digits = colon ? text : text.replace(":", " ");
  bitText(g, digits, 38, 11, 5, D2);
  bitText(g, digits, 37, 10, 5, D0);
  for (let i = 0; i < 10; i++) {
    rect(g, 40 + i * 8, 42, 7, 4, D0);
    rect(g, 41 + i * 8, 43, 5, 2, i < Math.round(bar * 10) ? D1 : D3);
  }

  // the ground: four rows of tiles
  for (let i = 0; i < LW / 8; i++) ["grass", "earth", "brick", "brick"].forEach((n, j) => tile(g, n, i * 8, 112 + j * 8));
}

export function draw(ctx, t, W, H, st) {
  const { lo, spr, grid } = st, k = W / 1080, pose = life(t, 8);
  lcd(lo, t, clock(t), pose);

  // sprites on their own layer for the outline: the rabbit, a small tree and a carrot
  spr.clearRect(0, 0, LW, LH);
  const rx = 50, ry = 114 + pose.y;
  rabbit(spr, { x: rx, y: ry, k: 1.35, fur: D3, shade: D2, belly: D3, inner: D1, eye: D0, nose: D0, hi: D3, blink: pose.blink, ear: pose.ear });
  rect(spr, 124, 98, 4, 14, D1);
  ell(spr, 126, 90, 11, 10, D1);
  ell(spr, 123, 87, 5, 4, D3);
  rect(spr, 96, 100, 6, 2, D1); rect(spr, 95, 102, 8, 4, D3); rect(spr, 96, 106, 6, 3, D3); rect(spr, 97, 109, 4, 3, D2);
  outline(spr, D0);
  shadow(lo, rx, 115, 26, D1);
  lo.drawImage(spr.canvas, 0, 0);

  // the handheld: dark page, shell, bezel with its label, the screen, then buttons below
  ctx.save();
  ctx.scale(k, k);
  ctx.fillStyle = "#1d1d21";
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = "#74737a";
  ctx.beginPath(); ctx.roundRect(24, 70, 1032, 1780, [64, 64, 150, 64]); ctx.fill();
  ctx.fillStyle = "#8a898f";
  ctx.fillRect(48, 70, 984, 8);
  ctx.strokeStyle = "#5f5e65"; ctx.lineWidth = 6;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(150, 130 + i * 24); ctx.lineTo(930, 130 + i * 24); ctx.stroke(); }
  ctx.fillStyle = "#34333f";
  ctx.beginPath(); ctx.roundRect(SX - 30, SY - 112, 1020, 1118, [34, 34, 90, 34]); ctx.fill();
  ctx.fillStyle = "#b9b8d0";
  ctx.font = "800 34px Nunito";
  ctx.letterSpacing = "6px";
  ctx.fillText("DOT MATRIX", SX + 6, SY - 48);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#c9433f";
  ctx.beginPath(); ctx.arc(SX + 880, SY - 62, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = D0;
  ctx.fillRect(SX - 8, SY - 8, 976, 880);
  ctx.save();
  ctx.translate(SX, SY);
  blit(ctx, lo, LW * S, LH * S);
  ctx.drawImage(grid, 0, 0);
  ctx.restore();

  // d-pad, A and B, start and select, speaker slots
  ctx.fillStyle = "#2a2a31";
  ctx.beginPath(); ctx.roundRect(120, 1500, 240, 78, 20); ctx.roundRect(201, 1419, 78, 240, 20); ctx.fill();
  ctx.fillStyle = "#3a3a42";
  ctx.beginPath(); ctx.arc(240, 1539, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#8b2f57";
  for (const [x, y] of [[770, 1560], [910, 1490]]) { ctx.beginPath(); ctx.arc(x, y, 66, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "#6a2244";
  for (const [x, y] of [[770, 1560], [910, 1490]]) { ctx.beginPath(); ctx.arc(x, y + 8, 56, 0.1, Math.PI - 0.1); ctx.fill(); }
  ctx.fillStyle = "#55545d";
  for (const x of [360, 540]) { ctx.save(); ctx.translate(x, 1730); ctx.rotate(-0.4); ctx.beginPath(); ctx.roundRect(-52, -14, 104, 28, 14); ctx.fill(); ctx.restore(); }
  ctx.strokeStyle = "#5a5961"; ctx.lineWidth = 14; ctx.lineCap = "round";
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(820 + i * 38, 1690 + i * 6); ctx.lineTo(900 + i * 38, 1610 + i * 6); ctx.stroke(); }
  ctx.restore();
}
