// node --test scripts/*.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  blueskyFacets,
  bufferInput,
  dueState,
  graphemes,
  loadPlatforms,
  parsePost,
  parseYaml,
  tagLinks,
  utm,
  validate,
  xLength,
} from "./publish.mjs";

const { byId } = loadPlatforms();
const post = (front, body = "Hello", file = "queue/2026-W41/t.md") => {
  const p = parsePost(`---\n${front}\n---\n${body}\n`, file);
  return { p, ...validate(p, byId) };
};
const ok = "stream: kit\nplatforms: [bluesky]\nat: 2026-10-12T09:00:00Z";

test("parseYaml reads platforms.yml in tier order", () => {
  const { order } = loadPlatforms();
  assert.deepEqual(order.map((p) => p.id), ["x", "youtube", "bluesky", "devto", "tiktok", "threads", "instagram"]);
  assert.deepEqual(byId.x, { id: "x", tier: "S", route: "buffer", streams: ["kit", "app"] });
});

test("parseYaml scalars, comments and quotes", () => {
  assert.deepEqual(parseYaml(`a: "x # y" # c\nb: 'it''s'\nc: [1, "two, 2", true]\nd: 2026-10-12T09:00:00Z\ne:`), {
    a: "x # y",
    b: "it's",
    c: [1, "two, 2", true],
    d: "2026-10-12T09:00:00Z",
    e: null,
  });
  assert.throws(() => parseYaml("a: |\n  text"), /not supported/);
  assert.throws(() => parseYaml("a: 1\n  b: 2"), /indentation/);
  assert.throws(() => parseYaml("a: 1\na: 2"), /duplicate/);
});

test("parsePost splits per-platform overrides", () => {
  const { p, errors } = post("stream: kit\nplatforms: [x, bluesky]\nat: 2026-10-12T09:00:00Z", "Default\n\n<!-- x -->\nFor X");
  assert.deepEqual(errors, []);
  assert.deepEqual(p.texts, { default: "Default", x: "For X" });
  assert.equal(p.campaign, "2026-w41");
});

test("validate rejects bad posts", () => {
  const errs = (front, body, file) => post(front, body, file).errors.join(" | ");
  assert.match(errs("stream: kit\nplatforms: [reddit]\nat: 2026-10-12T09:00:00Z"), /reddit: not in platforms.yml/);
  assert.match(errs("stream: kit\nplatforms: [tiktok]\nat: 2026-10-12T09:00:00Z"), /not used for the kit stream/);
  assert.match(errs("stream: app\nplatforms: [tiktok]\nat: 2026-10-12T09:00:00Z"), /needs a video/);
  assert.match(errs("stream: kit\nplatforms: [devto]\nat: 2026-10-12T09:00:00Z"), /needs article: true/);
  assert.match(errs("stream: kit\nplatforms: [bluesky]\nat: 2026-10-12 09:00"), /ISO 8601 UTC/);
  assert.match(errs(`${ok}\ntypo: 1`), /unknown field "typo"/);
  assert.match(errs(ok, "x".repeat(301)), /bluesky: 301\/300 graphemes/);
  assert.match(errs(ok, "Hi\n<!-- threads -->\nThere"), /override <!-- threads --> is not in platforms/);
  assert.match(errs(ok, "Hi", "queue/t.md"), /queue\/YYYY-Www/);
  assert.match(errs(`${ok}\nmedia: ../secret.mp4`), /path in focalstudio\/media/);
});

test("platforms with enabled: false are refused", () => {
  const p = parsePost(`---\n${ok}\n---\nHi\n`, "queue/2026-W41/t.md");
  assert.match(validate(p, { bluesky: { ...byId.bluesky, enabled: false } }).errors[0], /disabled/);
});

test("lengths: graphemes, X links count 23", () => {
  assert.equal(graphemes("👩‍👩‍👧 é"), 3);
  assert.equal(xLength(`a https://example.com/${"x".repeat(100)}`), 25);
});

test("UTM tags links but not media or already-tagged links", () => {
  assert.equal(utm("https://a.dev/p", "x", "2026-w41"), "https://a.dev/p?utm_source=x&utm_medium=social&utm_campaign=2026-w41");
  assert.equal(utm("https://a.dev/p?utm_source=hn", "x", "w"), "https://a.dev/p?utm_source=hn");
  assert.equal(utm("https://raw.githubusercontent.com/focalstudio/media/main/a.mp4", "x", "w"), "https://raw.githubusercontent.com/focalstudio/media/main/a.mp4");
  assert.equal(tagLinks("See https://a.dev.", "x", "w"), "See https://a.dev/?utm_source=x&utm_medium=social&utm_campaign=w.");
});

test("Bluesky facets use UTF-8 byte offsets", () => {
  const text = "Fox 🦊 — https://a.dev/p #ship";
  const [link, tag] = blueskyFacets(text, "w");
  const bytes = Buffer.from(text);
  assert.equal(bytes.subarray(link.index.byteStart, link.index.byteEnd).toString(), "https://a.dev/p");
  assert.equal(link.features[0].uri, "https://a.dev/p?utm_source=bluesky&utm_medium=social&utm_campaign=w");
  assert.equal(bytes.subarray(tag.index.byteStart, tag.index.byteEnd).toString(), "#ship");
  assert.equal(tag.features[0].tag, "ship");
});

test("due logic: Buffer 7-day window, direct up to 15 min early, stale after 48 h", () => {
  const now = Date.parse("2026-10-09T12:00:00Z");
  const h = 3600e3;
  assert.equal(dueState("buffer", now + 6 * 24 * h, now), "due");
  assert.equal(dueState("buffer", now + 8 * 24 * h, now), "later");
  const min = 60e3;
  assert.equal(dueState("direct", now + 14 * min, now), "due");
  assert.equal(dueState("direct", now + 16 * min, now), "later");
  assert.equal(dueState("direct", now - h, now), "due");
  assert.equal(dueState("direct", now - 49 * h, now), "stale");
});

test("Buffer input: customScheduled, AI flag, video asset without thumbnail, YouTube category, past times pushed forward", () => {
  const now = Date.parse("2026-10-09T12:00:00Z");
  const { p } = post("stream: app\nplatforms: [youtube]\nat: 2026-10-09T11:00:00Z\nmedia: wf/a.mp4\nthumb: wf/a.png\ntitle: T\nai: true", "Hi");
  p.atMs = Date.parse(p.meta.at);
  const input = bufferInput({ cfg: byId.youtube, post: p }, "ch1", now);
  assert.equal(input.mode, "customScheduled");
  assert.equal(input.schedulingType, "automatic");
  assert.equal(input.needsApproval, false);
  assert.equal(input.dueAt, "2026-10-09T12:10:00.000Z");
  assert.deepEqual(input.assets, [{ video: { url: "https://raw.githubusercontent.com/focalstudio/media/main/wf/a.mp4" } }]);
  assert.deepEqual(input.metadata, { youtube: { title: "T", categoryId: "22", privacy: "public", madeForKids: false, isAiGenerated: true } });
});
