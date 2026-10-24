// One animal's 25-minute focus session in 30 s, in the toon kit: a rabbit, a phone
// that buzzes and goes face down, a lesson-style progress bar filling over the time-lapse, a happy hop and a new
// neighbour, all as flat stickers on white paper. Every frame is a pure function of t; see focus_rabbit.md for the prompt.
import { rng, prog, easeOut, easeIo, lerp } from "../ink.mjs";
import { COLOR, ow, hop, blink, blinkTimes, blob, ell, pill, lip, button, progressBar, heading, critter, butterfly,
  confetti, easeBack } from "../toon.mjs";

export const DURATION = 30, COVER = 2.4;
export const SESSION = { from: 6, to: 21 };  // the 25 minutes, sped up
export const BUZZ = [3.2, 3.85], FLIP = { from: 5.1, to: 5.35 }, THUNK = 5.35, DONE = SESSION.to;
export const HOPS = [{ at: 4.8, dur: 0.7, h: 150 }, { at: 21.2, dur: 0.85, h: 210 }, { at: 22.25, dur: 0.85, h: 210 }];
export const HOG = { at: 22.5, dur: 0.75 };
export const SOUND = { kind: "toon", buzz: BUZZ, hops: HOPS.map(h => h.at), thunk: THUNK, start: SESSION.from, done: DONE,
  hog: HOG.at + HOG.dur * 0.8, sparkle: 21.7, tickFrom: SESSION.from, tickTo: SESSION.to };
export const SCENES = [{ name: "desk", from: 0, to: DURATION }];
const G = t => ({ t, c: COLOR.green }), B = t => ({ t, c: COLOR.blue });
export const CAPTIONS = [
  { from: 0, to: 3.1, lines: [["This rabbit has"], [G("25 minutes"), " to focus."]] },
  { from: 3.5, to: 5.0, lines: [["A new ", B("message.")]] },
  { from: 5.5, to: 8.9, lines: [[G("Phone down.")], ["Timer on."]] },
  { from: 12.1, to: 15.9, lines: [[G("Not now,"), " butterfly."]] },
  { from: 22.1, to: 25.6, lines: [[G("25 minutes done.")], ["Someone new moved in."]] },
];
export const END = { from: 26.2, title: "WildFocus", line: "25 minutes. Phone down." };

const SECS = 25 * 60;
export const timeLeft = t => Math.ceil(SECS * (1 - prog(t, SESSION.from, SESSION.to)) - 1e-9);
export const clockText = t => { const s = timeLeft(t); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };

export function setup(doc, W, H, { icon }) {
  return { icon, blinkRabbit: blinkTimes(3), blinkHog: blinkTimes(9) };
}

export function draw(ctx, t, W, H, st) {
  const k = W / 1080, u = prog(t, SESSION.from, SESSION.to);
  ctx.save();
  scenery(ctx, t, W, H);
  const rx = W * 0.44, deskY = H * 0.775, rs = 1.3 * k;
  const pose = rabbitPose(t, st);
  critter(ctx, { species: "rabbit", x: rx, y: deskY + 26 * k + pose.y * k, s: rs, ...pose.rabbit });
  desk(ctx, t, W, H);
  critter(ctx, { species: "rabbit", x: rx, y: deskY + 26 * k + pose.y * k, s: rs, ...pose.rabbit, onlyPaws: true });
  if (t >= BUZZ[0] && t < 4.4) bang(ctx, t, rx + 150 * k, deskY - 560 * k, k);
  if (t > HOG.at) hog(ctx, t, W, H, st);
  confetti(ctx, t, 21.55, rx, deskY - 440 * k, 54);
  if (t > 12 && t < 16.4) bug(ctx, t, W, H);
  progress(ctx, t, W, H, u);
  for (const c of CAPTIONS) {
    if (t < c.from || t >= c.to) continue;
    const a = 1 - prog(t, c.to - 0.25, c.to);
    heading(ctx, W, H * 0.125, c.lines, { size: 84 * k, alpha: a, pop: c.from === 0 ? 1 : prog(t, c.from, c.from + 0.4) });
  }
  if (t >= END.from) endCard(ctx, t, W, H, st);
  ctx.restore();
}

