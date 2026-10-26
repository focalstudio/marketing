// "Focal Studio": a 45 s narrated intro drawn in canvas 2D as a kawaii animation: flat white bunnies with a plum outline on pastel
// pages, one keyword per voice line, and the app's own low-poly animals on rarity cards. Every frame is a pure function of t; see
// studio_intro.md for the prompt and the script.
import { prog, easeOut, easeIo, lerp } from "../ink.mjs";
import { hop, blink, blinkTimes } from "../toon.mjs";
import { mix, grainPattern, endCard, CLOSING, STORE } from "../cel.mjs";
import { PAL, TAU, bunny, phoneBack, snail, keyword, rarityCard, timerRing, checklist, easel, brush, bookCover, dumbbell } from "../kawaii.mjs";

export const DURATION = 45, COVER = 3;
export const THROW = { from: 4.3, release: 4.5, to: 5.3 };  // the bunny winds up, throws the phone off to the right, and it is gone
export const SOUND = { kind: "intro", voice: "video/canvas/voice/studio_intro.wav", throw: THROW.release, close: 41.5 };
export const ANIMALS = ["rabbit", "fox", "otter", "orangutan"];
export const SCENES = [
  { name: "scroll", from: 0, to: 5.4 }, { name: "studio", from: 5, to: 11.4 }, { name: "calm", from: 11, to: 14.8 }, { name: "slow", from: 14.4, to: 17.6 },
  { name: "open", from: 17.2, to: 22.6 }, { name: "collect", from: 22.2, to: 31.4 }, { name: "challenges", from: 31, to: 35.6 },
  { name: "more", from: 35.4, to: 38 }, { name: "time", from: 37.8, to: DURATION },
];
const K = (word, from, to, size) => ({ from, to, lines: [[word]], size });
export const CAPTIONS = [
  K("Scroll.", 0, 4.6, 190), K("Focal Studio", 5.4, 10.6, 150), K("Disconnect", 11.4, 14.2, 140), K("Reconnect", 14.8, 17.0, 150), K("Your goals", 17.6, 21.8, 150),
  K("25 min", 22.8, 25.1, 150), K("Collect", 25.2, 30.6, 170), K("Challenges", 31.4, 33.5, 150), K("Legendary", 33.6, 35.5, 160),
  K("More soon", 36.1, 37.8, 150), K("Your time", 38.2, 41.3, 170),
];
export const END = { from: 41.5, title: "WildFocus", lines: CLOSING, store: STORE };
// Review gate 2: the still for each beat, with the voice line and keyword it carries.
export const BEATS = [
  { t: 0.5, word: "Scroll.", say: "Your phone was built to keep you scrolling." },
  { t: 3, word: "Scroll.", say: "(it stares into the phone, its glow on the ears)" },
  { t: 4.0, word: "Scroll.", say: "(throw 1: holding the phone)" },
  { t: 4.3, word: "", say: "(throw 2: wind-up, pulls it back)" },
  { t: 4.5, word: "", say: "(throw 3: release, paws let go)" },
  { t: 4.7, word: "", say: "(throw 4: the phone flies right, alone)" },
  { t: 4.9, word: "", say: "(throw 5: spinning, face uncovered)" },
  { t: 5.1, word: "", say: "(throw 6: almost out of frame)" },
  { t: 5.4, word: "Focal Studio", say: "We're Focal Studio. We make apps that do the opposite." },
  { t: 7, word: "Focal Studio", say: "(it hops and looks over its shoulder)" },
  { t: 12.5, word: "Disconnect", say: "We want to disconnect from the everyday noise," },
  { t: 16, word: "Reconnect", say: "and reconnect with your life" },
  { t: 19.5, word: "Your goals", say: "and your goals." },
  { t: 23.5, word: "25 min", say: "Our first app is WildFocus. It's a focus timer that rewards you." },
  { t: 28.5, word: "Collect", say: "Every twenty-five minutes adds a new animal to your collection." },
  { t: 32.3, word: "Challenges", say: "Finish daily challenges…" },
  { t: 34.6, word: "Legendary", say: "…to find rare animals more often." },
  { t: 36.8, word: "More soon", say: "More apps are on the way." },
  { t: 39.8, word: "Your time", say: "Every app we make has one job: to give you your time back." },
  { t: 43.5, word: "", say: "Just focus on what matters." },
];

