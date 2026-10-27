// "picnic_for_four_flat": a rabbit sits hunched over its phone on a picnic rug until a fox, a deer and a hedgehog arrive and try, one by
// one, to get its attention; the phone goes face down on a stump and the picnic starts. Clean flat mascot vector (see picnic_for_four_flat_style
// and video/styles/cards/mascot-flat.md): every shape in two flat tones, no outlines. A frame is a pure function of t; see picnic_for_four_flat.md.
import { prog, easeOut, easeIo, lerp } from "../ink.mjs";
import { grainPattern, endCard, CLOSING, STORE, mix } from "../cel.mjs";
import { sparkle } from "../kawaii.mjs";
import { squash, hop, easeBack, blinkTimes, blink } from "../toon.mjs";

export const DURATION = 18, COVER = 12.8;
// SOUND.kind picks the ffmpeg builder in audio.mjs: a lofi bed with a buzz, a thunk, hops, a sparkle and the end-card chime on the story's own times.
export const SOUND = { kind: "lofi", bpm: 74, buzz: [1.2, 3], thunk: 9, hops: [9.6, 10.4, 11.2] };
export const SCENES = [
  { name: "rug", from: 0, to: 3.8 }, { name: "waiting", from: 3.8, to: 8.4 }, { name: "picnic", from: 8.4, to: 12.2 },
  { name: "golden", from: 12.2, to: 14.8 }, { name: "card", from: 14.8, to: DURATION },
];
export const CAPTIONS = [
  { from: 0, to: 3.8, lines: [["Put the phone down."], ["Your friends are here."]] },
  { from: 4.2, to: 8, lines: [["They've been waiting."]] },
  { from: 8.4, to: 12, lines: [["Share the snack,"], ["not the screen."]] },
  { from: 12.2, to: 14.6, lines: [["Best company there is."]] },
];
export const END = { from: 14.8, title: "WildFocus", lines: CLOSING, store: STORE };
// Review gate 2: the still for each beat, with the line it carries (node video/canvas/render.mjs picnic_for_four_flat --sheet OUT.png "0.5,2.5,...").
export const BEATS = [
  { t: 0.5, word: "Hook", say: "The rabbit alone on the rug, hunched over its phone; the hook is on screen from frame 0." },
  { t: 2.5, word: "Friends arrive", say: "The fox, deer and hedgehog hop in one by one with the basket." },
  { t: 3.1, word: "Buzz", say: "The phone buzzes and shakes in the rabbit's paws; it does not look up." },
  { t: 5, word: "Nudge", say: "The hedgehog scoots over and nudges the rabbit." },
  { t: 6.2, word: "Head tilt", say: "The deer tilts its head and a question mark pops up." },
  { t: 7.4, word: "Wave", say: "The fox waves a paw: they have been waiting." },
  { t: 8.8, word: "Looks up", say: "The rabbit finally looks up, eyes open." },
  { t: 9.2, word: "Phone down", say: "The phone lies face down on the stump, a small dust puff." },
  { t: 10.4, word: "Picnic", say: "The carrot goes round, ha ha and hearts pop, everyone hops." },
  { t: 13, word: "Golden hour", say: "The four sit close, the sky warms, sparkles." },
  { t: 15.5, word: "End card", say: "The shared closing card." },
];

// style_mascot-flat's palette plus this story's: fox, deer and hedgehog coats, a red rug, wicker and wood, and a golden-hour sky.
const C = {
  cream: "#fff6e2", creamShade: "#eadcc0", sage: "#4a7c59", sageShade: "#3d6a4a", sageLight: "#7fa88a", sageLightShade: "#6d9879", ink: "#342c26",
  fur: "#fffdf8", furShade: "#e9dcc2", ear: "#f4b9ae", earShade: "#e89c92", blush: "#f4a5a0", nose: "#e27d78", sun: "#eea840", sunShade: "#d98f2c",
  fox: "#ee8a3c", foxShade: "#d97429", coat: "#dba46a", coatShade: "#c68a4e", hog: "#a47d64", hogShade: "#8f6a53", spike: "#7a5a47", spikeShade: "#654836",
  hogFace: "#f3d9b6", hogFaceShade: "#e0c096", antler: "#b98863", antlerShade: "#a1724f", snout: "#5b4034",
  rug: "#e8756a", rugShade: "#d0605a", wicker: "#d19a62", wickerShade: "#b98450", heart: "#ef6f7e", heartShade: "#d95a69",
  sky: "#dcece0", ridge: "#a9c7b0", ridgeShade: "#98b8a0", gold: "#f7d08e", goldRidge: "#e8b184", goldRidgeShade: "#d99f74",
  phone: "#4b413a", off: "#d9caa8",
};
const TAU = Math.PI * 2;

