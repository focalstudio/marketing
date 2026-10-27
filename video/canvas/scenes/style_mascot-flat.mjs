// Style demo for mascot-flat (see video/styles/cards/mascot-flat.md): a round rabbit and a big 25:00 timer as clean flat vector art.
// Every shape is two flat tones (a light face and a shade crescent), no outline, no gradients; type is Fredoka. A frame is a pure
// function of t. Render stills with `node scripts/gallery.mjs previews --only mascot-flat`.
import { prog, easeOut } from "../ink.mjs";
import { sparkle } from "../kawaii.mjs";
import { squash } from "../toon.mjs";

export const DURATION = 3, COVER = 1.5;
export const SOUND = { beats: [0.5, 1.5, 2.5], rumble: 1.5, easeFrom: 1, drips: 6 };
export const CAPTIONS = [], SCENES = [];

const C = {
  cream: "#fff6e2", creamShade: "#eadcc0", sage: "#4a7c59", sageShade: "#3d6a4a", sageLight: "#7fa88a", ink: "#342c26",
  fur: "#fffdf8", furShade: "#e9dcc2", ear: "#f4b9ae", earShade: "#e89c92", blush: "#f4a5a0", nose: "#e27d78", sun: "#eea840", sunShade: "#d98f2c",
};
const TAU = Math.PI * 2;

export function setup(doc, W, H) { return {}; }

// A flat shape in two tones: `build(ctx)` traces it, `shade` fills it, then the light tone is laid over it shifted up and left, so a
// crescent of shade stays on the lower right.
function flat(ctx, build, light, shade, d = 14) {
  ctx.save();
  ctx.beginPath(); build(ctx); ctx.clip();
  ctx.fillStyle = shade; ctx.fillRect(-2000, -2000, 4000, 4000);
  ctx.translate(-d, -d);
  ctx.beginPath(); build(ctx); ctx.fillStyle = light; ctx.fill();
  ctx.restore();
}
const ell = (cx, cy, rx, ry, rot = 0) => c => c.ellipse(cx, cy, rx, ry, rot, 0, TAU);
const pill = (x, y, w, h) => c => c.roundRect(x, y, w, h, h / 2);

// The rabbit sitting on (0, 0) of its own space, facing right: breath, a blink at `blink` (0..1) and a flick of its right ear.
function rabbit(ctx, { x, y, s, breathe, blink, flick, v = 0 }) {
  const { sx, sy } = squash(v);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * sx, s * sy * (1 + 0.016 * breathe));
  ctx.fillStyle = C.sageShade;  // ground shadow
  ctx.beginPath(); ctx.ellipse(0, 0, 185, 24, 0, 0, TAU); ctx.fill();
  flat(ctx, ell(-92, -34, 60, 34), C.fur, C.furShade, 8);  // feet
  flat(ctx, ell(92, -34, 60, 34), C.fur, C.furShade, 8);
  flat(ctx, ell(0, -150, 168, 150), C.fur, C.furShade, 22);  // body
  flat(ctx, ell(-40, -104, 24, 30), C.fur, C.furShade, 5);  // paws
  flat(ctx, ell(40, -104, 24, 30), C.fur, C.furShade, 5);
  flat(ctx, ell(-158, -128, 30, 30), C.fur, C.furShade, 6);  // tail, behind on the left
  for (const [d, rot] of [[-1, -0.16], [1, 0.16 + flick]]) {  // ears
    ctx.save(); ctx.translate(d * 62, -392); ctx.rotate(rot);
    flat(ctx, ell(0, -92, 46, 124), C.fur, C.furShade, 10);
    flat(ctx, ell(0, -86, 22, 90), C.ear, C.earShade, 6);
    ctx.restore();
  }
  flat(ctx, ell(0, -330, 150, 128), C.fur, C.furShade, 18);  // head
  const ex = 70, ey = -326;
  ctx.fillStyle = C.blush;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 96 + 16, ey + 44, 28, 17, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = ctx.strokeStyle = C.ink;
  ctx.lineWidth = 8; ctx.lineCap = "round";
  for (const d of [-1, 1]) {
    const cx = d * 52 + 18;
    if (blink > 0.6) { ctx.beginPath(); ctx.moveTo(cx - 14, ey); ctx.quadraticCurveTo(cx, ey + 8, cx + 14, ey); ctx.stroke(); }
    else {
      ctx.beginPath(); ctx.ellipse(cx, ey, 15, 19 * (1 - blink), 0, 0, TAU); ctx.fill();
      ctx.fillStyle = C.fur; ctx.beginPath(); ctx.arc(cx + 4, ey - 7 * (1 - blink), 5, 0, TAU); ctx.fill(); ctx.fillStyle = C.ink;
    }
  }
  ctx.fillStyle = C.nose;
  ctx.beginPath(); ctx.ellipse(18, ey + 38, 16, 11, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-2, ey + 54); ctx.quadraticCurveTo(10, ey + 70, 18, ey + 54); ctx.quadraticCurveTo(26, ey + 70, 38, ey + 54); ctx.stroke();
  ctx.restore();
}

