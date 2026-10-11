// node --test scripts/*.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { prBody, trusted } from "./queue-pr.mjs";
import { parseYaml } from "./publish.mjs";

test("trusted: only from trust_from, never for a missing or malformed date", () => {
  assert.equal(trusted({ a: { trust_from: "2026-10-30" } }, "2026-10-30").ok, true);
  assert.equal(trusted({ a: { trust_from: "2026-10-30" } }, "2026-10-29").ok, false);
  assert.match(trusted({ a: {} }, "2026-10-30").reasons[0], /no valid trust_from/);
  assert.equal(trusted({ a: { trust_from: "soon" } }, "2026-10-30").ok, false);
  assert.equal(trusted({}, "2026-10-30").ok, false);
});

test("trusted: a paused app is skipped, and all-paused is not trusted", () => {
  const apps = { a: { trust_from: "2026-10-01" }, b: { paused: true } };
  assert.equal(trusted(apps, "2026-10-30").ok, true);
  assert.equal(trusted({ b: { paused: true } }, "2026-10-30").ok, false);
});

test("trusted: reads the keys as the yml parser returns them", () => {
  const app = parseYaml("name: X\ntrust_from: 2026-10-30   # first run + 14 days\npaused: false\n");
  assert.equal(trusted({ x: app }, "2026-11-01").ok, true);
  assert.equal(trusted({ x: parseYaml("trust_from: 2026-10-30\npaused: true\n") }, "2026-11-01").ok, false);
});

test("prBody: a cover still per post, and the new story when there is one", () => {
  const posts = [{ file: "queue/2026-W44/a.md", title: "T", at: "2026-10-26T20:00:00Z", thumb: "wildfocus/a.png" }];
  const body = prBody("2026-W44", posts, "# Story\nPrompt");
  assert.match(body, /1 post\./);
  assert.match(body, /!\[\]\(https:\/\/raw\.githubusercontent\.com\/focalstudio\/media\/main\/wildfocus\/a\.png\)/);
  assert.match(body, /## New story\n\n# Story/);
  assert.doesNotMatch(prBody("2026-W44", posts, ""), /New story/);
});
