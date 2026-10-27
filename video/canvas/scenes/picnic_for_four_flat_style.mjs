// Style sheet for picnic_for_four_flat (review gate 1): one frame with the characters, props, type and palette of the mascot flat look.
// Every shape is two flat tones (a light face and a shade crescent), no outline, no gradients; type is Fredoka. Render it with
// `node video/canvas/render.mjs picnic_for_four_flat_style --preview DIR 0`.
import { sparkle } from "../kawaii.mjs";

export const DURATION = 1;
export const SOUND = { kind: "rain", beats: [] };
export const CAPTIONS = [], SCENES = [];

// style_mascot-flat's palette plus this story's: fox, deer and hedgehog coats, a red rug, wicker and wood, and a golden-hour sky.
const C = {
  cream: "#fff6e2", creamShade: "#eadcc0", sage: "#4a7c59", sageShade: "#3d6a4a", sageLight: "#7fa88a", sageLightShade: "#6d9879", ink: "#342c26",
  fur: "#fffdf8", furShade: "#e9dcc2", ear: "#f4b9ae", earShade: "#e89c92", blush: "#f4a5a0", nose: "#e27d78", sun: "#eea840", sunShade: "#d98f2c",
  fox: "#ee8a3c", foxShade: "#d97429", coat: "#dba46a", coatShade: "#c68a4e", hog: "#a47d64", hogShade: "#8f6a53", spike: "#7a5a47", spikeShade: "#654836",
  hogFace: "#f3d9b6", hogFaceShade: "#e0c096", antler: "#b98863", antlerShade: "#a1724f", snout: "#5b4034",
  rug: "#e8756a", rugShade: "#d0605a", wicker: "#d19a62", wickerShade: "#b98450", heart: "#ef6f7e", heartShade: "#d95a69",
  sky: "#dcece0", ridge: "#a9c7b0", ridgeShade: "#98b8a0", gold: "#f7d08e", goldShade: "#f1c177", goldRidge: "#e8b184", goldRidgeShade: "#d99f74",
  phone: "#4b413a", off: "#d9caa8",
};
const TAU = Math.PI * 2;

export function setup() { return {}; }

// A flat shape in two tones: `build(ctx)` traces it, `shade` fills it, then the light tone is laid over it shifted up and left, so a
// crescent of shade stays on the lower right.
function flat(ctx, build, light, shade, d = 14) {
  ctx.save();
  ctx.beginPath(); build(ctx); ctx.clip();
  ctx.fillStyle = shade; ctx.fillRect(-3000, -3000, 6000, 6000);
  ctx.translate(-d, -d);
  ctx.beginPath(); build(ctx); ctx.fillStyle = light; ctx.fill();
  ctx.restore();
}
const ell = (cx, cy, rx, ry, rot = 0) => c => c.ellipse(cx, cy, rx, ry, rot, 0, TAU);
const pill = (x, y, w, h) => c => c.roundRect(x, y, w, h, h / 2);
const rrect = (x, y, w, h, r) => c => c.roundRect(x, y, w, h, r);

// A rounded stroke in two tones (antlers, basket handle): the shade line, then the light one shifted up and left.
function flatLine(ctx, pts, w, light, shade, d = 5) {
  ctx.lineCap = ctx.lineJoin = "round"; ctx.lineWidth = w;
  for (const [o, col] of [[0, shade], [-d, light]]) {
    ctx.strokeStyle = col; ctx.beginPath();
    pts.forEach(([x, y], i) => ctx[i ? "lineTo" : "moveTo"](x + o, y + o));
    ctx.stroke();
  }
}

