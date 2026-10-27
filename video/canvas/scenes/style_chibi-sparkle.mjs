// Style demo for chibi-sparkle (see video/styles/cards/chibi-sparkle.md): a cuter take on kawaii-chibi. The head is two thirds of the
// figure, the eyes are huge and glossy (two highlights), the mouth is a dot-sized "w", cheeks blush, sparkles and hearts drift over a
// gradient-free pastel page with a soft heart pattern. A frame is a pure function of t. Render stills with
// `node scripts/gallery.mjs previews --only chibi-sparkle`.
import { rng, prog, easeOut } from "../ink.mjs";
import { PAL, TAU, sparkle, keyword } from "../kawaii.mjs";
import { hop, squash, easeBack } from "../toon.mjs";
import { mix } from "../cel.mjs";

export const DURATION = 3, COVER = 1.5;
export const SOUND = { beats: [0.5, 1.5, 2.5], rumble: 1.5, easeFrom: 1, drips: 6 };
export const CAPTIONS = [], SCENES = [];

const C = {
  page: "#fde8ef", heart: mix("#fde8ef", "#f7a1b8", 0.35), line: "#8a4a7a", plum: PAL.plum, fur: "#fffafc", ear: "#f7a1b8",
  iris: "#a35c9c", blush: "#f7a1b8", mint: "#cdeede", mintShade: "#b4e0cb", lilac: "#d9cdf0", lilacShade: "#c4b5e6", gold: "#fbd36b",
};

export function setup(doc, W, H) { return {}; }

const ell = (cx, cy, rx, ry, rot = 0) => c => c.ellipse(cx, cy, rx, ry, rot, 0, TAU);

// A heart centred on (x, y), r wide.
function heart(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.7, y - r * 1.1, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 1.1, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}

// The page: pale pink with a staggered grid of hearts drifting slowly down and left, wrapped so it never runs out.
function pattern(ctx, t, W, H) {
  ctx.fillStyle = C.page;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.heart;
  const gap = 150, dx = (t * 14) % gap, dy = (t * 10) % gap;
  for (let row = -1; row * gap < H + gap; row++) {
    for (let col = -1; col * gap < W + gap; col++) {
      heart(ctx, col * gap + (row % 2 ? gap / 2 : 0) - dx, row * gap + dy, 17);
      ctx.fill();
    }
  }
}

// One body part per call, merged into one soft silhouette: every part is stroked in the soft outline colour, then all are filled.
function sil(ctx, shapes) {
  ctx.lineJoin = "round";
  ctx.lineWidth = 16;
  ctx.strokeStyle = ctx.fillStyle = C.line;
  for (const f of shapes) { ctx.beginPath(); f(ctx); ctx.stroke(); ctx.fill(); }
  ctx.fillStyle = C.fur;
  for (const f of shapes) { ctx.beginPath(); f(ctx); ctx.fill(); }
}

// One huge glossy eye: a dark ball, a lighter lower iris, a big highlight up-left and a small one down-right.
function eye(ctx, x, y, blink) {
  ctx.save();
  if (blink > 0.6) {
    ctx.strokeStyle = C.plum; ctx.lineWidth = 9; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - 46, y + 6); ctx.quadraticCurveTo(x, y + 30, x + 46, y + 6); ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.translate(x, y);
  ctx.scale(1, 1 - blink * 0.9);
  ctx.fillStyle = C.plum;
  ctx.beginPath(); ctx.ellipse(0, 0, 62, 78, 0, 0, TAU); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, 0, 62, 78, 0, 0, TAU); ctx.clip();
  ctx.fillStyle = C.iris;
  ctx.beginPath(); ctx.ellipse(0, 36, 56, 42, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-18, -28, 24, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(22, 34, 11, 0, TAU); ctx.fill();
  ctx.restore();
}

