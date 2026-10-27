// Style demo: wet-on-wet watercolour. Pastel greens and warm yellow washes bleed into each other on cream paper, pigment
// pools at the edges, blooms and splatters break the colour up, a masked white border frames the sheet. The rabbit and the
// timer (video/canvas/paint.mjs) are the shared demo subject. Render: `node scripts/gallery.mjs previews --only watercolor`.
import { rng, paperGrain } from "../ink.mjs";
import { mix } from "../cel.mjs";
import { LAY, TIMER, TAU, life, rabbit, wobblyPts, smooth, speckle } from "../paint.mjs";

export const DURATION = 3, COVER = 1.5;
export const SOUND = { kind: "intro", close: 2.5 };
export const CAPTIONS = [], SCENES = [];

const PAPER = "#f8f3e6", PIGMENT = { sage: "#9fcf8f", leaf: "#7fb77a", moss: "#5f9a68", butter: "#f6d86a", lemon: "#f1e48d", mint: "#bfe3cf", fur: "#f3cba0", fur2: "#d9a77a", rose: "#f1a3a0", ink: "#4f7a5c" };

export function setup(doc, W, H) {
  return { paper: paperGrain(doc, W, H, 23), grit: speckle(doc, W, H, { seed: 5, color: PAPER, n: 90000, min: 0.8, max: 2.6, alpha: [0.15, 0.55] }) };
}