// The phone on (0, 0) of its own space, 130 x 240: face up with a few app lines, or `down` for its back.
function phone(ctx, { x, y, s = 1, rot = 0, down = false }) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  flat(ctx, rrect(-65, -120, 130, 240, 30), C.phone, C.ink, 8);
  if (down) {
    flat(ctx, rrect(-50, -105, 54, 54, 16), "#62564d", C.phone, 4);  // camera bump
    ctx.fillStyle = C.ink;
    for (const [dx, dy] of [[-35, -90], [-15, -66]]) { ctx.beginPath(); ctx.arc(dx, dy, 9, 0, TAU); ctx.fill(); }
    flat(ctx, ell(0, 52, 24, 24), C.sageLight, C.sageLightShade, 4);
  } else {
    flat(ctx, rrect(-54, -108, 108, 216, 20), C.cream, C.creamShade, 6);
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(-18, -96, 36, 10, 5); ctx.fill();  // speaker slot
    ctx.fillStyle = C.sageLight;  // a feed: lines and a dot
    for (const [py, w] of [[-52, 80], [-8, 90], [36, 60]]) { ctx.beginPath(); ctx.roundRect(-40, py, w, 26, 13); ctx.fill(); }
    ctx.fillStyle = C.heart; ctx.beginPath(); ctx.arc(34, 74, 14, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// Two eyes with a highlight at (cx, ey), a `lid` (0..1) shuts them half way for a bent-over look.
function eyes(ctx, cxs, ey, lid = 0) {
  for (const cx of cxs) {
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(cx, ey + 8 * lid, 15, 19 * (1 - 0.45 * lid), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = C.fur; ctx.beginPath(); ctx.arc(cx + 4, ey - 7 + 10 * lid, 5, 0, TAU); ctx.fill();
  }
}
// The small smile under a snout at (x, y).
function smile(ctx, x, y) {
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x - 20, y); ctx.quadraticCurveTo(x - 8, y + 16, x, y); ctx.quadraticCurveTo(x + 8, y + 16, x + 20, y); ctx.stroke();
}

// The rabbit sitting on (0, 0), facing right, as in style_mascot-flat. `phone` hunches it forward with the screen in its paws.
function rabbit(ctx, { x, y, s, phone: on = false, shadow = C.sageShade }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = shadow;  // ground shadow
  ctx.beginPath(); ctx.ellipse(0, 0, 185, 24, 0, 0, TAU); ctx.fill();
  flat(ctx, ell(-92, -34, 60, 34), C.fur, C.furShade, 8);  // feet
  flat(ctx, ell(92, -34, 60, 34), C.fur, C.furShade, 8);
  flat(ctx, ell(-158, -128, 30, 30), C.fur, C.furShade, 6);  // tail
  ctx.save();
  if (on) { ctx.translate(20, -90); ctx.rotate(0.3); ctx.translate(-20, 90); }  // lean the whole upper body forward
  flat(ctx, ell(0, -150, 168, 150), C.fur, C.furShade, 22);  // body
  if (!on) { flat(ctx, ell(-40, -104, 24, 30), C.fur, C.furShade, 5); flat(ctx, ell(40, -104, 24, 30), C.fur, C.furShade, 5); }  // paws
  for (const [d, rot] of [[-1, -0.16], [1, 0.16]]) {  // ears, laid back a little when hunched
    ctx.save(); ctx.translate(d * 62, -392); ctx.rotate(rot - (on ? 0.32 : 0));
    flat(ctx, ell(0, -92, 46, 124), C.fur, C.furShade, 10);
    flat(ctx, ell(0, -86, 22, 90), C.ear, C.earShade, 6);
    ctx.restore();
  }
  flat(ctx, ell(0, -330, 150, 128), C.fur, C.furShade, 18);  // head
  const ey = -326;
  ctx.fillStyle = C.blush;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 96 + 16, ey + 44, 28, 17, 0, 0, TAU); ctx.fill(); }
  eyes(ctx, [-34, 70], ey, on ? 1 : 0);
  ctx.fillStyle = C.nose;
  ctx.beginPath(); ctx.ellipse(18, ey + 38, 16, 11, 0, 0, TAU); ctx.fill();
  if (on) { ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(4, ey + 60); ctx.lineTo(32, ey + 60); ctx.stroke(); }  // a flat mouth
  else smile(ctx, 18, ey + 54);
  ctx.restore();
  if (on) {
    phone(ctx, { x: 215, y: -132, s: 0.62, rot: -0.2 });
    flat(ctx, ell(176, -96, 30, 27), C.fur, C.furShade, 5);  // paws over the phone's foot
    flat(ctx, ell(250, -104, 28, 26), C.fur, C.furShade, 5);
  }
  ctx.restore();
}

