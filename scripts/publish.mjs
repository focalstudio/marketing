// Focal Studio publisher. Plain Node 22, no dependencies.
//
//   node scripts/publish.mjs check                read-only: proves each key works, dumps Buffer's schema
//   node scripts/publish.mjs plan                 lists what is due, in platforms.yml order; posts nothing
//   node scripts/publish.mjs publish [--dry-run]  posts everything due; --dry-run prints the requests instead
//   node scripts/publish.mjs refresh              reports how long the Threads and Instagram tokens last
//
// The queue format is in README.md. Nothing here ever prints a secret.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const env = (k) => process.env[k] ?? "";
const results = [];

// Belt and braces: every line goes through here, and any secret value that slipped into it becomes ***.
const SECRETS = ["BUFFER_API_KEY", "BLUESKY_APP_PASSWORD", "DEVTO_API_KEY", "THREADS_TOKEN", "IG_TOKEN"];
function scrub(s) {
  let out = String(s);
  for (const k of SECRETS) if (env(k).length >= 6) out = out.split(env(k)).join("***");
  return out;
}
const say = (...a) => console.log(scrub(a.join(" ")));

async function step(name, fn) {
  try {
    const out = await fn();
    results.push({ name, ok: true });
    say(`✅ ${name}${out ? `: ${out}` : ""}`);
  } catch (e) {
    results.push({ name, ok: false });
    say(`❌ ${name}: ${e.message}`);
  }
}

function need(...keys) {
  const missing = keys.filter((k) => !env(k));
  if (missing.length) throw new Error(`missing secret(s): ${missing.join(", ")}`);
}

// ---------- Buffer ----------
async function buffer(query) {
  const res = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("BUFFER_API_KEY")}` },
    body: JSON.stringify({ query }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.errors) {
    throw new Error(`HTTP ${res.status} ${JSON.stringify(body.errors ?? body).slice(0, 300)}`);
  }
  return body.data;
}

const typeStr = (t) => (t.kind === "NON_NULL" ? `${typeStr(t.ofType)}!` : t.kind === "LIST" ? `[${typeStr(t.ofType)}]` : t.name);
const baseName = (t) => (t.ofType ? baseName(t.ofType) : t.name);
const TYPE_REF = "kind name ofType { kind name ofType { kind name ofType { kind name } } }";

async function dumpType(name, seen = new Set(), depth = 0) {
  if (seen.has(name) || depth > 2) return;
  seen.add(name);
  const d = await buffer(
    `{ __type(name: "${name}") { kind enumValues { name } inputFields { name type { ${TYPE_REF} } } } }`,
  );
  const t = d.__type;
  if (!t) return console.log(`   ${name}: not found`);
  if (t.enumValues) return console.log(`   ${name} = ${t.enumValues.map((v) => v.name).join(" | ")}`);
  console.log(`   ${name}`);
  for (const f of t.inputFields ?? []) console.log(`     ${f.name}: ${typeStr(f.type)}`);
  if (name === "PostInputMetaData" || depth > 0) {
    for (const f of t.inputFields ?? []) {
      const base = baseName(f.type);
      if (/youtube|tiktok|video/i.test(f.name) || /Youtube|Tiktok|VideoAsset/.test(base)) {
        await dumpType(base, seen, depth + 1);
      }
    }
  }
}

async function checkBuffer() {
  need("BUFFER_API_KEY");
  const d = await buffer("{ account { organizations { id name } } }");
  const orgs = d.account.organizations;
  if (!orgs.length) throw new Error("no organizations");
  const lines = [];
  for (const o of orgs) {
    const c = await buffer(`{ channels(input: { organizationId: "${o.id}" }) { id name service } }`);
    for (const ch of c.channels) lines.push(`${ch.service} · ${ch.name} · ${ch.id}`);
  }
  return `${orgs.length} org(s), ${lines.length} channel(s)\n   ${lines.join("\n   ")}`;
}

async function dumpField(typeName, fieldName) {
  const d = await buffer(
    `{ __type(name: "${typeName}") { fields { name args { name type { ${TYPE_REF} } } type { ${TYPE_REF} } } } }`,
  );
  const f = d.__type?.fields?.find((x) => x.name === fieldName);
  if (!f) return console.log(`   ${typeName}.${fieldName}: not found`);
  const args = f.args.map((a) => `${a.name}: ${typeStr(a.type)}`).join(", ");
  console.log(`   ${typeName}.${fieldName}(${args}): ${typeStr(f.type)}`);
  const ret = baseName(f.type);
  const u = await buffer(`{ __type(name: "${ret}") { kind possibleTypes { name } fields { name } } }`);
  if (u.__type?.possibleTypes) console.log(`   ${ret} = ${u.__type.possibleTypes.map((p) => p.name).join(" | ")}`);
  else if (u.__type?.fields) console.log(`   ${ret} { ${u.__type.fields.map((x) => x.name).join(" ")} }`);
  for (const a of f.args) await dumpType(baseName(a.type), new Set(), 1);
}

async function checkBufferSchema() {
  need("BUFFER_API_KEY");
  for (const n of ["Service", "CreatePostInput", "PostInputMetaData", "AssetInput", "VideoAssetInput"]) {
    await dumpType(n);
  }
  for (const n of ["ShareMode", "SchedulingType", "TwitterPostMetadataInput", "VideoMetadataInput", "ImageAssetInput"]) {
    await dumpType(n);
  }
  await dumpField("Mutation", "createPost");
  await dumpField("Query", "posts");
  for (const n of ["PostsFiltersInput", "PostStatus", "DateTimeComparator", "PostSortInput"]) {
    await dumpType(n, new Set(), 1);
  }
  for (const n of ["MutationError", "PostActionSuccess", "Post", "PostsResults", "PostsEdge"]) {
    const d = await buffer(`{ __type(name: "${n}") { kind possibleTypes { name } fields { name type { ${TYPE_REF} } } } }`);
    const t = d.__type;
    if (!t) { console.log(`   ${n}: not found`); continue; }
    console.log(`   ${n} (${t.kind})${t.possibleTypes ? ` = ${t.possibleTypes.map((p) => p.name).join(" | ")}` : ""}`);
    for (const f of t.fields ?? []) console.log(`     ${f.name}: ${typeStr(f.type)}`);
  }
}

// ---------- Bluesky ----------
async function checkBluesky() {
  need("BLUESKY_HANDLE", "BLUESKY_APP_PASSWORD");
  const res = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: env("BLUESKY_HANDLE"), password: env("BLUESKY_APP_PASSWORD") }),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status} ${b.message ?? ""}`);
  return `logged in as ${b.handle}`;
}

