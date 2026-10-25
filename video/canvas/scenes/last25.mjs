// "Last 25": a rooftop at dusk, a pocket watch in anime-cel, one impact frame and a 25-minute time-lapse into night, drawn
// in canvas 2D with the cel kit. Every frame is a pure function of t; see last25.md for the prompt.
import { rng, prog, easeOut, easeIo, lerp } from "../ink.mjs";
import { critter } from "../toon.mjs";
import { PAL, TAU, mix, snap, watch, makeLines, speedLines, grainPattern, grain, letterbox, invert, cel, CLOSING } from "../cel.mjs";

export const DURATION = 19, COVER = 1.5;
export const FLASH = [210, 211];                     // frames: 7.0 s and 7.033 s, palette inverted
export const IMPACT = FLASH[0] / 30, LAPSE = { from: 7.1, to: 14 }, WATCH = { from: 3.2, to: 14.2 };
export const SOUND = { kind: "city", impact: IMPACT, lapse: LAPSE, ticks: [4, 5, 6], horns: [0.9, 2.2, 2.45, 4.6, 5.8], siren: [1.6, 3.8], done: 14, close: 16.8 };
export const SCENES = [{ name: "roof", from: 0, to: 3.2 }, { name: "watch", from: 3.2, to: 14.2 }, { name: "night", from: 14.2, to: DURATION }];
const R_ = t => ({ t, c: PAL.red });
export const CAPTIONS = [
  { from: 0, to: 3.0, lines: [["The last"], [R_("25 minutes")], ["of the day."]] },
  { from: 3.5, to: 6.8, lines: [["Phone down."]], size: 96 },
  { from: 7.0, to: 7.3, lines: [["Start."]], size: 230, y: 0.5, hit: true },
  { from: 8.0, to: 13.4, lines: [[R_("25 minutes.")], ["Nothing else."]] },
  { from: 14.2, to: 16.6, lines: CLOSING, y: 0.27 },
];
export const END = { from: 16.8, title: "WildFocus", line: "25 minutes. Phone down." };

const SKY = { dusk: ["#3b3552", "#6b4a68", "#b85f5a", "#e49a5a", "#f2c27a"], night: ["#0f1424", "#171d33", "#232a47", "#2f3558", "#3a3f66"] };
const ROOF = 0.875;

export function setup(doc, W, H, { icon }) {
  const k = W / 1080, r = rng(21);
  const rab = doc.createElement("canvas");
  rab.width = W;
  rab.height = H;
  const g = rab.getContext("2d");
  critter(g, { species: "rabbit", x: W * 0.2, y: H * ROOF + 14 * k, s: 0.9 * k });
  g.globalCompositeOperation = "source-in";
  g.fillStyle = PAL.ink;
  g.fillRect(0, 0, W, H);
  const city = [];
  for (let x = -20 * k; x < W; ) {
    const w = (60 + r() * 70) * k, behindRabbit = x + w > W * 0.06 && x < W * 0.36;
    city.push({ x, w, h: (behindRabbit ? 0.02 + r() * 0.015 : 0.05 + r() * 0.15) * H, win: Array.from({ length: 3 + Math.floor(r() * 4) }, () => ({ u: r(), v: r(), on: r() })) });
    x += w + 4 * k;
  }
  const stars = Array.from({ length: 70 }, () => ({ x: r() * W, y: (0.07 + r() * 0.5) * H, s: (1.5 + r() * 2.5) * k, a: r() }));
  return { icon, rab, city, stars, lines: makeLines(5), tile: grainPattern(doc, 5) };
}

export const clock = t => {
  if (t < LAPSE.from) return { sec: snap(t), min: 48, hour: 304 };
  const m = 25 * easeIo(prog(t, LAPSE.from, LAPSE.to));
  return { sec: (m * 60 * 6) % 360, min: 48 + 6 * m, hour: 304 + 0.5 * m };
};

export function draw(ctx, t, W, H, st) {
  const k = W / 1080, f = Math.floor(t * 30 + 1e-6), flash = FLASH.includes(f), u = prog(t, LAPSE.from, LAPSE.to);
  if (t >= END.from) return endCard(ctx, t, W, H, st);
  ctx.save();
  ctx.translate(W / 2, H * 0.6);
  const push = 1 + 0.08 * prog(t, 0, 14);
  ctx.scale(push, push);
  ctx.translate(-W / 2, -H * 0.6);
  scenery(ctx, t, W, H, st, u);
  ctx.restore();

  // the watch: a push through the macro, a pull back after the impact, out as the 25 minutes end
  if (t >= WATCH.from && t < WATCH.to) {
    const z = (t < IMPACT ? lerp(1, 1.35, easeIo(prog(t, 3.2, 6.6))) : lerp(1.35, 1, easeIo(prog(t, LAPSE.from, 8.2)))) * (flash ? 1.05 : 1);
    const a = easeOut(prog(t, WATCH.from, WATCH.from + 0.3)) * (1 - prog(t, WATCH.to - 0.5, WATCH.to));
    ctx.save();
    ctx.globalAlpha = a;
    watch(ctx, { cx: W / 2, cy: H * 0.45, R: 360 * k * z, k, z, hands: clock(t) });
    ctx.restore();
    if (flash) speedLines(ctx, st.lines, W / 2, H * 0.45, 360 * k * z, H, PAL.ink);
  }
  letterbox(ctx, W, H, H * 0.06);
  for (const c of CAPTIONS) {
    if (t < c.from || t >= c.to) continue;
    cel(ctx, W, H * (c.y ?? (c.lines.length > 1 ? 0.14 : 0.125)), c.lines, { size: (c.size ?? 92) * k, alpha: c.from === 0 || c.hit ? 1 - prog(t, c.to - 0.1, c.to) : prog(t, c.from, c.from + 0.15) * (1 - prog(t, c.to - 0.2, c.to)) });
  }
  if (flash) invert(ctx, W, H);
  grain(ctx, t, W, H, st.tile);
}