// The fox: orange, a cream lower face and chest, pointed ears and a big tail with a white tip. Faces right; `flip: -1` faces left.
function fox(ctx, { x, y, s, flip = 1, shadow = C.sageShade }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * flip, s);
  ctx.fillStyle = shadow;
  ctx.beginPath(); ctx.ellipse(0, 0, 185, 24, 0, 0, TAU); ctx.fill();
  const tail = ell(-205, -120, 118, 54, 0.55);
  flat(ctx, tail, C.fox, C.foxShade, 12);
  ctx.save(); ctx.beginPath(); tail(ctx); ctx.clip();
  flat(ctx, ell(-290, -176, 56, 50, 0.55), C.fur, C.furShade, 8);  // the white tip
  ctx.restore();
  flat(ctx, ell(-92, -34, 60, 34), C.snout, C.ink, 8);  // dark socks
  flat(ctx, ell(92, -34, 60, 34), C.snout, C.ink, 8);
  flat(ctx, ell(0, -150, 165, 150), C.fox, C.foxShade, 22);  // body
  flat(ctx, ell(50, -128, 80, 104), C.fur, C.furShade, 10);  // chest
  flat(ctx, ell(-34, -104, 24, 30), C.snout, C.ink, 5);
  flat(ctx, ell(40, -104, 24, 30), C.snout, C.ink, 5);
  const ear = c => { c.moveTo(-54, 12); c.quadraticCurveTo(-50, -100, 6, -176); c.quadraticCurveTo(56, -100, 54, 12); c.closePath(); };
  const earIn = c => { c.moveTo(-26, 8); c.quadraticCurveTo(-22, -68, 6, -118); c.quadraticCurveTo(30, -68, 28, 8); c.closePath(); };
  for (const d of [-1, 1]) {
    ctx.save(); ctx.translate(d * 88, -412); ctx.rotate(d * 0.2);
    flat(ctx, ear, C.fox, C.foxShade, 9);
    flat(ctx, earIn, C.snout, C.ink, 4);
    ctx.restore();
  }
  flat(ctx, ell(0, -325, 160, 118), C.fox, C.foxShade, 18);  // head
  flat(ctx, ell(10, -282, 134, 62), C.fur, C.furShade, 8);  // cream lower face
  const ey = -336;
  ctx.fillStyle = C.blush;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 100 + 16, ey + 52, 24, 15, 0, 0, TAU); ctx.fill(); }
  eyes(ctx, [-34, 70], ey);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(18, ey + 38, 19, 13, 0, 0, TAU); ctx.fill();
  smile(ctx, 18, ey + 60);
  ctx.restore();
}