// ---------- dev.to ----------
async function checkDevto() {
  need("DEVTO_API_KEY");
  const res = await fetch("https://dev.to/api/users/me", { headers: { "api-key": env("DEVTO_API_KEY") } });
  const b = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status} ${b.error ?? ""}`);
  return `logged in as ${b.username}`;
}

// ---------- Threads ----------
async function checkThreads() {
  need("THREADS_TOKEN", "THREADS_USER_ID");
  const url = new URL("https://graph.threads.net/v1.0/me");
  url.searchParams.set("fields", "id,username");
  url.searchParams.set("access_token", env("THREADS_TOKEN"));
  const res = await fetch(url);
  const b = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status} ${b.error?.message ?? ""}`);
  if (b.id !== env("THREADS_USER_ID")) throw new Error("token user does not match THREADS_USER_ID");
  return `logged in as ${b.username}`;
}

// ---------- Instagram ----------
async function instagram(path, fields) {
  const url = new URL(`https://graph.instagram.com/v21.0/${path}`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", env("IG_TOKEN"));
  const res = await fetch(url);
  const b = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status} ${b.error?.message ?? ""}`);
  return b;
}

async function checkInstagram() {
  need("IG_TOKEN", "IG_USER_ID");
  const me = await instagram("me", "user_id,username,account_type");
  if (me.user_id !== env("IG_USER_ID")) throw new Error("token user does not match IG_USER_ID");
  // Reading the publishing limit needs instagram_business_content_publish, so this proves the scope.
  const lim = await instagram(`${me.user_id}/content_publishing_limit`, "quota_usage,config");
  const used = lim.data?.[0]?.quota_usage ?? "?";
  const total = lim.data?.[0]?.config?.quota_total ?? "?";
  return `logged in as ${me.username} (${me.account_type}), publish quota ${used}/${total}`;
}

// ====================================================================================
// Publisher: everything below is `plan`, `publish` and `refresh`.
// ====================================================================================

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLISHED = join(ROOT, "published.json");
const MEDIA_BASE = "https://raw.githubusercontent.com/focalstudio/media/main/";
const BSKY = "https://bsky.social/xrpc";
const THREADS_API = "https://graph.threads.net/v1.0";
const IG_API = "https://graph.instagram.com/v21.0";
const HOUR = 3600e3;
const DAY = 24 * HOUR;
const BUFFER_WINDOW = 7 * DAY; // only schedule the next 7 days on Buffer
const BUFFER_CAP = 10; // Buffer free plan: at most 10 scheduled posts per channel
const BUFFER_LEAD = 10 * 60e3; // a Buffer post whose time has passed goes out this far from now
const STALE = 48 * HOUR; // unposted for this long after its time: report it, don't post it
const MAX_MEDIA = 50 * 1024 * 1024;
const BUFFER_SERVICE = { x: "twitter" }; // platforms.yml id -> Buffer service, where they differ
const FIELDS = new Set(["stream", "platforms", "at", "media", "thumb", "title", "ai", "article", "tags", "draft"]);

// ---------- YAML subset ----------
// Enough for platforms.yml and the queue frontmatter: nested maps, `- ` lists (of maps or scalars),
// inline [a, b] lists, quoted and plain scalars, booleans, numbers and # comments.
// Anything else throws, so a file is never silently misread.

function stripComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === q) q = null;
    } else if (c === '"' || c === "'") q = c;
    else if (c === "#" && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function splitInline(s, n) {
  const out = [];
  let q = null;
  let cur = "";
  for (const c of s) {
    if (q) {
      if (c === q) q = null;
    } else if (c === '"' || c === "'") q = c;
    else if (c === ",") {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  if (q) throw new Error(`line ${n}: unclosed quote`);
  if (cur.trim() || out.length) out.push(cur);
  return out.map((x) => scalar(x.trim(), n));
}

function scalar(s, n) {
  if (s.startsWith('"')) {
    if (!s.endsWith('"') || s.length < 2) throw new Error(`line ${n}: unclosed quote`);
    return JSON.parse(s);
  }
  if (s.startsWith("'")) {
    if (!s.endsWith("'") || s.length < 2) throw new Error(`line ${n}: unclosed quote`);
    return s.slice(1, -1).replaceAll("''", "'");
  }
  if (s.startsWith("[")) {
    if (!s.endsWith("]")) throw new Error(`line ${n}: unclosed [`);
    return splitInline(s.slice(1, -1), n);
  }
  if (/^[|>{&*!%@`]/.test(s)) throw new Error(`line ${n}: "${s[0]}" is not supported by this YAML parser`);
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null" || s === "~") return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