export function setup(doc, W, H, { icon }) {
  const until = 13.2;  // nobody blinks once the group is posed
  return { icon, tile: grainPattern(doc, 5), blinks: { rabbit: blinkTimes(11, until), fox: blinkTimes(23, until), deer: blinkTimes(37, until), hog: blinkTimes(41, until) } };
}

// --- flat helpers (copied from the style sheet) ---------------------------------------------------------------------------

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

// Places a character on (x, y) (its feet): `flip` -1 faces left, `v` squashes (toon.squash), `breathe` swells it a hair.
function place(ctx, { x, y, s, flip = 1, v = 0, breathe = 0 }) {
  const { sx, sy } = squash(v);
  ctx.translate(x, y);
  ctx.scale(s * flip * sx, s * sy * (1 + 0.016 * breathe));
}

// The phone on (0, 0) of its own space, 130 x 240: face up with a scrolling feed, or `down` for its back. `sx`/`sy` squash it in perspective.
function phone(ctx, { x, y, s = 1, rot = 0, down = false, sx = 1, sy = 1, scroll = 0 }) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * sx, s * sy);
  flat(ctx, rrect(-65, -120, 130, 240, 30), C.phone, C.ink, 8);
  if (down) {
    flat(ctx, rrect(-50, -105, 54, 54, 16), "#62564d", C.phone, 4);  // camera bump
    ctx.fillStyle = C.ink;
    for (const [dx, dy] of [[-35, -90], [-15, -66]]) { ctx.beginPath(); ctx.arc(dx, dy, 9, 0, TAU); ctx.fill(); }
    flat(ctx, ell(0, 52, 24, 24), C.sageLight, C.sageLightShade, 4);
  } else {
    flat(ctx, rrect(-54, -108, 108, 216, 20), C.cream, C.creamShade, 6);
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(-18, -96, 36, 10, 5); ctx.fill();  // speaker slot
    ctx.save(); ctx.beginPath(); ctx.roundRect(-54, -84, 108, 192, 14); ctx.clip();
    ctx.fillStyle = C.sageLight;  // a feed that scrolls up under the thumb
    for (let i = 0; i < 5; i++) { const yy = -90 + ((i * 44 - scroll) % 220 + 220) % 220; ctx.beginPath(); ctx.roundRect(-40, yy, [80, 90, 60, 84, 70][i], 26, 13); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = C.heart; ctx.beginPath(); ctx.arc(34, 80, 12, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// Two eyes with a highlight at (cx, ey): `lid` (0..1) half shuts them for a bent-over look, `b` is a blink (0 open, 1 shut).
function eyes(ctx, cxs, ey, lid = 0, b = 0) {
  for (const cx of cxs) {
    if (b > 0.6) {
      ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(cx - 14, ey + 6 * lid); ctx.quadraticCurveTo(cx, ey + 6 * lid + 8, cx + 14, ey + 6 * lid); ctx.stroke();
      continue;
    }
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(cx, ey + 8 * lid, 15, 19 * (1 - 0.45 * lid) * (1 - b), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = C.fur; ctx.beginPath(); ctx.arc(cx + 4, ey - 7 + 10 * lid, 5, 0, TAU); ctx.fill();
  }
}
// The small smile under a snout at (x, y).
function smile(ctx, x, y) {
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x - 20, y); ctx.quadraticCurveTo(x - 8, y + 16, x, y); ctx.quadraticCurveTo(x + 8, y + 16, x + 20, y); ctx.stroke();
}

// --- characters ---------------------------------------------------------------------------------------------------------

// The rabbit sitting on (0, 0), facing right. `hunch` (0..1) leans it over the phone, which `hold` keeps in its paws; `thumb` lifts the
// thumb paw, `shake` jolts the phone, `rock` tips the whole rabbit (a nudge).
function rabbit(ctx, o) {
  const { hunch = 0, hold = false, shake = 0, thumb = 0, rock = 0, blink: b = 0, scroll = 0 } = o;
  ctx.save();
  place(ctx, o);
  ctx.rotate(rock);
  flat(ctx, ell(-92, -34, 60, 34), C.fur, C.furShade, 8);  // feet
  flat(ctx, ell(92, -34, 60, 34), C.fur, C.furShade, 8);
  flat(ctx, ell(-158, -128, 30, 30), C.fur, C.furShade, 6);  // tail
  ctx.save();
  if (hunch) { ctx.translate(20, -90); ctx.rotate(0.3 * hunch); ctx.translate(-20, 90); }  // lean the whole upper body forward
  flat(ctx, ell(0, -150, 168, 150), C.fur, C.furShade, 22);  // body
  if (!hold) { flat(ctx, ell(-40, -104, 24, 30), C.fur, C.furShade, 5); flat(ctx, ell(40, -104, 24, 30), C.fur, C.furShade, 5); }  // paws
  for (const [d, rot] of [[-1, -0.16], [1, 0.16]]) {  // ears, laid back a little when hunched
    ctx.save(); ctx.translate(d * 62, -392); ctx.rotate(rot - 0.32 * hunch);
    flat(ctx, ell(0, -92, 46, 124), C.fur, C.furShade, 10);
    flat(ctx, ell(0, -86, 22, 90), C.ear, C.earShade, 6);
    ctx.restore();
  }
  flat(ctx, ell(0, -330, 150, 128), C.fur, C.furShade, 18);  // head
  const ey = -326;
  ctx.fillStyle = C.blush;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 96 + 16, ey + 44, 28, 17, 0, 0, TAU); ctx.fill(); }
  eyes(ctx, [-34, 70], ey, hunch, b);
  ctx.fillStyle = C.nose;
  ctx.beginPath(); ctx.ellipse(18, ey + 38, 16, 11, 0, 0, TAU); ctx.fill();
  if (hunch > 0.5) { ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(4, ey + 60); ctx.lineTo(32, ey + 60); ctx.stroke(); }  // a flat mouth
  else smile(ctx, 18, ey + 54);
  ctx.restore();
  if (hold) {
    phone(ctx, { x: 215 + 7 * shake, y: -132, s: 0.62, rot: -0.2 + 0.14 * shake, scroll });
    flat(ctx, ell(176, -96, 30, 27), C.fur, C.furShade, 5);  // paws over the phone's foot
    flat(ctx, ell(250, -104 - thumb, 28, 26), C.fur, C.furShade, 5);
  }
  ctx.restore();
}

// The fox: orange, a cream lower face and chest, pointed ears and a big tail with a white tip. `wave` (0..1) raises a paw and `ang` swings it.
function fox(ctx, o) {
  const { wave = 0, ang = 0, blink: b = 0 } = o;
  ctx.save();
  place(ctx, o);
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
  if (!wave) flat(ctx, ell(40, -104, 24, 30), C.snout, C.ink, 5);
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
  eyes(ctx, [-34, 70], ey, 0, b);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(18, ey + 38, 19, 13, 0, 0, TAU); ctx.fill();
  smile(ctx, 18, ey + 60);
  if (wave) {  // the waving arm, from the shoulder up, in front of the chest
    ctx.translate(138, -170); ctx.rotate(0.7 * wave + ang);
    ctx.scale(1, wave);
    flat(ctx, ell(0, -70, 34, 90), C.fox, C.foxShade, 6);
    flat(ctx, ell(0, -154, 38, 36), C.snout, C.ink, 5);
    ctx.restore();
  }
  ctx.restore();
}

// The deer sitting on (0, 0): an egg body, a round head, leaf ears, small antlers, a pale muzzle. `tilt` rolls the head.
function deer(ctx, o) {
  const { tilt = 0, blink: b = 0 } = o;
  ctx.save();
  place(ctx, o);
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
  ctx.save(); ctx.translate(30, -250); ctx.rotate(tilt); ctx.translate(-30, 250);  // the head and all on it roll about the neck
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
  eyes(ctx, [-2, 96], ey, 0, b);
  ctx.fillStyle = C.snout;
  ctx.beginPath(); ctx.ellipse(130, -330, 21, 15, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = C.snout; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(100, -302); ctx.quadraticCurveTo(110, -288, 122, -302); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// The hedgehog: a round brown body whose back is a spiky star in two tones under a softer dome, a pale round face and a pointed snout.
function hedgehog(ctx, o) {
  const { blink: b = 0 } = o;
  ctx.save();
  place(ctx, o);
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
  eyes(ctx, [72, 140], ey, 0, b);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(208, -98, 16, 13, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(150, -62); ctx.quadraticCurveTo(168, -46, 186, -62); ctx.stroke();
  ctx.restore();
}

// --- props and scenery --------------------------------------------------------------------------------------------------

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
function rug(ctx, x, y, rx, ry) {
  ctx.save(); ctx.translate(x, y);
  flat(ctx, ell(0, 0, rx, ry), C.rug, C.rugShade, 16);
  ctx.save(); ctx.translate(-16, -16);
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.clip();
  ctx.fillStyle = C.cream;
  const cw = 80, ch = 52;
  for (let i = -7; i < 7; i++) for (let j = -4; j < 4; j++) if ((i + j) % 2 === 0) ctx.fillRect(i * cw, j * ch, cw, ch);
  ctx.restore();
  ctx.restore();
}

// The basket on (x, y) (its foot): wicker with a handle, a cream cloth and an apple.
function basket(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  flatLine(ctx, Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (1 - i / 12); return [Math.cos(a) * 62, -60 - Math.sin(a) * 78]; }), 14, C.wicker, C.wickerShade, 4);  // handle
  flat(ctx, c => { c.moveTo(-78, -64); c.lineTo(78, -64); c.quadraticCurveTo(70, 0, 0, 0); c.quadraticCurveTo(-70, 0, -78, -64); c.closePath(); }, C.wicker, C.wickerShade, 8);
  flat(ctx, pill(-92, -88, 184, 36), C.cream, C.creamShade, 5);  // the cloth
  flat(ctx, ell(-30, -98, 26, 24), C.heart, C.heartShade, 5);  // an apple
  ctx.restore();
}

// The carrot on (x, y), tilted by `rot`.
function carrot(ctx, x, y, rot, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  flat(ctx, c => { c.moveTo(-62, -24); c.quadraticCurveTo(-78, 0, -62, 24); c.quadraticCurveTo(0, 34, 80, 3); c.quadraticCurveTo(84, 0, 80, -3); c.quadraticCurveTo(0, -34, -62, -24); c.closePath(); }, "#f2923f", "#d9742a", 6);
  for (const a of [-0.5, 0, 0.5]) { ctx.save(); ctx.translate(-70, 0); ctx.rotate(Math.PI + a); flat(ctx, ell(34, 0, 36, 13), C.sageLight, C.sageLightShade, 4); ctx.restore(); }
  ctx.restore();
}

// A tree stump on (x, y): wood, a pale cut top and a ring.
function stump(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  flat(ctx, rrect(-76, -84, 152, 110, 30), C.antler, C.antlerShade, 8);
  flat(ctx, ell(0, -84, 76, 28), "#dcae7f", "#c4915f", 6);  // the cut top
  flat(ctx, ell(0, -84, 44, 14), "#c4915f", "#dcae7f", 3);  // a ring
  ctx.restore();
}

function flower(ctx, x, y, r, petal) {
  ctx.fillStyle = petal;
  for (let i = 0; i < 5; i++) { const a = (i * TAU) / 5; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, r * 0.7, 0, TAU); ctx.fill(); }
  ctx.fillStyle = C.sun; ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, TAU); ctx.fill();
}