// What the rabbit is doing at t: lift y, and the pose handed to critter().
function rabbitPose(t, st) {
  let y = 0, v = 0.012 * Math.sin((t * Math.PI * 2) / 2.4);
  for (const h of HOPS) { const o = hop(t, h.at, h.dur, h.h); y += o.y; v += o.v; }
  const done = t >= DONE;
  let mood = "idle", look = [0.25, 0.15], ears = 0.15, tilt = 0, handL, handR;
  if (t >= 2.4 && t < 3.2) look = [0, 0];
  if (t >= BUZZ[0] && t < 4.75) {
    mood = "startled"; look = [-0.9, 0.8]; ears = -0.95; tilt = -0.05;
  } else if (t >= 4.75 && t < 5.6) {
    look = [-0.8, 0.7]; ears = -0.2;
    const sw = easeIo(prog(t, 5.0, 5.2)) * (1 - easeIo(prog(t, 5.3, 5.5)));
    handL = [lerp(-34, -126, sw), lerp(-98, -40, sw)];
    tilt = -0.2 * sw;
  } else if (t >= 5.6 && !done) {
    mood = "focus"; look = [0, 0.75]; tilt = 0.04;
    ears = 0.25 + 0.2 * Math.max(0, Math.sin(t * 1.3));
    if (t > 12.7 && t < 15.1) { look = t > 14.6 ? [0.3, 0.2] : [0.85, -0.5]; ears = -0.7; tilt = 0.08; }
  } else if (done) {
    mood = "happy"; ears = 0.1;
    if (t < 23.6) { handL = [-112, -236]; handR = [112, -236]; }
  }
  ears += 1.1 * v;
  const lid = mood === "happy" ? 0 : blink(t, st.blinkRabbit);
  return { y, rabbit: { v, look, lid, ears, mood, tilt, handL, handR } };
}

// A red "!" that pops up over the head for the buzz.
function bang(ctx, t, x, y, k) {
  const u = prog(t, BUZZ[0], BUZZ[0] + 0.25), s = easeBack(u) * k;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(0.15);
  blob(ctx, COLOR.red, pill(-34, -70, 68, 140, 34), 0);
  ctx.fillStyle = COLOR.white;
  ctx.font = "900 110px Nunito";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", 0, 4);
  ctx.restore();
}

function hog(ctx, t, W, H, st) {
  const o = hop(t, HOG.at, HOG.dur, 260), k = W / 1080, fromX = W + 260 * k, toX = W * 0.86;
  const x = lerp(fromX, toX, easeOut(prog(t, HOG.at, HOG.at + HOG.dur * 0.8)));
  const landed = t > HOG.at + HOG.dur * 0.8;
  critter(ctx, { species: "fox", x, y: H * 0.832 + o.y * k, s: 0.62 * k, v: o.v, mood: landed ? "happy" : "startled", look: [-0.6, 0.2], lid: blink(t, st.blinkHog) });
}

// The lesson bar and the timer, under the hook text. The bar fills with the session; the timer presses like a button.
function progress(ctx, t, W, H, u) {
  const k = W / 1080, cy = H * 0.238, w = 780 * k, h = 40 * k, done = t >= DONE;
  progressBar(ctx, W / 2, cy, w, h, u, { glow: done && Math.floor((t - DONE) * 4) % 2 === 0 });
  const tap = Math.max(0, 1 - Math.abs(t - (SESSION.from + 0.06)) / 0.1);
  const pw = 400 * k, ph = 132 * k, py = H * 0.305 - ph / 2;
  const pop = done ? 1 + 0.07 * Math.exp(-(t - DONE) * 3) * Math.cos((t - DONE) * 16) : 1;
  ctx.save();
  ctx.translate(W / 2, py + ph / 2);
  ctx.scale(pop, pop);
  ctx.translate(-W / 2, -(py + ph / 2));
  lip(ctx, W / 2 - pw / 2, py, pw, ph, 38 * k, done ? { fill: COLOR.green, edge: COLOR.greenLip, lipH: 12 * k, press: tap } : { fill: COLOR.white, edge: COLOR.track, border: 6 * k, lipH: 12 * k, press: tap });
  ctx.font = `900 ${100 * k}px Nunito`;
  ctx.letterSpacing = `${-2 * k}px`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = done ? COLOR.white : COLOR.charcoal;
  ctx.fillText(clockText(t), W / 2, py + ph / 2 + 5 * k + 12 * k * tap * 0.5);
  ctx.restore();
}

function bug(ctx, t, W, H) {
  const u = prog(t, 12, 16.4), k = W / 1080;
  const x = lerp(-120 * k, W + 120 * k, u) + 40 * k * Math.sin(t * 3), y = H * (0.5 - 0.1 * Math.sin(u * Math.PI)) + 60 * k * Math.sin(t * 5.3);
  butterfly(ctx, x, y, t, 1.5 * k);
}