export function parseYaml(src) {
  const lines = [];
  src.split(/\r?\n/).forEach((raw, idx) => {
    if (raw.includes("\t")) throw new Error(`line ${idx + 1}: tabs are not allowed`);
    const s = stripComment(raw).trimEnd();
    if (s.trim()) lines.push({ indent: s.length - s.trimStart().length, text: s.trim(), n: idx + 1 });
  });
  let i = 0;
  const isItem = (l) => l.text === "-" || l.text.startsWith("- ");

  function map(indent) {
    const out = {};
    while (i < lines.length && lines[i].indent === indent && !isItem(lines[i])) {
      const { text, n } = lines[i];
      const m = text.match(/^([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
      if (!m) throw new Error(`line ${n}: expected "key: value"`);
      if (m[1] in out) throw new Error(`line ${n}: duplicate key "${m[1]}"`);
      i++;
      const next = lines[i];
      if (m[2] !== undefined) out[m[1]] = scalar(m[2], n);
      else if (next && next.indent > indent) out[m[1]] = isItem(next) ? list(next.indent) : map(next.indent);
      else if (next && next.indent === indent && isItem(next)) out[m[1]] = list(indent);
      else out[m[1]] = null;
    }
    if (i < lines.length && lines[i].indent >= indent && !(lines[i].indent === indent && isItem(lines[i]))) {
      throw new Error(`line ${lines[i].n}: unexpected indentation`);
    }
    return out;
  }

  function list(indent) {
    const out = [];
    while (i < lines.length && lines[i].indent === indent && isItem(lines[i])) {
      const { text, n } = lines[i];
      const rest = text.slice(1).trim();
      if (/^[A-Za-z0-9_-]+:(\s|$)/.test(rest)) {
        lines[i] = { indent: indent + 2, text: rest, n }; // treat "- key: v" as a map at indent + 2
        out.push(map(indent + 2));
      } else {
        if (!rest) throw new Error(`line ${n}: empty list item`);
        i++;
        out.push(scalar(rest, n));
      }
    }
    return out;
  }

  if (!lines.length) return {};
  if (lines[0].indent !== 0) throw new Error(`line ${lines[0].n}: unexpected indentation`);
  const doc = map(0);
  if (i < lines.length) throw new Error(`line ${lines[i].n}: unexpected content`);
  return doc;
}

// ---------- Queue files ----------

export function parsePost(src, file) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/);
  if (!m) throw new Error("missing --- frontmatter --- block at the top");
  const meta = parseYaml(m[1]);
  const texts = {};
  let key = "default";
  let buf = [];
  const flush = () => {
    if (key in texts) throw new Error(`override <!-- ${key} --> appears twice`);
    texts[key] = buf.join("\n").trim();
  };
  for (const line of (m[2] ?? "").split(/\r?\n/)) {
    const mk = line.match(/^<!--\s*([a-z0-9]+)\s*-->\s*$/);
    if (mk) {
      flush();
      key = mk[1];
      buf = [];
    } else buf.push(line);
  }
  flush();
  const week = file.split("/").at(-2) ?? "";
  return { file, meta, texts, campaign: week.toLowerCase() };
}

export const textFor = (post, id) => post.texts[id] || post.texts.default || "";

// ---------- Text helpers ----------

export const URL_RE = /https?:\/\/[^\s<>"'`]*[^\s<>"'`.,;:!?)\]]/g;
const TAG_RE = /(^|\s)#([\p{L}\p{N}_]*[\p{L}_][\p{L}\p{N}_]*)/gu;
const isVideo = (p) => /\.(mp4|mov|m4v)$/i.test(p.split("?")[0]);
const isImage = (p) => /\.(png|jpe?g|webp|gif)$/i.test(p.split("?")[0]);
export const mediaUrl = (v) =>
  /^https:\/\//.test(v) ? v : MEDIA_BASE + v.split("/").map(encodeURIComponent).join("/");

export function utm(url, platform, campaign) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  // Media files and links that already carry tracking stay as they are.
  if (u.hostname === "raw.githubusercontent.com" || isImage(u.pathname) || isVideo(u.pathname)) return url;
  if ([...u.searchParams.keys()].some((k) => k.startsWith("utm_"))) return url;
  u.searchParams.set("utm_source", platform);
  u.searchParams.set("utm_medium", "social");
  if (campaign) u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}

export const tagLinks = (text, platform, campaign) => text.replace(URL_RE, (m) => utm(m, platform, campaign));

// The text a platform receives. Bluesky keeps the plain URL on screen and puts the tagged one in the
// link facet, so tags cost no graphemes there.
export const outText = (post, id) =>
  id === "bluesky" ? textFor(post, id) : tagLinks(textFor(post, id), id, post.campaign);

export const graphemes = (s) => [...new Intl.Segmenter().segment(s)].length;
export const xLength = (s) => [...s.replace(URL_RE, "x".repeat(23))].length;

const LIMITS = {
  x: (t) => [xLength(t), 280, "characters (links count as 23)"],
  bluesky: (t) => [graphemes(t), 300, "graphemes"],
  threads: (t) => [[...t].length, 500, "characters"],
  instagram: (t) => [[...t].length, 2200, "characters"],
  tiktok: (t) => [[...t].length, 2200, "characters"],
  youtube: (t) => [[...t].length, 5000, "characters"],
};

export function blueskyFacets(text, campaign) {
  const enc = new TextEncoder();
  const byteAt = (i) => enc.encode(text.slice(0, i)).length;
  const facets = [];
  for (const m of text.matchAll(URL_RE)) {
    const start = byteAt(m.index);
    facets.push({
      index: { byteStart: start, byteEnd: start + enc.encode(m[0]).length },
      features: [{ $type: "app.bsky.richtext.facet#link", uri: utm(m[0], "bluesky", campaign) }],
    });
  }
  for (const m of text.matchAll(TAG_RE)) {
    const start = byteAt(m.index + m[1].length);
    facets.push({
      index: { byteStart: start, byteEnd: start + enc.encode(`#${m[2]}`).length },
      features: [{ $type: "app.bsky.richtext.facet#tag", tag: m[2] }],
    });
  }
  return facets.sort((a, b) => a.index.byteStart - b.index.byteStart);
}

// ---------- Validation ----------

export function validate(post, byId) {
  const { meta } = post;
  const errors = [];
  const warnings = [];
  if (!/^queue\/\d{4}-W\d{2}\/[^/]+\.md$/.test(post.file)) errors.push("path must be queue/YYYY-Www/<slug>.md");
  for (const k of Object.keys(meta)) if (!FIELDS.has(k)) errors.push(`unknown field "${k}"`);
  if (!["kit", "app"].includes(meta.stream)) errors.push("stream must be kit or app");
  const platforms = Array.isArray(meta.platforms) ? meta.platforms : [];
  if (!platforms.length) errors.push("platforms must be a non-empty list, like [x, bluesky]");
  if (new Set(platforms).size !== platforms.length) errors.push("platforms lists the same platform twice");
  const atOk = typeof meta.at === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?Z$/.test(meta.at);
  post.atMs = atOk ? Date.parse(meta.at) : NaN;
  if (Number.isNaN(post.atMs)) errors.push("at must be ISO 8601 UTC, like 2026-10-12T09:00:00Z");
  for (const k of ["ai", "article", "draft"]) {
    if (meta[k] != null && typeof meta[k] !== "boolean") errors.push(`${k} must be true or false`);
  }
  if (meta.title != null && typeof meta.title !== "string") errors.push("title must be text");
  for (const k of ["media", "thumb"]) {
    const v = meta[k];
    if (v == null) continue;
    if (typeof v !== "string") errors.push(`${k} must be a path or URL`);
    else if (/^[a-z]+:/i.test(v) ? !/^https:\/\//.test(v) : v.startsWith("/") || v.split("/").includes("..")) {
      errors.push(`${k} must be a path in focalstudio/media or an https URL`);
    } else if (k === "thumb" ? !isImage(v) : !isImage(v) && !isVideo(v)) {
      errors.push(`${k} must be ${k === "thumb" ? "an image" : "an image or video"} (by file extension)`);
    }
  }
  if (meta.tags != null) {
    if (!Array.isArray(meta.tags) || meta.tags.length > 4 || meta.tags.some((t) => !/^[a-z0-9]+$/.test(String(t)))) {
      errors.push("tags must be at most 4 lowercase alphanumeric words");
    }
  }
  for (const k of Object.keys(post.texts)) {
    if (k !== "default" && !platforms.includes(k)) errors.push(`override <!-- ${k} --> is not in platforms`);
  }
  const video = typeof meta.media === "string" && isVideo(meta.media);
  const image = typeof meta.media === "string" && isImage(meta.media);
  for (const id of platforms) {
    const cfg = byId[id];
    if (!cfg) {
      errors.push(`${id}: not in platforms.yml`);
      continue;
    }
    if (cfg.enabled === false) {
      errors.push(`${id}: disabled in platforms.yml`);
      continue;
    }
    if (!(cfg.streams ?? []).includes(meta.stream)) errors.push(`${id}: not used for the ${meta.stream} stream`);
    if (cfg.media === "video" && !video) errors.push(`${id}: needs a video in media`);
    if (cfg.kind === "article") {
      if (meta.article !== true) errors.push(`${id}: needs article: true`);
      if (!meta.title) errors.push(`${id}: needs a title`);
    }
    if (id === "youtube" && !meta.title) errors.push("youtube: needs a title");
    if (id === "youtube" && meta.title && [...meta.title].length > 100) errors.push("youtube: title is over 100 characters");
    const text = outText(post, id);
    if (!text.trim()) errors.push(`${id}: text is empty`);
    const lim = LIMITS[id];
    if (lim) {
      const [n, max, unit] = lim(text);
      if (n > max) errors.push(`${id}: ${n}/${max} ${unit}`);
    }
    if (id === "bluesky") {
      if (video) warnings.push("bluesky: the video isn't uploaded, the post is text only");
      if (meta.thumb && !image && !text.match(URL_RE)) errors.push("bluesky: thumb needs a link in the text");
    }
  }
  return { errors, warnings };
}

// ---------- Loading ----------

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)],
  );
}

