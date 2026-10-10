// What the weekly workflow (draft-week.yml) needs around the queue PR. Plain Node 22, no dependencies.
//
//   node scripts/queue-pr.mjs gate [--date 2026-10-30]        exit 0 when the PR may auto-merge, else 1 (with why)
//   node scripts/queue-pr.mjs body --week 2026-W44 [--story video/clips/x.md]   the PR body, markdown
//
// Gate: every app that isn't `paused: true` needs `trust_from: YYYY-MM-DD` on or before today (UTC).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mediaUrl, parsePost, parseYaml } from "./publish.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// { ok, reasons } for a map of app id -> parsed app yml. Paused apps are skipped; a missing or
// malformed trust_from is "not trusted yet", never an error, so a typo can't auto-merge.
export function trusted(apps, today) {
  const reasons = [];
  let active = 0;
  for (const [id, app] of Object.entries(apps)) {
    if (app.paused === true) continue;
    active++;
    const from = String(app.trust_from ?? "");
    if (!DATE_RE.test(from) || Number.isNaN(Date.parse(from))) reasons.push(`${id}: no valid trust_from (want YYYY-MM-DD)`);
    else if (from > today) reasons.push(`${id}: trusted from ${from}, today is ${today}`);
  }
  if (!active) reasons.push("no active apps");
  return { ok: reasons.length === 0, reasons };
}

// The PR body: every drafted post's cover still, title and slot, then the new story's prompt (.md) if there is one.
export function prBody(week, posts, story) {
  const rows = posts.map((p) => `### ${p.title}\n\`${p.file}\`, posts ${p.at}\n\n![](${mediaUrl(p.thumb)})`);
  const parts = [`Queue for ${week}: ${posts.length} post${posts.length === 1 ? "" : "s"}. Merging is the approval.`, ...rows];
  if (story) parts.push(`## New story\n\n${story.trim()}`);
  return parts.join("\n\n") + "\n";
}

const loadApps = () =>
  Object.fromEntries(
    readdirSync(join(ROOT, "apps"))
      .filter((f) => f.endsWith(".yml"))
      .map((f) => [f.replace(/\.yml$/, ""), parseYaml(readFileSync(join(ROOT, "apps", f), "utf8"))]),
  );

export function main(argv) {
  const arg = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : undefined);
  if (argv[0] === "gate") {
    const { ok, reasons } = trusted(loadApps(), arg("--date") ?? new Date().toISOString().slice(0, 10));
    console.log(ok ? "trusted: auto-merge allowed" : `not trusted: ${reasons.join("; ")}`);
    return ok ? 0 : 1;
  }
  if (argv[0] === "body") {
    const week = arg("--week");
    if (!week) throw new Error("body needs --week");
    const dir = join(ROOT, "queue", week);
    const posts = (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")).sort() : []).map((f) => {
      const { meta } = parsePost(readFileSync(join(dir, f), "utf8"), `queue/${week}/${f}`);
      return { file: `queue/${week}/${f}`, title: meta.title, at: meta.at, thumb: meta.thumb };
    });
    const story = arg("--story");
    process.stdout.write(prBody(week, posts, story && existsSync(join(ROOT, story)) ? readFileSync(join(ROOT, story), "utf8") : ""));
    return 0;
  }
  console.error("usage: queue-pr.mjs gate [--date D] | body --week W [--story FILE]");
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