// A wash: a few offset, blurred, translucent copies of the shape glazed on top of each other (multiply, like real pigment),
// then a darker rim pooled just inside the edge, where watercolour dries heavier.
function wash(ctx, g, color, { seed = 1, layers = 3, alpha = 0.2, blur = 5, pool = 0.4, amp = 0.07, drift = 8 } = {}) {
  const r = rng(seed);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = color;
  let main;
  for (let i = 0; i < layers; i++) {
    const pts = wobblyPts(g.cx + (r() - 0.5) * drift * 2, g.cy + (r() - 0.5) * drift * 2, g.rx * (1 + (r() - 0.5) * 0.08), g.ry * (1 + (r() - 0.5) * 0.08), (g.rot || 0) + (r() - 0.5) * 0.06, { seed: seed * 13 + i, amp });
    ctx.filter = `blur(${blur * (0.6 + r() * 0.8)}px)`;
    ctx.globalAlpha = alpha;
    smooth(ctx, pts);
    ctx.fill();
    main = pts;
  }
  if (pool) {
    ctx.save();
    smooth(ctx, main);
    ctx.clip();
    ctx.filter = `blur(${Math.max(1.2, blur * 0.3)}px)`;
    ctx.globalAlpha = pool;
    ctx.strokeStyle = mix(color, "#3d5a3a", 0.3);
    ctx.lineWidth = Math.max(6, blur * 2.4);
    smooth(ctx, main);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// A bloom (backrun): water dropped into a drying wash pushes the pigment back, leaving a pale lumpy patch with a dark rim.
function bloom(ctx, cx, cy, rad, seed, color) {
  const pts = wobblyPts(cx, cy, rad, rad * 0.8, seed, { seed, amp: 0.18, n: 30 });
  ctx.save();
  ctx.filter = "blur(12px)";
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = PAPER;
  smooth(ctx, pts);
  ctx.fill();
  ctx.filter = "blur(1.6px)";
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = mix(color, "#3d5a3a", 0.35);
  ctx.lineWidth = 5;
  smooth(ctx, pts);
  ctx.stroke();
  ctx.restore();
}

// One brush stroke: a curved line whose width swells and thins, wobbling as the hand does.
function brush(ctx, x0, y0, x1, y1, w, color, alpha, seed) {
  const r = rng(seed), bx = (x0 + x1) / 2 + (r() - 0.5) * 40, by = (y0 + y1) / 2 + (r() - 0.5) * 30;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.filter = "blur(1.2px)";
  for (let i = 0; i < 6; i++) {
    const u0 = i / 6, u1 = (i + 1) / 6, q = (u, a, b, c) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = w * (0.45 + 0.55 * Math.sin(((u0 + u1) / 2) * Math.PI)) * (0.85 + 0.3 * r());
    ctx.beginPath();
    ctx.moveTo(q(u0, x0, bx, x1), q(u0, y0, by, y1));
    ctx.lineTo(q(u1, x0, bx, x1), q(u1, y0, by, y1));
    ctx.stroke();
  }
  ctx.restore();
}

export function draw(ctx, t, W, H, st) {
  const k = W / 1080, L = life(t), R = rabbit(t, L), r = rng(77);
  ctx.save();
  ctx.scale(k, k);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, 1080, 1920);

  // sky: yellow glow top right bleeding into mint and green, with blooms where the water ran back
  wash(ctx, { cx: 540, cy: 520, rx: 760, ry: 620 }, PIGMENT.mint, { seed: 2, layers: 4, alpha: 0.2, blur: 22, pool: 0, amp: 0.05, drift: 30 });
  wash(ctx, { cx: 800, cy: 330, rx: 440, ry: 330 }, PIGMENT.butter, { seed: 3, layers: 4, alpha: 0.2, blur: 26, pool: 0, amp: 0.08, drift: 24 });
  wash(ctx, { cx: 250, cy: 760, rx: 430, ry: 260 }, PIGMENT.lemon, { seed: 4, layers: 3, alpha: 0.2, blur: 20, pool: 0, drift: 24 });
  wash(ctx, { cx: 160, cy: 200, rx: 380, ry: 240 }, PIGMENT.sage, { seed: 5, layers: 3, alpha: 0.16, blur: 20, pool: 0, drift: 24 });
  bloom(ctx, 420, 360, 90, 11, PIGMENT.mint);
  bloom(ctx, 900, 760, 70, 12, PIGMENT.butter);
  bloom(ctx, 190, 560, 55, 13, PIGMENT.lemon);
  wash(ctx, { cx: 840, cy: 250, rx: 120, ry: 112 }, PIGMENT.butter, { seed: 6, layers: 3, alpha: 0.3, blur: 6, pool: 0.45 });  // the sun
  wash(ctx, { cx: 250 + 40 * t, cy: 430, rx: 190, ry: 62 }, PIGMENT.mint, { seed: 7, layers: 3, alpha: 0.22, blur: 12, pool: 0.12 });  // a cloud, drifting
  wash(ctx, { cx: 360 + 40 * t, cy: 405, rx: 130, ry: 50 }, PIGMENT.mint, { seed: 8, layers: 2, alpha: 0.2, blur: 12, pool: 0.1 });

  // hills and meadow
  wash(ctx, { cx: 260, cy: 1345, rx: 760, ry: 150 }, "#a9d3a0", { seed: 9, layers: 3, alpha: 0.28, blur: 14, pool: 0.15 });
  wash(ctx, { cx: 900, cy: 1370, rx: 560, ry: 110 }, "#c4de9c", { seed: 10, layers: 3, alpha: 0.28, blur: 14, pool: 0.15 });
  wash(ctx, { cx: 540, cy: 1660, rx: 800, ry: 350 }, PIGMENT.sage, { seed: 14, layers: 4, alpha: 0.26, blur: 16, pool: 0.15, drift: 14 });
  wash(ctx, { cx: 420, cy: 1790, rx: 640, ry: 190 }, PIGMENT.leaf, { seed: 15, layers: 3, alpha: 0.22, blur: 16, pool: 0.12 });
  wash(ctx, { cx: 880, cy: 1560, rx: 330, ry: 160 }, PIGMENT.lemon, { seed: 16, layers: 3, alpha: 0.26, blur: 16, pool: 0.12 });
  bloom(ctx, 620, 1700, 80, 17, PIGMENT.sage);
  bloom(ctx, 170, 1560, 60, 18, PIGMENT.sage);
  for (let i = 0; i < 26; i++) {  // grass strokes
    const x = 40 + r() * 1000, y = 1380 + r() * 480;
    brush(ctx, x, y, x + (r() - 0.5) * 36, y - 40 - r() * 50, 9 + r() * 8, r() < 0.7 ? PIGMENT.moss : PIGMENT.leaf, 0.35, 100 + i);
  }
  [[120, 1500], [940, 1640], [700, 1810], [260, 1740]].forEach(([x, y], i) => {  // dandelions
    wash(ctx, { cx: x, cy: y, rx: 20, ry: 18 }, "#f2c94c", { seed: 30 + i, layers: 2, alpha: 0.5, blur: 2, pool: 0.4 });
    brush(ctx, x, y + 14, x + 8, y + 90, 7, PIGMENT.moss, 0.4, 40 + i);
  });

  // the rabbit: shadow, then glazes of warm cream with a darker pass lower right
  const sh = R.shadow;
  wash(ctx, { cx: sh.x, cy: sh.y + 4, rx: sh.rx, ry: sh.ry }, "#7f9a78", { seed: 21, layers: 3, alpha: 0.3 * sh.a, blur: 8, pool: 0.15 });
  for (const p of R.parts) {
    const base = p.id === "tail" ? "#e6eadb" : PIGMENT.fur;
    wash(ctx, p, base, { seed: 50 + p.id.length * 7 + Math.round(p.cx) % 5, layers: 3, alpha: p.id === "haunch" ? 0.12 : p.id === "body" || p.id === "head" ? 0.5 : 0.5, blur: 4, pool: 0.5, amp: 0.05, drift: 5 });
    if (["body", "head"].includes(p.id)) wash(ctx, { ...p, cx: p.cx + 12, cy: p.cy + 16, rx: p.rx * 0.8, ry: p.ry * 0.8 }, PIGMENT.fur2, { seed: 90 + p.id.length, layers: 2, alpha: 0.2, blur: 12, pool: 0 });
    if (p.inner) wash(ctx, p.inner, PIGMENT.rose, { seed: 70 + p.id.length, layers: 3, alpha: 0.4, blur: 5, pool: 0.4, amp: 0.08, drift: 3 });
  }
  wash(ctx, { cx: R.cheek.x, cy: R.cheek.y, rx: R.cheek.r * 1.2, ry: R.cheek.r }, PIGMENT.rose, { seed: 81, layers: 2, alpha: 0.4, blur: 9, pool: 0 });
  wash(ctx, { cx: R.nose.x, cy: R.nose.y, rx: R.nose.r, ry: R.nose.r * 0.8 }, "#d7807a", { seed: 82, layers: 2, alpha: 0.7, blur: 1.5, pool: 0.3 });
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = ctx.strokeStyle = "#45483a";
  ctx.filter = "blur(0.9px)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  if (R.blink > 0.5) {
    ctx.beginPath();
    ctx.arc(R.eye.x, R.eye.y - 2, R.eye.r * 0.9, 0.15 * TAU * 0.5, TAU * 0.45);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(R.eye.x, R.eye.y, R.eye.r, R.eye.r * (1 - 0.6 * R.blink), 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // the timer: a butter-yellow dial, its face lifted with a bloom, a green ring that fills, two little feet
  const { tx, ty, tr } = LAY;
  wash(ctx, { cx: tx - 90, cy: ty + tr + 4, rx: 28, ry: 22 }, PIGMENT.moss, { seed: 91, layers: 2, alpha: 0.4, blur: 2, pool: 0.3 });
  wash(ctx, { cx: tx + 90, cy: ty + tr + 4, rx: 28, ry: 22 }, PIGMENT.moss, { seed: 92, layers: 2, alpha: 0.4, blur: 2, pool: 0.3 });
  wash(ctx, { cx: tx, cy: ty - tr - 18, rx: 34, ry: 26 }, PIGMENT.moss, { seed: 93, layers: 2, alpha: 0.4, blur: 2, pool: 0.3 });
  wash(ctx, { cx: tx, cy: ty, rx: tr, ry: tr * 0.99 }, PIGMENT.butter, { seed: 94, layers: 4, alpha: 0.42, blur: 6, pool: 0.5, amp: 0.025, drift: 6 });
  wash(ctx, { cx: tx - 6, cy: ty - 4, rx: tr * 0.8, ry: tr * 0.78 }, PAPER, { seed: 95, layers: 2, alpha: 0.5, blur: 14, pool: 0, drift: 5 });
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.lineCap = "round";
  for (let pass = 0; pass < 2; pass++) {
    ctx.filter = pass ? "blur(1.5px)" : "blur(5px)";
    ctx.globalAlpha = pass ? 0.65 : 0.4;
    ctx.strokeStyle = "#6fae7f";
    ctx.lineWidth = pass ? 24 : 32;
    ctx.beginPath();
    ctx.arc(tx + pass * 2, ty - pass * 2, tr * 0.88, -TAU / 4, -TAU / 4 + L.ring * TAU);
    ctx.stroke();
  }
  ctx.filter = "blur(4px)";
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = PIGMENT.ink;
  ctx.font = "900 124px Nunito";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(TIMER, tx + 6, ty + 14);
  ctx.filter = "blur(0.9px)";
  ctx.globalAlpha = 0.85;
  ctx.fillText(TIMER, tx, ty + 8);
  ctx.globalAlpha = 0.35;
  ctx.fillText(TIMER, tx + 2, ty + 10);
  ctx.restore();

  // splatters: a flick of the loaded brush, a few drops with satellites
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.filter = "blur(0.6px)";
  for (let i = 0; i < 30; i++) {
    const x = r() * 1080, y = r() * 1920, rad = i % 6 === 0 ? 7 + r() * 8 : 1.5 + r() * 4, c = [PIGMENT.moss, "#e8c13c", PIGMENT.leaf][i % 3];
    if (x > 560 && y > 880 && y < 1360) continue;  // keep the timer face clean
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, TAU);
    ctx.fill();
    if (rad > 7) for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(x + (r() - 0.5) * 60, y + (r() - 0.5) * 60, 1.5 + r() * 2.5, 0, TAU); ctx.fill(); }
  }
  ctx.restore();

  // the sheet: pale grit where the pigment skipped the paper's tooth, paper fibres, and the masked white border
  ctx.drawImage(st.grit, 0, 0, 1080, 1920);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(st.paper, 0, 0, 1080, 1920);
  ctx.restore();
  const e = rng(3);
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.rect(0, 0, 1080, 1920);
  const edge = (a, b, f) => { for (let u = a; u <= b; u += 60) f(u, 34 + (e() - 0.5) * 12); };
  ctx.moveTo(36, 36);
  edge(36, 1044, (u, d) => ctx.lineTo(u, d));
  edge(36, 1884, (u, d) => ctx.lineTo(1080 - d, u));
  edge(36, 1044, (u, d) => ctx.lineTo(1080 - u, 1920 - d));
  edge(36, 1884, (u, d) => ctx.lineTo(d, 1920 - u));
  ctx.closePath();
  ctx.fill("evenodd");
  ctx.restore();
}
