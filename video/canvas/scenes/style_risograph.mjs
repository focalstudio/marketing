// Style demo: two-ink risograph print. Only fluorescent pink and teal on off-white paper: each ink is its own layer,
// drawn solid or as halftone dots, knocked out where the paper should show, then printed with multiply and a slight
// misregistration, so overlaps go dark and edges show thin gaps. Grain eats holes in the ink. The rabbit and the timer
// (video/canvas/paint.mjs) are the shared demo subject. Render: `node scripts/gallery.mjs previews --only risograph`.
import { rng, clamp, paperGrain } from "../ink.mjs";
import { LAY, TIMER, TAU, life, rabbit, speckle } from "../paint.mjs";

export const DURATION = 3, COVER = 1.5;
export const SOUND = { kind: "intro", close: 2.5 };
export const CAPTIONS = [], SCENES = [];

const PAPER = "#f3efe4", PINK = "#ff48b0", TEAL = "#00838a", SHIFT = [6, -4];

export function setup(doc, W, H) {
  const layer = () => { const c = doc.createElement("canvas"); c.width = W; c.height = H; return c; };
  return { pink: layer(), teal: layer(), paper: paperGrain(doc, W, H, 31), grit: speckle(doc, W, H, { seed: 9, color: "#fff", n: 110000, min: 0.8, max: 2.4, alpha: [0.25, 0.9] }) };
}

const ell = p => g => { g.beginPath(); g.ellipse(p.cx, p.cy, p.rx, p.ry, p.rot || 0, 0, TAU); };
const rect = (x0, y0, x1, y1) => g => { g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); };
const circ = (x, y, r) => g => { g.beginPath(); g.arc(x, y, r, 0, TAU); };

