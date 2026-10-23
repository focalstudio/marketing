// node --test scripts/*.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { addWeeks, copy, history, isoWeek, key, mediaFor, nextWeek, perWeek, pick, postFile, slots, units, weekStart } from "./draft-week.mjs";
import { loadPlatforms, parsePost, parseYaml, validate } from "./publish.mjs";

const cat = {
  clips: { meditate: { dur: 16, variants: [] }, rare_find: { dur: 18, variants: ["snow_leopard", "tiger"] } },
  styles: ["ink", "lowpoly", "pixel", "toon", "appart"],
};
const cfg = { meditate: {}, rare_find: { styles: ["appart"] } };
const all = units(cfg, cat, ["toon", "lowpoly", "pixel", "ink", "appart"]);
const keys = (us) => us.map(key);

test("ISO weeks", () => {
  assert.equal(isoWeek(new Date("2026-10-10T12:00:00Z")), "2026-W41");
  assert.equal(nextWeek(new Date("2026-10-10T12:00:00Z")), "2026-W42");
  assert.equal(weekStart("2026-W42").toISOString(), "2026-10-12T00:00:00.000Z");
  assert.equal(isoWeek(new Date("2027-01-03T00:00:00Z")), "2026-W53");
});

test("slots are the first n posting days at the posting time", () => {
  assert.deepEqual(slots("2026-W44", ["mon", "wed", "fri"], "20:00", 2), ["2026-10-26T20:00:00Z", "2026-10-28T20:00:00Z"]);
  assert.throws(() => slots("2026-W44", ["funday"], "20:00", 1), /bad day/);
});

test("perWeek", () => {
  assert.equal(perWeek("3 per week"), 3);
  assert.equal(perWeek("weekly"), 0);
});

test("units: styles x variants, limited by a clip's own styles, skipping clips that don't exist", () => {
  assert.deepEqual(keys(all), [
    "meditate-toon", "meditate-lowpoly", "meditate-pixel", "meditate-ink", "meditate-appart",
    "rare-find-appart-snow-leopard", "rare-find-appart-tiger",
  ]);
  assert.equal(units({ gone: {} }, cat, ["toon"]).length, 0);
});

test("history reads queue names; a bare clip name is the toon original", () => {
  const h = history(
    ["2026-W42/wildfocus-meditate-lowpoly.md", "2026-W43/wildfocus-meditate.md", "2026-W44/wildfocus-rare-find-appart-tiger.md", "2026-W41/first-post.md", "2026-W44/other-meditate-ink.md"],
    "wildfocus",
    all,
  );
  assert.deepEqual(keys(h).sort(), ["meditate-lowpoly", "meditate-toon", "rare-find-appart-tiger"]);
  assert.equal(h.find((u) => u.variant === "tiger").week, "2026-W44");
});

test("history: a bare <clip>-<style> file is the clip's meadow variant", () => {
  const withMeadow = units({ night_owls: { styles: ["appart"] } }, { clips: { night_owls: { dur: 17, variants: ["deer", "fox", "meadow"] } }, styles: ["appart"] }, ["appart"]);
  const h = history(["2026-W43/wildfocus-night-owls-appart.md"], "wildfocus", withMeadow);
  assert.deepEqual(keys(h), ["night-owls-appart-meadow"]);
});

test("pick: unused first, least-used clip first, so a week mixes storyboards", () => {
  const used = [{ clip: "meditate", style: "toon", variant: null, week: "2026-W43" }];
  assert.deepEqual(keys(pick(all, used, 3, "2026-W45")), ["rare-find-appart-snow-leopard", "meditate-lowpoly", "rare-find-appart-tiger"]);
});

test("pick: when the pool is dry, reuse the oldest unit rested 8+ weeks, else fall short", () => {
  const used = all.map((u, i) => ({ ...u, week: i < 2 ? "2026-W42" : "2026-W50", file: `x/${i}.md` }));
  const p = pick(all, used, 3, "2026-W51");
  assert.deepEqual(keys(p), ["meditate-toon", "meditate-lowpoly"]);
  assert.ok(p.every((u) => u.reuse && u.file));
  assert.deepEqual(pick(all, used, 3, "2026-W49"), []);
});

test("a drafted post passes the publisher's validation", () => {
  const app = { name: "WildFocus", caption_cta: "Free on iOS and Android.", links: { app_store: "https://apps.apple.com/us/app/x/id1", play_store: "TODO" } };
  const c = copy(app, { hooks: ["Hook one.", "Hook two."], titles: ["T1", "T2"] }, 2);
  assert.equal(c.title, "T1");
  const src = postFile({ at: "2026-10-26T20:00:00Z", mediaPath: "wildfocus/a.mp4", thumbPath: "wildfocus/a.png", ...c });
  const { errors } = validate(parsePost(src, "queue/2026-W44/wildfocus-meditate-toon.md"), loadPlatforms().byId);
  assert.deepEqual(errors, []);
});

