// Style demo: toon with cel shading. The sticker look of toon.mjs (thick dark outline, flat fills, big round shapes) plus depth:
// every shape gets ONE hard shadow band on the lower right and ONE small flat highlight on the upper left, because the light
// comes from the upper left everywhere in the frame (the sun sits there). No gradients, no soft shading.
// Every frame is a pure function of t: nothing here is random.
import { mix } from "../cel.mjs";
import { COLOR, blob, ell, pill, dotEye, squash } from "../toon.mjs";
import { pose, clockText, tick, TAU, DURATION as DEMO_DURATION } from "../demo.mjs";

export const DURATION = DEMO_DURATION, COVER = 1.5;
export const SOUND = { kind: "intro", close: 2.5 };
export const CAPTIONS = [], SCENES = [];

export const PAL = {
  outline: "#422c26", cream: "#fff6e2", sky: "#c4e6fa", sun: "#ffd45e", cloud: "#ffffff", hill: "#78b88b", grass: "#8fcb73",
  fur: "#86b4f4", earInner: "#fabac8", coral: "#ee7064", butter: "#ffc94d", shadow: "#2c1f4a",
};
const OUT = 12, FEET = 1400, RABBIT = { x: 300, s: 1.32 }, TIMER = { x: 610, w: 400, h: 540 };

// toon.mjs draws its outlines and eyes with COLOR.ink: this page uses the warm brown of the toon look.
export function setup() { COLOR.ink = PAL.outline; return {}; }

// --- cel helpers ---------------------------------------------------------------------------------------------------------

const shadeOf = fill => mix(fill, PAL.shadow, 0.26);
const hiOf = fill => mix(fill, "#ffffff", 0.6);

// An ellipse with its outline, one hard shadow band (the part of the shape outside an ellipse pushed towards the light) and
// one flat highlight.
function cel(ctx, fill, [cx, cy, rx, ry], { w = OUT, shine = true, band = 0.24 } = {}) {
  blob(ctx, fill, ell(cx, cy, rx, ry), w, [shadeOf(fill), cx - band * rx, cy - band * 1.15 * ry, rx * 1.02, ry * 1.02]);
  if (shine) blob(ctx, hiOf(fill), ell(cx - rx * 0.5, cy - ry * 0.55, rx * 0.2, ry * 0.09, -0.75), 0);
}

// The same for a rounded rectangle.
function celBox(ctx, fill, x, y, w, h, r, { lw = OUT, shine = true, band = 0.1 } = {}) {
  blob(ctx, fill, pill(x, y, w, h, r), lw, [shadeOf(fill), x + w / 2 - band * w, y + h / 2 - band * h, w * 0.56, h * 0.56]);
  if (shine) blob(ctx, hiOf(fill), pill(x + w * 0.1, y + h * 0.1, w * 0.07, h * 0.28, w * 0.035), 0);
}

// --- the world -----------------------------------------------------------------------------------------------------------

function backdrop(ctx, W, H) {
  ctx.fillStyle = PAL.sky;
  ctx.fillRect(0, 0, W, FEET);
  cel(ctx, PAL.sun, [90, 110, 150, 150], { w: OUT, band: 0.18 });  // the light source, up in the left corner
  for (const [x, y, s] of [[760, 640, 1], [260, 560, 0.7]]) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (const [dx, dy, rx, ry] of [[-60, 10, 70, 44], [60, 14, 80, 46], [0, -22, 80, 56]]) blob(ctx, PAL.cloud, ell(dx, dy, rx, ry), OUT * 0.8);
    ctx.restore();
  }
  for (const [x, y, rx, ry] of [[200, FEET - 10, 420, 250], [850, FEET - 10, 460, 190]]) cel(ctx, PAL.hill, [x, y, rx, ry], { shine: false, band: 0.16 });
  blob(ctx, PAL.grass, c => c.rect(-40, FEET, W + 80, H - FEET + 40), OUT, [shadeOf(PAL.grass), W / 2, FEET + 60, W * 0.8, 400]);
  for (const [x, y, c] of [[110, 1560, PAL.coral], [940, 1520, PAL.butter], [520, 1690, PAL.coral], [830, 1740, PAL.cream], [180, 1790, PAL.butter]]) flower(ctx, x, y, c);
}

function flower(ctx, x, y, color) {
  for (let i = 0; i < 5; i++) { const a = (i * TAU) / 5 - 1.2; blob(ctx, color, ell(x + Math.cos(a) * 20, y + Math.sin(a) * 20, 16, 16), OUT * 0.5); }
  blob(ctx, PAL.cream, ell(x, y, 12, 12), OUT * 0.5);
}