// The deer sitting on (0, 0), same round language: an egg body, a round head, leaf ears, small antlers, a pale muzzle.
function deer(ctx, { x, y, s, flip = 1, shadow = C.sageShade }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * flip, s);
  ctx.fillStyle = shadow;
  ctx.beginPath(); ctx.ellipse(0, 0, 190, 24, 0, 0, TAU); ctx.fill();
  flat(ctx, ell(-166, -118, 26, 32), C.cream, C.creamShade, 6);  // tail tuft
  flat(ctx, ell(-44, -28, 56, 28), C.coat, C.coatShade, 8);  // hind foot
  flat(ctx, ell(-12, -150, 158, 162), C.coat, C.coatShade, 22);  // body
  flat(ctx, ell(-96, -78, 80, 66), C.coat, C.coatShade, 10);  // haunch
  flat(ctx, ell(58, -126, 66, 100), C.cream, C.creamShade, 10);  // chest
  ctx.fillStyle = C.cream;  // back spots
  for (const [dx, dy, r] of [[-58, -250, 14], [-112, -196, 12], [-22, -204, 11], [-132, -250, 9]]) { ctx.beginPath(); ctx.arc(dx, dy, r, 0, TAU); ctx.fill(); }
  for (const lx of [24, 92]) {  // front legs
    flat(ctx, pill(lx - 27, -150, 54, 134), C.coat, C.coatShade, 6);
    flat(ctx, ell(lx, -16, 31, 17), C.snout, C.ink, 4);  // hooves
  }
  flatLine(ctx, [[-14, -454], [-40, -562]], 24, C.antler, C.antlerShade);  // antlers, behind the head
  flatLine(ctx, [[-30, -512], [-84, -540]], 22, C.antler, C.antlerShade);
  flatLine(ctx, [[84, -458], [104, -566]], 24, C.antler, C.antlerShade);
  flatLine(ctx, [[98, -514], [150, -536]], 22, C.antler, C.antlerShade);
  for (const [d, rot] of [[-1, -1.0], [1, 1.0]]) {  // leaf ears
    ctx.save(); ctx.translate(30 + d * 140, -404); ctx.rotate(rot);
    flat(ctx, ell(0, -40, 40, 84), C.coat, C.coatShade, 8);
    flat(ctx, ell(0, -34, 20, 58), C.ear, C.earShade, 5);
    ctx.restore();
  }
  flat(ctx, ell(30, -350, 142, 122), C.coat, C.coatShade, 18);  // head
  const ey = -358;
  ctx.fillStyle = C.blush;
  ctx.beginPath(); ctx.ellipse(-20, ey + 50, 26, 16, 0, 0, TAU); ctx.fill();
  flat(ctx, ell(98, -310, 62, 46), C.cream, C.creamShade, 8);  // muzzle
  eyes(ctx, [-2, 96], ey);
  ctx.fillStyle = C.snout;
  ctx.beginPath(); ctx.ellipse(130, -330, 21, 15, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = C.snout; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(100, -302); ctx.quadraticCurveTo(110, -288, 122, -302); ctx.stroke();
  ctx.restore();
}

// The hedgehog: a round brown body whose back is a spiky star in two tones under a softer dome, a pale round face and a pointed snout.
function hedgehog(ctx, { x, y, s, flip = 1, shadow = C.sageShade }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * flip, s);
  ctx.fillStyle = shadow;
  ctx.beginPath(); ctx.ellipse(0, 0, 175, 22, 0, 0, TAU); ctx.fill();
  const spikes = c => {
    const n = 24;
    for (let i = 0; i < n * 2; i++) {
      const a = (i * Math.PI) / n, r = i % 2 ? 150 : 192;
      c[i ? "lineTo" : "moveTo"](-14 + Math.cos(a) * r, -135 + Math.sin(a) * r * 0.96);
    }
    c.closePath();
  };
  flat(ctx, spikes, C.spike, C.spikeShade, 14);
  flat(ctx, ell(-14, -138, 140, 128), C.hog, C.hogShade, 16);  // the softer dome
  flat(ctx, ell(-40, -22, 40, 22), C.hogFace, C.hogFaceShade, 5);  // feet
  flat(ctx, ell(80, -22, 40, 22), C.hogFace, C.hogFaceShade, 5);
  flat(ctx, ell(34, -196, 30, 34), C.hogFace, C.hogFaceShade, 5);  // ear
  flat(ctx, ell(92, -108, 98, 90), C.hogFace, C.hogFaceShade, 12);  // face
  flat(ctx, ell(172, -92, 46, 36), C.hogFace, C.hogFaceShade, 6);  // snout
  const ey = -130;
  ctx.fillStyle = C.blush; ctx.beginPath(); ctx.ellipse(82, ey + 46, 24, 15, 0, 0, TAU); ctx.fill();
  eyes(ctx, [72, 140], ey);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(208, -98, 16, 13, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(150, -62); ctx.quadraticCurveTo(168, -46, 186, -62); ctx.stroke();
  ctx.restore();
}