test("pick: rest_weeks shortens the wait before a unit is reused", () => {
  const used = all.map((u, i) => ({ ...u, week: "2026-W50", file: `x/${i}.md` }));
  assert.deepEqual(pick(all, used, 1, "2026-W53"), []);
  assert.deepEqual(keys(pick(all, used, 1, "2026-W54", 4)), ["meditate-toon"]);
});

test("addWeeks steps ISO weeks across a year end", () => {
  assert.equal(addWeeks("2026-W44", 1), "2026-W45");
  assert.equal(addWeeks("2026-W52", 2), "2027-W01");
});

test("mediaFor adopts files already in the media repo and renders nothing", () => {
  const seen = [];
  const m = mediaFor("wildfocus", "wildfocus-night-owls-appart", {
    has: (p) => (seen.push(p), true),
    render: () => assert.fail("must not render"),
    push: () => assert.fail("must not push"),
  });
  assert.deepEqual(m, { mediaPath: "wildfocus/wildfocus-night-owls-appart.mp4", thumbPath: "wildfocus/wildfocus-night-owls-appart.png", adopted: true });
  assert.equal(seen[0], m.mediaPath);
});

test("mediaFor renders and pushes when either file is missing", () => {
  const pushed = [];
  const m = mediaFor("wildfocus", "wildfocus-x-appart", {
    has: (p) => p.endsWith(".mp4"),
    render: () => ({ mp4: "a.mp4", png: "a.png" }),
    push: (f) => (pushed.push(f), `wildfocus/${f}`),
  });
  assert.deepEqual(pushed, ["a.mp4", "a.png"]);
  assert.deepEqual(m, { mediaPath: "wildfocus/a.mp4", thumbPath: "wildfocus/a.png" });
});

test("every WildFocus clip has 3+ hooks, one title each, so a reused clip rotates its copy", async () => {
  const { readFileSync } = await import("node:fs");
  const app = parseYaml(readFileSync(new URL("../apps/wildfocus.yml", import.meta.url), "utf8"));
  for (const [clip, c] of Object.entries(app.clips)) {
    assert.ok(c.hooks.length >= 3, `${clip} has ${c.hooks.length} hooks`);
    assert.equal(c.titles.length, c.hooks.length, `${clip}: hooks and titles pair up`);
    for (const t of c.titles) assert.ok(t.length <= 100, `${clip}: "${t}" is over YouTube's 100 characters`);
  }
});

const mixPool = units({ meditate: { styles: ["toon", "pixel"] }, rare_find: { styles: ["appart"] } }, cat, []);

test("pick: mix fills each style's minimum first, then the usual rule", () => {
  const pool = mixPool;
  assert.deepEqual(keys(pick(pool, [], 3, "2026-W45", 8, { appart: 2 })), ["rare-find-appart-snow-leopard", "rare-find-appart-tiger", "meditate-toon"]);
  assert.deepEqual(keys(pick(pool, [], 3, "2026-W45", 8, { pixel: 1, appart: 1 })), ["meditate-pixel", "rare-find-appart-snow-leopard", "meditate-toon"]);
});

test("pick: a mix minimum the pool can't meet warns and the week still fills", () => {
  const warned = [];
  const p = pick(all, [], 3, "2026-W45", 8, { lowpoly: 2, nope: 1 }, (m) => warned.push(m));
  assert.equal(p.length, 3);
  assert.deepEqual(keys(p).slice(0, 1), ["meditate-lowpoly"]);
  assert.deepEqual(warned, ["mix wants 2 lowpoly, the pool gave 1", "mix wants 1 nope, the pool gave 0"]);
});

test("pick: mix minimums are capped at the week's size, and a rested unit counts for its style", () => {
  const p = pick(mixPool, [], 2, "2026-W45", 8, { appart: 5 });
  assert.deepEqual(keys(p), ["rare-find-appart-snow-leopard", "rare-find-appart-tiger"]);
  const used = mixPool.map((u) => ({ ...u, week: "2026-W40", file: "x.md" }));
  const r = pick(mixPool, used, 1, "2026-W50", 8, { pixel: 1 });
  assert.deepEqual(keys(r), ["meditate-pixel"]);
  assert.ok(r[0].reuse);
});

test("pick: no mix is the same pick as before", () => {
  const used = [{ clip: "meditate", style: "toon", variant: null, week: "2026-W43" }];
  assert.deepEqual(keys(pick(all, used, 3, "2026-W45", 8, {})), keys(pick(all, used, 3, "2026-W45")));
});