const heartPath = c => { c.moveTo(0, -20); c.bezierCurveTo(0, -52, -52, -52, -52, -12); c.bezierCurveTo(-52, 22, -10, 42, 0, 58); c.bezierCurveTo(10, 42, 52, 22, 52, -12); c.bezierCurveTo(52, -52, 0, -52, 0, -20); c.closePath(); };

// A pop prop living for u in 0..1: it springs in, floats up and shrinks away. `kind` is "heart", "?" or a laugh text.
function pop(ctx, kind, x, y, u) {
  if (u <= 0 || u >= 1) return;
  const sc = easeBack(prog(u, 0, 0.22)) * (1 - prog(u, 0.82, 1)), yy = y - 50 * easeOut(u);
  ctx.save(); ctx.translate(x, yy); ctx.scale(sc, sc);
  if (kind === "heart") { ctx.scale(1.1, 1.1); flat(ctx, heartPath, C.heart, C.heartShade, 7); }
  else {
    const w = kind === "?" ? 90 : 210;
    flat(ctx, pill(-w / 2, -42, w, 84), C.cream, C.creamShade, 6);
    ctx.fillStyle = C.ink; ctx.font = "700 54px Fredoka"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(kind, 0, 4);
  }
  ctx.restore();
}

// --- the story's clock ----------------------------------------------------------------------------------------------------