const BG = [
  [0, PAL.bgPink], [11, PAL.mint], [14.5, PAL.peach], [17.3, PAL.sky], [22.3, PAL.butter], [31.2, PAL.sky], [35.4, PAL.mint], [37.9, PAL.bgPink],
];
const RARITY = { common: "#9ca3af", uncommon: "#4caf50", rare: "#2196f3", legendary: "#ff9800" };
const LABEL = { common: "Common", uncommon: "Uncommon", rare: "Rare", legendary: "Endangered" };
const BLINKS = [blinkTimes(3, DURATION), blinkTimes(8, DURATION), blinkTimes(13, DURATION)];

export function setup(doc, W, H, { icon, animals }) {
  return { icon, animals: animals || {}, tile: grainPattern(doc, 5) };
}

const background = t => {
  let c = BG[0][1];
  for (let i = 1; i < BG.length; i++) if (t >= BG[i][0]) c = mix(BG[i - 1][1], BG[i][1], easeIo(prog(t, BG[i][0], BG[i][0] + 0.5)));
  return c;
};
const breathe = (t, k = 0) => Math.sin(t * 2.1 + k);
const flick = (t, at) => (t > at && t < at + 0.5 ? 0.35 * Math.sin(((t - at) / 0.5) * Math.PI) : 0);
const pop = (t, at, dur = 0.45) => { const u = prog(t, at, at + dur); return u <= 0 ? 0 : 1 + 0.12 * Math.sin(u * Math.PI) - (1 - easeOut(u)) * 0.2; };

function icon(ctx, st, cx, cy, s, a = 1) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.shadowColor = "rgba(75,33,66,0.25)"; ctx.shadowBlur = s * 0.14; ctx.shadowOffsetY = s * 0.06;
  ctx.beginPath(); ctx.roundRect(cx - s / 2, cy - s / 2, s, s, s * 0.225);
  ctx.fillStyle = PAL.white; ctx.fill();
  ctx.shadowColor = "transparent";
  if (st.icon) { ctx.save(); ctx.clip(); ctx.drawImage(st.icon, cx - s / 2, cy - s / 2, s, s); ctx.restore(); }
  ctx.lineWidth = s * 0.045; ctx.strokeStyle = PAL.plum;
  ctx.beginPath(); ctx.roundRect(cx - s / 2, cy - s / 2, s, s, s * 0.225); ctx.stroke();
  ctx.restore();
}

function mystery(ctx, cx, cy, s, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.beginPath(); ctx.roundRect(cx - s / 2, cy - s / 2, s, s, s * 0.225);
  ctx.fillStyle = "#fff"; ctx.fill();
  ctx.lineWidth = s * 0.045; ctx.strokeStyle = PAL.plum; ctx.setLineDash([s * 0.1, s * 0.07]); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = PAL.plum; ctx.font = `900 ${s * 0.6}px Nunito`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("?", cx, cy + s * 0.04);
  ctx.restore();
}

// Where the phone is at t: held up at the bunny's face, pulled back for the wind-up, then flying off to the right, spinning. `held`
// is false from the release on, so it is drawn alone, with no paws.
export function phonePose(t, base) {
  const y0 = base - 200;
  if (t < THROW.from) return { x: 540, y: y0, s: 1.02, rot: 0, held: true };
  if (t < THROW.release) { const e = easeOut(prog(t, THROW.from, THROW.release)); return { x: lerp(540, 500, e), y: lerp(y0, y0 + 30, e), s: 1.02, rot: -0.15 * e, held: true }; }
  const u = prog(t, THROW.release, THROW.to);
  return { x: 500 + 1100 * u, y: y0 + 30 - 620 * u + 580 * u * u, s: 1.02 * (1 - 0.25 * u), rot: -0.15 + 6 * u, held: false };
}

// Arms for the bunnies that hold things, in the bunny's own units: [shoulder, elbow, hand] for the left (l) and right (r) arm.
// A side left out keeps the resting "U". Pure in t, so tests can reach them.
const mirror = a => a.map(([x, y]) => [-x, y]);
export function armsHook(t) {  // the phone, held at the sides, then a swing of the right arm as it is thrown
  const l = [[-50, -160], [-112, -140], [-100, -210]], r = mirror(l);
  if (t < THROW.release) return { l, r };
  const u = prog(t, THROW.release, THROW.release + 0.3);
  return u < 1 ? { r: [[50, -160], [lerp(112, 120, u), lerp(-140, -178, u)], [lerp(100, 160, u), lerp(-210, -232, u)]] } : null;
}
export const armsPaint = (t, hand) => ({ l: [[-50, -160], [-92, -122], hand], r: [[50, -160], [88, -122], [62, -96]] });
export const armsRead = () => ({ l: [[-50, -160], [-116, -126], [-78, -100]], r: [[50, -160], [116, -126], [78, -100]] });
export const armsLift = barY => ({ l: [[-50, -160], [-108, lerp(-125, barY, 0.45)], [-52, barY]], r: [[50, -160], [108, lerp(-125, barY, 0.45)], [52, barY]] });