const rel = (p) => relative(ROOT, p).split(sep).join("/");

export function loadPlatforms() {
  const order = parseYaml(readFileSync(join(ROOT, "platforms.yml"), "utf8")).order ?? [];
  return { order, byId: Object.fromEntries(order.map((p) => [p.id, p])) };
}

function loadQueue(byId) {
  const posts = [];
  const invalid = [];
  let drafts = 0;
  for (const path of walk(join(ROOT, "queue")).filter((p) => p.endsWith(".md")).sort()) {
    const file = rel(path);
    try {
      const post = parsePost(readFileSync(path, "utf8"), file);
      const { errors, warnings } = validate(post, byId);
      post.warnings = warnings;
      if (errors.length) invalid.push({ file, errors });
      else if (post.meta.draft) drafts++;
      else posts.push(post);
    } catch (e) {
      invalid.push({ file, errors: [e.message] });
    }
  }
  return { posts, invalid, drafts };
}

const key = (file, platform) => `${file}|${platform}`;

function loadPublished() {
  const list = existsSync(PUBLISHED) ? JSON.parse(readFileSync(PUBLISHED, "utf8")) : [];
  return { list, done: new Set(list.map((r) => key(r.file, r.platform))) };
}

export function dueState(route, atMs, now) {
  if (atMs < now - STALE) return "stale";
  if (route === "buffer") return atMs <= now + BUFFER_WINDOW ? "due" : "later";
  return atMs <= now ? "due" : "later";
}