// "mm:ss" left on a 25 minute timer that has run `secs` seconds.
const clock = secs => { const n = 1500 - Math.floor(secs); return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`; };

function timer(ctx, { x, y, s, t }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  flat(ctx, pill(-60, -250, 120, 70), C.sun, C.sunShade, 8);  // crown button
  flat(ctx, c => c.roundRect(-260, -200, 520, 400, 110), C.cream, C.creamShade, 18);  // case
  ctx.font = "700 190px Fredoka";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const text = clock(t), w = ctx.measureText("25:00").width, k = Math.min(1, 410 / w);
  ctx.save(); ctx.translate(0, -26); ctx.scale(k, k);
  ctx.fillStyle = C.ink; ctx.fillText(text, 0, 0);
  ctx.restore();
  ctx.fillStyle = C.sageLight; ctx.beginPath(); ctx.roundRect(-190, 90, 380, 34, 17); ctx.fill();  // progress track
  ctx.fillStyle = C.sage; ctx.beginPath(); ctx.roundRect(-190, 90, 40 + 340 * easeOut(prog(t, 0, 3)) * 0.5, 34, 17); ctx.fill();
  ctx.restore();
}

export function draw(ctx, t, W, H, st) {
  const k = W / 1080;
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.scale(k, k);

  // a sun and two dots drift across the cream page
  ctx.fillStyle = C.sun;
  ctx.beginPath(); ctx.arc(920 - 18 * t, 190 + 6 * t, 62, 0, TAU); ctx.fill();
  ctx.fillStyle = C.sageLight;
  for (const [dx, dy, r, sp] of [[120, 220, 22, 14], [210, 1620, 16, -10], [930, 1590, 26, 12]]) { ctx.beginPath(); ctx.arc(dx + sp * t, dy, r, 0, TAU); ctx.fill(); }

  // title
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = C.ink; ctx.font = "700 150px Fredoka";
  ctx.fillText("Focus time", 540, 345);
  ctx.fillStyle = C.sage; ctx.font = "500 56px Fredoka";
  ctx.fillText("25 minutes, phone down", 540, 462);

  // the badge: a sage disc, its lower part a darker ground
  ctx.save();
  ctx.beginPath(); ctx.arc(540, 1030, 480, 0, TAU); ctx.clip();
  ctx.fillStyle = C.sage; ctx.fillRect(0, 0, W, 2000);
  ctx.fillStyle = C.sageShade; ctx.beginPath(); ctx.ellipse(540, 1560, 760, 250, 0, 0, TAU); ctx.fill();
  ctx.restore();

  const breathe = Math.sin((t * TAU) / 2.4);
  const blink = (() => { const u = (t - 1.4) / 0.2; return u >= 0 && u <= 1 ? 1 - Math.abs(2 * u - 1) : 0; })();
  const flick = (() => { const u = (t - 2.25) / 0.5; return u >= 0 && u <= 1 ? 0.5 * Math.sin(u * Math.PI * 3) * (1 - u) : 0; })();
  rabbit(ctx, { x: 325, y: 1340, s: 0.95, breathe, blink, flick });
  timer(ctx, { x: 770, y: 1130, s: 0.84, t });

  sparkle(ctx, 560, 700 + 8 * Math.sin(t * 3), 34, C.cream, 0.9);
  sparkle(ctx, 690, 650, 22, C.sun, 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 4)));

  // a start pill
  ctx.fillStyle = C.sageShade; ctx.beginPath(); ctx.roundRect(300, 1668, 480, 130, 65); ctx.fill();
  ctx.fillStyle = C.sage; ctx.beginPath(); ctx.roundRect(300, 1654, 480, 130, 65); ctx.fill();
  ctx.fillStyle = C.cream; ctx.font = "600 66px Fredoka";
  ctx.fillText("Start focus", 540, 1722);
  ctx.restore();
}