// The rabbit sitting on (x, y): v squash, ear flick (rad), blink 0..1, breathe -1..1.
function chibi(ctx, { x, y, s, v = 0, ear = 0, blink = 0, breathe = 0, lift = 0 }) {
  const { sx, sy } = squash(v);
  ctx.fillStyle = "rgba(122,63,110,0.16)";
  ctx.beginPath(); ctx.ellipse(x, y + 6, 190 * s * (1 - lift / 600), 24 * s, 0, 0, TAU); ctx.fill();
  ctx.save();
  ctx.translate(x, y - lift);
  ctx.scale(s * sx, s * sy * (1 + 0.016 * breathe));
  sil(ctx, [
    ell(-72, -22, 54, 30), ell(72, -22, 54, 30),
    ell(0, -92, 122, 92),
    ell(-84, -590, 44, 116, -0.18), ell(84, -590, 44, 116, 0.18 + ear),
    ell(0, -330, 200, 168),
  ]);
  ctx.fillStyle = C.ear;
  for (const [cx, rot] of [[-84, -0.18], [84, 0.18 + ear]]) {
    ctx.save(); ctx.translate(cx, -590); ctx.rotate(rot);
    ctx.beginPath(); ctx.ellipse(0, 8, 20, 78, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  for (const d of [-1, 1]) {  // little paws on the belly
    ctx.beginPath(); ctx.ellipse(d * 40, -116, 24, 20, 0, 0, TAU);
    ctx.fillStyle = C.fur; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = C.line; ctx.stroke();
  }
  ctx.fillStyle = C.blush; ctx.globalAlpha = 0.9;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 160, -250, 34, 20, 0, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  eye(ctx, -96, -326, blink);
  eye(ctx, 96, -326, blink);
  ctx.strokeStyle = C.plum; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(-8, -258, 8, 0.1, Math.PI - 0.1); ctx.arc(8, -258, 8, 0.1, Math.PI - 0.1); ctx.stroke();
  ctx.restore();
}

// "mm:ss" left on a 25 minute timer that has run `secs` seconds.
const clock = secs => { const n = 1500 - Math.floor(secs); return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`; };

// A round alarm clock with two bells, a glossy rim and a pink ring that fills with the session.
function timer(ctx, { x, y, s, t }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const shake = 0.05 * Math.sin(t * 9) * (t % 1 < 0.35 ? 1 : 0);
  ctx.fillStyle = "rgba(122,63,110,0.16)";
  ctx.beginPath(); ctx.ellipse(0, 232, 190, 22, 0, 0, TAU); ctx.fill();
  ctx.lineJoin = "round"; ctx.lineWidth = 14; ctx.strokeStyle = C.line;
  for (const d of [-1, 1]) {  // bells and feet
    ctx.save(); ctx.translate(d * 150, -170); ctx.rotate(d * (0.5 + shake));
    ctx.fillStyle = C.ear; ctx.beginPath(); ctx.ellipse(0, -30, 70, 52, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = C.ear; ctx.beginPath(); ctx.ellipse(d * 120, 218, 34, 26, 0, 0, TAU); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = C.lilac; ctx.beginPath(); ctx.arc(0, 0, 225, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, 178, 0, TAU); ctx.fill();
  ctx.lineWidth = 16; ctx.lineCap = "round"; ctx.strokeStyle = C.mint;
  ctx.beginPath(); ctx.arc(0, 0, 202, 0, TAU); ctx.stroke();
  const u = 0.03 + 0.09 * t;
  ctx.strokeStyle = C.ear; ctx.beginPath(); ctx.arc(0, 0, 202, -Math.PI / 2, -Math.PI / 2 + TAU * u); ctx.stroke();
  ctx.fillStyle = C.plum; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "900 124px Nunito";
  ctx.fillText(clock(t), 0, -4);
  ctx.font = "800 38px Nunito"; ctx.fillStyle = C.iris;
  ctx.fillText("minutes left", 0, 82);
  ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 16;  // glossy streak on the rim
  ctx.beginPath(); ctx.arc(0, 0, 208, Math.PI * 1.1, Math.PI * 1.35); ctx.stroke();
  heart(ctx, 0, 138, 15); ctx.fillStyle = C.blush; ctx.fill();
  ctx.restore();
}

// Sparkles and hearts floating up around the pair: seeded positions, each twinkling in its own phase.
function twinkles(ctx, t, W, H) {
  const r = rng(11), cols = ["#ffffff", C.gold, C.lilacShade, C.blush];
  for (let i = 0; i < 22; i++) {
    const x = 70 + r() * (W - 140), y = 520 + r() * 900, ph = r() * TAU, size = 22 + r() * 26, kind = i % 4;
    const a = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(t * 3.2 + ph)), yy = y - 14 * Math.sin(t * 1.6 + ph);
    if (kind === 3) { ctx.fillStyle = C.blush; ctx.globalAlpha = a; heart(ctx, x, yy, size * 0.6); ctx.fill(); ctx.globalAlpha = 1; }
    else sparkle(ctx, x, yy, size * (0.7 + 0.3 * Math.sin(t * 3.2 + ph)), cols[kind], a);
  }
}

export function draw(ctx, t, W, H, st) {
  const k = W / 1080;
  ctx.save();
  ctx.scale(k, k);
  const w = 1080, h = H / k;
  pattern(ctx, t, w, h);

  keyword(ctx, w, 330, "Focus", { size: 200, t: 1 });
  ctx.fillStyle = C.line; ctx.font = "800 56px Nunito"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("25 minutes of cozy calm", 540, 478);

  // the ground: a soft mint hill with a lighter bank in front
  ctx.fillStyle = C.mint;
  ctx.beginPath(); ctx.ellipse(540, 1760, 980, 420, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = C.mintShade;
  ctx.beginPath(); ctx.ellipse(540, 1980, 1000, 360, 0, 0, TAU); ctx.fill();

  const h1 = hop(t, 2.1, 0.7, 70);
  const blink = (() => { const u = (t - 1.0) / 0.2; return u >= 0 && u <= 1 ? 1 - Math.abs(2 * u - 1) : 0; })();
  const ear = (() => { const u = (t - 0.35) / 0.5; return u >= 0 && u <= 1 ? 0.35 * Math.sin(u * Math.PI * 3) * (1 - u) : 0; })();
  twinkles(ctx, t, w, h);
  chibi(ctx, { x: 305, y: 1400, s: 0.98, v: h1.v, lift: -h1.y, ear, blink, breathe: Math.sin((t * TAU) / 2.4) });
  timer(ctx, { x: 800, y: 1170, s: 0.9, t });

  // a pill below
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(290, 1640, 500, 120, 60); ctx.fill();
  ctx.fillStyle = C.plum; ctx.font = "900 54px Nunito";
  ctx.fillText("Phone down", 540, 1702);
  sparkle(ctx, 330, 1700, 14, C.gold); sparkle(ctx, 750, 1700, 14, C.gold);
  ctx.restore();
}