function buildJobs(order, posts, done, now) {
  const jobs = [];
  for (const cfg of order) {
    if (cfg.enabled === false) continue;
    const mine = posts.filter((p) => p.meta.platforms.includes(cfg.id)).sort((a, b) => a.atMs - b.atMs);
    for (const post of mine) {
      const state = done.has(key(post.file, cfg.id)) ? "posted" : dueState(cfg.route, post.atMs, now);
      jobs.push({ cfg, post, state });
    }
  }
  return jobs;
}

function reportQueue(order, posts, invalid, drafts, jobs) {
  say(`Queue: ${posts.length} post(s) ready, ${drafts} draft(s), ${invalid.length} invalid`);
  for (const { file, errors } of invalid) say(`❌ ${file}\n   ${errors.join("\n   ")}`);
  for (const p of posts) for (const w of p.warnings) say(`⚠️  ${p.file}: ${w}`);
  for (const cfg of order) {
    const mine = jobs.filter((j) => j.cfg === cfg);
    if (!mine.length) continue;
    say(`\n${cfg.id} (tier ${cfg.tier}, ${cfg.route})`);
    for (const j of mine) say(`  ${j.state.padEnd(6)}  ${j.post.meta.at}  ${j.post.file}`);
  }
  const count = (s) => jobs.filter((j) => j.state === s).length;
  say(`\n${count("due")} due · ${count("posted")} already posted · ${count("later")} later · ${count("stale")} stale`);
  for (const j of jobs.filter((x) => x.state === "stale")) {
    say(`⚠️  stale, not posted: ${j.cfg.id} · ${j.post.file} was due ${j.post.meta.at}. Change "at" or delete it.`);
  }
}

// ---------- HTTP (the dry run swaps every write for a printout) ----------

const SECRET_KEY = /pass(word)?|token|secret|authorization|api-key|jwt/i;

function redact(v) {
  if (Array.isArray(v)) return v.map(redact);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SECRET_KEY.test(k) ? "***" : redact(x)]));
  }
  return v;
}

function redactUrl(url) {
  const u = new URL(url);
  for (const k of [...u.searchParams.keys()]) if (SECRET_KEY.test(k)) u.searchParams.set(k, "***");
  return decodeURI(u.toString());
}

const jsonReq = (headers, body) => ({
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify(body),
  shown: body,
});
const formReq = (params) => ({ method: "POST", body: new URLSearchParams(params), shown: params });

function getUrl(base, params) {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u;
}