// A walk-in: x eases from `from` to `to` over a..b with `n` hops (a lift y and a squash v), still before and after.
function walk(t, a, b, from, to, n) {
  const u = prog(t, a, b), ph = u * n;
  if (u <= 0 || u >= 1) return { x: u <= 0 ? from : to, y: 0, v: 0 };
  return { x: lerp(from, to, easeOut(u)), y: -26 * Math.abs(Math.sin(Math.PI * ph)) * (1 - 0.4 * u), v: 0.1 * Math.sin(TAU * ph + 1.2) };
}
// A bump of 0..1: rises over a..b, holds to c, falls over c..d.
const bell = (t, a, b, c, d) => easeIo(prog(t, a, b)) * (1 - easeIo(prog(t, c, d)));
// The phone's buzz: a quick damped shake after each cue (-1..1).
const BUZZ = [1.2, 3];
const buzz = t => BUZZ.reduce((s, b) => { const u = t - b; return u > 0 && u < 0.5 ? s + Math.sin(u * 95) * Math.exp(-u * 7) : s; }, 0);
const HOPS = [9.6, 10.4, 11.2];
// All the animals hop on the sound cues, and once together as they scoot close at 12.
const hopAt = (t, h = 64) => [...HOPS, 12].reduce((a, at) => { const o = hop(t, at, 0.55, at === 12 ? 16 : h); return { y: a.y + o.y, v: a.v + o.v }; }, { y: 0, v: 0 });

