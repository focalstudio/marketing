// Engine spike helper: just the rabbit silhouette on a transparent canvas, so `render.mjs spike_rabbit --preview DIR "0"`
// exports the PNG the Blender spike composites.
import { rabbitSilhouette } from "../../spikes/rabbit.mjs";

export const DURATION = 1, COVER = 0, SCENES = [], CAPTIONS = [], END = null;
export const SOUND = { drips: 0, easeFrom: 0, rumble: 99 };

export const setup = (doc, W, H) => ({ rabbit: rabbitSilhouette(doc, W, H) });
export function draw(ctx, t, W, H, st) {
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(st.rabbit, 0, 0);
}
