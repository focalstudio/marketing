// Flat kawaii vector kit: white bunnies with one thick plum outline, pink inner ears, blush and dot eyes on pastel pages,
// after the reference bunny sticker. Clean Bézier/ellipse shapes, no boil, no texture: a frame is a pure function of its
// arguments. The outline is one silhouette: every body part is stroked and filled plum, then all parts are filled white on top,
// so overlapping parts merge into one outline.
import { prog, easeOut, lerp } from "./ink.mjs";
import { squash, easeBack } from "./toon.mjs";

export const PAL = {
  plum: "#4b2142", white: "#ffffff", pink: "#f5a3b5", blush: "#f7a1b8",
  bgPink: "#f7c6d0", mint: "#cdeede", peach: "#fbd9c4", sky: "#cfe6f7", butter: "#fbeab0",
};
export const TAU = Math.PI * 2;
const OUT = 10;

function silhouette(ctx, shapes, fill = PAL.white) {
  ctx.lineJoin = "round";
  ctx.lineWidth = OUT * 2;
  ctx.strokeStyle = ctx.fillStyle = PAL.plum;
  for (const f of shapes) { ctx.beginPath(); f(ctx); ctx.stroke(); ctx.fill(); }
  ctx.fillStyle = fill;
  for (const f of shapes) { ctx.beginPath(); f(ctx); ctx.fill(); }
}

const ell = (cx, cy, rx, ry, rot = 0) => c => c.ellipse(cx, cy, rx, ry, rot, 0, TAU);

// A chunky noodle arm with an elbow, like the Powerpuff Girls': the same white as the body inside a plum outline, with a rounded tip
// (no hand drawn on the end). `pts` is [shoulder, elbow, hand]. The shoulder end has no outline: a white disc over it joins the arm
// to the body.
export function arm(ctx, pts, w = 38) {
  ctx.save();
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = PAL.plum; ctx.lineWidth = w + 14; ctx.stroke();
  ctx.strokeStyle = PAL.white; ctx.lineWidth = w; ctx.stroke();
  ctx.fillStyle = PAL.white;
  ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], w / 2 + 8, 0, TAU); ctx.fill();
  ctx.restore();
}