// A round tree on (x, y) (its foot): a pill trunk and a round crown in two tones.
function tree(ctx, x, y, s, light, shade) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  flat(ctx, pill(-15, -110, 30, 112), C.antler, C.antlerShade, 5);
  flat(ctx, ell(0, -170, 82, 82), light, shade, 14);
  flat(ctx, ell(-52, -126, 42, 42), light, shade, 8);
  flat(ctx, ell(54, -128, 40, 40), light, shade, 8);
  ctx.restore();
}

// The picnic rug: a red oval in perspective with a cream gingham check laid in its light tone.
function rug(ctx, x, y) {
  ctx.save(); ctx.translate(x, y);
  flat(ctx, ell(0, 0, 270, 70), C.rug, C.rugShade, 12);
  ctx.save(); ctx.translate(-12, -12);
  ctx.beginPath(); ctx.ellipse(0, 0, 270, 70, 0, 0, TAU); ctx.clip();
  ctx.fillStyle = C.cream;
  for (let i = -6; i < 6; i++) for (let j = -2; j < 2; j++) if ((i + j) % 2 === 0) ctx.fillRect(i * 50, j * 34, 50, 34);
  ctx.restore();
  ctx.restore();
}

// The basket on (x, y) (its foot): wicker with a handle, a cream cloth and an apple.
function basket(ctx, x, y) {
  ctx.save(); ctx.translate(x, y);
  flatLine(ctx, Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (1 - i / 12); return [Math.cos(a) * 62, -60 - Math.sin(a) * 78]; }), 14, C.wicker, C.wickerShade, 4);  // handle
  flat(ctx, c => { c.moveTo(-78, -64); c.lineTo(78, -64); c.quadraticCurveTo(70, 0, 0, 0); c.quadraticCurveTo(-70, 0, -78, -64); c.closePath(); }, C.wicker, C.wickerShade, 8);
  flat(ctx, pill(-92, -88, 184, 36), C.cream, C.creamShade, 5);  // the cloth
  flat(ctx, ell(24, -98, 26, 24), C.heart, C.heartShade, 5);  // an apple
  ctx.restore();
}

// The carrot on (x, y), lying tilted by `rot`.
function carrot(ctx, x, y, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  flat(ctx, c => { c.moveTo(-62, -24); c.quadraticCurveTo(-78, 0, -62, 24); c.quadraticCurveTo(0, 34, 80, 3); c.quadraticCurveTo(84, 0, 80, -3); c.quadraticCurveTo(0, -34, -62, -24); c.closePath(); }, "#f2923f", "#d9742a", 6);
  for (const a of [-0.5, 0, 0.5]) { ctx.save(); ctx.translate(-70, 0); ctx.rotate(Math.PI + a); flat(ctx, ell(34, 0, 36, 13), C.sageLight, C.sageLightShade, 4); ctx.restore(); }
  ctx.restore();
}

// A tree stump on (x, y) with the phone face down on top of it.
function stump(ctx, x, y) {
  ctx.save(); ctx.translate(x, y);
  flat(ctx, rrect(-76, -84, 152, 110, 30), C.antler, C.antlerShade, 8);
  flat(ctx, ell(0, -84, 76, 28), "#dcae7f", "#c4915f", 6);  // the cut top
  flat(ctx, ell(0, -84, 44, 14), "#c4915f", "#dcae7f", 3);  // a ring
  ctx.save(); ctx.translate(0, -90); ctx.scale(1, 0.42);
  phone(ctx, { x: 0, y: 0, s: 0.42, rot: -0.9, down: true });
  ctx.restore();
  ctx.restore();
}