const SLOT = { rabbit: [230, 1660, 0.95], hog: [540, 1810, 0.8], fox: [800, 1530, 0.78], deer: [960, 1660, 0.7] };
const BASKET = [800, 1815], STUMP = [470, 1540, 1.3], RUG = [540, 1690, 640, 230];
const PHONE_DOWN = [STUMP[0], STUMP[1] - 90 * STUMP[2], 0.42 * STUMP[2]];  // where the phone lies: x, y, scale

// Everything that moves, as a pure function of t: the characters' places and poses, the basket, the carrot.
function world(t) {
  const sc = easeIo(prog(t, 12, 12.8)), H = hopAt(t);
  const fx = walk(t, 0.3, 1.7, 1420, SLOT.fox[0], 5), de = walk(t, 1.1, 2.5, 1420, SLOT.deer[0], 5), hg = walk(t, 1.9, 3.4, 1420, SLOT.hog[0], 6);
  const nud = easeIo(prog(t, 4.5, 4.95)) - easeIo(prog(t, 5.25, 5.9)), bump = t - 4.95;
  const hn = hop(t, 4.5, 0.5, 18);
  const rs = easeIo(prog(t, 8, 8.8));
  const hunch = 1 - rs;
  const R = {
    rabbit: { x: SLOT.rabbit[0] + 60 * sc, y: SLOT.rabbit[1] + H.y, s: SLOT.rabbit[2], flip: 1, v: H.v + 0.05 * buzz(t) * (t < 8 ? 1 : 0),
      hunch, hold: t < 8.6, shake: t < 8.6 ? buzz(t) : 0, thumb: t < 8.6 ? 9 * Math.abs(Math.sin(t * 7)) : 0, scroll: t * 150,
      rock: bump > 0 && bump < 1.2 ? 0.07 * Math.sin(bump * 18) * Math.exp(-bump * 5) : 0 },
    fox: { x: fx.x - 50 * sc, y: SLOT.fox[1] + fx.y + H.y, s: SLOT.fox[2], flip: -1, v: fx.v + H.v, wave: bell(t, 6.9, 7.2, 7.8, 8.1), ang: 0.42 * Math.sin((t - 6.9) * 15) },
    deer: { x: de.x - 70 * sc, y: SLOT.deer[1] + de.y + H.y, s: SLOT.deer[2], flip: -1, v: de.v + H.v, tilt: 0.36 * bell(t, 5.6, 6, 6.6, 7) + 0.03 * Math.sin(t * 9) * bell(t, 5.8, 6, 6.6, 6.8) },
    hog: { x: hg.x - 70 * nud + 40 * sc, y: SLOT.hog[1] + hg.y + hn.y * (t < 5 ? 1 : 0) + H.y, s: SLOT.hog[2], flip: -1,
      v: hg.v + H.v + (t < 5.3 ? hn.v * (t < 4.95 ? 1 : 0) : 0) + (bump > 0 && bump < 0.4 ? -0.18 * Math.exp(-bump * 10) * Math.cos(bump * 40) : 0) },
  };
  const breathe = (Math.sin((t * TAU) / 2.4)) * (1 - prog(t, 12.8, 13.6));
  for (const k of Object.keys(R)) R[k].breathe = breathe * (k === "hog" ? -1 : 1);
  // the basket rides with the fox, then drops onto the rug
  const drop = prog(t, 1.7, 2.2);
  R.basket = { x: lerp(fx.x - 190, BASKET[0], easeIo(drop)), y: lerp(SLOT.fox[1] + 60 + fx.y, BASKET[1], easeIo(drop)) - 90 * Math.sin(Math.PI * drop) };
  return R;
}

