// Style gallery. Plain Node 22, no dependencies.
//
//   node scripts/gallery.mjs build [--inline OUT.html]   writes docs/styles/index.html from the cards in video/styles/cards/
//                                                        and video/fonts/fonts.json; --inline writes a self-contained copy
//   node scripts/gallery.mjs previews [--only id]        renders three stills per style into video/styles/cards/previews/
//                                                        (needs Pillow, ffmpeg and Chrome; run locally, never in CI)
//
// A card is video/styles/cards/<id>.md: front matter (the subset parseYaml reads) plus ## Look, ## Do, ## Don't and
// ## Prompt recipe. The page is a pure function of the cards, so CI can check that the committed copy is current.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseYaml } from "./publish.mjs";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const CARDS = join(ROOT, "video", "styles", "cards");
export const PAGE = join(ROOT, "docs", "styles", "index.html");
export const STATUSES = ["in-use", "built", "planned", "retired"];
const LABEL = { "in-use": "In use", built: "Built", planned: "Planned", retired: "Retired" };
const SECTIONS = ["Look", "Do", "Don't", "Prompt recipe"];
const HEX = /^#[0-9a-f]{6}$/;

// ---------- cards ----------

export function parseCard(src, file) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/);
  if (!m) throw new Error(`${file}: missing --- frontmatter --- block`);
  const meta = parseYaml(m[1]);
  const body = {};
  let key = null;
  for (const line of (m[2] ?? "").split(/\r?\n/)) {
    const h = line.match(/^## (.+?)\s*$/);
    if (h) body[(key = h[1])] = [];
    else if (key) body[key].push(line);
  }
  for (const k of Object.keys(body)) body[k] = body[k].join("\n").trim();
  return { ...meta, body };
}

export function loadCards(dir = CARDS) {
  const cards = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => ({ ...parseCard(readFileSync(join(dir, f), "utf8"), f), file: f }));
  return cards.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status)); // stable: ids stay alphabetical within a status
}

export function loadFonts() {
  return JSON.parse(readFileSync(join(ROOT, "video", "fonts", "fonts.json"), "utf8"));
}

export function previewNames(card) {
  return Array.from({ length: card.previews ?? 0 }, (_, i) => `${card.id}-${i + 1}.jpg`);
}

// Problems with a card, as strings; empty when it is fine.
export function cardProblems(card, fonts) {
  const bad = [];
  for (const k of ["id", "name", "status", "engine", "summary", "prompt", "palette", "fonts"]) {
    if (card[k] === undefined || card[k] === null || card[k] === "") bad.push(`${card.file}: missing ${k}`);
  }
  if (card.id && `${card.id}.md` !== card.file) bad.push(`${card.file}: id "${card.id}" does not match the file name`);
  if (card.status && !STATUSES.includes(card.status)) bad.push(`${card.file}: status "${card.status}" is not one of ${STATUSES.join(", ")}`);
  if (card.engine && !["pillow", "canvas"].includes(card.engine)) bad.push(`${card.file}: engine "${card.engine}" is not pillow or canvas`);
  if (card.status !== "planned" && !card.source) bad.push(`${card.file}: missing source`);
  for (const [role, hex] of Object.entries(card.palette ?? {})) if (!HEX.test(hex)) bad.push(`${card.file}: palette ${role} "${hex}" is not #rrggbb`);
  for (const f of card.fonts ?? []) if (!fonts.some((x) => x.family === f)) bad.push(`${card.file}: font "${f}" is not in fonts.json`);
  for (const s of SECTIONS) if (!card.body?.[s]) bad.push(`${card.file}: missing ## ${s}`);
  if (card.status !== "planned" && !card.previews) bad.push(`${card.file}: a ${card.status} style needs previews`);
  if (card.previews && !card.previews_from) bad.push(`${card.file}: previews needs previews_from`);
  return bad;
}

// ---------- html ----------

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const inline = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
const md = (text) =>
  text
    .split(/\n{2,}/)
    .map((blk) => {
      const lines = blk.split("\n");
      return lines.every((l) => l.startsWith("- "))
        ? `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join("")}</ul>`
        : `<p>${inline(blk)}</p>`;
    })
    .join("");

const swatch = ([role, hex]) =>
  `<button class="sw" type="button" data-copy="${hex}" title="Copy ${hex}"><i style="background:${hex}"></i><b>${esc(role)}</b><span>${hex}</span></button>`;