// A small flower: five round petals round a sun-coloured heart.
function flower(ctx, x, y, r, petal) {
  ctx.fillStyle = petal;
  for (let i = 0; i < 5; i++) { const a = (i * TAU) / 5; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, r * 0.7, 0, TAU); ctx.fill(); }
  ctx.fillStyle = C.sun; ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, TAU); ctx.fill();
}

// The meadow panel: day sky, a far ridge, the hill with the rug, basket, carrot and the stump with the phone face down.
function meadow(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, 56); ctx.clip();
  ctx.fillStyle = C.sky; ctx.fillRect(0, 0, w, h);
  flat(ctx, ell(780, 84, 52, 52), C.sun, C.sunShade, 8);
  flat(ctx, pill(110, 56, 190, 58), C.cream, C.creamShade, 7);  // clouds
  flat(ctx, pill(190, 24, 110, 58), C.cream, C.creamShade, 7);
  flat(ctx, ell(200, 250, 360, 130), C.ridge, C.ridgeShade, 18);  // far ridge
  flat(ctx, ell(720, 240, 420, 140), C.ridge, C.ridgeShade, 18);
  flat(ctx, ell(480, 500, 700, 230), C.sage, C.sageShade, 26);  // the meadow
  tree(ctx, 92, 296, 0.8, C.sageLight, C.sageLightShade);
  tree(ctx, 214, 270, 0.5, C.sageLight, C.sageLightShade);
  tree(ctx, 900, 300, 0.9, C.sageLight, C.sageLightShade);
  tree(ctx, 640, 268, 0.5, C.sun, C.sunShade);
  for (const [fx, fy, r, col] of [[60, 380, 11, C.cream], [150, 396, 9, C.ear], [700, 392, 10, C.cream], [950, 420, 12, C.ear], [610, 330, 8, C.ear], [930, 370, 9, C.cream]]) flower(ctx, fx, fy, r, col);
  rug(ctx, 400, 330);
  basket(ctx, 310, 330);
  carrot(ctx, 545, 340, 0.3);
  stump(ctx, 800, 390);
  ctx.restore();
}

// The golden-hour strip: the same sky and ridge warmed, a low sun, the hill and a tree, in flat bands.
function golden(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, h / 2); ctx.clip();
  ctx.fillStyle = C.gold; ctx.fillRect(0, 0, w, h);
  flat(ctx, ell(700, h + 4, 120, 120), C.sun, C.sunShade, 8);  // a low sun
  flat(ctx, ell(300, h + 40, 420, 90), C.goldRidge, C.goldRidgeShade, 12);
  flat(ctx, ell(860, h + 50, 360, 86), C.goldRidge, C.goldRidgeShade, 12);
  flat(ctx, ell(480, h + 80, 620, 100), C.sage, C.sageShade, 14);
  ctx.restore();
}