// The carrot's path: in the basket, then fox, deer, hedgehog and back to the rabbit, one hand-off on each hop.
function carrotPos(t, W_) {
  const hold = n => [W_[n].x + W_[n].flip * 70 * W_[n].s, W_[n].y - 120 * W_[n].s - 20];
  const stops = [[9.15, [W_.basket.x, W_.basket.y - 150]], [9.6, hold("deer")], [9.95, hold("deer")], [10.4, hold("fox")], [10.75, hold("fox")], [11.2, hold("hog")], [11.55, hold("hog")], [12, hold("rabbit")]];
  if (t <= stops[0][0]) return { x: stops[0][1][0], y: stops[0][1][1], rot: 0.3 };
  for (let i = 1; i < stops.length; i++) {
    const [t1, p1] = stops[i], [t0, p0] = stops[i - 1];
    if (t < t1) { const u = prog(t, t0, t1), m = easeIo(u); return { x: lerp(p0[0], p1[0], m), y: lerp(p0[1], p1[1], m) - 90 * Math.sin(Math.PI * u) * (p0 === p1 ? 0 : 1), rot: 0.3 - 0.9 * Math.sin(Math.PI * u) + 0.15 * u }; }
  }
  const p = stops.at(-1)[1];
  return { x: W_.rabbit.x + 70 * W_.rabbit.s, y: W_.rabbit.y - 120 * W_.rabbit.s - 20, rot: 0.45, p };
}

// --- one frame ------------------------------------------------------------------------------------------------------------

