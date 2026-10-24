// The shared spec for the engine spikes: one anime-cel pocket-watch close-up, 4 s at 30 fps, 1080x1920. The canvas 2D and
// WebGL scenes import it; the Blender script reads watch_shot.json, written by `node video/spikes/watch_shot.mjs --json`.
export const SHOT = {
  duration: 4, fps: 30, w: 1080, h: 1920,
  push: { from: 0, to: 2.3, zoom: [1, 1.35] },       // slow camera push on the face
  flash: { frames: [69, 70] },                         // 2.3 s and 2.333 s (a still at 2.35 s is frame 70): palette inverted, speed lines
  hold: { from: 2.4, to: 4 },                          // rabbit in silhouette at the frame edge
  tick: { dur: 0.15 },                                 // the second hand snaps once a second
  hands: { hour: 304, minute: 48 },                    // degrees: 10:08
  // y-down screen offset of the circle that carves the one hard cel shadow out of the face, in watch radii
  shadow: { dx: -0.16, dy: -0.2 },
  palette: { paper: "#d9d2c3", ink: "#26211e", case: "#8a8478", face: "#ece5d3", shade: "#b9b09c", red: "#c8372d" },
  grain: { alpha: 0.1, seed: 5 },
};

export const flashAt = t => SHOT.flash.frames.includes(Math.floor(t * SHOT.fps + 1e-6));

const clamp01 = x => Math.max(0, Math.min(1, x));
const ease = x => x * x * (3 - 2 * x);

// Camera zoom: eased push over the first 2.3 s, then held.
export const zoomAt = t => {
  const { from, to, zoom } = SHOT.push;
  return zoom[0] + (zoom[1] - zoom[0]) * ease(clamp01((t - from) / (to - from)));
};

// Second-hand angle in degrees: a snap with a small overshoot at each whole second.
export const secondAngle = t => {
  const f = clamp01((t % 1) / SHOT.tick.dur);
  return (Math.floor(t) + ease(f) + 0.12 * Math.sin(f * Math.PI) * (1 - f)) * 6;
};

if (typeof process !== "undefined" && process.argv?.includes("--json")) {
  const { writeFileSync } = await import("node:fs");
  const out = new URL("./watch_shot.json", import.meta.url);
  writeFileSync(out, JSON.stringify(SHOT, null, 2) + "\n");
  console.log(`wrote ${out.pathname}`);
}
