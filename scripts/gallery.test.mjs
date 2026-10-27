// node --test scripts/*.test.mjs
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { CARDS, PAGE, ROOT, brandPalette, cardProblems, loadCards, loadFonts, parseCard, previewCommand, previewNames, render } from "./gallery.mjs";
import { parseYaml } from "./publish.mjs";

const cards = loadCards();
const fonts = loadFonts();

test("every card is complete and valid", () => {
  const bad = cards.flatMap((c) => cardProblems(c, fonts));
  assert.deepEqual(bad, []);
});

test("every Pillow style and every app style has a card", () => {
  const modules = readdirSync(join(ROOT, "video", "styles")).filter((f) => f.endsWith(".py") && !/^(_|base)/.test(f)).map((f) => f.slice(0, -3));
  const ids = new Set(cards.map((c) => c.id));
  for (const m of modules) assert.ok(ids.has(m), `video/styles/${m}.py has no card`);
  const app = parseYaml(readFileSync(join(ROOT, "apps", "wildfocus.yml"), "utf8")).styles;
  for (const s of app) assert.equal(cards.find((c) => c.id === s)?.status, "in-use", `${s} is in apps/wildfocus.yml styles: so its card must be in-use`);
});

test("every preview exists and every source file exists", () => {
  for (const c of cards) {
    for (const n of previewNames(c)) assert.ok(existsSync(join(CARDS, "previews", n)), `${n} is missing: run gallery.mjs previews --only ${c.id}`);
    if (c.source) assert.ok(existsSync(join(ROOT, c.source)), `${c.id}: ${c.source} does not exist`);
  }
});

test("every installed font has its file and licence, and every font names a google/fonts source", () => {
  for (const f of fonts) {
    assert.ok(f.source, `${f.family} has no google/fonts source`);
    assert.ok(["OFL-1.1", "Apache-2.0"].includes(f.license), `${f.family}: licence ${f.license}`);
    if (f.status === "installed") {
      assert.ok(existsSync(join(ROOT, "video", "fonts", f.file)), `${f.family}: ${f.file} is missing`);
      assert.ok(existsSync(join(ROOT, "video", "fonts", f.licenseFile)), `${f.family}: ${f.licenseFile} is missing`);
    }
    for (const s of f.styles) assert.ok(cards.some((c) => c.id === s), `${f.family} lists unknown style ${s}`);
  }
});

test("the committed page is what build writes", () => {
  const html = render(cards, fonts, brandPalette(), { src: (p) => `../../${p}`, fontUrl: "../../video/fonts/Nunito%5Bwght%5D.ttf" });
  assert.equal(readFileSync(PAGE, "utf8"), html, "docs/styles/index.html is stale: run node scripts/gallery.mjs build");
});

test("cardProblems names what is wrong", () => {
  const card = parseCard('---\nid: x\nname: X\nstatus: shiny\nengine: gpu\nsummary: s\nprompt: p\nfonts: [Comic Sans]\npalette:\n  a: red\n---\n## Look\nl\n', "y.md");
  const bad = cardProblems({ ...card, file: "y.md" }, fonts).join("\n");
  for (const re of [/does not match the file name/, /status "shiny"/, /engine "gpu"/, /missing source/, /palette a "red"/, /font "Comic Sans"/, /missing ## Do/, /needs previews/]) assert.match(bad, re);
});

test("parseCard splits the body into sections and rejects a missing block", () => {
  const c = parseCard('---\nid: a\n---\n## Look\nOne.\n\n## Do\n- x\n- y\n', "a.md");
  assert.equal(c.body.Look, "One.");
  assert.equal(c.body.Do, "- x\n- y");
  assert.throws(() => parseCard("no front matter", "b.md"), /missing/);
});

test("previewCommand builds the right render for each engine", () => {
  assert.deepEqual(previewCommand({ id: "toon", previews_from: "pillow meditate 1,4,8" }, "/d"), ["python3", ["-m", "video.render", "meditate", "--style", "toon", "--preview", "/d", "1,4,8"]]);
  assert.deepEqual(previewCommand({ id: "k", previews_from: "canvas last25 1.5,6" }, "/d"), ["node", ["video/canvas/render.mjs", "last25", "--preview", "/d", "1.5,6"]]);
  assert.throws(() => previewCommand({ file: "z.md", previews_from: "gpu x 1" }, "/d"), /pillow or canvas/);
});

test("the page escapes card text", () => {
  const evil = { ...cards[0], name: "<script>alert(1)</script>", prompt: 'a "quoted" <b>' };
  const html = render([evil], fonts, null, { fontUrl: "f.ttf" });
  assert.ok(!html.includes("<script>alert(1)"));
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
});