// White paper: a drifting sun and a cloud as flat stickers, and a pale-green floor patch for everyone to sit on.
function scenery(ctx, t, W, H) {
  const k = W / 1080;
  ctx.fillStyle = COLOR.white;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W * lerp(0.1, 0.9, prog(t, 0, DURATION)), H * 0.05);
  ctx.rotate(t * 0.25);
  ctx.fillStyle = COLOR.yellow;
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 4);
    ctx.beginPath();
    ctx.roundRect(-9 * k, -66 * k, 18 * k, 28 * k, 9 * k);
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 40 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  for (const [x0, y0, s0, sp] of [[0.78, 0.075, 0.8, 16], [0.42, 0.09, 0.6, 24]]) {
    cloud(ctx, ((x0 * W - t * sp * k + 400 * k) % (W + 800 * k)) - 400 * k + W * 0, H * y0, s0 * k);
  }
  ctx.fillStyle = COLOR.mint;
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.835, W * 0.56, H * 0.085, 0, 0, Math.PI * 2);
  ctx.fill();
  const r = rng(21);
  ctx.fillStyle = COLOR.greenHi;
  for (let i = 0; i < 7; i++) {
    const gx = W * (0.08 + r() * 0.84), gy = H * (0.86 + r() * 0.04), sway = Math.sin(t * 2 + i) * 3 * k;
    for (const d of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.roundRect(gx + d * 12 * k + sway * Math.abs(d), gy - (d ? 30 : 42) * k, 9 * k, (d ? 30 : 42) * k, 4 * k);
      ctx.fill();
    }
  }
}

