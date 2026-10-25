// The house rabbit for the engine spikes: the toon-kit critter as a flat ink silhouette, half off the lower-right edge.
// Built once per scene; the scene fades it in over the hold. The Blender spike gets the same shape as a PNG.
import { critter } from "../canvas/toon.mjs";
import { SHOT } from "./watch_shot.mjs";

export function rabbitSilhouette(doc, W, H) {
  const c = doc.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d"), k = W / 1080;
  critter(g, { species: "rabbit", x: W * 0.82, y: H * 0.985, s: 0.8 * k });
  g.globalCompositeOperation = "source-in";
  g.fillStyle = SHOT.palette.ink;
  g.fillRect(0, 0, W, H);
  return c;
}