// Halftone: a rotated grid of dots clipped to area(g), each dot sized by tone(x, y) from 0 (none) to 1 (they merge).
function dots(g, area, box, tone, { pitch = 15, angle = 0.26 } = {}) {
  const [x0, y0, x1, y1] = box, c = Math.cos(angle), s = Math.sin(angle), R = Math.hypot(x1 - x0, y1 - y0) / 2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  g.save();
  area(g);
  g.clip();
  g.beginPath();
  for (let j = -R; j <= R; j += pitch) {
    for (let i = -R; i <= R; i += pitch) {
      const x = cx + i * c - j * s, y = cy + i * s + j * c;
      if (x < x0 - pitch || x > x1 + pitch || y < y0 - pitch || y > y1 + pitch) continue;
      const v = tone(x, y);
      if (v <= 0.03) continue;
      const r = pitch * 0.75 * Math.sqrt(Math.min(v, 1));
      g.moveTo(x + r, y);
      g.arc(x, y, r, 0, TAU);
    }
  }
  g.fill();
  g.restore();
}
const fill = (g, area, color) => { g.fillStyle = color; area(g); g.fill(); };
const knock = (g, area) => { g.save(); g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000"; area(g); g.fill(); g.restore(); };
// A paper gap around a shape, so the print has the thin white halo a misregistered flat leaves.
const halo = (g, area, w) => { g.save(); g.globalCompositeOperation = "destination-out"; g.strokeStyle = g.fillStyle = "#000"; g.lineWidth = w; area(g); g.stroke(); g.fill(); g.restore(); };

export function draw(ctx, t, W, H, st) {
  const k = W / 1080, L = life(t), R = rabbit(t, L), r = rng(41), { tx, ty, tr, ground } = LAY;
  const P = st.pink.getContext("2d"), T = st.teal.getContext("2d");
  for (const g of [P, T]) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.scale(k, k); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; }

  // --- teal ink: hills, meadow, the sun, grass ---
  T.fillStyle = TEAL;
  const hills = g => { g.beginPath(); g.moveTo(0, 1500); for (let x = 0; x <= 1080; x += 30) g.lineTo(x, 1250 + 38 * Math.sin(x / 150) + 24 * Math.sin(x / 61 + 1)); g.lineTo(1080, 1500); g.closePath(); };
  dots(T, hills, [0, 1180, 1080, 1500], () => 0.34, { pitch: 20, angle: 0.5 });
  dots(T, rect(0, ground, 1080, 1920), [0, ground, 1080, 1920], (x, y) => 0.5 + 0.3 * (y - ground) / (1920 - ground), { pitch: 15, angle: 0.26 });
  for (let i = 0; i < 34; i++) {  // grass tufts knocked out of the meadow dots
    const x = 40 + r() * 1000, y = ground + 90 + r() * 440;
    T.save();
    T.globalCompositeOperation = "destination-out";
    T.strokeStyle = "#000";
    T.lineWidth = 7;
    T.lineCap = "round";
    T.beginPath();
    [-14, 0, 14].forEach((d, j) => { T.moveTo(x + d, y); T.lineTo(x + d * 1.6, y - 34 + Math.abs(d) * 0.9 - j); });
    T.stroke();
    T.restore();
  }
  fill(T, circ(830, 300, 112), TEAL);

  // --- pink ink: the sky, a drifting cloud, flowers ---
  P.fillStyle = PINK;
  dots(P, rect(0, 0, 1080, ground + 6), [0, 0, 1080, ground], (x, y) => 0.75 - 0.78 * y / ground, { pitch: 16, angle: 0.26 });
  halo(P, circ(830, 300, 112), 40);
  const cx = 520 + 60 * t;
  [[0, 0, 80], [90, -26, 62], [-84, 14, 58], [160, 16, 52]].forEach(([dx, dy, rad]) => knock(P, circ(cx + dx, 600 + dy, rad)));
  [[130, 1560], [900, 1700], [520, 1830], [250, 1700], [960, 1480]].forEach(([x, y], i) => {
    knock(T, circ(x, y, 46));
    fill(P, circ(x, y, 40), PINK);
    knock(P, circ(x, y, 14));
    if (i % 2) fill(T, circ(x, y, 9), TEAL);
  });

  // --- the rabbit: paper halo, solid pink, teal halftone shading from the upper-left light, eye and nose in teal ---
  const sh = R.shadow;
  T.fillStyle = TEAL;
  dots(T, ell({ cx: sh.x, cy: sh.y, rx: sh.rx, ry: sh.ry }), [sh.x - sh.rx, sh.y - sh.ry, sh.x + sh.rx, sh.y + sh.ry], () => 0.95 * sh.a, { pitch: 9, angle: 0.8 });
  for (const p of R.parts) halo(P, ell(p), 26), halo(T, ell(p), 26);
  for (const p of R.parts) {
    const tail = p.id === "tail";
    knock(T, ell(p));
    if (tail) { knock(P, ell(p)); } else { fill(P, ell(p), PINK); }
    const big = Math.max(p.rx, p.ry);
    T.fillStyle = TEAL;
    dots(T, ell(p), [p.cx - big, p.cy - big, p.cx + big, p.cy + big], (x, y) => clamp((((x - p.cx) * 0.55 + (y - p.cy) * 0.85) / big - 0.12) * (tail ? 0.6 : 0.95)), { pitch: 11, angle: 0.5 });
    if (p.inner) { knock(P, ell(p.inner)); T.fillStyle = TEAL; dots(T, ell(p.inner), [p.cx - big, p.cy - big, p.cx + big, p.cy + big], () => 0.34, { pitch: 9, angle: 0.5 }); }
  }
  knock(P, circ(R.eye.x, R.eye.y, R.eye.r * 1.9));
  knock(T, circ(R.eye.x, R.eye.y, R.eye.r * 1.9));
  T.fillStyle = T.strokeStyle = TEAL;
  if (R.blink > 0.5) { T.lineWidth = 7; T.lineCap = "round"; T.beginPath(); T.arc(R.eye.x, R.eye.y - 3, R.eye.r * 0.9, 0.2 * Math.PI, 0.8 * Math.PI); T.stroke(); }
  else { T.beginPath(); T.ellipse(R.eye.x, R.eye.y, R.eye.r, R.eye.r * (1 - 0.7 * R.blink), 0, 0, TAU); T.fill(); }
  T.beginPath(); T.arc(R.nose.x, R.nose.y, R.nose.r, 0, TAU); T.fill();

  // --- the timer: teal dial with a paper face, a pink ring that fills (overprinting dark), teal digits ---
  [[-82, 1], [82, 1]].forEach(([dx]) => { halo(P, circ(tx + dx, ty + tr + 8, 30), 14); fill(T, circ(tx + dx, ty + tr + 8, 30), TEAL); });
  halo(P, circ(tx, ty, tr), 28);
  halo(T, circ(tx, ty, tr), 28);
  fill(T, circ(tx, ty - tr - 16, 30), TEAL);
  fill(T, circ(tx, ty, tr), TEAL);
  knock(T, circ(tx, ty, tr * 0.82));
  P.fillStyle = PINK;
  dots(P, circ(tx, ty, tr * 0.82), [tx - tr, ty - tr, tx + tr, ty + tr], (x, y) => y < ty + 60 ? 0 : clamp(((x - tx) * 0.3 + (y - ty) * 0.9) / tr * 0.5 - 0.1), { pitch: 10, angle: 0.8 });
  for (const [g, ink] of [[T, null], [P, PINK]]) {
    g.save();
    if (!ink) g.globalCompositeOperation = "destination-out";
    g.strokeStyle = ink || "#000";
    g.lineWidth = 26;
    g.beginPath();
    g.arc(tx, ty, tr * 0.91, -TAU / 4, -TAU / 4 + L.ring * TAU);
    g.stroke();
    g.restore();
  }
  T.fillStyle = TEAL;
  T.font = "900 112px Nunito";
  T.textAlign = "center";
  T.textBaseline = "middle";
  T.fillText(TIMER, tx, ty + 8);

  // --- print: grain eats holes in each ink, then the layers go down on the paper with a misregistered teal ---
  for (const [g, o] of [[P, [0, 0]], [T, [37, 91]]]) {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "destination-out";
    g.drawImage(st.grit, o[0], o[1], W, H);
    g.drawImage(st.grit, -o[0], -o[1], W, H);
    g.restore();
  }
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.95;
  ctx.drawImage(st.pink, 0, 0);
  ctx.drawImage(st.teal, SHIFT[0] * k, SHIFT[1] * k);
  ctx.globalAlpha = 0.6;
  ctx.drawImage(st.paper, 0, 0);
  ctx.restore();
}
