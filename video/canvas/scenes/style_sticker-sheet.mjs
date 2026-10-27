// Style demo for sticker-sheet (see video/styles/cards/sticker-sheet.md): die-cut vinyl stickers peeled onto a dark page. Each piece
// (the rabbit, the timer, the title, a few stars) is drawn once on a scratch canvas, grown into a thick white die-cut border by
// stamping its silhouette around a ring, tinted a little so a bright gloss streak reads on white, and laid down with a soft drop
// shadow and a slight tilt. A frame is a pure function of t. Render stills with `node scripts/gallery.mjs previews --only sticker-sheet`.
import { prog, easeIo } from "../ink.mjs";
import { PAL, TAU, bunny, sparkle } from "../kawaii.mjs";
import { hop } from "../toon.mjs";
import { mix } from "../cel.mjs";

export const DURATION = 3, COVER = 1.5;
export const SOUND = { beats: [0.5, 1.5, 2.5], rumble: 1.5, easeFrom: 1, drips: 6 };
export const CAPTIONS = [], SCENES = [];

const C = {
  page: "#2a2347", dot: "#352d58", ground: "#3a3163", groundEdge: "#463c74", plum: PAL.plum, white: "#ffffff", vinyl: "#8d7bd1",
  sun: "#f6c453", sunShade: "#e2a93b", cream: "#fff6e2", pink: "#ff7aa8", mint: "#7fe0b4",
};
const SIZE = 900, BORDER = 26;

export function setup(doc, W, H) {
  const mk = () => { const c = doc.createElement("canvas"); c.width = c.height = SIZE; return c; };
  const art = mk(), sil = mk(), out = mk();
  art.getContext("2d", { willReadFrequently: true });
  return { art, sil, out };
}

// Lay one sticker on the page. `draw(g)` paints the artwork on the scratch canvas with its anchor at (ax, ay); (x, y) is where that
// anchor lands, rot the tilt, lift how far it floats above the page (the shadow moves away with it), gloss 0..1 where the streak sits.
function sticker(ctx, st, { x, y, rot = 0, s = 1, lift = 0, ax = SIZE / 2, ay = SIZE / 2, gloss = 0.5, draw }) {
  const a = st.art.getContext("2d", { willReadFrequently: true }), g = st.out.getContext("2d"), m = st.sil.getContext("2d");
  a.clearRect(0, 0, SIZE, SIZE);
  draw(a);
  const px = a.getImageData(0, 0, SIZE, SIZE), d = px.data;  // drop faint pixels (a kit's own ground shadow) so they do not grow a border
  for (let i = 3; i < d.length; i += 4) if (d[i] < 60) d[i] = 0;
  a.putImageData(px, 0, 0);
  m.globalCompositeOperation = "source-over";
  m.clearRect(0, 0, SIZE, SIZE);
  m.drawImage(st.art, 0, 0);
  m.globalCompositeOperation = "source-in";
  m.fillStyle = C.white;
  m.fillRect(0, 0, SIZE, SIZE);
  g.clearRect(0, 0, SIZE, SIZE);
  for (const [r, n] of [[BORDER, 48], [BORDER * 0.6, 32], [BORDER * 0.25, 16]]) {  // the die-cut border: the silhouette stamped on rings
    for (let i = 0; i < n; i++) g.drawImage(st.sil, Math.cos((i / n) * TAU) * r, Math.sin((i / n) * TAU) * r);
  }
  g.drawImage(st.art, 0, 0);
  g.save();
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = "rgba(141,123,209,0.13)";  // a cool vinyl tint over the whole sticker, so the gloss shows even on white
  g.fillRect(0, 0, SIZE, SIZE);
  const gx = SIZE * (-0.05 + 0.2 * gloss);
  g.fillStyle = "rgba(255,255,255,0.22)";  // the glossy streak: one wide band and one narrow
  g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx + 90, 0); g.lineTo(gx + 90 + 420, SIZE); g.lineTo(gx + 420, SIZE); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,0.5)";
  g.beginPath(); g.moveTo(gx + 130, 0); g.lineTo(gx + 160, 0); g.lineTo(gx + 160 + 420, SIZE); g.lineTo(gx + 130 + 420, SIZE); g.closePath(); g.fill();
  g.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.shadowColor = "rgba(8,4,24,0.55)"; ctx.shadowBlur = 34 + lift * 0.25; ctx.shadowOffsetY = 16 + lift * 0.6; ctx.shadowOffsetX = 6;
  ctx.drawImage(st.out, -ax, -ay - lift / s);
  ctx.restore();
}

