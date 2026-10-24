// Canvas video tests: storyboard timing, determinism and the audio graph. Offline: no Chrome, no ffmpeg run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rng, teardropPts, pointAngle } from "./ink.mjs";
import { rainArgv } from "./audio.mjs";
import { frameTimes, iconPath } from "./render.mjs";
import * as rain from "./scenes/rain_outside.mjs";

test("the hook text is on screen from the first frame and the camera moves by about 3 s", () => {
  assert.equal(rain.CAPTIONS[0].from, 0);
  assert.ok(rain.SCENES[1].from <= 3.3);
});

test("scenes overlap: there is never a frame with nothing drawn", () => {
  for (let i = 1; i < rain.SCENES.length; i++) assert.ok(rain.SCENES[i].from <= rain.SCENES[i - 1].to, rain.SCENES[i].name);
  assert.equal(rain.SCENES.at(-1).to, rain.DURATION);
});

test("captions sit inside the video and do not overlap", () => {
  const cs = [...rain.CAPTIONS].sort((a, b) => a.from - b.from);
  cs.forEach((c, i) => {
    assert.ok(c.from < c.to && c.to <= rain.DURATION);
    if (i) assert.ok(cs[i - 1].to <= c.from);
  });
  assert.ok(cs.at(-1).to <= rain.END.from);
});

test("a drop has its point on top at angle 0 and is taller than wide", () => {
  const pts = teardropPts(0, 0, 10, { tip: 0.6 });
  const ys = pts.map(p => p[1]), xs = pts.map(p => p[0]);
  assert.equal(Math.min(...ys), pts[0][1]);  // the point is the topmost point
  assert.ok(Math.max(...xs) - Math.min(...xs) < Math.max(...ys) - Math.min(...ys));
  const right = teardropPts(0, 0, 10, { tip: 0.6, angle: pointAngle(1, 0) });
  assert.ok(right[0][0] > 9 && Math.abs(right[0][1]) < 1e-9);  // pointAngle(1, 0) points it right
});

test("rng is deterministic", () => {
  const a = rng(42), b = rng(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test("rain starts at full level and lands a plink on each story beat", () => {
  const argv = rainArgv("/o.wav", rain.DURATION, rain.SOUND);
  const fg = argv[argv.indexOf("-filter_complex") + 1];
  assert.ok(!fg.includes("afade=t=in"));
  for (const b of rain.SOUND.beats) assert.ok(fg.includes(`adelay=${Math.round(b * 1000)}|`), `beat ${b}`);
  assert.deepEqual(rainArgv("/o.wav", 30, rain.SOUND), rainArgv("/o.wav", 30, rain.SOUND));
});

test("frame times step at 30 fps over the whole duration", () => {
  const ts = frameTimes(rain.DURATION);
  assert.equal(ts.length, Math.round(rain.DURATION * 30));
  assert.equal(ts[1], 1 / 30);
});

test("the icon path comes from apps/wildfocus.yml", () => {
  assert.match(iconPath(), /\.(png|jpg)$/i);
});