async function call(url, { shown, ...init } = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  if (!res.ok) {
    const msg = body?.error?.message ?? body?.message ?? body?.error ?? JSON.stringify(body).slice(0, 300);
    throw new Error(`HTTP ${res.status} ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
  }
  return body;
}

function makeHttp(dryRun) {
  return {
    dryRun,
    read: (url, init) => call(url, init),
    async write(url, init, stub) {
      if (!dryRun) return call(url, init);
      say(`→ ${init.method} ${redactUrl(String(url))}`);
      const headers = redact(init.headers ?? {});
      if (Object.keys(headers).length) say(`  headers ${JSON.stringify(headers)}`);
      say(typeof init.shown === "string" ? `  body ${init.shown}` : JSON.stringify(redact(init.shown), null, 2).replace(/^/gm, "  "));
      return stub;
    },
  };
}

async function waitFinished(http, url, field, minutes) {
  if (http.dryRun) return say(`  (then poll until ${field} = FINISHED)`);
  const end = Date.now() + minutes * 60e3;
  for (;;) {
    const b = await http.read(url);
    if (b[field] === "FINISHED") return;
    if (b[field] === "ERROR" || b[field] === "EXPIRED") {
      throw new Error(`container ${b[field]}: ${b.error_message ?? b.status ?? "no detail"}`);
    }
    if (Date.now() > end) throw new Error(`container still ${b[field]} after ${minutes} min`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}

// Read the permalink after posting. The post is already live, so a failure here must not fail the job.
async function permalink(http, base, id, token) {
  if (http.dryRun) return null;
  try {
    return (await http.read(getUrl(`${base}/${id}`, { fields: "permalink", access_token: token }))).permalink ?? null;
  } catch {
    return null;
  }
}

function needLive(http, ...keys) {
  if (!http.dryRun) need(...keys);
}

// ---------- Buffer: X, YouTube, TikTok ----------

const CREATE_POST = `mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    __typename
    ... on PostActionSuccess { post { id dueAt } }
    ... on MutationError { message }
  }
}`;

async function bufferCall(http, query, variables, stub) {
  const init = jsonReq({ Authorization: `Bearer ${env("BUFFER_API_KEY")}` }, variables ? { query, variables } : { query });
  const body = stub ? await http.write("https://api.buffer.com", init, stub) : await http.read("https://api.buffer.com", init);
  if (body.errors) throw new Error(`Buffer: ${body.errors.map((e) => e.message).join("; ")}`);
  return body.data;
}

let bufferCtx;
async function bufferContext(http) {
  if (bufferCtx) return bufferCtx;
  if (!env("BUFFER_API_KEY")) {
    needLive(http, "BUFFER_API_KEY");
    say("  (no BUFFER_API_KEY: channel IDs are placeholders)");
    return (bufferCtx = { placeholder: true, channels: {}, pending: {} });
  }
  const ctx = { channels: {}, pending: {} };
  const d = await bufferCall(http, "{ account { organizations { id } } }");
  for (const o of d.account.organizations) {
    const c = await bufferCall(http, `{ channels(input: { organizationId: ${JSON.stringify(o.id)} }) { id name service } }`);
    for (const ch of c.channels) ctx.channels[ch.service] ??= { ...ch, orgId: o.id };
  }
  return (bufferCtx = ctx);
}

async function bufferScheduled(http, ch) {
  const d = await bufferCall(
    http,
    `{ posts(first: 100, input: { organizationId: ${JSON.stringify(ch.orgId)}, filter: { channelIds: [${JSON.stringify(ch.id)}], status: [scheduled] } }) { edges { node { id } } } }`,
  );
  return d.posts.edges?.length ?? 0;
}

export function bufferInput({ cfg, post }, channelId, now) {
  const { meta } = post;
  const ai = meta.ai === true;
  const assets = [];
  if (meta.media) {
    const url = mediaUrl(meta.media);
    if (isVideo(meta.media)) assets.push({ video: meta.thumb ? { url, thumbnailUrl: mediaUrl(meta.thumb) } : { url } });
    else assets.push({ image: { url } });
  }
  const metadata = {
    x: { twitter: { isAiGenerated: ai } },
    youtube: { youtube: { title: meta.title, privacy: "public", madeForKids: false, isAiGenerated: ai } },
    tiktok: { tiktok: { ...(meta.title && { title: meta.title }), isAiGenerated: ai } },
  }[cfg.id];
  return {
    channelId,
    text: outText(post, cfg.id),
    schedulingType: "automatic",
    mode: "customScheduled",
    dueAt: new Date(Math.max(post.atMs, now + BUFFER_LEAD)).toISOString(),
    needsApproval: false,
    assets,
    ...(metadata && { metadata }),
  };
}

async function postBuffer(http, job, now) {
  const service = BUFFER_SERVICE[job.cfg.id] ?? job.cfg.id;
  const ctx = await bufferContext(http);
  const ch = ctx.placeholder ? { id: `<channel:${service}>` } : ctx.channels[service];
  if (!ch) throw new Error(`Buffer has no ${service} channel connected`);
  if (!ctx.placeholder) {
    ctx.pending[service] ??= await bufferScheduled(http, ch);
    if (ctx.pending[service] >= BUFFER_CAP) return { deferred: `Buffer already has ${BUFFER_CAP} scheduled on ${service}` };
  }
  const input = bufferInput(job, ch.id, now);
  const stub = { data: { createPost: { __typename: "PostActionSuccess", post: { id: "<dry-run>", dueAt: input.dueAt } } } };
  const r = (await bufferCall(http, CREATE_POST, { input }, stub)).createPost;
  if (!r?.post) throw new Error(`Buffer ${r?.__typename ?? "error"}: ${r?.message ?? "no post returned"}`);
  ctx.pending[service] = (ctx.pending[service] ?? 0) + 1;
  return { id: r.post.id, url: null, status: "scheduled", dueAt: r.post.dueAt };
}

// ---------- Bluesky ----------

async function uploadBlob(http, auth, url) {
  if (http.dryRun) {
    say(`→ POST ${BSKY}/com.atproto.repo.uploadBlob\n  body <the bytes of ${url}>`);
    return { $type: "blob", ref: { $link: "<dry-run>" }, mimeType: "image/*", size: 0 };
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length > 1_000_000) throw new Error(`${url} is ${bytes.length} bytes; Bluesky images max out at 1 MB`);
  const ext = url.split("?")[0].split(".").pop().toLowerCase();
  const type = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" }[ext];
  return (await http.write(`${BSKY}/com.atproto.repo.uploadBlob`, { method: "POST", headers: { ...auth, "Content-Type": type }, body: bytes })).blob;
}

async function postBluesky(http, { post }) {
  needLive(http, "BLUESKY_HANDLE", "BLUESKY_APP_PASSWORD");
  const { meta } = post;
  const s = await http.write(
    `${BSKY}/com.atproto.server.createSession`,
    jsonReq({}, { identifier: env("BLUESKY_HANDLE"), password: env("BLUESKY_APP_PASSWORD") }),
    { accessJwt: "<jwt>", did: "did:plc:<dry-run>", handle: env("BLUESKY_HANDLE") || "<handle>" },
  );
  const auth = { Authorization: `Bearer ${s.accessJwt}` };
  const text = textFor(post, "bluesky");
  const record = { $type: "app.bsky.feed.post", text, createdAt: new Date().toISOString(), langs: ["en"] };
  const facets = blueskyFacets(text, post.campaign);
  if (facets.length) record.facets = facets;
  const link = text.match(URL_RE)?.[0];
  if (meta.media && isImage(meta.media)) {
    const blob = await uploadBlob(http, auth, mediaUrl(meta.media));
    record.embed = { $type: "app.bsky.embed.images", images: [{ image: blob, alt: meta.title ?? "" }] };
  } else if (meta.thumb && link) {
    const blob = await uploadBlob(http, auth, mediaUrl(meta.thumb));
    record.embed = {
      $type: "app.bsky.embed.external",
      external: { uri: utm(link, "bluesky", post.campaign), title: meta.title ?? new URL(link).hostname, description: "", thumb: blob },
    };
  }
  const r = await http.write(
    `${BSKY}/com.atproto.repo.createRecord`,
    jsonReq(auth, { repo: s.did, collection: "app.bsky.feed.post", record }),
    { uri: `at://${s.did}/app.bsky.feed.post/<dry-run>`, cid: "<cid>" },
  );
  return { id: r.uri, url: `https://bsky.app/profile/${s.handle}/post/${r.uri.split("/").pop()}` };
}

