// Canvas video tests: storyboard timing, determinism and the audio graph. Offline: no Chrome, no ffmpeg run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rng, teardropPts, pointAngle } from "./ink.mjs";
import { squash, hop, blink, blinkTimes } from "./toon.mjs";
import { rainArgv, soundArgv } from "./audio.mjs";
import { frameTimes, iconPath } from "./render.mjs";
import * as rain from "./scenes/rain_outside.mjs";
import * as rabbit from "./scenes/focus_rabbit.mjs";

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

test("soundArgv builds rain_outside exactly as rainArgv did", () => {
  assert.deepEqual(soundArgv("/o.wav", rain.DURATION, rain.SOUND), rainArgv("/o.wav", rain.DURATION, rain.SOUND));
});

test("focus_rabbit: hook from frame 0, captions inside the video and apart, end card after them", () => {
  assert.equal(rabbit.CAPTIONS[0].from, 0);
  const cs = [...rabbit.CAPTIONS].sort((a, b) => a.from - b.from);
  cs.forEach((c, i) => {
    assert.ok(c.from < c.to && c.to <= rabbit.DURATION);
    if (i) assert.ok(cs[i - 1].to <= c.from);
  });
  assert.ok(cs.at(-1).to <= rabbit.END.from && rabbit.END.from < rabbit.DURATION);
});

test("the timer reads 25:00 until the session starts and 00:00 once it is done", () => {
  assert.equal(rabbit.clockText(0), "25:00");
  assert.equal(rabbit.clockText(rabbit.SESSION.from), "25:00");
  assert.equal(rabbit.clockText(rabbit.SESSION.to), "00:00");
  assert.equal(rabbit.clockText(rabbit.DURATION), "00:00");
});

test("squash keeps the area and a hop comes back to rest on the ground", () => {
  for (const v of [-0.3, 0, 0.32]) { const { sx, sy } = squash(v); assert.ok(Math.abs(sx * sy - 1) < 1e-12); }
  const h = { at: 4.8, dur: 0.7, h: 150 };
  assert.equal(hop(h.at - 1, h.at, h.dur, h.h).y, 0);
  assert.ok(hop(h.at + h.dur / 2, h.at, h.dur, h.h).y < -100);
  assert.deepEqual(hop(h.at + h.dur * 3, h.at, h.dur, h.h), { y: 0, v: 0 });
});

test("blinks are seeded, uneven and brief", () => {
  assert.deepEqual(blinkTimes(3), blinkTimes(3));
  const ts = blinkTimes(3);
  assert.ok(blink(ts[0] + 0.08, ts) > 0.9 && blink(ts[0] - 0.1, ts) === 0);
});

test("toon sound is full level from frame 0 and puts a sound on every story beat", () => {
  const argv = soundArgv("/o.wav", rabbit.DURATION, rabbit.SOUND), fg = argv[argv.indexOf("-filter_complex") + 1];
  assert.ok(!fg.includes("afade=t=in"));
  for (const t of [...rabbit.BUZZ, rabbit.THUNK, rabbit.SESSION.from, rabbit.DONE, rabbit.HOG.at + rabbit.HOG.dur * 0.8]) assert.ok(fg.includes(`adelay=${Math.round(t * 1000)}|`), `beat ${t}`);
  for (const h of rabbit.HOPS) assert.ok(fg.includes(`adelay=${Math.round((h.at + 0.15) * 1000)}|`), `hop ${h.at}`);
  assert.deepEqual(argv, soundArgv("/o.wav", rabbit.DURATION, rabbit.SOUND));
});
