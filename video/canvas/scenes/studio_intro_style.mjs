// Style sheet for studio_intro (review gate 1): one frame with the bunny in its poses, props, a keyword, the app's
// low-poly cards and the page colours. Render it with `node video/canvas/render.mjs studio_intro_style --preview DIR 0`.
import { PAL, bunny, phone, snail, keyword, rarityCard, sparkle } from "../kawaii.mjs";

export const DURATION = 1, ANIMALS = ["rabbit", "fox", "otter", "orangutan"];
export const SOUND = { kind: "intro", close: 0.5 };
export const CAPTIONS = [], SCENES = [];

export function setup(doc, W, H, { animals }) { return { animals }; }

const RARITY = { common: ["#9ca3af", "Common"], uncommon: ["#4caf50", "Uncommon"], rare: ["#2196f3", "Rare"], legendary: ["#ff9800", "Endangered"] };

export function draw(ctx, t, W, H, st) {
  const k = W / 1080;
  ctx.fillStyle = "#fbe7ec";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.scale(k, k);
  const label = (x, y, s) => { ctx.save(); ctx.font = "800 30px Nunito"; ctx.fillStyle = PAL.plum; ctx.textAlign = "center"; ctx.fillText(s, x, y); ctx.restore(); };

  // palette of pages
  ["#f7c6d0", PAL.mint, PAL.peach, PAL.sky, PAL.butter].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(60 + i * 192, 40, 168, 70, 18); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = PAL.plum; ctx.stroke(); });

  // poses
  const row = 600, sc = 0.52;
  [["back", {}, "back"], ["over", { ear: 0.25 }, "over the shoulder"], ["front", {}, "front"], ["front", { blink: 1 }, "blink"], ["front", { v: 0.1, y: -90 }, "hop"]].forEach(([face, o, name], i) => {
    const x = 130 + i * 205;
    bunny(ctx, { x, y: row + (o.y || 0), s: sc, face, ear: o.ear || 0, blink: o.blink || 0, v: o.v || 0 });
    label(x, row + 56, name);
  });

  // keyword on mint
  ctx.fillStyle = PAL.mint;
  ctx.fillRect(0, 700, 1080, 260);
  keyword(ctx, 1080, 830, "Calm", { size: 190 });
  bunny(ctx, { x: 910, y: 930, s: 0.45, face: "front" });

  // props on sky
  ctx.fillStyle = PAL.sky;
  ctx.fillRect(0, 960, 1080, 330);
  phone(ctx, { x: 200, y: 1130, s: 0.75, t: 0.4 });
  bunny(ctx, { x: 500, y: 1250, s: 0.46, face: "back" });
  snail(ctx, { x: 830, y: 1250, s: 1.1, t: 0.2 });
  label(200, 1300, "phone"); label(830, 1300, "snail");

  // the app's animals, low-poly, on rarity cards
  ctx.fillStyle = PAL.peach;
  ctx.fillRect(0, 1320, 1080, 600);
  [["rabbit", "common"], ["fox", "uncommon"], ["otter", "rare"]].forEach(([id, r], i) => {
    rarityCard(ctx, { img: st.animals[id], cx: 125 + i * 215, cy: 1540, w: 195, h: 270, color: RARITY[r][0], label: RARITY[r][1], t });
  });
  rarityCard(ctx, { img: st.animals.orangutan, cx: 840, cy: 1590, w: 340, h: 450, color: RARITY.legendary[0], label: RARITY.legendary[1], glow: true, t: 0.9 });
  sparkle(ctx, 60, 1340, 22, "#fff", 0.8);
  label(540, 1895, "The app's own low-poly animals, framed in the app's rarity colours");
  ctx.restore();
}
