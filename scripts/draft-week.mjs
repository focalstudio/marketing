// Draft next week's app posts: pick clip x style x variant units that haven't been used, render
// them, push the finals to focalstudio/media and write queue/<week>/*.md. Plain Node 22, no dependencies.
//
//   node scripts/draft-week.mjs [--week 2026-W44] [--app wildfocus] [--dry-run [--weeks 4]]
//
// `--dry-run --weeks N` plans N consecutive weeks, feeding each week's picks into the next, to show where the pool runs dry.
// Exit 3 when an app got fewer posts than its cadence (the pool ran dry), so a scheduled run flags it.
// App stream only. Per-app settings and copy live in apps/<app>.yml; `paused: true` skips an app.

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parsePost, parseYaml } from "./publish.mjs";
import { destPath, hasRemote } from "./push-media.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DAYS = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
const PLATFORMS = ["x", "youtube", "bluesky", "tiktok", "threads", "instagram"];

// ---------- Pure helpers (tested) ----------

export const slug = (s) => s.replaceAll("_", "-");

// ISO week label "YYYY-Www" for a date.
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d - Date.UTC(year, 0, 1)) / 864e5 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

// The Monday (UTC midnight) of an ISO week label.
export function weekStart(label) {
  const m = label.match(/^(\d{4})-W(\d{2})$/);
  if (!m) throw new Error(`bad week "${label}", want YYYY-Www`);
  const jan4 = new Date(Date.UTC(+m[1], 0, 4));
  const monday = new Date(jan4 - ((jan4.getUTCDay() || 7) - 1) * 864e5);
  return new Date(+monday + (+m[2] - 1) * 7 * 864e5);
}

export const nextWeek = (now = new Date()) => isoWeek(new Date(+now + 7 * 864e5));

// "3 per week" -> 3
export const perWeek = (cadence) => Number(String(cadence).match(/^(\d+)\s+per\s+week$/)?.[1] ?? 0);

// ISO timestamps for the first n of the app's posting days in a week.
export function slots(label, days, time, n) {
  const [hh, mm] = time.split(":").map(Number);
  const start = weekStart(label);
  return days.slice(0, n).map((d) => {
    if (!(d in DAYS)) throw new Error(`bad day "${d}"`);
    const t = new Date(+start + DAYS[d] * 864e5);
    t.setUTCHours(hh, mm, 0, 0);
    return t.toISOString().replace(".000Z", "Z");
  });
}

// One post's worth of video: a storyboard, a style, and optionally one of the clip's VARIANTS.
export const key = ({ clip, style, variant }) => `${slug(clip)}-${style}${variant ? `-${slug(variant)}` : ""}`;

// Every unit an app can post, in preference order: per clip, each style, then each variant.
// clipCfg[c].styles limits a clip to the styles it renders in; otherwise the app's styles apply.
export function units(clipCfg, cat, styles) {
  return Object.keys(clipCfg)
    .filter((c) => c in cat.clips)
    .flatMap((clip) => {
      const vs = cat.clips[clip].variants.length ? cat.clips[clip].variants : [null];
      return (clipCfg[clip].styles ?? styles)
        .filter((s) => cat.styles.includes(s))
        .flatMap((style) => vs.map((variant) => ({ clip, style, variant })));
    });
}

// What each app has already queued or published, from queue file names (<app>-<key>.md).
// The older bare <app>-<clip>.md files were the toon original, and a bare <app>-<clip>-<style>.md is the clip's
// "meadow" variant (the base cast, from before the clip had variants).
export function history(files, app, all) {
  const byName = new Map(all.map((u) => [key(u), u]));
  for (const u of all) if (u.style === "toon" && !u.variant) byName.set(slug(u.clip), u);
  for (const u of all) if (u.variant === "meadow") byName.set(`${slug(u.clip)}-${u.style}`, u);
  const used = [];
  for (const f of files) {
    const [week, name] = f.split("/").slice(-2);
    const base = name.replace(/\.md$/, "");
    const u = base.startsWith(`${app}-`) && byName.get(base.slice(app.length + 1));
    if (u) used.push({ ...u, week, file: f });
  }
  return used;
}

export const addWeeks = (label, n) => isoWeek(new Date(+weekStart(label) + n * 7 * 864e5));

const weeksBetween = (a, b) => Math.round((weekStart(b) - weekStart(a)) / (7 * 864e5));

