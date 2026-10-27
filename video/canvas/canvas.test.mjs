// Canvas video tests: storyboard timing, determinism and the audio graph. Offline: no Chrome, no ffmpeg run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rng, teardropPts, pointAngle } from "./ink.mjs";
import { squash, hop, blink, blinkTimes } from "./toon.mjs";
import { rainArgv, soundArgv } from "./audio.mjs";
import { frameTimes, iconPath, animalPath } from "./render.mjs";
import * as rain from "./scenes/rain_outside.mjs";
import * as rabbit from "./scenes/focus_rabbit.mjs";
import * as last25 from "./scenes/last25.mjs";
import { snap, makeLines, CLOSING, STORE } from "./cel.mjs";
import { cityArgv, introArgv } from "./audio.mjs";
import * as intro from "./scenes/studio_intro.mjs";
import { mkdtempSync, symlinkSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { STYLES, scaffold } from "./new.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

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

test("last25: the impact is two frames and shows its caption", () => {
  assert.equal(last25.FLASH.length, 2);
  assert.equal(last25.FLASH[1], last25.FLASH[0] + 1);
  const hit = last25.CAPTIONS.find(c => c.hit);
  assert.ok(hit.from <= last25.IMPACT && last25.IMPACT < hit.to);
});

test("last25: city sound at full level from frame 0, cut at the impact, focus bed and ticks after it", () => {
  const argv = soundArgv("/o.wav", last25.DURATION, last25.SOUND), fg = argv[argv.indexOf("-filter_complex") + 1], S = last25.SOUND;
  assert.equal(S.kind, "city");
  assert.ok(!fg.includes("afade=t=in"));
  assert.ok(fg.includes(`max(0,1-(t-${S.impact})/0.12)`), "the street cuts out at the impact");
  for (const t of [S.impact, ...S.ticks, ...S.horns, S.done, S.done + 0.14, S.close]) assert.ok(fg.includes(`adelay=${Math.round(t * 1000)}|`), `beat ${t}`);
  assert.ok(fg.includes(`between(t,${S.lapse.from},${S.lapse.to})`));
  assert.deepEqual(argv, soundArgv("/o.wav", last25.DURATION, last25.SOUND));
  assert.deepEqual(argv, cityArgv("/o.wav", last25.DURATION, S));
});

test("every video ends on the shared card: the closing line and the store line, held for 3 s", () => {
  assert.deepEqual(CLOSING, [["Just focus on"], ["what matters."]]);
  assert.equal(STORE, "Free on iOS");
  assert.deepEqual(last25.END.lines, CLOSING);
  assert.equal(last25.END.store, STORE);
  assert.ok(last25.DURATION - last25.END.from >= 3);
  assert.ok(Math.max(...last25.CAPTIONS.map(c => c.to)) <= last25.END.from);
  assert.equal(last25.SOUND.close, last25.END.from);
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

test("studio_intro: hook from frame 0, captions inside the video and apart, 45 s, end card held for 3 s", () => {
  assert.equal(intro.DURATION, 45);
  assert.equal(intro.CAPTIONS[0].from, 0);
  const cs = [...intro.CAPTIONS].sort((a, b) => a.from - b.from);
  cs.forEach((c, i) => {
    assert.ok(c.from < c.to && c.to <= intro.DURATION);
    if (i) assert.ok(cs[i - 1].to <= c.from);
  });
  assert.ok(cs.at(-1).to <= intro.END.from);
  assert.ok(intro.DURATION - intro.END.from >= 3);
  assert.deepEqual(intro.END.lines, CLOSING);
  assert.equal(intro.END.store, STORE);
  assert.equal(intro.SOUND.close, intro.END.from);
  for (let i = 1; i < intro.SCENES.length; i++) assert.ok(intro.SCENES[i].from <= intro.SCENES[i - 1].to, intro.SCENES[i].name);
  assert.equal(intro.SCENES.at(-1).to, intro.DURATION);
});

test("studio_intro: music only without a voice, music ducked under the voice with one", () => {
  const dry = introArgv("/o.wav", intro.DURATION, { ...intro.SOUND, voice: undefined }), wet = introArgv("/o.wav", intro.DURATION, { ...intro.SOUND, voice: "/v.wav", voiceAt: 0.3 });
  const fgOf = a => a[a.indexOf("-filter_complex") + 1];
  assert.ok(!dry.includes("/v.wav") && !fgOf(dry).includes("sidechaincompress"));
  assert.ok(wet.includes("/v.wav") && fgOf(wet).includes("sidechaincompress"));
  assert.ok(fgOf(wet).includes("adelay=300|300"), "the voice starts at voiceAt");
  assert.ok(fgOf(dry).includes(`adelay=${intro.SOUND.close * 1000}|`), "chime as the end card arrives");
  assert.deepEqual(dry, soundArgv("/o.wav", intro.DURATION, { ...intro.SOUND, voice: undefined }));
});

test("animalPath finds the app's cast PNGs and refuses anything but a plain id", () => {
  assert.ok(animalPath("orangutan").endsWith("/src/assets/animals/orangutan.png"));
  for (const bad of ["../x", "a/b", "Rabbit", "rabbit.png", ""]) assert.throws(() => animalPath(bad), /bad animal id/, bad);
});

test("studio_intro: every review beat falls inside the video, and the app's animals are the ones preloaded", () => {
  for (const b of intro.BEATS) assert.ok(b.t >= 0 && b.t < intro.DURATION, `beat ${b.t}`);
  assert.deepEqual(intro.ANIMALS, ["rabbit", "fox", "otter", "orangutan"]);
});

test("studio_intro: the phone is held, wound up, then thrown off screen with no paws on it", () => {
  const { from, release, to } = intro.THROW, base = 1344;
  assert.ok(from < release && release < to && to <= 5.4);
  const held = intro.phonePose(0, base), start = intro.phonePose(from, base);
  assert.equal(held.held, true);
  assert.deepEqual([held.x, held.y], [start.x, start.y]);
  assert.equal(intro.phonePose(release - 0.01, base).held, true);
  for (const t of [release, (release + to) / 2, to]) assert.equal(intro.phonePose(t, base).held, false, `t ${t}`);
  assert.ok(intro.phonePose(to, base).x > 1080 + 200, "off the right edge by the end of the throw");
  assert.ok(intro.phonePose(to, base).rot > intro.phonePose(release, base).rot, "it spins");
});

test("studio_intro: a whoosh sounds at the release", () => {
  const argv = soundArgv("/o.wav", intro.DURATION, { ...intro.SOUND, voice: undefined }), fg = argv[argv.indexOf("-filter_complex") + 1];
  assert.equal(intro.SOUND.throw, intro.THROW.release);
  assert.ok(fg.includes(`adelay=${Math.round(intro.SOUND.throw * 1000)}|`));
});

test("studio_intro: a bunny holding something has bent arms (shoulder, elbow, hand), and goes back to resting arms after the throw", () => {
  const held = intro.armsHook(1);
  for (const side of ["l", "r"]) assert.equal(held[side].length, 3);
  assert.ok(intro.armsHook(intro.THROW.release + 0.1).r && !intro.armsHook(intro.THROW.release + 0.1).l, "only the throwing arm swings");
  assert.equal(intro.armsHook(intro.THROW.release + 0.5), null);
  for (const a of [intro.armsRead(), intro.armsLift(-150), intro.armsPaint(0, [-100, -146])]) for (const side of ["l", "r"]) assert.equal(a[side].length, 3);
});

test("new.mjs scaffolds a scene per style that imports and follows the timing rules, and never overwrites", async () => {
  for (const style of Object.keys(STYLES)) {
    const dir = mkdtempSync(join(tmpdir(), "focal-scaffold-"));
    try {
      for (const kit of ["ink", "cel", "toon", "kawaii", "audio"]) symlinkSync(join(HERE, `${kit}.mjs`), join(dir, `${kit}.mjs`));
      const [main, sheet] = scaffold("demo_scaffold", style, dir);
      assert.throws(() => scaffold("demo_scaffold", style, dir), /not overwriting/);
      const s = await import(pathToFileURL(main).href);
      await import(pathToFileURL(sheet).href);
      assert.equal(s.CAPTIONS[0].from, 0, style);
      const cs = [...s.CAPTIONS].sort((a, b) => a.from - b.from);
      cs.forEach((c, i) => { assert.ok(c.from < c.to && c.to <= s.DURATION); if (i) assert.ok(cs[i - 1].to <= c.from); });
      assert.ok(cs.at(-1).to <= s.END.from && s.DURATION - s.END.from >= 3, style);
      assert.deepEqual(s.END.lines, CLOSING);
      assert.equal(s.END.store, STORE);
      assert.equal(s.SCENES.at(-1).to, s.DURATION);
      for (const b of s.BEATS) assert.ok(b.t >= 0 && b.t < s.DURATION, `beat ${b.t}`);
      assert.ok(soundArgv("/o.wav", s.DURATION, s.SOUND).includes("ffmpeg"));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
  assert.throws(() => scaffold("Bad-Name", "toon", tmpdir()), /bad name/);
  assert.throws(() => scaffold("ok", "nope", tmpdir()), /unknown style/);
});

test("canvas code is deterministic: no Math.random, Date.now, performance.now or fetch in kits or scenes", () => {
  const files = [...readdirSync(HERE).filter(f => f.endsWith(".mjs") && !f.endsWith(".test.mjs") && f !== "render.mjs" && f !== "new.mjs").map(f => join(HERE, f)),
    ...readdirSync(join(HERE, "scenes")).map(f => join(HERE, "scenes", f))];
  const code = f => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/ .*$/gm, "");
  for (const f of files) assert.doesNotMatch(code(f), /Math\.random|Date\.now|performance\.now|\bfetch\(/, f);
});