// "mm:ss" left on a 25 minute timer that has run `secs` seconds.
const clock = secs => { const n = 1500 - Math.floor(secs); return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`; };

// The timer artwork: a yellow case with a crown button and a cream screen, in the same plum outline as the bunny.
function timerArt(g, t) {
  g.save();
  g.translate(SIZE / 2, SIZE / 2);
  g.lineJoin = g.lineCap = "round"; g.strokeStyle = C.plum; g.lineWidth = 16;
  g.fillStyle = C.sunShade; g.beginPath(); g.roundRect(-70, -250, 140, 84, 34); g.fill(); g.stroke();
  g.fillStyle = C.sun; g.beginPath(); g.roundRect(-290, -190, 580, 380, 100); g.fill(); g.stroke();
  g.fillStyle = C.cream; g.lineWidth = 12; g.beginPath(); g.roundRect(-240, -140, 480, 280, 64); g.fill(); g.stroke();
  g.fillStyle = C.plum; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "900 168px Nunito";
  g.fillText(clock(t), 0, -14);
  for (let i = 0; i < 5; i++) { g.fillStyle = i < 1 + Math.floor(t * 0.9) ? C.pink : "#e7dce4"; g.beginPath(); g.arc(-80 + i * 40, 98, 11, 0, TAU); g.fill(); }
  g.restore();
}

const textArt = (g, text, size, color) => {
  g.save();
  g.translate(SIZE / 2, SIZE / 2);
  g.font = `900 ${size}px Nunito`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.lineWidth = size * 0.2; g.strokeStyle = C.plum; g.strokeText(text, 0, 0);
  g.fillStyle = color; g.fillText(text, 0, 0);
  g.restore();
};

const starArt = (g, color) => {
  g.save();
  g.translate(SIZE / 2, SIZE / 2);
  g.lineJoin = "round"; g.lineWidth = 22; g.strokeStyle = C.plum; g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2, r = i % 2 ? 62 : 150; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath(); g.stroke(); g.fill();
  g.restore();
};

const heartArt = (g, color) => {
  g.save();
  g.translate(SIZE / 2, SIZE / 2 + 10);
  g.lineJoin = "round"; g.lineWidth = 22; g.strokeStyle = C.plum; g.fillStyle = color;
  g.beginPath(); g.moveTo(0, 120); g.bezierCurveTo(-190, -10, -90, -150, 0, -70); g.bezierCurveTo(90, -150, 190, -10, 0, 120); g.closePath(); g.stroke(); g.fill();
  g.restore();
};

export function draw(ctx, t, W, H, st) {
  const k = W / 1080;
  ctx.save();
  ctx.scale(k, k);
  const h = H / k;
  ctx.fillStyle = C.page; ctx.fillRect(0, 0, 1080, h);
  ctx.fillStyle = C.dot;  // a halftone dot grid on the page
  for (let y = 30; y < h; y += 60) for (let x = (y / 60) % 2 ? 30 : 60; x < 1080; x += 60) { ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); }
  ctx.fillStyle = C.ground; ctx.fillRect(0, 1480, 1080, h - 1480);  // the shelf the stickers stand on
  ctx.fillStyle = C.groundEdge; ctx.fillRect(0, 1480, 1080, 10);

  const wob = (f, ph) => 0.012 * Math.sin(t * f + ph);
  sticker(ctx, st, { x: 540, y: 380, rot: -0.05 + wob(1.6, 0), s: 0.9, gloss: 0.4 + 0.3 * Math.sin(t), draw: g => textArt(g, "Focus time", 170, C.pink) });
  sticker(ctx, st, { x: 140, y: 640, rot: -0.35 + wob(2, 1), s: 0.55, gloss: 0.5, draw: g => heartArt(g, C.pink) });
  sticker(ctx, st, { x: 930, y: 740, rot: 0.3 + wob(2, 2), s: 0.6, gloss: 0.5, draw: g => starArt(g, C.mint) });

  const jump = hop(t, 2.05, 0.7, 60), blinkU = (t - 1.0) / 0.2;
  const blink = blinkU >= 0 && blinkU <= 1 ? 1 - Math.abs(2 * blinkU - 1) : 0;
  const ear = (() => { const u = (t - 0.35) / 0.5; return u >= 0 && u <= 1 ? 0.35 * Math.sin(u * Math.PI * 3) * (1 - u) : 0; })();
  sticker(ctx, st, {
    x: 300, y: 1500, rot: -0.06 + wob(1.4, 3), s: 1.08, ax: SIZE / 2, ay: 840, lift: -jump.y, gloss: 0.5 + 0.35 * Math.sin(t * 1.3),
    draw: g => bunny(g, { x: SIZE / 2, y: 840, s: 1.2, face: "front", v: jump.v * 0.5, ear, blink, breathe: Math.sin((t * TAU) / 2.4) }),
  });
  sticker(ctx, st, { x: 800, y: 1240, rot: 0.07 + wob(1.8, 4), s: 0.82, gloss: 0.45 + 0.3 * Math.sin(t * 1.1 + 1), draw: g => timerArt(g, t) });

  sticker(ctx, st, { x: 540, y: 1720, rot: 0.03 + wob(1.5, 5), s: 0.9, gloss: 0.5, draw: g => textArt(g, "Phone down", 120, C.mint) });
  sparkle(ctx, 760, 900 + 8 * Math.sin(t * 3), 26, "#fff", 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 4)));
  sparkle(ctx, 120, 1180, 20, C.sun, 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 3 + 2)));
  ctx.restore();
}