// Pick up to n units for `week`. `mix` ({style: n}) is a minimum of posts per style: those are filled first, then the
// rest by the rule below. Unused ones first: the least-used clip goes first, so a week mixes storyboards. If that runs
// short, reuse the oldest unit last posted at least `rest` weeks earlier (it keeps its media and gets its next hook),
// so the app never goes quiet. A style the pool can't fill to its minimum is reported through `warn`, and the week still
// fills from the rest. Deterministic for a given history, so a re-run drafts the same week.
export function pick(all, used, n, week, rest = 8, mix = {}, warn = () => {}) {
  const taken = new Set(used.map(key));
  const count = {};
  for (const u of used) count[u.clip] = (count[u.clip] ?? 0) + 1;
  const out = [];
  const fresh = all.filter((u) => !taken.has(key(u)));
  const last = new Map();
  for (const u of used) if (!last.has(key(u)) || last.get(key(u)).week < u.week) last.set(key(u), u);
  const stale = [...last.values()].filter((u) => weeksBetween(u.week, week) >= rest).sort((a, b) => (a.week < b.week ? -1 : a.week > b.week ? 1 : 0));
  const next = (ok) => {
    fresh.sort((a, b) => (count[a.clip] ?? 0) - (count[b.clip] ?? 0) || all.indexOf(a) - all.indexOf(b));
    let i = fresh.findIndex(ok);
    const u = i >= 0 ? fresh.splice(i, 1)[0] : (i = stale.findIndex(ok)) >= 0 ? { ...stale.splice(i, 1)[0], reuse: true } : null;
    if (u) {
      out.push(u);
      count[u.clip] = (count[u.clip] ?? 0) + 1;
    }
    return u;
  };
  for (const [style, min] of Object.entries(mix)) {
    const want = Math.min(min, n - out.length);
    let got = 0;
    while (got < want && next((u) => u.style === style)) got++;
    if (got < min) warn(`mix wants ${min} ${style}, the pool gave ${got}`);
  }
  while (out.length < n && next(() => true));
  return out;
}

// Copy for one clip: the hook rotates by how many times that clip has been used.
export function copy(app, clipCfg, uses) {
  const i = uses % clipCfg.hooks.length;
  const hook = clipCfg.hooks[i];
  const title = clipCfg.titles[i % clipCfg.titles.length];
  const play = app.links?.play_store && app.links.play_store !== "TODO";
  const cta = play ? app.caption_cta : "Free on iOS.";
  const store = app.links.app_store;
  const dev = `${hook}\n\n${app.name}, ${cta.charAt(0).toLowerCase() + cta.slice(1)} Built with Claude Code.\n${store}`;
  return { title, text: `${hook}\n\n${app.name}. ${cta}`, dev };
}

export function postFile({ at, mediaPath, thumbPath, title, text, dev }) {
  const front = [
    "stream: app",
    `platforms: [${PLATFORMS.join(", ")}]`,
    `at: ${at}`,
    `media: ${mediaPath}`,
    `thumb: ${thumbPath}`,
    `title: ${JSON.stringify(title)}`,
  ].join("\n");
  const links = (id) => `<!-- ${id} -->\n${dev}\n`;
  return `---\n${front}\n---\n${text}\n\n${links("x")}\n${links("bluesky")}\n<!-- threads -->\n${text}\n${dev.split("\n").at(-1)}\n`;
}

// ---------- Rendering and publishing ----------

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], ...opts });

const catalogue = () => JSON.parse(sh("python3", ["-m", "video.render", "--list", "--json"]));

function renderOne(app, u, dur, outDir) {
  const base = `${app}-${key(u)}`;
  const v = u.variant ? ["--variant", u.variant] : [];
  const mp4 = join(outDir, `${base}.mp4`);
  sh("python3", ["-m", "video.render", u.clip, mp4, "--style", u.style, ...v]);
  // The cover is the settled end card, just before the clip's closing fade.
  const t = (dur - 0.6).toFixed(2);
  const stills = join(outDir, `${base}-still`);
  sh("python3", ["-m", "video.render", u.clip, "--style", u.style, ...v, "--preview", stills, t]);
  const png = join(outDir, `${base}.png`);
  copyFileSync(join(stills, `${t.padStart(5, "0")}.png`), png);
  return { mp4, png };
}

const base0 = (app, u) => `${app}-${key(u)}`;

const pushMedia = (file, app) => sh("node", ["scripts/push-media.mjs", file, app]).match(/^media: (.+)$/m)[1];

