// Style demo: crt-vhs. The demo scene (flat shapes) seen on a tube TV playing a worn tape: per-line horizontal jitter and a
// rolling tracking band with snow, RGB channel bleed, scanlines, a head-switching skew at the bottom, a glass vignette with
// rounded corners and an on-screen "PLAY" with a tape counter in a blocky bitmap font.
// Render the stills with `node scripts/gallery.mjs previews --only crt-vhs`.
import { rng, prog } from "../ink.mjs";
import { squash } from "../toon.mjs";
import { bitText, clock, life } from "../pixel.mjs";

export const DURATION = 3, COVER = 1.5;
export const SOUND = { kind: "intro", close: 2.5 };
export const CAPTIONS = [], SCENES = [];

const HW = 540, HH = 960;  // the picture is drawn at half size, bled and jittered there, then scaled up (a soft tape)

export function setup(doc) {
  const mk = () => { const c = doc.createElement("canvas"); c.width = HW; c.height = HH; return c; };
  return { pic: mk(), tape: mk(), chan: mk() };
}

// The flat-shape scene in 1080x1920 space: banded sunset, hills, meadow, the timer board and the rabbit.
function picture(g, t) {
  const { text, colon, bar } = clock(t), pose = life(t, 130), r = rng(11);
  g.save();
  g.scale(0.5, 0.5);
  [["#2b2057", 0], ["#6d2b8a", 520], ["#d8477a", 800], ["#ff9a4d", 1040], ["#ffc46b", 1200]].forEach(([c, y], i, a) => { g.fillStyle = c; g.fillRect(0, y, 1080, (a[i + 1]?.[1] ?? 1920) - y); });
  g.fillStyle = "#fff3df";
  for (let i = 0; i < 26; i++) g.fillRect(r() * 1080, r() * 560, 7, 7);
  g.fillStyle = "#ffe27a";
  g.beginPath(); g.arc(790, 1170, 190, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#35205e";
  g.beginPath(); g.moveTo(0, 1330); g.quadraticCurveTo(260, 1180, 520, 1300); g.quadraticCurveTo(800, 1220, 1080, 1320); g.lineTo(1080, 1400); g.lineTo(0, 1400); g.fill();
  g.fillStyle = "#3ba070"; g.fillRect(0, 1320, 1080, 600);
  g.fillStyle = "#2d7f57"; g.fillRect(0, 1640, 1080, 280);

  // the timer board: dark panel, yellow frame, big digits, a progress bar
  g.fillStyle = "#ffd166";
  g.beginPath(); g.roundRect(70, 290, 940, 420, 48); g.fill();
  g.fillStyle = "#1a1233";
  g.beginPath(); g.roundRect(94, 314, 892, 372, 34); g.fill();
  g.font = "900 300px Nunito";
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  g.fillStyle = "#ffe27a";
  const w = g.measureText("25:00").width, colonW = g.measureText(":").width;
  [...text].forEach((ch, i) => { if (ch !== ":" || colon) g.fillText(ch, 540 - w / 2 + g.measureText(text.slice(0, i)).width + g.measureText(ch).width / 2, 540); });
  g.fillStyle = "#3a2d6b"; g.fillRect(170, 600, 740, 36);
  g.fillStyle = "#6fe3b0"; g.fillRect(170, 600, 740 * bar, 36);

  // the rabbit, squashed about its feet by the hop
  const { sx, sy } = squash(pose.v * 0.5);
  g.save();
  g.translate(330, 1640 + pose.y);
  g.fillStyle = "rgba(20,10,40,0.3)";
  g.beginPath(); g.ellipse(0, 6 - pose.y, 190 - pose.y * 0.4, 34, 0, 0, Math.PI * 2); g.fill();
  g.scale(sx, sy);
  const el = (x, y, rx, ry, c, rot = 0) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); };
  for (const [s, lean] of [[-1, 0], [1, pose.ear * 0.5]]) {
    g.save();
    g.translate(s * 62, -470);
    g.rotate(s * 0.16 + lean);
    el(0, -140, 46, 160, "#dfe8ff");
    el(0, -130, 22, 110, "#ff9fb8");
    g.restore();
  }
  el(0, -170, 160, 170, "#dfe8ff");
  el(60, -150, 100, 150, "#b9c8f2");
  el(0, -140, 100, 120, "#fff3df");
  el(0, -380, 150, 128, "#dfe8ff");
  el(-90, -345, 34, 22, "#ff9fb8"); el(90, -345, 34, 22, "#ff9fb8");
  for (const s of [-1, 1]) el(s * 62, -400, 17, Math.max(3, 25 * (1 - pose.blink)), "#2a1a3a");
  el(0, -352, 22, 14, "#ff6f86");
  g.restore();
  g.fillStyle = "#ee8034";  // a carrot
  g.beginPath(); g.moveTo(760, 1560); g.lineTo(840, 1560); g.lineTo(800, 1750); g.fill();
  g.fillStyle = "#4ec27a"; g.fillRect(768, 1500, 20, 60); g.fillRect(790, 1480, 20, 80); g.fillRect(812, 1500, 20, 60);
  g.restore();
}

