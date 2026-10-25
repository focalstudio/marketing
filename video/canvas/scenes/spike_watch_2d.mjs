// Engine spike, canvas 2D baseline: the shared pocket-watch shot (video/spikes/watch_shot.mjs) with a clip-path cel shadow,
// tapered ink polygons, seeded grain, an inverted-palette flash and radial speed lines. Every frame is a pure function of t.
import { rng, prog, easeOut } from "../ink.mjs";
import { rabbitSilhouette } from "../../spikes/rabbit.mjs";
import { SHOT, flashAt, zoomAt, secondAngle } from "../../spikes/watch_shot.mjs";

export const DURATION = SHOT.duration, COVER = 0.5;
export const SCENES = [{ name: "watch", from: 0, to: DURATION }];
export const CAPTIONS = [];
export const END = null;
// The renderer needs a sound; this is the quietest existing bed (rain, no drips). The spike video is not silent.
export const SOUND = { drips: 0, easeFrom: 2, rumble: 99 };

const P = SHOT.palette, TAU = Math.PI * 2;
const invert = hex => "#" + hex.slice(1).match(/../g).map(h => (255 - parseInt(h, 16)).toString(16).padStart(2, "0")).join("");
const pal = flash => flash ? Object.fromEntries(Object.entries(P).map(([k, v]) => [k, invert(v)])) : P;

export function setup(doc, W, H) {
  const g = doc.createElement("canvas");
  g.width = g.height = 256;
  const gx = g.getContext("2d"), img = gx.createImageData(256, 256), r = rng(SHOT.grain.seed);
  for (let i = 0; i < img.data.length; i += 4) img.data[i] = img.data[i + 1] = img.data[i + 2] = r() < 0.5 ? 0 : 255, img.data[i + 3] = 255 * r();
  gx.putImageData(img, 0, 0);
  return { rabbit: rabbitSilhouette(doc, W, H), grain: g, lines: Array.from({ length: 28 }, () => ({ a: r() * TAU, w: 0.01 + r() * 0.035, in: 0.5 + r() * 0.3 })) };
}