const bun = (ctx, t, i, o) => bunny(ctx, { breathe: breathe(t, i), blink: blink(t, BLINKS[i % 3]), ...o });

function hill(ctx, W, H, a = 1) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = "#bfe3c9";
  ctx.beginPath(); ctx.ellipse(W * 0.35, H * 0.86, W * 0.85, H * 0.2, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#a9d6b6";
  ctx.beginPath(); ctx.ellipse(W * 0.95, H * 0.9, W * 0.6, H * 0.17, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

export function draw(ctx, t, W, H, st) {
  const k = W / 1080;
  ctx.fillStyle = background(t);
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.scale(k, k);
  const w = 1080, h = H / k, base = h * 0.7;

  if (t < 5.4) {  // three bunnies; the middle one is lost in a phone, then throws it away
    const lean = t < THROW.release ? -0.08 * easeIo(prog(t, THROW.from, THROW.release))  // leans back to wind up, snaps forward, settles
      : t < 4.65 ? lerp(-0.08, 0.1, easeOut(prog(t, THROW.release, 4.65))) : 0.1 * (1 - easeIo(prog(t, 4.65, 5.1)));
    bun(ctx, t, 0, { x: 220, y: base, s: 0.74, face: "back", ear: flick(t, 2.2) });
    bun(ctx, t, 2, { x: 860, y: base, s: 0.74, face: "back", ear: flick(t, 3.6), flip: -1 });
    bun(ctx, t, 1, { x: 540, y: base + 40, s: 0.96, face: "front", arms: armsHook(t), v: lean, blink: Math.max(0, 1 - Math.abs(t - 4.97) / 0.07), ear: flick(t, 4.6) });
    if (t < THROW.to) {
      const p = phonePose(t, base);
      if (!p.held) {  // speed streaks trailing the phone
        const q = phonePose(t - 0.06, base);
        ctx.save(); ctx.strokeStyle = PAL.plum; ctx.lineWidth = 9; ctx.lineCap = "round";
        for (const dy of [-46, 0, 46]) { ctx.beginPath(); ctx.moveTo(q.x - 70, q.y + dy); ctx.lineTo(p.x - 130, p.y + dy); ctx.stroke(); }
        ctx.restore();
      }
      phoneBack(ctx, { x: p.x, y: p.y, s: p.s, rot: p.rot, t });
    }
  } else if (t < 11.4) {  // it drops the phone and turns round to look at us
    const turn = t - 5.2, h2 = hop(t, 5.4, 0.7, 70);
    bun(ctx, t, 0, { x: 220, y: base, s: 0.74, face: "back" });
    bun(ctx, t, 2, { x: 860, y: base, s: 0.74, face: "back", flip: -1 });
    bun(ctx, t, 1, { x: 540, y: base + 40 + h2.y, s: 0.96, face: turn < 0.2 ? "front" : "over", v: h2.v, ear: flick(t, 8) });
  } else if (t < 14.6) {  // calm: one bunny, eyes shut, breathing
    bun(ctx, t, 0, { x: 540, y: h * 0.72, s: 1.35, face: "front", blink: 1, breathe: breathe(t, 0) * 1.2 });
  } else if (t < 17.4) {  // slow: a snail crosses the page
    const u = prog(t, 14.6, 17.3);
    bun(ctx, t, 1, { x: 400, y: h * 0.7, s: 1.15, face: "front", ear: flick(t, 16.0) });
    snail(ctx, { x: lerp(1250, -200, u), y: h * 0.7 + 30, s: 1.25, t });
  } else if (t < 22.6) {  // your goals: on a meadow, one bunny paints, one reads and one lifts
    hill(ctx, w, h, easeOut(prog(t, 17.3, 18.1)));
    const gy = h * 0.77, a = pop(t, 17.5, 0.5), lift = 0.5 + 0.5 * Math.sin((t - 17.5) * 3.2), at = (x, y, f) => { ctx.save(); ctx.translate(x, y); ctx.scale(a, a); ctx.translate(-x, -y); f(); ctx.restore(); };
    // painter, with the easel beside it: one arm reaches out and holds the brush
    const pb = { x: 340, y: gy, s: 0.9 }, hx = -124 + 4 * Math.sin(t * 3.4), hy = -150 + 5 * Math.cos(t * 2.6);
    bun(ctx, t, 0, { ...pb, face: "front", arms: armsPaint(t, [hx, hy]) });
    at(125, gy, () => easel(ctx, { x: 125, y: gy + 6, s: 1.05, paint: [prog(t, 18, 18.8), prog(t, 19, 19.8), prog(t, 20, 20.8)] }));
    brush(ctx, { x: pb.x + hx * pb.s, y: pb.y + hy * pb.s, tx: 214 + 12 * Math.sin(t * 3.4), ty: gy - 172 + 22 * Math.cos(t * 2.6) });
    // reader: both arms bend in to the book
    bun(ctx, t, 1, { x: 610, y: gy + 24, s: 1.05, face: "front", arms: armsRead() });
    at(610, gy - 67, () => bookCover(ctx, { x: 610, y: gy - 67, s: 0.85, t: t - 17.5 }));
    // lifter: the arms follow the dumbbell up and down
    const ly = gy - 124 - 88 * lift;
    bun(ctx, t, 2, { x: 915, y: gy, s: 0.9, face: "front", v: 0.03 * lift, arms: armsLift((ly - gy) / 0.9) });
    at(915, ly, () => dumbbell(ctx, { x: 915, y: ly, s: 0.9 }));
  } else if (t < 31.4) {  // collect: the app icon runs a 25-minute ring, then the animals arrive on their rarity cards
    const u = prog(t, 23, 25.4), a = pop(t, 22.4, 0.5);
    ctx.save();
    ctx.translate(540, h * 0.3); ctx.scale(a, a);
    timerRing(ctx, { x: 0, y: 0, r: 190, u });
    icon(ctx, st, 0, 0, 250);
    ctx.restore();
    [["rabbit", "common", 25.3, 215], ["fox", "uncommon", 26.7, 540], ["otter", "rare", 28.1, 865]].forEach(([id, r, at, x], i) => {
      const sc = pop(t, at);
      if (sc <= 0) return;
      ctx.save();
      ctx.translate(x, h * 0.62 + Math.sin(t * 2 + i) * 6); ctx.scale(sc, sc);
      rarityCard(ctx, { img: st.animals[id], cx: 0, cy: 0, w: 290, h: 390, color: RARITY[r], label: LABEL[r], t });
      ctx.restore();
    });
  } else if (t < 35.6) {  // challenges, then the legendary orangutan
    const slide = easeIo(prog(t, 33.3, 33.9));
    if (t < 34) checklist(ctx, { x: 540, y: h * 0.5 + slide * 900, s: 1.15, t: t - 31.3, at: [0.6, 1.1, 1.6] });
    const o = pop(t, 33.6, 0.6);
    if (o > 0) {
      ctx.save();
      ctx.translate(540, h * 0.56); ctx.scale(o, o);
      rarityCard(ctx, { img: st.animals.orangutan, cx: 0, cy: 0, w: 640, h: 850, color: RARITY.legendary, label: LABEL.legendary, glow: true, t });
      ctx.restore();
    }
  } else if (t < 38) {  // more apps on the way
    const row = easeOut(prog(t, 35.5, 36));
    const sz = 240, xs = [540 - 300, 540, 540 + 300], y = h * 0.45;
    icon(ctx, st, xs[0], y, sz, row);
    mystery(ctx, xs[1], y, sz, row * prog(t, 35.8, 36.3));
    mystery(ctx, xs[2], y, sz, row * prog(t, 36, 36.5));
  } else {  // the trio, together
    [[240, 0.82, 0], [540, 0.95, 1], [840, 0.82, 2]].forEach(([x, sc, i]) => bun(ctx, t, 0, { x, y: h * 0.72 + (i === 1 ? 20 : 0), s: sc, face: "front", blink: blink(t, BLINKS[i]), breathe: breathe(t, 0) }));
  }
  ctx.restore();

  for (const c of CAPTIONS) {
    if (t < c.from || t >= c.to) continue;
    keyword(ctx, W, H * 0.13, c.lines[0][0], { size: c.size * k, t: t - c.from, alpha: 1 - prog(t, c.to - 0.25, c.to) });
  }
  endCard(ctx, t, W, H, { icon: st.icon, from: END.from, tile: st.tile });
}
