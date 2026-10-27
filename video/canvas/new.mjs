#!/usr/bin/env node
// Scaffold a canvas video: scenes/<name>.mjs (hook from frame 0, BEATS, shared end card), scenes/<name>_style.mjs (review
// gate 1) and <name>.md (the prompt). Plain files to edit, never overwritten.
//
//   node video/canvas/new.mjs <name> --style toon|cel|ink|kawaii
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// kit: the import line; bg: page colour; sample: one drawn element so the first sheet shows something.
export const STYLES = {
  toon: { kit: `import { COLOR, critter } from "../toon.mjs";`, bg: "COLOR.mint", sample: `critter(ctx, { species: "rabbit", x: W / 2, y: H * 0.62, s: 1.4 * k });` },
  cel: { kit: `import { PAL, speedLines } from "../cel.mjs";`, bg: "PAL.paper", sample: `speedLines(ctx, st.lines, W / 2, H * 0.5, 300 * k, H, PAL.ink);` },
  ink: { kit: `import { PAPER, INK, pen, ellipsePts } from "../ink.mjs";`, bg: "PAPER", sample: `pen(ctx, ellipsePts(W / 2, H * 0.5, 220 * k, 160 * k), { w: 5 * k, color: INK });` },
  kawaii: { kit: `import { PAL, bunny } from "../kawaii.mjs";`, bg: `"#fbe7ec"`, sample: `bunny(ctx, { x: W / 2, y: H * 0.62, s: 0.9 * k });` },
};

const scene = (name, style) => `// "${name}": TODO one line on the premise, in the ${style} look. Every frame is a pure function of t; see ${name}.md for the prompt.
import { prog } from "../ink.mjs";
import { cel, grainPattern, endCard, CLOSING, STORE, makeLines } from "../cel.mjs";
${STYLES[style].kit}

export const DURATION = 15, COVER = 1;
// SOUND.kind picks the ffmpeg builder in audio.mjs: rain (default), toon, city, intro. Each reads its own fields.
export const SOUND = { kind: "rain", beats: [] };
export const SCENES = [{ name: "main", from: 0, to: DURATION }];
export const CAPTIONS = [
  { from: 0, to: 4, lines: [["Hook line."]] },
  { from: 4.5, to: 11.5, lines: [["Second line."]] },
];
export const END = { from: 12, title: "WildFocus", lines: CLOSING, store: STORE };
// Review gate 2: the still for each beat, with the line it carries (node video/canvas/render.mjs ${name} --sheet OUT.png "0.5,5,...").
export const BEATS = [
  { t: 0.5, word: "Hook", say: "What the viewer sees and reads in the first second." },
  { t: 5, word: "Second", say: "The premise, clear by 3 s." },
  { t: 12.5, word: "End card", say: "The shared closing card." },
];

export function setup(doc, W, H, { icon }) {
  return { icon, lines: makeLines(5), tile: grainPattern(doc, 5) };
}

export function draw(ctx, t, W, H, st) {
  const k = W / 1080;
  ctx.fillStyle = ${STYLES[style].bg};
  ctx.fillRect(0, 0, W, H);
  ${STYLES[style].sample}
  for (const c of CAPTIONS) {
    if (t < c.from || t >= c.to) continue;
    cel(ctx, W, H * 0.14, c.lines, { size: (c.size ?? 92) * k, alpha: c.from === 0 ? 1 - prog(t, c.to - 0.1, c.to) : prog(t, c.from, c.from + 0.15) * (1 - prog(t, c.to - 0.2, c.to)) });
  }
  endCard(ctx, t, W, H, { icon: st.icon, from: END.from, tile: st.tile });
}
`;

const styleSheet = (name, style) => `// Style sheet for ${name} (review gate 1): one frame with the characters, props, type and palette. Render it with
// \`node video/canvas/render.mjs ${name}_style --preview DIR 0\`.
import { cel, makeLines } from "../cel.mjs";
${STYLES[style].kit}

export const DURATION = 1;
export const SOUND = { kind: "rain", beats: [] };
export const CAPTIONS = [], SCENES = [];

export function setup() { return { lines: makeLines(5) }; }

export function draw(ctx, t, W, H, st) {
  const k = W / 1080;
  ctx.fillStyle = ${STYLES[style].bg};
  ctx.fillRect(0, 0, W, H);
  ${STYLES[style].sample}
  cel(ctx, W, H * 0.14, [["The type"]], { size: 92 * k });
}
`;

const prompt = (name, style) => `# ${name}: the prompt behind the video

A 15-second vertical video (1080×1920, 30 fps) for WildFocus in the **${style}** look, drawn in canvas code. The scene is
[scenes/${name}.mjs](scenes/${name}.mjs).

- **0-3 s, hook.** Text from frame 0. The premise is clear by 3 s.
- **3-12 s.** The story, one beat per line of \`BEATS\`.
- **12-15 s.** The shared end card (\`endCard\`): icon, WildFocus, "Just focus on / what matters.", "Free on iOS".
- **Sound.** Say which \`SOUND.kind\` and what lands on each beat.
`;

export function files(name, style) {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error(`bad name: ${name} (lowercase words and underscores)`);
  if (!STYLES[style]) throw new Error(`unknown style: ${style} (${Object.keys(STYLES).join(", ")})`);
  return { [`scenes/${name}.mjs`]: scene(name, style), [`scenes/${name}_style.mjs`]: styleSheet(name, style), [`${name}.md`]: prompt(name, style) };
}

export function scaffold(name, style, dir = HERE) {
  const out = files(name, style);
  for (const rel of Object.keys(out)) if (existsSync(join(dir, rel))) throw new Error(`${rel} already exists; not overwriting`);
  for (const [rel, text] of Object.entries(out)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  return Object.keys(out).map(rel => join(dir, rel));
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] || "")) {
  const argv = process.argv.slice(2), at = argv.indexOf("--style");
  const style = at < 0 ? "toon" : argv[at + 1], name = argv.find((a, i) => !a.startsWith("--") && i !== at + 1);
  try {
    for (const f of scaffold(name || "", style)) console.log(f);
  } catch (e) { console.error(e.message); process.exit(1); }
}