// ---------- dev.to ----------

async function postDevto(http, { post }) {
  needLive(http, "DEVTO_API_KEY");
  const { meta } = post;
  const article = {
    title: meta.title,
    body_markdown: tagLinks(textFor(post, "devto"), "devto", post.campaign),
    published: true,
    tags: meta.tags ?? [],
    ...(meta.thumb && { main_image: mediaUrl(meta.thumb) }),
  };
  const r = await http.write("https://dev.to/api/articles", jsonReq({ "api-key": env("DEVTO_API_KEY") }, { article }), {
    id: "<dry-run>",
    url: null,
  });
  return { id: r.id, url: r.url ?? null };
}

// ---------- Threads ----------

async function postThreads(http, { post }) {
  needLive(http, "THREADS_TOKEN", "THREADS_USER_ID");
  const { meta } = post;
  const uid = env("THREADS_USER_ID") || "<user-id>";
  const token = env("THREADS_TOKEN");
  const params = { media_type: "TEXT", text: outText(post, "threads"), access_token: token };
  if (meta.media && isVideo(meta.media)) Object.assign(params, { media_type: "VIDEO", video_url: mediaUrl(meta.media) });
  else if (meta.media) Object.assign(params, { media_type: "IMAGE", image_url: mediaUrl(meta.media) });
  const c = await http.write(`${THREADS_API}/${uid}/threads`, formReq(params), { id: "<container-id>" });
  await waitFinished(http, getUrl(`${THREADS_API}/${c.id}`, { fields: "status,error_message", access_token: token }), "status", 5);
  const p = await http.write(`${THREADS_API}/${uid}/threads_publish`, formReq({ creation_id: c.id, access_token: token }), {
    id: "<dry-run>",
  });
  return { id: p.id, url: await permalink(http, THREADS_API, p.id, token) };
}

// ---------- Instagram Reels ----------

async function postInstagram(http, { post }) {
  needLive(http, "IG_TOKEN", "IG_USER_ID");
  const { meta } = post;
  const uid = env("IG_USER_ID") || "<ig-user-id>";
  const token = env("IG_TOKEN");
  const params = {
    media_type: "REELS",
    video_url: mediaUrl(meta.media),
    caption: outText(post, "instagram"),
    share_to_feed: "true",
    ...(meta.thumb && { cover_url: mediaUrl(meta.thumb) }),
    access_token: token,
  };
  const c = await http.write(`${IG_API}/${uid}/media`, formReq(params), { id: "<container-id>" });
  await waitFinished(http, getUrl(`${IG_API}/${c.id}`, { fields: "status_code,status", access_token: token }), "status_code", 10);
  const p = await http.write(`${IG_API}/${uid}/media_publish`, formReq({ creation_id: c.id, access_token: token }), {
    id: "<dry-run>",
  });
  return { id: p.id, url: await permalink(http, IG_API, p.id, token) };
}