function sky(ctx, t) {
  const g = easeIo(prog(t, 12, 14));  // golden hour, 12 s to 14 s
  ctx.fillStyle = mix(C.sky, C.gold, g); ctx.fillRect(0, 0, 1080, 1920);
  const sx = lerp(880, 800, g), sy = lerp(700, 960, g), sr = lerp(80, 150, g);
  flat(ctx, ell(sx, sy, sr, sr), C.sun, C.sunShade, 10);
  for (const [cx, cy, w, sp] of [[210, 560, 260, 9], [720, 470, 200, -7], [480, 780, 170, 6]]) {  // clouds drift
    const x = cx + sp * t;
    flat(ctx, pill(x - w / 2, cy, w, 64), C.cream, C.creamShade, 7);
    flat(ctx, pill(x - w / 4, cy - 34, w / 2, 64), C.cream, C.creamShade, 7);
  }
  const ridge = mix(C.ridge, C.goldRidge, g), ridgeShade = mix(C.ridgeShade, C.goldRidgeShade, g);
  flat(ctx, ell(220, 1090, 520, 260), ridge, ridgeShade, 22);  // far ridge
  flat(ctx, ell(860, 1070, 560, 240), ridge, ridgeShade, 22);
  flat(ctx, ell(540, 1740, 1300, 660), C.sage, C.sageShade, 34);  // the meadow
  tree(ctx, 110, 1290, 1.9, C.sageLight, C.sageLightShade);
  tree(ctx, 340, 1210, 1.1, C.sageLight, C.sageLightShade);
  tree(ctx, 970, 1270, 1.7, C.sageLight, C.sageLightShade);
  tree(ctx, 700, 1190, 1.0, C.sun, C.sunShade);
  for (const [fx, fy, r, col] of [[60, 1380, 15, C.cream], [210, 1420, 12, C.ear], [450, 1330, 11, C.cream], [640, 1400, 12, C.ear], [900, 1360, 14, C.ear], [1030, 1430, 13, C.cream], [40, 1880, 16, C.ear]]) flower(ctx, fx, fy, r, col);
}