// A flat cloud with a pale-gray border: the border pass is drawn first for every lobe so no seams show inside.
function cloud(ctx, x, y, s) {
  const lobes = [[0, 8, 70, 38], [-44, -4, 42, 36], [24, -22, 52, 48]];
  for (const pass of [0, 1]) {
    ctx.fillStyle = pass ? COLOR.white : COLOR.track;
    for (const [dx, dy, rx, ry] of lobes) {
      const g = pass ? 0 : 6 * s;
      ctx.beginPath();
      ctx.ellipse(x + dx * s, y + dy * s, rx * s + g, ry * s + g, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// The little desk, seen from above at the front: top, front lip, then the book, mug and phone on it.
function desk(ctx, t, W, H) {
  const k = W / 1080, y0 = H * 0.775, top = 112 * k, x0 = 110 * k, x1 = W * 0.78, o = ow() * k;
  ctx.save();
  blob(ctx, COLOR.orangeLip, pill(x0 + 30 * k, y0 + top - 6 * k, 40 * k, 130 * k, 10 * k), o);
  blob(ctx, COLOR.orangeLip, pill(x1 - 70 * k, y0 + top - 6 * k, 40 * k, 130 * k, 10 * k), o);
  blob(ctx, COLOR.orangeLip, c => c.roundRect(x0, y0 + 10 * k, x1 - x0, top, 26 * k), o);
  blob(ctx, COLOR.orange, c => c.roundRect(x0, y0, x1 - x0, top - 10 * k, 26 * k), o);
  const cx = (x0 + x1) / 2;
  book(ctx, t, cx, y0 + top * 0.45, k);
  mug(ctx, t, x1 - 140 * k, y0 + top * 0.45, k);
  phone(ctx, t, x0 + 130 * k, y0 + top * 0.45, k);
  ctx.restore();
}

function book(ctx, t, x, y, k) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  const pw = 150, ph = 84;
  blob(ctx, COLOR.blue, pill(-pw - 12, -ph / 2 - 10, pw * 2 + 24, ph + 20, 12), ow(0.8));
  blob(ctx, COLOR.white, pill(-pw, -ph / 2, pw - 3, ph, 8), ow(0.6));
  blob(ctx, COLOR.white, pill(3, -ph / 2, pw - 3, ph, 8), ow(0.6));
  ctx.strokeStyle = COLOR.faded;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? -pw + 22 : 25, x1 = sd < 0 ? -26 : pw - 22;
    ctx.beginPath();
    ctx.moveTo(x0, -ph / 2 + 20 + i * 15);
    ctx.lineTo(x1, -ph / 2 + 20 + i * 15);
    ctx.stroke();
  }
  if (t > SESSION.from && t < SESSION.to + 0.5) {
    const cyc = ((t - SESSION.from) % 2) / 0.5;
    if (cyc < 1) {
      const wdt = pw * Math.cos(Math.PI * cyc);
      blob(ctx, COLOR.white, c => c.roundRect(Math.min(0, wdt), -ph / 2 - 3, Math.abs(wdt), ph + 6, 8), ow(0.6));
    }
  }
  ctx.restore();
}

function mug(ctx, t, x, y, k) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  blob(ctx, COLOR.purple, ell(38, 0, 18, 24), ow(0.7));
  blob(ctx, COLOR.purple, ell(0, 0, 44, 40));
  blob(ctx, "#8b4d2c", ell(0, -2, 31, 27), ow(0.5));
  ctx.strokeStyle = COLOR.track;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const ph = t * 2.4 + i * 2;
    ctx.globalAlpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(ph));
    ctx.beginPath();
    for (let j = 0; j <= 8; j++) {
      const yy = -44 - j * 11 - 6 * Math.sin(ph), xx = (i - 1) * 20 + 7 * Math.sin(j * 0.9 + ph);
      j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// The phone: lit and buzzing with a notification until 5.1 s, then it flips onto its face.
function phone(ctx, t, x, y, k) {
  const flip = easeIo(prog(t, FLIP.from, FLIP.to)), buzzing = BUZZ.some(b => t >= b && t < b + 0.55) || (t > BUZZ[1] + 0.55 && t < FLIP.from);
  const shake = buzzing ? Math.sin(t * 90) * 6 : 0;
  ctx.save();
  ctx.translate(x + shake * k, y);
  ctx.rotate(-0.18 + (buzzing ? Math.sin(t * 70) * 0.05 : 0));
  ctx.scale(k * Math.abs(Math.cos(Math.PI * flip)) + 0.0001, k);
  const front = flip < 0.5;
  blob(ctx, front ? COLOR.charcoal : COLOR.red, pill(-40, -68, 80, 136, 16), ow(0.8));
  if (front) {
    blob(ctx, t >= BUZZ[0] ? COLOR.blue : "#2c3a4b", pill(-31, -58, 62, 116, 9), 0);
    if (t >= BUZZ[0]) {
      blob(ctx, COLOR.white, pill(-26, -50, 52, 26, 8), 0);
      blob(ctx, COLOR.red, pill(-26, -18, 52, 26, 8), 0);
    }
  } else {
    blob(ctx, COLOR.white, ell(0, -28, 12, 12), ow(0.5));
  }
  ctx.restore();
  const grow = prog(t, BUZZ[0], BUZZ[0] + 0.4), gone = 1 - prog(t, FLIP.from, FLIP.from + 0.2);
  if (grow > 0 && gone > 0) {
    ctx.save();
    ctx.translate(x - 20 * k, y - 120 * k);
    const s = k * easeBack(grow) * gone;
    ctx.scale(s, s);
    lip(ctx, -88, -36, 176, 72, 36, { fill: COLOR.white, edge: COLOR.track, border: 5, lipH: 8 });
    blob(ctx, COLOR.red, ell(-46, 0, 24, 24), 0);
    ctx.fillStyle = COLOR.white;
    ctx.font = "900 34px Nunito";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3", -46, 2);
    blob(ctx, COLOR.track, pill(-10, -14, 74, 12, 6), 0);
    blob(ctx, COLOR.track, pill(-10, 6, 52, 12, 6), 0);
    ctx.restore();
  }
}

// White page: the real app icon as a sticker with a lip, the name in display green, the line on a green button.
function endCard(ctx, t, W, H, st) {
  const k = W / 1080, a = easeOut(prog(t, END.from, END.from + 0.5));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = COLOR.white;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  const bounce = easeBack(prog(t, END.from + 0.1, END.from + 0.8)), cy = H * 0.4, s = 260 * k;
  ctx.save();
  ctx.translate(W / 2, cy);
  ctx.scale(bounce, bounce);
  if (st.icon) {
    ctx.fillStyle = COLOR.track;
    ctx.beginPath();
    ctx.roundRect(-s / 2, -s / 2 + 14 * k, s, s, s * 0.225);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.225);
    ctx.clip();
    ctx.drawImage(st.icon, -s / 2, -s / 2, s, s);
    ctx.restore();
    ctx.lineWidth = 6 * k;
    ctx.strokeStyle = COLOR.track;
    ctx.beginPath();
    ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.225);
    ctx.stroke();
  }
  ctx.restore();
  heading(ctx, W, cy + s * 0.5 + 130 * k, [[{ t: END.title, c: COLOR.green }]], { size: 128 * k, alpha: a, pop: prog(t, END.from + 0.2, END.from + 0.7) });
  button(ctx, W / 2, cy + s * 0.5 + 290 * k, 800 * k, 120 * k, END.line, { size: 44 * k, alpha: prog(t, END.from + 0.5, END.from + 1) });
  ctx.restore();
}