const POSTERS = { buffer: postBuffer, bluesky: postBluesky, devto: postDevto, threads: postThreads, instagram: postInstagram };

// ---------- Media check ----------

const mediaChecked = new Map();
function checkMedia(url) {
  if (!mediaChecked.has(url)) {
    mediaChecked.set(
      url,
      (async () => {
        const res = await fetch(url, { method: "HEAD", redirect: "manual" });
        if (res.status >= 300 && res.status < 400) throw new Error(`${url} redirects; Buffer and Meta need a direct URL`);
        if (res.status !== 200) throw new Error(`${url}: HTTP ${res.status}`);
        const len = Number(res.headers.get("content-length") ?? 0);
        if (len > MAX_MEDIA) throw new Error(`${url} is ${(len / 1048576).toFixed(1)} MB; keep media under 50 MB`);
      })(),
    );
  }
  return mediaChecked.get(url);
}

// ---------- Commands ----------

function plan() {
  const { order, byId } = loadPlatforms();
  const { posts, invalid, drafts } = loadQueue(byId);
  const { done } = loadPublished();
  reportQueue(order, posts, invalid, drafts, buildJobs(order, posts, done, Date.now()));
  return invalid.length ? 1 : 0;
}

async function publish(dryRun) {
  const now = Date.now();
  const { order, byId } = loadPlatforms();
  const { posts, invalid, drafts } = loadQueue(byId);
  const pub = loadPublished();
  const jobs = buildJobs(order, posts, pub.done, now);
  if (dryRun) say("DRY RUN: nothing is sent. Each request below is printed with secrets as ***.\n");
  reportQueue(order, posts, invalid, drafts, jobs);
  const http = makeHttp(dryRun);
  let ok = 0;
  let failed = invalid.length;
  let deferred = 0;
  for (const job of jobs.filter((j) => j.state === "due")) {
    const { cfg, post } = job;
    say(`\n▶ ${cfg.id} · ${post.file}`);
    try {
      for (const k of ["media", "thumb"]) if (post.meta[k]) await checkMedia(mediaUrl(post.meta[k]));
      const poster = POSTERS[cfg.route === "buffer" ? "buffer" : cfg.id];
      if (!poster) throw new Error(`no poster for ${cfg.id} (route ${cfg.route})`);
      const r = await poster(http, job, now);
      if (r.deferred) {
        deferred++;
        say(`⏭  deferred: ${r.deferred}. The next run tries again.`);
        continue;
      }
      if (!dryRun) {
        // Written straight away, so a crash later in the run can never cause a second post.
        const { deferred: _, ...rest } = r;
        pub.list.push({ file: post.file, platform: cfg.id, ...rest, at: post.meta.at, postedAt: new Date().toISOString() });
        writeFileSync(PUBLISHED, `${JSON.stringify(pub.list, null, 2)}\n`);
      }
      ok++;
      say(`✅ ${cfg.id}${dryRun ? " (dry run)" : `: ${r.url ?? r.id}${r.status ? ` (${r.status} for ${r.dueAt})` : ""}`}`);
    } catch (e) {
      failed++;
      say(`❌ ${cfg.id} · ${post.file}: ${e.message}`);
    }
  }
  say(`\n${ok} ${dryRun ? "would post" : "posted"} · ${deferred} deferred · ${failed} failed`);
  return failed ? 1 : 0;
}

async function refreshToken(base, grant, k) {
  need(k);
  const res = await fetch(getUrl(base, { grant_type: grant, access_token: env(k) }));
  const b = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`NOT long-lived yet, or under 24 h old: refresh refused (HTTP ${res.status} ${b.error?.message ?? ""})`);
  }
  // The new token in b.access_token is deliberately dropped: this command only reports.
  return `long-lived; a refresh would last ${Math.round(b.expires_in / 86400)} days. Not saved: ${k} is unchanged`;
}

// ---------- CLI ----------

async function main([cmd, ...args]) {
  if (cmd === "check") {
    await step("Buffer: organisations + channels", checkBuffer);
    await step("Bluesky: login", checkBluesky);
    await step("dev.to: login", checkDevto);
    await step("Threads: token", checkThreads);
    await step("Instagram: token + publish scope", checkInstagram);
    say("\nBuffer input schema (what createPost accepts):");
    await step("Buffer: schema introspection", checkBufferSchema);
    const failed = results.filter((r) => !r.ok);
    say(`\n${results.length - failed.length}/${results.length} checks passed`);
    return failed.length ? 1 : 0;
  }
  if (cmd === "plan" && !args.length) return plan();
  if (cmd === "publish" && args.every((a) => a === "--dry-run")) return publish(args.includes("--dry-run"));
  if (cmd === "refresh" && !args.length) {
    await step("Threads: token lifetime", () =>
      refreshToken("https://graph.threads.net/refresh_access_token", "th_refresh_token", "THREADS_TOKEN"),
    );
    await step("Instagram: token lifetime", () =>
      refreshToken("https://graph.instagram.com/refresh_access_token", "ig_refresh_token", "IG_TOKEN"),
    );
    return results.some((r) => !r.ok) ? 1 : 0;
  }
  console.error("usage: node scripts/publish.mjs check | plan | publish [--dry-run] | refresh");
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main(process.argv.slice(2)));
}