function title(ctx, t, W) {
  const lines = [["Time to", PAL.cream], ["focus!", PAL.coral]];
  ctx.save();
  ctx.font = "900 158px Nunito";
  ctx.letterSpacing = "-3px";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  const pop = 1 + 0.04 * Math.sin(t * 5) * tick(t, 2);
  lines.forEach(([s, fill], i) => {
    ctx.save();
    ctx.translate(W / 2, 330 + i * 168); ctx.scale(pop, pop);
    ctx.lineWidth = 34; ctx.strokeStyle = PAL.outline; ctx.strokeText(s, 0, 0);
    ctx.fillStyle = fill; ctx.fillText(s, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

// --- the timer: a coral kitchen timer with a cream display ---------------------------------------------------------------------

function timer(ctx, t) {
  const { x, w, h } = TIMER, y = FEET - 30 - h, cx = x + w / 2, rock = Math.sin(t * 45) * 0.03 * tick(t, 3);
  ctx.save();
  ctx.translate(cx, FEET); ctx.rotate(rock); ctx.translate(-cx, -FEET);
  for (const fx of [x + 90, x + w - 90]) cel(ctx, PAL.cream, [fx, FEET - 16, 54, 26], { shine: false });
  for (const bx of [x + 90, x + w - 90]) cel(ctx, PAL.butter, [bx, y - 4, 62, 50], { band: 0.2 });
  celBox(ctx, PAL.coral, x, y, w, h, 110);
  // the display: cream, with its own hard shadow, and the time in big brown digits
  const dx = x + 38, dy = y + 110, dw = w - 76, dh = 190;
  celBox(ctx, PAL.cream, dx, dy, dw, dh, 44, { lw: OUT * 0.8, shine: false, band: 0.06 });
  ctx.save();
  ctx.font = "900 100px Nunito";
  const label = clockText(t), size = (100 * (dw - 50)) / ctx.measureText(label).width, pop = 1 + 0.06 * tick(t, 5);
  ctx.translate(dx + dw / 2, dy + dh / 2 + 6); ctx.scale(pop, pop);
  ctx.font = `900 ${size}px Nunito`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = PAL.outline;
  ctx.fillText(label, 0, 0);
  ctx.restore();
  // a dial that turns and two buttons
  const kx = cx, ky = y + 400, a = t * 0.8 - 1.4;
  cel(ctx, PAL.cream, [kx, ky, 62, 62], { band: 0.2 });
  ctx.save(); ctx.strokeStyle = PAL.outline; ctx.lineWidth = OUT * 0.8; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(kx + Math.cos(a) * 40, ky + Math.sin(a) * 40); ctx.stroke(); ctx.restore();
  for (const bx of [x + 80, x + w - 80]) cel(ctx, PAL.butter, [bx, y + 420, 26, 26], { w: OUT * 0.7, shine: false });
  ctx.restore();
}

// --- the rabbit ----------------------------------------------------------------------------------------------------------

function rabbit(ctx, p) {
  const { sx, sy } = squash(p.v), look = [0.5, 0.1];
  ctx.save();
  ctx.translate(RABBIT.x, FEET + p.y);
  ctx.scale(RABBIT.s * sx, RABBIT.s * sy * (1 + 0.012 * p.breathe));
  for (const [side, rot] of [[-1, -0.2 - 0.4 * p.twitch], [1, 0.16]]) {  // the left ear twitches
    ctx.save(); ctx.translate(side * 66, -300); ctx.rotate(rot);
    cel(ctx, PAL.fur, [0, -105, 46, 108]);
    blob(ctx, PAL.earInner, ell(0, -96, 22, 78), 0, [shadeOf(PAL.earInner), -6, -104, 22, 78]);
    ctx.restore();
  }
  for (const side of [-1, 1]) cel(ctx, PAL.cream, [side * 74, -22, 66, 28], { shine: false });
  cel(ctx, PAL.fur, [0, -124, 142, 126 * (1 + 0.02 * p.breathe)]);
  blob(ctx, PAL.cream, ell(0, -100, 82, 82), 0, [shadeOf(PAL.cream), -18, -118, 82, 82]);
  for (const side of [-1, 1]) cel(ctx, PAL.fur, [side * 76, -150, 32, 42], { shine: false, w: OUT * 0.8 });
  cel(ctx, PAL.fur, [0, -284, 154, 128]);
  // face: muzzle, nose, mouth, blush and eyes (a blink squashes them to a line)
  blob(ctx, PAL.cream, ell(0, -246, 60, 42), 0, [shadeOf(PAL.cream), -10, -256, 60, 42]);
  blob(ctx, PAL.earInner, ell(0, -268, 17, 12), OUT * 0.4);
  ctx.save();
  ctx.strokeStyle = PAL.outline; ctx.lineWidth = OUT * 0.55; ctx.lineCap = ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(0, -256); ctx.lineTo(0, -240); ctx.moveTo(-16, -236); ctx.arc(-14, -240, 14, 0.2, Math.PI - 0.3); ctx.moveTo(14, -226); ctx.arc(14, -240, 14, Math.PI * 0.3, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
  for (const side of [-1, 1]) {
    blob(ctx, PAL.earInner, ell(side * 104, -246, 26, 17), 0);
    dotEye(ctx, side * 64, -292, { r: 15, look, lid: p.lid });
  }
  ctx.restore();
}

// --- frame ---------------------------------------------------------------------------------------------------------------

export function draw(ctx, t, W, H) {
  const k = W / 1080, p = pose(t);
  ctx.save();
  ctx.scale(k, k);
  backdrop(ctx, 1080, H / k);
  title(ctx, t, 1080);
  const lift = Math.min(1, -p.y / 90);  // the cast shadow shrinks while the rabbit is in the air
  ctx.fillStyle = mix(PAL.grass, PAL.shadow, 0.34);
  for (const [x, rx] of [[RABBIT.x + 70, 215 * (1 - 0.25 * lift)], [TIMER.x + TIMER.w / 2 + 50, 235]]) { ctx.beginPath(); ctx.ellipse(x, FEET + 14, rx, 26, 0, 0, TAU); ctx.fill(); }
  timer(ctx, t);
  rabbit(ctx, p);
  ctx.restore();
}