// A ring whose outer edge swells towards the lower right: the tapered ink line.
function inkRing(ctx, cx, cy, r, base, swell, c) {
  const n = 120, w = a => base + swell * (0.5 + 0.5 * Math.cos(a - Math.PI / 4));
  ctx.beginPath();
  for (let i = 0; i <= n; i++) { const a = (i / n) * TAU; ctx.lineTo(cx + Math.cos(a) * (r + w(a)), cy + Math.sin(a) * (r + w(a))); }
  ctx.closePath();
  for (let i = n; i >= 0; i--) { const a = (i / n) * TAU; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  ctx.closePath();
  ctx.fillStyle = c;
  ctx.fill("evenodd");
}

// A hand from the centre: a tapered blade with a tail. `grow` fattens it for the ink pass behind the fill.
function blade(ctx, deg, len, tail, w, grow = 0) {
  ctx.save();
  ctx.rotate((deg * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(-(w + grow), tail + grow);
  ctx.lineTo(w + grow, tail + grow);
  ctx.lineTo(w * 0.25, -len - grow);
  ctx.lineTo(-w * 0.25, -len - grow);
  ctx.closePath();
  ctx.restore();
}

export function draw(ctx, t, W, H, st) {
  const flash = flashAt(t), c = pal(flash), k = W / 1080;
  const zoom = zoomAt(t) * (flash ? 1.05 : 1), R = 360 * k * zoom, cx = W / 2, cy = H * 0.47;
  ctx.save();
  ctx.fillStyle = c.paper;
  ctx.fillRect(0, 0, W, H);

  // crown behind the case
  ctx.fillStyle = c.ink;
  ctx.fillRect(cx - 0.14 * R - 5, cy - 1.2 * R - 5, 0.28 * R + 10, 0.24 * R + 10);
  ctx.fillStyle = c.case;
  ctx.fillRect(cx - 0.14 * R, cy - 1.2 * R, 0.28 * R, 0.24 * R);
  ctx.fillStyle = c.red;
  ctx.fillRect(cx - 0.14 * R, cy - 1.2 * R, 0.28 * R, 0.07 * R);

  // case, bezel and face
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = c.case; ctx.fill();
  inkRing(ctx, cx, cy, R, 4 * k, 18 * k * zoom, c.ink);
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.86, 0, TAU); ctx.fillStyle = c.face; ctx.fill();

  // the one hard cel shadow: the face minus a circle shifted towards the light
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.86, 0, TAU); ctx.clip();
  ctx.beginPath();
  ctx.rect(cx - R, cy - R, 2 * R, 2 * R);
  ctx.arc(cx + SHOT.shadow.dx * R, cy + SHOT.shadow.dy * R, R * 0.86, 0, TAU, true);
  ctx.fillStyle = c.shade; ctx.fill("evenodd");
  ctx.restore();
  inkRing(ctx, cx, cy, R * 0.86, 3 * k, 6 * k * zoom, c.ink);

  // hour marks
  ctx.fillStyle = c.ink;
  for (let i = 0; i < 12; i++) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate((i * TAU) / 12);
    ctx.fillRect(-R * (i % 3 ? 0.012 : 0.022), -R * 0.8, R * (i % 3 ? 0.024 : 0.044), R * (i % 3 ? 0.07 : 0.12));
    ctx.restore();
  }

  // hands: ink pass, then fill
  for (const [deg, len, w, tail] of [[SHOT.hands.hour, 0.45, 0.06, 0.07], [SHOT.hands.minute, 0.7, 0.04, 0.08]]) {
    ctx.save(); ctx.translate(cx, cy);
    blade(ctx, deg, len * R, tail * R, w * R, 5 * k); ctx.fillStyle = c.ink; ctx.fill();
    blade(ctx, deg, len * R, tail * R, w * R); ctx.fillStyle = c.case; ctx.fill();
    ctx.restore();
  }
  ctx.save(); ctx.translate(cx, cy);
  blade(ctx, secondAngle(t), 0.78 * R, 0.18 * R, 0.014 * R, 4 * k); ctx.fillStyle = c.ink; ctx.fill();
  blade(ctx, secondAngle(t), 0.78 * R, 0.18 * R, 0.014 * R); ctx.fillStyle = c.red; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, 0.05 * R, 0, TAU); ctx.fillStyle = c.red; ctx.fill();
  ctx.restore();

  // impact: speed lines out of the centre
  if (flash) {
    for (const l of st.lines) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(l.a - l.w) * R * l.in * 2, cy + Math.sin(l.a - l.w) * R * l.in * 2);
      ctx.lineTo(cx + Math.cos(l.a) * H, cy + Math.sin(l.a) * H);
      ctx.lineTo(cx + Math.cos(l.a + l.w) * R * l.in * 2, cy + Math.sin(l.a + l.w) * R * l.in * 2);
      ctx.closePath(); ctx.fillStyle = c.ink; ctx.fill();
    }
  }

  // the rabbit, in silhouette at the lower-right edge, fading in over the hold
  const a = easeOut(prog(t, SHOT.hold.from, SHOT.hold.from + 0.5));
  if (a > 0) { ctx.globalAlpha = a; ctx.drawImage(st.rabbit, (1 - a) * 80 * (W / 1080), 0); ctx.globalAlpha = 1; }

  // grain, offset each frame
  const f = Math.floor(t * SHOT.fps + 1e-6), r = rng(f + 1);
  ctx.globalAlpha = SHOT.grain.alpha; ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(st.grain, "repeat");
  ctx.translate(Math.floor(r() * 256), Math.floor(r() * 256));
  ctx.fillRect(-256, -256, W + 256, H + 256);
  ctx.restore();
}