export function draw(ctx, t, W, H, st) {
  const k = W / 1080;
  ctx.save();
  ctx.scale(k, k);
  sky(ctx, t);
  rug(ctx, ...RUG);

  const w = world(t), b = st.blinks;
  const lands = prog(t, 8.6, 9);
  // ground shadows, then the cast and props from back to front
  const shadow = (x, y, rx) => { ctx.fillStyle = C.rugShade; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.13, 0, 0, TAU); ctx.fill(); };
  const items = [
    { y: SLOT.rabbit[1], fn: () => { shadow(w.rabbit.x, SLOT.rabbit[1], 185 * w.rabbit.s); rabbit(ctx, { ...w.rabbit, blink: blink(t, b.rabbit) }); } },
    { y: SLOT.hog[1], fn: () => { shadow(w.hog.x, SLOT.hog[1], 175 * w.hog.s); hedgehog(ctx, { ...w.hog, blink: blink(t, b.hog) }); } },
    { y: SLOT.fox[1], fn: () => { shadow(w.fox.x, SLOT.fox[1], 185 * w.fox.s); fox(ctx, { ...w.fox, blink: blink(t, b.fox) }); } },
    { y: SLOT.deer[1], fn: () => { shadow(w.deer.x, SLOT.deer[1], 190 * w.deer.s); deer(ctx, { ...w.deer, blink: blink(t, b.deer) }); } },
    { y: STUMP[1], fn: () => { shadow(STUMP[0], STUMP[1] + 26, 140); stump(ctx, STUMP[0], STUMP[1], STUMP[2]); } },
    { y: w.basket.y, fn: () => { basket(ctx, w.basket.x, w.basket.y, 1.3); } },
  ].sort((a, c) => a.y - c.y);
  for (const it of items) it.fn();

  // a dust puff as it lands
  const pu = prog(t, 9, 9.7);
  if (pu > 0 && pu < 1) {
    ctx.save(); ctx.globalAlpha = 0.9 * (1 - prog(pu, 0.35, 1));
    for (const [dx, dy, r] of [[-84, 6, 22], [-30, -6, 26], [34, -6, 24], [88, 6, 20]]) { const g = easeOut(pu); flat(ctx, ell(PHONE_DOWN[0] + dx * (0.6 + g), PHONE_DOWN[1] + 34 + dy - 16 * g, r * (0.4 + g), r * (0.4 + g)), C.cream, C.creamShade, 5); }
    ctx.restore();
  }
  // the phone: in the rabbit's paws until 8.6, then a card-flip arc onto the stump, where it lies face down
  if (t >= 8.6) {
    const u = lands, m = easeIo(u), x0 = SLOT.rabbit[0] + 215 * SLOT.rabbit[2], y0 = SLOT.rabbit[1] - 132 * SLOT.rabbit[2];
    const sy = u < 0.5 ? 1 : lerp(1, 0.42, prog(u, 0.5, 1));
    phone(ctx, { x: lerp(x0, PHONE_DOWN[0], m), y: lerp(y0, PHONE_DOWN[1], m) - 150 * Math.sin(Math.PI * u), s: lerp(SLOT.rabbit[2] * 0.62, PHONE_DOWN[2], m), rot: lerp(-0.2, -0.9, m), down: u >= 0.5, sx: Math.abs(Math.cos(Math.PI * u)), sy });
  }
  // the carrot goes round
  const cp = carrotPos(t, w);
  carrot(ctx, cp.x, cp.y, cp.rot, t < 9.15 ? 0.9 : 0.8);

  // buzz marks around the phone
  for (const bz of BUZZ) {
    const u = (t - bz) / 0.5;
    if (u > 0 && u < 1) {
      ctx.save(); ctx.globalAlpha = 1 - u; ctx.strokeStyle = C.sage; ctx.lineWidth = 11; ctx.lineCap = "round";
      const px = w.rabbit.x + 215 * w.rabbit.s, py = w.rabbit.y - 132 * w.rabbit.s - 40;
      for (const o of [-1, 1]) for (const r of [112, 142]) { ctx.beginPath(); ctx.arc(px, py, r + 10 * u, o < 0 ? Math.PI * 0.75 : -Math.PI * 0.25, o < 0 ? Math.PI * 1.25 : Math.PI * 0.25); ctx.stroke(); }
      ctx.restore();
    }
  }
  // pops
  pop(ctx, "?", w.deer.x - 20, w.deer.y - 380 * w.deer.s - 30, prog(t, 5.8, 6.9));
  pop(ctx, "ha ha!", w.fox.x, w.fox.y - 460 * w.fox.s, prog(t, 9.7, 10.7));
  pop(ctx, "heart", w.rabbit.x + 20, w.rabbit.y - 640 * w.rabbit.s, prog(t, 10.5, 11.5));
  pop(ctx, "ha ha!", w.deer.x, w.deer.y - 640 * w.deer.s, prog(t, 11.1, 12.1));
  pop(ctx, "heart", w.hog.x - 40, w.hog.y - 350 * w.hog.s, prog(t, 11.5, 12.5));
  // sparkles around the four, from 12.6
  [[120, 1130, 52, C.sun], [470, 1180, 38, C.cream], [700, 1090, 58, C.sun], [1010, 1170, 42, C.cream], [330, 1000, 36, C.sun]].forEach(([sx, sy, r, col], i) => {
    const u = prog(t, 12.6 + 0.07 * i, 12.95 + 0.07 * i);
    if (u > 0) sparkle(ctx, sx, sy, r * easeBack(u) * (1 + 0.1 * Math.sin(t * 5 + i * 2)), col, 1);
  });

  // golden hour: a warm flat tint over the whole picture
  const g = easeIo(prog(t, 12, 14));
  if (g > 0) { ctx.save(); ctx.globalAlpha = 0.17 * g; ctx.fillStyle = "#ff9d3c"; ctx.fillRect(0, 0, 1080, 1920); ctx.restore(); }

  // captions, in Fredoka: a spring in, a quick fade out
  for (const c of CAPTIONS) {
    if (t < c.from || t >= c.to) continue;
    const a = c.from === 0 ? 1 - prog(t, c.to - 0.1, c.to) : prog(t, c.from, c.from + 0.15) * (1 - prog(t, c.to - 0.2, c.to));
    const sc = c.from === 0 ? 1 : 0.88 + 0.12 * easeBack(prog(t, c.from, c.from + 0.3));
    const y0 = c.lines.length === 1 ? 250 : 190;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(540, y0 + (c.lines.length - 1) * 62); ctx.scale(sc, sc); ctx.translate(-540, -(y0 + (c.lines.length - 1) * 62));
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    c.lines.forEach((ln, i) => {
      ctx.fillStyle = i === 0 ? C.ink : C.sage; ctx.font = "700 112px Fredoka";
      const f = Math.min(1, 940 / ctx.measureText(ln[0]).width);
      ctx.save(); ctx.translate(540, y0 + i * 124); ctx.scale(f, f); ctx.fillText(ln[0], 0, 0); ctx.restore();
    });
    ctx.restore();
  }
  ctx.restore();
  endCard(ctx, t, W, H, { icon: st.icon, from: END.from, tile: st.tile });
}