// A bunny standing on (x, y). face: "back" (as in the reference), "over" (head turned to look over its shoulder) or "front".
// ear: flick angle of the right ear (rad); blink 0-1; breathe -1..1; v: squash value from toon.mjs hop(); s: scale.
export function bunny(ctx, { x, y, s = 1, face = "front", ear = 0, blink = 0, breathe = 0, v = 0, flip = 1, arms = null }) {
  const { sx, sy } = squash(v), hx = face === "over" ? 30 : 0, pinkEars = face !== "back";
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * sx * flip, s * sy * (1 + 0.018 * breathe));
  ctx.fillStyle = "rgba(75,33,66,0.13)";
  ctx.beginPath(); ctx.ellipse(0, 2, 175, 22, 0, 0, TAU); ctx.fill();
  silhouette(ctx, [
    ...(face === "front" ? [] : [ell(-80, -16, 54, 28), ell(80, -16, 54, 28)]),
    face === "front" ? ell(0, -118, 130, 116) : ell(0, -122, 144, 126),  // seated: a narrower pear, its base hidden by the feet
    ell(hx - 56, -374, 36, 98, -0.17), ell(hx + 56, -374, 36, 98, 0.17 + ear),
    ell(hx, -262, 102, 92),
  ]);
  if (face !== "front") {  // round tail, outlined on its own
    ctx.beginPath(); ctx.arc(0, -66, 38, 0, TAU);
    ctx.fillStyle = PAL.white; ctx.fill();
    ctx.lineWidth = 9; ctx.strokeStyle = PAL.plum; ctx.stroke();
  }
  if (pinkEars) {
    ctx.fillStyle = PAL.pink;
    // centred on each ear's own axis, and ending above the head; the turned bunny keeps pink only in its left ear
    for (const [cx, rot] of face === "over" ? [[hx - 56, -0.17]] : [[hx - 56, -0.17], [hx + 56, 0.17 + ear]]) {
      ctx.save(); ctx.translate(cx, -374); ctx.rotate(rot);
      ctx.beginPath(); ctx.ellipse(0, -28, 17, 56, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  if (face === "front") {  // two little arms on the chest, and the feet: vertical ovals tucked at the sides, soles towards us
    ctx.strokeStyle = PAL.plum; ctx.lineWidth = 6; ctx.lineCap = "round";
    for (const d of [-1, 1]) {
      const pose = arms && arms[d < 0 ? "l" : "r"];
      if (pose === false) continue;           // drawn by the caller, in front of a prop
      if (pose) { arm(ctx, pose); continue; }  // holding something: a bent arm instead of the resting "U"
      const ax = d * 42; ctx.beginPath(); ctx.moveTo(ax - 15, -160); ctx.lineTo(ax - 15, -124); ctx.arc(ax, -124, 15, Math.PI, 0, true); ctx.lineTo(ax + 15, -160); ctx.stroke();
    }
    for (const d of [-1, 1]) {
      ctx.save(); ctx.translate(d * 94, -50); ctx.rotate(d * 0.2);
      ctx.beginPath(); ctx.ellipse(0, 0, 31, 47, 0, 0, TAU);
      ctx.fillStyle = PAL.white; ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = PAL.plum; ctx.stroke();
      ctx.fillStyle = PAL.pink;
      ctx.beginPath(); ctx.ellipse(0, 12, 15, 20, 0, 0, TAU); ctx.fill();
      for (const [dx, dy] of [[-13, -16], [0, -24], [13, -16]]) { ctx.beginPath(); ctx.ellipse(dx, dy, 5, 6.5, dx * 0.02, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }
  if (face !== "back") {
    const fx = hx + (face === "over" ? 42 : 0), fy = -258, gap = face === "over" ? 30 : 38;
    ctx.fillStyle = PAL.blush;
    ctx.globalAlpha = 0.85;
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(fx + d * (gap + 26), fy + 30, 21, 13, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = ctx.strokeStyle = PAL.plum;
    ctx.lineWidth = 6; ctx.lineCap = "round";
    for (const d of [-1, 1]) {
      const ex = fx + d * gap;
      if (blink > 0.6) { ctx.beginPath(); ctx.moveTo(ex - 9, fy); ctx.lineTo(ex + 9, fy); ctx.stroke(); }
      else { ctx.beginPath(); ctx.ellipse(ex, fy, 9, 11 * (1 - blink), 0, 0, TAU); ctx.fill(); }
    }
    ctx.beginPath(); ctx.arc(fx - 8, fy + 24, 8, 0.1, Math.PI - 0.1); ctx.arc(fx + 8, fy + 24, 8, 0.1, Math.PI - 0.1); ctx.stroke();
  }
  ctx.restore();
}

// A ring that fills as a session runs: u 0..1 of the way round, a plum rim and a sage fill.
export function timerRing(ctx, { x, y, r, u }) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = 30; ctx.strokeStyle = PAL.plum;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.lineWidth = 16; ctx.strokeStyle = "#fff";
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  if (u > 0) { ctx.strokeStyle = "#7fbf8e"; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, u)); ctx.stroke(); }
  ctx.restore();
}

// A to-do card whose three boxes tick at the times in `at` (seconds since the card appeared; t is the same clock).
export function checklist(ctx, { x, y, s = 1, t = 0, at = [0.4, 1, 1.6], colors = ["#f5a3b5", "#7fbf8e", "#f6c453"] }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.shadowColor = "rgba(75,33,66,0.22)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
  ctx.fillStyle = "#fff"; ctx.strokeStyle = PAL.plum; ctx.lineWidth = 12; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.roundRect(-250, -230, 500, 460, 46); ctx.fill(); ctx.stroke();
  ctx.shadowColor = "transparent";
  for (let i = 0; i < 3; i++) {
    const cy = -120 + i * 120, tick = easeBack(prog(t, at[i], at[i] + 0.35));
    ctx.lineWidth = 9; ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.roundRect(-190, cy - 36, 72, 72, 20); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e7dce4";
    ctx.beginPath(); ctx.roundRect(-92, cy - 12, 250 - i * 36, 24, 12); ctx.fill();
    if (tick > 0) {
      ctx.save(); ctx.translate(-154, cy); ctx.scale(tick, tick);
      ctx.fillStyle = colors[i]; ctx.beginPath(); ctx.roundRect(-26, -26, 52, 52, 12); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 10; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-3, 11); ctx.lineTo(16, -11); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

// The phone seen from behind, held up in front of a bunny's face (the bunny's own arms hold it): the screen's glow leaks round the edge.
// The mark on the back is a generic leaf-and-fruit, not a brand logo.
export function phoneBack(ctx, { x, y, s = 1, t = 0, rot = 0 }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  const pulse = 0.85 + 0.15 * Math.sin(t * 5);
  const g = ctx.createRadialGradient(0, 0, 90, 0, 0, 250);
  g.addColorStop(0, `rgba(150,200,255,${0.6 * pulse})`); g.addColorStop(1, "rgba(150,200,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-280, -300, 560, 600);
  ctx.lineJoin = "round"; ctx.lineWidth = 14; ctx.strokeStyle = PAL.plum;
  ctx.fillStyle = "#d9cdf0";
  ctx.beginPath(); ctx.roundRect(-84, -142, 168, 284, 34); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#c4b5e6";  // camera bump with two lenses
  ctx.beginPath(); ctx.roundRect(-66, -124, 76, 76, 20); ctx.fill(); ctx.lineWidth = 9; ctx.stroke();
  ctx.fillStyle = PAL.plum;
  for (const [dx, dy] of [[-42, -100], [-14, -72]]) { ctx.beginPath(); ctx.arc(dx, dy, 11, 0, TAU); ctx.fill(); }
  ctx.fillStyle = "#fff";  // the mark
  ctx.beginPath(); ctx.arc(0, 30, 24, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(10, 2, 14, 7, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
}

// Goal props for the "Your goals" beat, in the same outlined style. Each is drawn in front of a bunny that is using it.

// An easel with a canvas; `paint` is how far along (0..1) the sun, the hill and the flower are painted. y is the ground.
export function easel(ctx, { x, y, s = 1, paint = [0, 0, 0] }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = PAL.plum; ctx.lineWidth = 11; ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const [a, b] of [[-62, -92], [62, 92], [0, 0]]) { ctx.beginPath(); ctx.moveTo(a * 0.7, -70); ctx.lineTo(b, 0); ctx.stroke(); }
  ctx.beginPath(); ctx.roundRect(-95, -300, 190, 230, 12); ctx.fillStyle = "#fff"; ctx.fill();
  ctx.save();
  ctx.clip();
  const sun = easeOut(paint[0]), hill = easeOut(paint[1]), flower = easeOut(paint[2]);
  ctx.fillStyle = "#f6c453"; ctx.beginPath(); ctx.arc(40, -245, 26 * sun, 0, TAU); ctx.fill();
  ctx.fillStyle = "#7fbf8e"; ctx.beginPath(); ctx.ellipse(-10, -62, 120 * hill, 52 * hill, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = PAL.pink; ctx.beginPath(); ctx.arc(-44, -150, 20 * flower, 0, TAU); ctx.fill();
  ctx.fillStyle = "#f6c453"; ctx.beginPath(); ctx.arc(-44, -150, 7 * flower, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.lineWidth = 10; ctx.beginPath(); ctx.roundRect(-95, -300, 190, 230, 12); ctx.stroke();
  ctx.restore();
}

// A brush held in a paw at (x, y), its tip at (tx, ty).
export function brush(ctx, { x, y, tx, ty, color = PAL.pink }) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = PAL.plum; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 16;
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + (tx - x) * 0.08, ty + (ty - y) * 0.08); ctx.stroke();
  ctx.restore();
}

// A classic held up with its pages towards the reader and its cover towards us: Alice's Adventures in Wonderland (public domain), in
// teal and gold, with a white rabbit and its pocket watch. Pages show at the top and right, with a bookmark; every 2.4 s the page edge
// flutters. (x, y) is the middle of the cover, 150 x 205 units at s = 1.
export function bookCover(ctx, { x, y, s = 1, t = 0 }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  const u = (t % 2.4) / 0.5, fl = u < 1 ? Math.sin(Math.PI * u) : 0, gold = "#e9c46a", W = 150, H = 205, x0 = -W / 2, y0 = -H / 2;
  ctx.fillStyle = "#d64550"; ctx.strokeStyle = PAL.plum; ctx.lineWidth = 8;  // the bookmark, hanging below
  ctx.beginPath(); ctx.moveTo(26, y0 + H - 4); ctx.lineTo(26, y0 + H + 36); ctx.lineTo(37, y0 + H + 26); ctx.lineTo(48, y0 + H + 36); ctx.lineTo(48, y0 + H - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fff6e0"; ctx.lineWidth = 9;  // the pages, a little up and to the right
  ctx.beginPath(); ctx.roundRect(x0 + 10, y0 - 9, W + 6 + 10 * fl, H, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#2f6f7e"; ctx.lineWidth = 10;  // the cover
  ctx.beginPath(); ctx.roundRect(x0, y0, W, H, 12); ctx.fill(); ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x0, y0, W, H, 12); ctx.clip();
  ctx.fillStyle = "#245863"; ctx.fillRect(x0, y0, 26, H);  // the spine
  ctx.fillStyle = gold;
  for (const yy of [-68, -8, 52]) ctx.fillRect(x0, yy, 26, 7);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 4; ctx.strokeRect(x0 + 36, y0 + 12, W - 48, H - 24);
  ctx.lineWidth = 2; ctx.strokeRect(x0 + 43, y0 + 19, W - 62, H - 38);
  ctx.restore();
  const cx = x0 + 36 + (W - 48) / 2;  // the middle of the framed area
  ctx.fillStyle = gold; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const fit = (text, size, yy) => {  // the lettering shrinks until it sits inside the inner gold frame
    ctx.font = `italic 700 ${size}px Georgia, serif`;
    const k = Math.min(1, (W - 62 - 20) / ctx.measureText(text).width);
    ctx.font = `italic 700 ${size * k}px Georgia, serif`;
    ctx.fillText(text, cx, yy);
  };
  fit("Alice", 36, y0 + 50);
  fit("in Wonderland", 15, y0 + 78);
  ctx.lineWidth = 3; ctx.strokeStyle = PAL.plum;  // the white rabbit
  for (const [dx, rot] of [[-9, -0.12], [9, 0.12]]) {
    ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.ellipse(cx + dx, y0 + 100, 6, 17, rot, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.pink; ctx.beginPath(); ctx.ellipse(cx + dx, y0 + 101, 2.6, 11, rot, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = PAL.white; ctx.beginPath(); ctx.ellipse(cx, y0 + 124, 22, 18, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAL.plum;
  for (const dx of [-8, 8]) { ctx.beginPath(); ctx.arc(cx + dx, y0 + 122, 2.6, 0, TAU); ctx.fill(); }
  ctx.fillStyle = PAL.blush;
  for (const dx of [-14, 14]) { ctx.beginPath(); ctx.ellipse(cx + dx, y0 + 130, 5, 3, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(cx, y0 + 160, 14, 0, TAU); ctx.fill(); ctx.stroke();  // the pocket watch
  ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, y0 + 160); ctx.lineTo(cx, y0 + 151); ctx.moveTo(cx, y0 + 160); ctx.lineTo(cx + 7, y0 + 163); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, y0 + 146); ctx.lineTo(cx, y0 + 142); ctx.stroke();
  sparkle(ctx, cx - 40, y0 + 120, 8, gold); sparkle(ctx, cx + 40, y0 + 168, 6, gold);
  ctx.restore();
}

// A dumbbell held in two paws, centred on (x, y).
export function dumbbell(ctx, { x, y, s = 1 }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = PAL.plum; ctx.lineWidth = 16;
  ctx.beginPath(); ctx.moveTo(-100, 0); ctx.lineTo(100, 0); ctx.stroke();
  for (const d of [-1, 1]) {
    ctx.fillStyle = "#f5a3b5"; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.roundRect(d * 100 - 17, -48, 34, 96, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#c4b5e6";
    ctx.beginPath(); ctx.roundRect(d * 100 + d * 20 - 12, -32, 24, 64, 9); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// A phone glowing in the dark: bezel, camera pill, a glossy screen with a social feed (avatar, text lines, picture) that
// scrolls up with `t`, and a red heart notification.
export function phone(ctx, { x, y, s = 1, t = 0 }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const g = ctx.createRadialGradient(0, 0, 60, 0, 0, 230);
  g.addColorStop(0, "rgba(150,200,255,0.55)"); g.addColorStop(1, "rgba(150,200,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-240, -260, 480, 520);
  ctx.lineJoin = "round"; ctx.lineWidth = 14; ctx.strokeStyle = PAL.plum;
  ctx.fillStyle = "#6c4a8a";
  ctx.beginPath(); ctx.roundRect(-84, -142, 168, 284, 34); ctx.fill(); ctx.stroke();
  const sc = ctx.createLinearGradient(0, -128, 0, 128);
  sc.addColorStop(0, "#e9f4ff"); sc.addColorStop(1, "#bcd9ff");
  ctx.fillStyle = sc;
  ctx.beginPath(); ctx.roundRect(-70, -128, 140, 256, 24); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(-70, -128, 140, 256, 24); ctx.clip();
  const item = 128, off = (t * 70) % item;
  for (let i = -1; i < 3; i++) {
    const y0 = -104 + i * item - off;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(-60, y0, 120, 112, 12); ctx.fill();
    ctx.fillStyle = PAL.blush; ctx.beginPath(); ctx.arc(-40, y0 + 18, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = "#cfd8ea";
    ctx.beginPath(); ctx.roundRect(-24, y0 + 10, 62, 6, 3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-24, y0 + 22, 38, 6, 3); ctx.fill();
    ctx.fillStyle = ["#fbd9c4", "#cdeede", "#fbeab0"][((i % 3) + 3) % 3];
    ctx.beginPath(); ctx.roundRect(-52, y0 + 40, 104, 62, 8); ctx.fill();
  }
  const gl = ctx.createLinearGradient(-70, -128, 30, 40);
  gl.addColorStop(0, "rgba(255,255,255,0.5)"); gl.addColorStop(0.5, "rgba(255,255,255,0.12)"); gl.addColorStop(0.51, "rgba(255,255,255,0)");
  ctx.fillStyle = gl; ctx.fillRect(-70, -128, 140, 256);
  ctx.restore();
  ctx.fillStyle = PAL.plum;
  ctx.beginPath(); ctx.roundRect(-22, -132, 44, 11, 5.5); ctx.fill();
  const pulse = 1 + 0.08 * Math.sin(t * 6);  // the notification heart
  ctx.save();
  ctx.translate(76, -128);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = "#ff5d73"; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.moveTo(0, 14); ctx.bezierCurveTo(-26, -4, -12, -22, 0, -8); ctx.bezierCurveTo(12, -22, 26, -4, 0, 14); ctx.fill();
  ctx.restore();
  ctx.restore();
}

export function snail(ctx, { x, y, s = 1, t = 0 }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const bob = Math.sin(t * 4) * 3;
  silhouette(ctx, [c => c.roundRect(-110, -34 + bob, 200, 40, 20), ell(-100, -44 + bob, 22, 22)], "#fde3ea");
  silhouette(ctx, [ell(30, -88 + bob, 62, 62)], PAL.butter);
  ctx.strokeStyle = PAL.plum; ctx.lineWidth = 7; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(30, -88 + bob, 30, 0.5, 4.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-108, -62 + bob); ctx.lineTo(-114, -92 + bob); ctx.moveTo(-94, -62 + bob); ctx.lineTo(-90, -92 + bob); ctx.stroke();
  ctx.fillStyle = PAL.plum;
  for (const ex of [-114, -90]) { ctx.beginPath(); ctx.arc(ex, -96 + bob, 6, 0, TAU); ctx.fill(); }
  ctx.restore();
}

export const sparkle = (ctx, x, y, r, color = "#fff", a = 1) => {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const ang = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 ? r * 0.28 : r; ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr); }
  ctx.closePath(); ctx.fill();
  ctx.restore();
};

// One keyword, plum Nunito 900, popping in with a small overshoot.
export function keyword(ctx, W, y, text, { size = 150, t = 1, color = PAL.plum, alpha = 1 } = {}) {
  const pop = easeBack(prog(t, 0, 0.35));
  ctx.save();
  ctx.globalAlpha = alpha * Math.min(1, t * 8);
  ctx.translate(W / 2, y);
  ctx.scale(pop, pop);
  ctx.font = `900 ${size}px Nunito`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// An app animal on a card framed in its rarity colour, with the rarity pill. `img` is the app's low-poly PNG.
export function rarityCard(ctx, { img, cx, cy, w, h, color, label, glow = false, t = 0, a = 1 }) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(cx, cy);
  if (glow) {
    const g = ctx.createRadialGradient(0, 0, w * 0.2, 0, 0, w * 0.95);
    g.addColorStop(0, color + "aa"); g.addColorStop(1, color + "00");
    ctx.fillStyle = g;
    ctx.fillRect(-w, -h, 2 * w, 2 * h);
  }
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(75,33,66,0.22)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
  ctx.fillStyle = "#fff"; ctx.strokeStyle = PAL.plum; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 44); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.save();
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 44); ctx.clip();
  ctx.fillStyle = color + "33";
  ctx.fillRect(-w / 2, -h / 2, w, h);
  if (img) {
    const box = { w: w * 0.86, h: h * 0.7 }, k = Math.min(box.w / img.naturalWidth, box.h / img.naturalHeight);
    ctx.drawImage(img, -img.naturalWidth * k / 2, -h / 2 + h * 0.06, img.naturalWidth * k, img.naturalHeight * k);
  }
  if (glow) {  // a soft shimmer sweeping across
    const x0 = lerp(-w, w, (t % 2.4) / 2.4), g = ctx.createLinearGradient(x0 - 70, -h / 2, x0 + 70, h / 2);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }
  ctx.restore();
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 44); ctx.stroke();
  ctx.font = `900 ${h * 0.075}px Nunito`;
  const pw = ctx.measureText(label).width + h * 0.1, ph = h * 0.115, py = h / 2 - ph * 0.9;
  ctx.fillStyle = color; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.roundRect(-pw / 2, py - ph / 2, pw, ph, ph / 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(label, 0, py + 2);
  ctx.restore();
  if (glow) for (const [dx, dy, r, ph] of [[-0.52, -0.5, 36, 0], [0.55, -0.32, 28, 1.7], [-0.6, 0.1, 22, 3.1], [0.5, 0.18, 32, 4.4]]) {
    sparkle(ctx, cx + dx * w, cy + dy * h, r * (0.7 + 0.3 * Math.sin(t * 4 + ph)), "#fff7d6", a);
  }
}