// Sky in five flat cel bands, a sun that sinks and a moon that rises, a skyline with windows, the roof and the rabbit.
function scenery(ctx, t, W, H, st, u) {
  const k = W / 1080, night = easeIo(u), roofY = H * ROOF, bands = SKY.dusk.map((c, i) => mix(c, SKY.night[i], night));
  ctx.fillStyle = bands[0];
  ctx.fillRect(-W, -H, 3 * W, 3 * H);
  bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(-W, roofY * (i / 5) - (i ? 0 : H), 3 * W, roofY / 5 + 2); });
  const stars = prog(night, 0.45, 0.9);
  for (const s of st.stars) { ctx.globalAlpha = stars * (0.5 + 0.5 * s.a); ctx.fillStyle = PAL.face; ctx.fillRect(s.x, s.y, s.s, s.s); }
  ctx.globalAlpha = 1;
  const sunY = lerp(H * 0.55, H * 0.93, easeIo(prog(night, 0, 0.7)));
  ctx.beginPath(); ctx.arc(W * 0.72, sunY, 130 * k, 0, TAU); ctx.fillStyle = PAL.red; ctx.fill();
  const mA = prog(night, 0.4, 0.8);
  if (mA > 0) {
    ctx.globalAlpha = mA;
    ctx.beginPath(); ctx.arc(W * 0.86, H * 0.32, 70 * k, 0, TAU); ctx.fillStyle = PAL.face; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(W * 0.86, H * 0.32, 70 * k, 0, TAU); ctx.clip();
    ctx.beginPath(); ctx.arc(W * 0.86 + 26 * k, H * 0.32 + 19 * k, 70 * k, 0, TAU); ctx.fillStyle = PAL.shade; ctx.fill(); ctx.restore();
    ctx.globalAlpha = 1;
  }
  const city = mix("#2a2036", "#1d2440", night);
  for (const b of st.city) {
    ctx.fillStyle = city;
    ctx.fillRect(b.x, roofY - b.h, b.w, b.h + 2);
    for (const w of b.win) {
      if (b.h < H * 0.05) break;
      ctx.globalAlpha = (0.15 + 0.85 * prog(night, 0.15, 0.8)) * (w.on > 0.45 ? 1 : 0.15);
      ctx.fillStyle = "#e8b95a";
      ctx.fillRect(b.x + 8 * k + w.u * (b.w - 26 * k), roofY - b.h + 12 * k + w.v * (b.h - 30 * k), 10 * k, 14 * k);
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(-W, roofY, 3 * W, H);
  ctx.drawImage(st.rab, 0, 0);
}

// Night page: the real app icon as a sticker with a lip, the name in paper, the line under a red bar.
function endCard(ctx, t, W, H, st) {
  const k = W / 1080, a = easeOut(prog(t, END.from, END.from + 0.5)), s = 260 * k, cy = H * 0.4;
  ctx.save();
  ctx.fillStyle = SKY.night[0];
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = a;
  const pop = 0.85 + 0.15 * easeOut(prog(t, END.from + 0.1, END.from + 0.6));
  ctx.translate(W / 2, cy);
  ctx.scale(pop, pop);
  if (st.icon) {
    ctx.fillStyle = PAL.ink;
    ctx.beginPath(); ctx.roundRect(-s / 2 + 8 * k, -s / 2 + 14 * k, s, s, s * 0.225); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.225); ctx.clip();
    ctx.drawImage(st.icon, -s / 2, -s / 2, s, s);
    ctx.restore();
    ctx.lineWidth = 6 * k;
    ctx.strokeStyle = PAL.face;
    ctx.beginPath(); ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.225); ctx.stroke();
  }
  ctx.restore();
  cel(ctx, W, cy + s * 0.5 + 140 * k, [[END.title]], { size: 128 * k, alpha: a });
  ctx.globalAlpha = prog(t, END.from + 0.4, END.from + 0.9);
  ctx.fillStyle = PAL.red;
  ctx.fillRect(W / 2 - 160 * k, cy + s * 0.5 + 240 * k, 320 * k, 10 * k);
  cel(ctx, W, cy + s * 0.5 + 310 * k, [[END.line]], { size: 54 * k });
  ctx.restore();
  ctx.save();
  grain(ctx, t, W, H, st.tile);
  ctx.restore();
}