export function draw(ctx, t, W, H, st) {
  const k = W / 1080;
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.scale(k, k);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const label = (text, x, y, size = 36, color = C.sage) => { ctx.fillStyle = color; ctx.font = `500 ${size}px Fredoka`; ctx.fillText(text, x, y); };
  // a caption line, shrunk to fit the gutters
  const line = (text, y, color, size) => {
    ctx.fillStyle = color; ctx.font = `700 ${size}px Fredoka`;
    const f = Math.min(1, 940 / ctx.measureText(text).width);
    ctx.save(); ctx.translate(540, y); ctx.scale(f, f); ctx.fillText(text, 0, 0); ctx.restore();
  };

  // type: the hook caption as it will read, with the sheet's name above it
  label("Picnic for four · mascot flat · style sheet", 540, 64, 36);
  line("Put the phone down.", 176, C.ink, 112);
  line("Your friends are here.", 300, C.sage, 112);

  // the meadow by day, then the same sky at golden hour
  meadow(ctx, 60, 380, 960, 490);
  golden(ctx, 60, 892, 960, 92);
  label("golden hour", 230, 938, 38, C.snout);

  // the cast, on a sage band so the pale fur reads
  ctx.save();
  ctx.beginPath(); ctx.roundRect(60, 1016, 960, 434, 56); ctx.clip();
  ctx.fillStyle = C.sage; ctx.fillRect(0, 0, W, 2000);
  ctx.fillStyle = C.sageShade; ctx.beginPath(); ctx.ellipse(540, 1560, 900, 190, 0, 0, TAU); ctx.fill();
  ctx.restore();
  rabbit(ctx, { x: 148, y: 1360, s: 0.44 });
  rabbit(ctx, { x: 345, y: 1360, s: 0.44, phone: true });
  fox(ctx, { x: 555, y: 1360, s: 0.44, flip: -1 });
  deer(ctx, { x: 745, y: 1360, s: 0.44, flip: -1 });
  hedgehog(ctx, { x: 915, y: 1360, s: 0.44 });
  ctx.save(); ctx.font = "500 34px Fredoka"; ctx.fillStyle = C.cream;
  ctx.fillText("rabbit", 148, 1412); ctx.fillText("rabbit + phone", 360, 1412); ctx.fillText("fox", 555, 1412); ctx.fillText("deer", 745, 1412); ctx.fillText("hedgehog", 915, 1412);
  ctx.restore();

  // the pop props: heart, sparkle, laugh, dust, buzz
  const py = 1585;
  ctx.save(); ctx.translate(120, py); ctx.scale(0.9, 0.9);
  flat(ctx, c => { c.moveTo(0, -20); c.bezierCurveTo(0, -52, -52, -52, -52, -12); c.bezierCurveTo(-52, 22, -10, 42, 0, 58); c.bezierCurveTo(10, 42, 52, 22, 52, -12); c.bezierCurveTo(52, -52, 0, -52, 0, -20); c.closePath(); }, C.heart, C.heartShade, 7);
  ctx.restore();
  sparkle(ctx, 330, py, 56, C.sun);
  sparkle(ctx, 384, py - 42, 20, C.sage);
  flat(ctx, pill(440, py - 38, 190, 76), C.cream, C.creamShade, 6);  // "ha ha"
  ctx.fillStyle = C.ink; ctx.font = "700 46px Fredoka"; ctx.fillText("ha ha!", 535, py + 2);
  for (const [dx, dy, r] of [[722, py + 12, 24], [796, py + 12, 22], [759, py - 6, 32]]) flat(ctx, ell(dx, dy, r, r), C.ridge, C.ridgeShade, 5);  // a dust puff
  ctx.strokeStyle = C.sage; ctx.lineWidth = 12; ctx.lineCap = "round";  // buzz marks
  for (const o of [-1, 1]) for (const r of [34, 56]) { ctx.beginPath(); ctx.arc(950, py, r, o < 0 ? Math.PI * 0.72 : -Math.PI * 0.28, o < 0 ? Math.PI * 1.28 : Math.PI * 0.28); ctx.stroke(); }
  [["heart", 120], ["sparkle", 345], ["laugh", 535], ["dust", 765], ["buzz", 950]].forEach(([text, px]) => label(text, px, 1680, 32));

  // the palette: every colour in the same two tones
  const swatches = [[C.cream, C.creamShade], [C.sageLight, C.sageLightShade], [C.sage, C.sageShade], [C.fur, C.furShade], [C.fox, C.foxShade],
    [C.coat, C.coatShade], [C.hog, C.hogShade], [C.rug, C.rugShade], [C.sun, C.sunShade], [C.phone, C.ink]];
  ctx.fillStyle = C.sky; ctx.beginPath(); ctx.roundRect(50, 1750, 980, 116, 58); ctx.fill();
  swatches.forEach(([light, shade], i) => flat(ctx, ell(100 + i * 98, 1808, 40, 40), light, shade, 7));
  ctx.restore();
}