// Media for one unit: the files already in focalstudio/media if both are there (no render, no push), else render and push.
// `deps` is injectable for tests.
export function mediaFor(app, base, { has = hasRemote, render, push = pushMedia }) {
  const mp4 = destPath(`${base}.mp4`, app);
  const png = destPath(`${base}.png`, app);
  if (has(mp4) && has(png)) return { mediaPath: mp4, thumbPath: png, adopted: true };
  const r = render();
  return { mediaPath: push(r.mp4, app), thumbPath: push(r.png, app) };
}

// ---------- Main ----------

export function main(argv) {
  const arg = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : undefined);
  const dry = argv.includes("--dry-run");
  const week = arg("--week") ?? nextWeek();
  const weeks = Number(arg("--weeks") ?? 1);
  if (!Number.isInteger(weeks) || weeks < 1 || (weeks > 1 && !dry)) {
    console.error("--weeks N (N >= 1) only works with --dry-run");
    return 2;
  }
  const only = arg("--app");
  const queueDir = join(ROOT, "queue");
  const files = existsSync(queueDir)
    ? readdirSync(queueDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .flatMap((d) => readdirSync(join(queueDir, d.name)).filter((f) => f.endsWith(".md")).map((f) => `${d.name}/${f}`))
    : [];
  const cat = catalogue();
  let made = 0;
  let short = false;

  for (const f of readdirSync(join(ROOT, "apps")).filter((f) => f.endsWith(".yml"))) {
    const app = parseYaml(readFileSync(join(ROOT, "apps", f), "utf8"));
    const id = f.replace(/\.yml$/, "");
    if (only && only !== id) continue;
    if (app.paused) {
      console.log(`${id}: paused`);
      continue;
    }
    const n = perWeek(app.cadence);
    const clipCfg = app.clips ?? {};
    const all = units(clipCfg, cat, app.styles ?? cat.styles);
    if (!n || !all.length) {
      console.log(`${id}: nothing to draft (cadence "${app.cadence}", ${all.length} renderable clips with copy)`);
      continue;
    }
    let used = history(files, id, all);
    const rest = Number(app.rest_weeks ?? 8);
    for (let k = 0; k < weeks; k++) {
      const wk = addWeeks(week, k);
      const already = k ? 0 : files.filter((x) => x.startsWith(`${wk}/${id}-`)).length;
      const want = Math.max(0, n - already);
      // A style's minimum counts the posts this week already has queued.
      const left = Object.fromEntries(Object.entries(app.mix ?? {}).map(([st, m]) => [st, Math.max(0, m - used.filter((u) => u.week === wk && u.style === st).length)]));
      const todo = pick(all, used, want, wk, rest, left, (m) => console.warn(`${id}: ${wk}: ${m}`));
      const times = slots(wk, app.days, app.time, n).slice(already);
      const unused = all.length - new Set(used.map(key)).size;
      console.log(`${id}: ${wk} has ${already}/${n}; ${unused} unused units in the pool`);
      if (todo.length < want) {
        short = true;
        console.warn(`${id}: only ${todo.length} of ${want} posts for ${wk}. Add a clip, a variant or a style.`);
      }

      todo.forEach((u, i) => {
        // Earlier posts of this clip, including ones drafted above for this same week, so each gets the next hook.
        const uses = used.filter((x) => x.clip === u.clip).length + todo.slice(0, i).filter((x) => x.clip === u.clip).length;
        const base = `${id}-${key(u)}`;
        const c = copy(app, clipCfg[u.clip], uses);
        console.log(`${id}: ${times[i]}  ${base}${u.reuse ? ` (reuse from ${u.week})` : ""}  "${c.title}"`);
        if (dry) return;
        let media;
        if (u.reuse) {
          const old = parsePost(readFileSync(join(queueDir, u.file), "utf8"), u.file).meta;
          media = { mediaPath: old.media, thumbPath: old.thumb };
        } else {
          const outDir = join(ROOT, "out", wk);
          mkdirSync(outDir, { recursive: true });
          media = mediaFor(id, base, { render: () => renderOne(id, u, cat.clips[u.clip].dur, outDir) });
          if (media.adopted) console.log(`${id}: ${base} is already in the media repo; using it`);
        }
        mkdirSync(join(queueDir, wk), { recursive: true });
        writeFileSync(join(queueDir, wk, `${base}.md`), postFile({ at: times[i], ...media, ...c }));
        made++;
      });
      used = [...used, ...todo.map((u) => ({ ...u, week: wk, file: `${wk}/${base0(id, u)}.md` }))];
    }
  }
  console.log(dry ? "dry run: nothing rendered or written" : `drafted ${made} posts in queue/${week}`);
  return short ? 3 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