const chips = (pal) => Object.values(pal).map((h) => `<i style="background:${h}"></i>`).join("");

export function render(cards, fonts, brand, { src = (p) => p, fontUrl } = {}) {
  const tag = (c) => `<span class="tag ${c.status}">${LABEL[c.status]}</span><span class="tag eng">${c.engine}</span>`;
  const thumb = (c) => {
    const names = previewNames(c);
    return names.length
      ? names.map((n, i) => `<img src="${src(`video/styles/cards/previews/${n}`)}" alt="${esc(c.name)} still ${i + 1}" loading="lazy"${i ? "" : ' class="on"'}>`).join("")
      : `<div class="ph">${chips(c.palette)}<span>planned</span></div>`;
  };
  const cardHtml = cards
    .map(
      (c) => `<article class="card" data-id="${c.id}" data-status="${c.status}" data-engine="${c.engine}" data-q="${esc(`${c.name} ${c.summary} ${c.id}`.toLowerCase())}" tabindex="0">
  <div class="thumb">${thumb(c)}</div>
  <div class="meta"><h3>${esc(c.name)}</h3><p>${esc(c.summary)}</p><div class="row">${tag(c)}</div><div class="chips">${chips(c.palette)}</div></div>
</article>
<template id="d-${c.id}">
  <div class="dhead"><div><h2>${esc(c.name)}</h2><div class="row">${tag(c)}<code>${c.id}</code></div></div></div>
  <div class="dshots">${thumb(c)}</div>
  <p class="lead">${esc(c.summary)}</p>
  <h4>Look</h4>${md(c.body.Look)}
  <div class="two"><div><h4>Do</h4>${md(c.body.Do)}</div><div><h4>Don't</h4>${md(c.body["Don't"])}</div></div>
  <h4>Palette</h4><div class="sws">${Object.entries(c.palette).map(swatch).join("")}</div>
  <h4>Fonts</h4><p>${c.fonts.map(esc).join(", ")}</p>
  <h4>Example prompt</h4><pre>${esc(c.prompt)}</pre><button class="btn" type="button" data-copy="${esc(c.prompt)}">Copy prompt</button>
  <h4>Prompt recipe</h4><pre>${esc(c.body["Prompt recipe"])}</pre><button class="btn" type="button" data-copy="${esc(c.body["Prompt recipe"])}">Copy recipe</button>
  <h4>Used in</h4><p>${c.used_in.length ? c.used_in.map((u) => `<code>${esc(u)}</code>`).join(" ") : "Nothing yet."}${c.source ? ` Source: <code>${esc(c.source)}</code>` : ""}</p>
</template>`,
    )
    .join("\n");

  const fontRows = fonts
    .map(
      (f) => `<div class="frow ${f.status}">
  <div class="sample" style="${f.status === "installed" ? `font-family:'${f.family}'` : ""}">Just focus on what matters.</div>
  <div class="finfo"><b>${esc(f.family)}</b> <span class="tag ${f.status === "installed" ? "in-use" : "planned"}">${f.status}</span>
  <span>${esc(f.role)} · ${esc(f.license)}</span><span>google/fonts <code>${esc(f.source)}</code></span>
  <span>${f.styles.length ? f.styles.map((s) => `<a href="#styles/${s}">${esc(s)}</a>`).join(", ") : "no style yet"}</span></div>
</div>`,
    )
    .join("\n");

  const strips = [
    ...(brand ? [{ id: "", name: "WildFocus brand", pal: brand }] : []),
    ...cards.map((c) => ({ id: c.id, name: c.name, pal: c.palette, status: c.status })),
  ]
    .map(
      (s) => `<section class="strip"><h3>${s.id ? `<a href="#styles/${s.id}">${esc(s.name)}</a>` : esc(s.name)}${s.status === "planned" ? ' <span class="tag planned">proposed</span>' : ""}</h3><div class="sws">${Object.entries(s.pal).map(swatch).join("")}</div></section>`,
    )
    .join("\n");

  const filter = (key, vals) => `<div class="chipset" data-key="${key}"><button type="button" class="on" data-v="">All</button>${vals.map((v) => `<button type="button" data-v="${v}">${LABEL[v] ?? v}</button>`).join("")}</div>`;
  const count = (s) => cards.filter((c) => c.status === s).length;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Focal Studio styles</title>
<style>
@font-face{font-family:Nunito;src:url("${fontUrl}");font-weight:200 1000}
:root{--bg:#faf7f0;--card:#fff;--ink:#2b2622;--mute:#6f675f;--line:#e6dfd2;--accent:#4a7c59;--accent-ink:#fff;--shadow:0 1px 2px rgba(0,0,0,.06),0 6px 20px rgba(60,40,20,.07)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#171513;--card:#211e1b;--ink:#f1ece4;--mute:#a49b90;--line:#352f29;--accent:#7fb48d;--accent-ink:#10200f;--shadow:0 1px 2px rgba(0,0,0,.4)}}
:root[data-theme="dark"]{--bg:#171513;--card:#211e1b;--ink:#f1ece4;--mute:#a49b90;--line:#352f29;--accent:#7fb48d;--accent-ink:#10200f;--shadow:0 1px 2px rgba(0,0,0,.4)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 Nunito,system-ui,sans-serif}
a{color:var(--accent)}
code{font:.85em ui-monospace,Menlo,monospace;background:color-mix(in srgb,var(--ink) 8%,transparent);padding:.1em .35em;border-radius:4px}
header,main{max-width:1180px;margin:0 auto;padding:0 16px}
header{padding-top:32px}
h1{font-size:clamp(1.8rem,5vw,2.6rem);margin:0 0 4px;font-weight:900;letter-spacing:-.01em}
header p{margin:0 0 20px;color:var(--mute);max-width:60ch}
nav{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-bottom:20px}
nav button{font:inherit;font-weight:700;background:none;border:0;border-bottom:3px solid transparent;color:var(--mute);padding:10px 14px;cursor:pointer}
nav button[aria-selected="true"]{color:var(--ink);border-color:var(--accent)}
.bar{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;margin-bottom:18px}
.chipset{display:flex;flex-wrap:wrap;gap:6px}
.chipset button{font:inherit;font-size:.85rem;font-weight:700;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:99px;padding:4px 12px;cursor:pointer}
.chipset button.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
input[type=search]{font:inherit;padding:6px 12px;border:1px solid var(--line);border-radius:99px;background:var(--card);color:var(--ink);min-width:0;flex:1 1 180px;max-width:280px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(210px,100%),1fr));gap:16px;padding-bottom:48px}
@media (max-width:480px){.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.meta p{display:none}}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:var(--shadow);cursor:pointer;display:flex;flex-direction:column}
.card:focus-visible{outline:3px solid var(--accent)}
.thumb{position:relative;aspect-ratio:9/16;background:var(--line);overflow:hidden}
.thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .4s}
.thumb img.on{opacity:1}
.ph{position:absolute;inset:0;display:flex;flex-direction:column}
.ph i{flex:1}.ph span{position:absolute;inset:auto 0 12px;text-align:center;font-weight:800;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.5)}
.meta{padding:12px 14px 14px}
.meta h3{margin:0;font-size:1.05rem}
.meta p{margin:2px 0 8px;font-size:.88rem;color:var(--mute)}
.row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.tag{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;border-radius:6px;padding:2px 7px;background:var(--line);color:var(--mute)}
.tag.in-use{background:var(--accent);color:var(--accent-ink)}
.tag.built{background:#3a79b8;color:#fff}
.tag.planned{background:#d98a1f;color:#fff}
.chips{display:flex;height:10px;border-radius:5px;overflow:hidden;margin-top:10px}.chips i{flex:1}
.sws{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}
.sw{font:inherit;text-align:left;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:0 0 8px;cursor:pointer;color:var(--ink);overflow:hidden;display:flex;flex-direction:column}
.sw i{display:block;height:44px;border-bottom:1px solid var(--line)}
.sw b{font-size:.82rem;padding:6px 8px 0}.sw span{font:.78rem ui-monospace,Menlo,monospace;color:var(--mute);padding:0 8px}
.strip{margin-bottom:22px}.strip h3{margin:0 0 8px}
.frow{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:16px;align-items:center;padding:16px 0;border-top:1px solid var(--line)}
.sample{font-size:clamp(1.3rem,3.4vw,2rem);font-weight:800;overflow-wrap:anywhere}
.frow.planned .sample{color:var(--mute);font-style:italic}
.finfo{display:flex;flex-direction:column;gap:2px;font-size:.88rem;color:var(--mute)}.finfo b{color:var(--ink);font-size:1rem}
@media (max-width:640px){.frow{grid-template-columns:1fr}}
dialog{width:min(860px,calc(100vw - 24px));max-height:calc(100vh - 24px);border:0;border-radius:18px;padding:0;background:var(--bg);color:var(--ink);box-shadow:0 20px 60px rgba(0,0,0,.4)}
dialog::backdrop{background:rgba(0,0,0,.5)}
#body{padding:20px 20px 28px}
.close{position:sticky;top:0;float:right;margin:10px;font:inherit;font-weight:800;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:99px;padding:4px 14px;cursor:pointer;z-index:2}
.dhead h2{margin:0 0 6px}
.dshots{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:14px 0}
.dshots img{display:block;width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:12px}
.dshots .ph{position:relative;aspect-ratio:9/16;border-radius:12px;overflow:hidden}
.lead{font-size:1.05rem}
#body h4{margin:20px 0 6px;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;color:var(--mute)}
#body ul{margin:0;padding-left:1.2em}
.two{display:grid;grid-template-columns:1fr 1fr;gap:0 24px}@media (max-width:640px){.two{grid-template-columns:1fr}}
pre{white-space:pre-wrap;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px;margin:0 0 8px;font:.85rem/1.5 ui-monospace,Menlo,monospace}
.btn{font:inherit;font-weight:700;background:var(--accent);color:var(--accent-ink);border:0;border-radius:99px;padding:6px 16px;cursor:pointer}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:8px 16px;border-radius:99px;font-weight:700;opacity:0;pointer-events:none;transition:opacity .2s;z-index:10}.toast.show{opacity:1}
[hidden]{display:none!important}
</style>
</head>
<body>
<header>
  <h1>Focal Studio styles</h1>
  <p>${cards.length} looks: ${count("in-use")} in the weekly mix, ${count("built")} built, ${count("planned")} planned, ${count("retired")} retired. Click a style for its stills, palette, fonts and a prompt that makes the same image. Add one with a card in <code>video/styles/cards/</code>.</p>
  <nav role="tablist"><button role="tab" data-tab="styles" aria-selected="true">Styles</button><button role="tab" data-tab="fonts" aria-selected="false">Fonts</button><button role="tab" data-tab="palettes" aria-selected="false">Palettes</button></nav>
</header>
<main>
<section id="tab-styles">
  <div class="bar"><input type="search" placeholder="Search styles" aria-label="Search styles">${filter("status", STATUSES)}${filter("engine", ["pillow", "canvas"])}</div>
  <div class="grid">
${cardHtml}
  </div>
</section>
<section id="tab-fonts" hidden>
${fontRows}
</section>
<section id="tab-palettes" hidden>
${strips}
</section>
</main>
<dialog id="dlg"><button class="close" type="button">Close</button><div id="body"></div></dialog>
<div class="toast" id="toast">Copied</div>
<script>
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const dlg = $("#dlg"), body = $("#body"), toast = $("#toast"), filters = { status: "", engine: "", q: "" };
  const show = tab => { $$("main > section").forEach(s => s.hidden = s.id !== "tab-" + tab); $$("nav button").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === tab)); };
  const route = () => {
    const [tab, id] = location.hash.slice(1).split("/");
    show(["styles", "fonts", "palettes"].includes(tab) ? tab : "styles");
    if (tab === "styles" && id && $("#d-" + id)) open(id); else if (dlg.open) dlg.close();
  };
  const open = id => { body.replaceChildren($("#d-" + id).content.cloneNode(true)); if (!dlg.open) dlg.showModal(); };
  const apply = () => $$(".card").forEach(c => c.hidden = (filters.status && c.dataset.status !== filters.status) || (filters.engine && c.dataset.engine !== filters.engine) || (filters.q && !c.dataset.q.includes(filters.q)));
  const copy = async text => { try { await navigator.clipboard.writeText(text); toast.textContent = "Copied"; } catch { toast.textContent = "Copy failed"; } toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 1200); };
  $$("nav button").forEach(b => b.onclick = () => { location.hash = b.dataset.tab; });
  $$(".chipset").forEach(set => set.onclick = e => { const b = e.target.closest("button"); if (!b) return; $$("button", set).forEach(x => x.classList.toggle("on", x === b)); filters[set.dataset.key] = b.dataset.v; apply(); });
  $("input[type=search]").oninput = e => { filters.q = e.target.value.trim().toLowerCase(); apply(); };
  $$(".card").forEach(c => {
    const go = () => { location.hash = "styles/" + c.dataset.id; };
    c.onclick = go; c.onkeydown = e => { if (e.key === "Enter") go(); };
    const imgs = $$(".thumb img", c); let t, i = 0;
    if (imgs.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      c.onmouseenter = () => { t = setInterval(() => { imgs[i].classList.remove("on"); i = (i + 1) % imgs.length; imgs[i].classList.add("on"); }, 800); };
      c.onmouseleave = () => { clearInterval(t); imgs.forEach((m, k) => m.classList.toggle("on", k === 0)); i = 0; };
    }
  });
  document.addEventListener("click", e => { const b = e.target.closest("[data-copy]"); if (b) copy(b.dataset.copy); });
  $(".close").onclick = () => { location.hash = "styles"; };
  dlg.addEventListener("cancel", e => { e.preventDefault(); location.hash = "styles"; });
  dlg.addEventListener("click", e => { if (e.target === dlg) location.hash = "styles"; });
  addEventListener("hashchange", route);
  route();
})();
</script>
</body>
</html>
`;
}

export function brandPalette() {
  const p = parseYaml(readFileSync(join(ROOT, "apps", "wildfocus.yml"), "utf8")).palette;
  return p && Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v).toLowerCase()]));
}

const mime = { ".jpg": "image/jpeg", ".ttf": "font/ttf" };
const dataUri = (rel) => `data:${mime[rel.slice(rel.lastIndexOf("."))]};base64,${readFileSync(join(ROOT, rel)).toString("base64")}`;

export function build({ inlineOut } = {}) {
  const cards = loadCards(), fonts = loadFonts(), brand = brandPalette();
  const bad = cards.flatMap((c) => cardProblems(c, fonts));
  if (bad.length) throw new Error(bad.join("\n"));
  if (inlineOut) {
    writeFileSync(inlineOut, render(cards, fonts, brand, { src: dataUri, fontUrl: dataUri("video/fonts/Nunito[wght].ttf") }));
    return inlineOut;
  }
  mkdirSync(dirname(PAGE), { recursive: true });
  writeFileSync(PAGE, render(cards, fonts, brand, { src: (p) => `../../${p}`, fontUrl: "../../video/fonts/Nunito%5Bwght%5D.ttf" }));
  return PAGE;
}

// ---------- previews ----------

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8" });
  return r;
}

// previews_from is "pillow <clip> <times>" or "canvas <scene> <times>"; times are comma-separated seconds, ascending.
export function previewCommand(card, dir) {
  const [engine, name, times] = String(card.previews_from).split(/\s+/);
  if (engine === "pillow") return ["python3", ["-m", "video.render", name, "--style", card.id, "--preview", dir, times]];
  if (engine === "canvas") return ["node", ["video/canvas/render.mjs", name, "--preview", dir, times]];
  throw new Error(`${card.file}: previews_from must start with pillow or canvas`);
}

export function makePreviews(only) {
  const out = join(CARDS, "previews");
  mkdirSync(out, { recursive: true });
  for (const card of loadCards().filter((c) => c.previews && (!only || c.id === only))) {
    const tmp = mkdtempSync(join(tmpdir(), "gallery-"));
    try {
      const [cmd, args] = previewCommand(card, tmp);
      run(cmd, args); // Chrome's profile cleanup can fail after the stills are written, so count the files, not the exit code
      const pngs = readdirSync(tmp).filter((f) => f.endsWith(".png")).sort((a, b) => parseFloat(a) - parseFloat(b));
      if (pngs.length !== card.previews) throw new Error(`${card.id}: expected ${card.previews} stills, got ${pngs.length}`);
      pngs.forEach((png, i) => {
        const r = run("ffmpeg", ["-y", "-v", "error", "-i", join(tmp, png), "-vf", "scale=540:-1:flags=lanczos", "-q:v", "4", join(out, `${card.id}-${i + 1}.jpg`)]);
        if (r.status !== 0) throw new Error(`${card.id}: ffmpeg failed: ${r.stderr}`);
      });
      console.log(`${card.id}: ${pngs.length} stills`);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
}

// ---------- CLI ----------

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [cmd, ...args] = process.argv.slice(2);
  const flag = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  if (cmd === "build") console.log(`wrote ${build({ inlineOut: flag("--inline") })}`);
  else if (cmd === "previews") makePreviews(flag("--only"));
  else {
    console.error("usage: gallery.mjs build [--inline OUT.html] | previews [--only id]");
    process.exit(2);
  }
}
