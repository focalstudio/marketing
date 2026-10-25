// Canvas video tests: storyboard timing, determinism and the audio graph. Offline: no Chrome, no ffmpeg run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rng, teardropPts, pointAngle } from "./ink.mjs";
import { squash, hop, blink, blinkTimes } from "./toon.mjs";
import { rainArgv, soundArgv } from "./audio.mjs";
import { frameTimes, iconPath } from "./render.mjs";
import * as rain from "./scenes/rain_outside.mjs";
import * as rabbit from "./scenes/focus_rabbit.mjs";
import * as last25 from "./scenes/last25.mjs";
import { snap, makeLines } from "./cel.mjs";

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

test("last25: hook from frame 0, captions inside the video and apart, end card after them", () => {
  assert.equal(last25.CAPTIONS[0].from, 0);
  const cs = [...last25.CAPTIONS].sort((a, b) => a.from - b.from);
  cs.forEach((c, i) => {
    assert.ok(c.from < c.to && c.to <= last25.DURATION);
    if (i) assert.ok(cs[i - 1].to <= c.from);
  });
  assert.ok(cs.at(-1).to <= last25.END.from && last25.END.from < last25.DURATION);
  for (let i = 1; i < last25.SCENES.length; i++) assert.ok(last25.SCENES[i].from <= last25.SCENES[i - 1].to, last25.SCENES[i].name);
  assert.equal(last25.SCENES.at(-1).to, last25.DURATION);
});

test("last25: the impact is two frames, shows its caption and has the thunder on it", () => {
  assert.equal(last25.FLASH.length, 2);
  assert.equal(last25.FLASH[1], last25.FLASH[0] + 1);
  const hit = last25.CAPTIONS.find(c => c.hit);
  assert.ok(hit.from <= last25.IMPACT && last25.IMPACT < hit.to);
  const argv = soundArgv("/o.wav", last25.DURATION, last25.SOUND), fg = argv[argv.indexOf("-filter_complex") + 1];
  assert.ok(!fg.includes("afade=t=in"));
  for (const b of last25.SOUND.beats) assert.ok(fg.includes(`adelay=${Math.round(b * 1000)}|`), `beat ${b}`);
  assert.deepEqual(argv, soundArgv("/o.wav", last25.DURATION, last25.SOUND));
});

test("last25: the watch reads 10:08 until the lapse, then the minute hand sweeps 25 minutes", () => {
  assert.deepEqual(last25.clock(5), { sec: snap(5), min: 48, hour: 304 });
  const end = last25.clock(last25.LAPSE.to);
  assert.ok(Math.abs(end.min - 198) < 1e-9 && Math.abs(end.hour - 316.5) < 1e-9);
  assert.ok(last25.clock(10).min > last25.clock(9).min);
});

test("cel: the second hand snaps once a second and the speed lines are seeded", () => {
  assert.equal(Math.round(snap(3.0) * 1000) / 1000, 18);
  assert.ok(snap(3.5) > 18 && snap(3.5) <= 24.001);
  assert.deepEqual(makeLines(5), makeLines(5));
  assert.equal(makeLines(5).length, 28);
});