// Slice the picture into 4-px lines, each shifted sideways: a little jitter everywhere, a rolling tracking band that
// tears and a skew over the last lines (the VCR's head switch). Returns the band centre in half-res px.
function tracking(tape, pic, t) {
  const rr = rng(Math.floor(t * 30) * 977 + 13), band = ((t * 0.3 + 0.55) % 1.1) * HH - 60;
  tape.fillStyle = "#000";
  tape.fillRect(0, 0, HW, HH);
  for (let y = 0; y < HH; y += 4) {
    const n = rr();
    let dx = (n - 0.5) * 1.4;
    const u = (y - band) / 90;
    if (u > 0 && u < 1) dx += Math.sin(u * Math.PI) * (6 + 14 * rr()) - 4;
    if (y > 900) dx += (y - 900) * 0.3 + (n - 0.5) * 6;
    tape.drawImage(pic, 0, y, HW, 4, dx, y, HW, 4);
  }
  return band;
}

export function draw(ctx, t, W, H, st) {
  const { pic, tape, chan } = st, k = W / 1080, fr = Math.floor(t * 30), rr = rng(fr * 31 + 5);
  picture(pic.getContext("2d"), t);
  const band = tracking(tape.getContext("2d"), pic, t), cg = chan.getContext("2d");

  ctx.save();
  ctx.scale(k, k);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 1080, 1920);

  // RGB bleed: each channel on its own, slid a few px apart and blurred, then added back together
  ctx.globalCompositeOperation = "lighter";
  ctx.filter = "blur(1.6px)";
  [["#ff0000", 7], ["#00ff00", 0], ["#0000ff", -7]].forEach(([c, dx]) => {
    cg.globalCompositeOperation = "source-over";
    cg.drawImage(tape, 0, 0);
    cg.globalCompositeOperation = "multiply";
    cg.fillStyle = c;
    cg.fillRect(0, 0, HW, HH);
    ctx.drawImage(chan, dx, 0, 1080, 1920);
  });
  ctx.globalAlpha = 0.16;  // a ghost of the picture a little to the right
  ctx.drawImage(tape, 16, 0, 1080, 1920);
  ctx.globalAlpha = 1;
  ctx.filter = "none";

  // snow in the tracking band, and a little everywhere
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < 90; i++) {
    const y = band * 2 + 90 + (rr() - 0.5) * 220, w = 24 + rr() * 170;
    ctx.fillStyle = rr() < 0.7 ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)";
    ctx.fillRect(rr() * 1080, y, w, 2 + Math.floor(rr() * 4));
  }
  for (let i = 0; i < 160; i++) { ctx.fillStyle = `rgba(255,255,255,${0.05 + rr() * 0.12})`; ctx.fillRect(rr() * 1080, rr() * 1920, 2 + rr() * 8, 2); }

  // the on-screen display: PLAY with a triangle, the tape counter and the speed, each with a red and a blue fringe
  const sec = 41 + Math.floor(t), counter = `0:02:${sec}`;
  const osd = (dx, c, mode) => {
    ctx.globalCompositeOperation = mode;
    bitText(ctx, "PLAY", 100 + dx, 110, 14, c);
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(350 + dx, 110); ctx.lineTo(350 + dx, 180); ctx.lineTo(412 + dx, 145); ctx.fill();
    bitText(ctx, counter, 100 + dx, 1740, 11, c);
    bitText(ctx, "SP", 840 + dx, 1740, 11, c);
  };
  osd(-5, "#ff2a2a", "lighter");
  osd(5, "#22e0ff", "lighter");
  osd(0, "#ffffff", "source-over");
  ctx.globalCompositeOperation = "source-over";

  // scanlines, a faint rolling bar and glass sheen
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  for (let y = 0; y < 1920; y += 4) ctx.fillRect(0, y, 1080, 2);
  const roll = ((t * 0.22) % 1.3 - 0.15) * 1920, g = ctx.createLinearGradient(0, roll - 160, 0, roll + 160);
  g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,0.07)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, roll - 160, 1080, 320);

  // vignette, then the tube's rounded corners cut out of black
  const v = ctx.createRadialGradient(540, 960, 520, 540, 960, 1220);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = "#050507";
  ctx.beginPath();
  ctx.rect(-4, -4, 1088, 1928);
  ctx.roundRect(22, 22, 1036, 1876, 120);
  ctx.fill("evenodd");
  ctx.restore();
}
