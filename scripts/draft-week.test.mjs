// node --test scripts/*.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { copy, history, isoWeek, key, nextWeek, perWeek, pick, postFile, slots, units, weekStart } from "./draft-week.mjs";
import { loadPlatforms, parsePost, validate } from "./publish.mjs";

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
