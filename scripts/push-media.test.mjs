// node --test scripts/*.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanName, destPath, refusal } from "./push-media.mjs";

test("cleanName makes names safe for raw URLs", () => {
  assert.equal(cleanName("stop-scrolling(1).mp4"), "stop-scrolling-1.mp4");
  assert.equal(cleanName("Stop Scrolling.MP4"), "stop-scrolling.mp4");
  assert.equal(cleanName("wildfocus-meditate.mp4"), "wildfocus-meditate.mp4");
});

test("destPath puts the file under its app", () => {
  assert.equal(destPath("/a/b/Rabbit (final).mp4"), "wildfocus/rabbit-final.mp4");
  assert.equal(destPath("x.png", "Tick"), "tick/x.png");
});

test("refusal blocks non-media and oversize files", () => {
  assert.equal(refusal("a.mp4", 1e6), "");
  assert.equal(refusal("a.png", 1e6), "");
  assert.match(refusal("a.txt", 1), /not a video or image/);
  assert.match(refusal("a.mp4", 60 * 1048576), /under 50 MB/);
});
