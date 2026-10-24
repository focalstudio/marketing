#!/usr/bin/env node
// Render a canvas scene (video/canvas/scenes/<name>.mjs) to mp4 by driving the installed Chrome headless over the
// DevTools protocol (Node's built-in WebSocket; no dependencies). Each frame is the page's frame(t) PNG, piped to ffmpeg.
//
//   node video/canvas/render.mjs rain_outside [out.mp4] [--size 1080x1080] [--preview DIR "0.5,4,10"]
//
// Writes out.mp4 (default inbox/wildfocus/<name>.mp4), <out>-silent.mp4 (add a platform sound when posting) and
// <out>-cover.jpg. Chrome: CHROME_BIN, else the macOS app, else google-chrome on PATH. The app icon is read from the app
// repo as video/kit/brand.py finds it (APP_REPO_DIR, WILDFOCUS_REPO, APPS_DIR/<Name>, ../<Name>).
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { rainArgv } from "./audio.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const FPS = 30;
const TYPES = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".ttf": "font/ttf", ".png": "image/png" };

export function iconPath(app = "wildfocus") {
  const yml = readFileSync(join(ROOT, "apps", `${app}.yml`), "utf8");
  const val = k => (yml.match(new RegExp(`^${k}:\\s*["']?([^"'#\\n]+?)["']?\\s*(#.*)?$`, "m")) || [])[1];
  const name = val("repo").split("/").pop();
  const repo = process.env.APP_REPO_DIR || process.env.WILDFOCUS_REPO || join(process.env.APPS_DIR || join(ROOT, ".."), name);
  return join(repo, val("icon"));
}

export function frameTimes(duration, fps = FPS) {
  return Array.from({ length: Math.round(duration * fps) }, (_, i) => i / fps);
}

function serve() {
  const icon = iconPath();
  const srv = createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    const file = url === "/__icon" ? icon : normalize(join(ROOT, url));
    if (!file.startsWith(ROOT) && file !== icon || !existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" }).end(readFileSync(file));
  });
  return new Promise(ok => srv.listen(0, "127.0.0.1", () => ok(srv)));
}

function chromeBin() {
  const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  return process.env.CHROME_BIN || (existsSync(mac) ? mac : "google-chrome");
}

async function browser(W, H) {
  const profile = mkdtempSync(join(tmpdir(), "focal-canvas-"));
  const proc = spawn(chromeBin(), ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--hide-scrollbars",
    "--mute-audio", "--no-first-run", "--no-default-browser-check", "--force-color-profile=srgb", `--window-size=${W},${H}`, "about:blank"]);
  const wsUrl = await new Promise((ok, fail) => {
    let err = "";
    proc.stderr.on("data", d => {
      err += d;
      const m = err.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) ok(m[1]);
    });
    proc.on("exit", c => fail(new Error(`chrome exited (${c}); set CHROME_BIN`)));
  });
  const ws = new WebSocket(wsUrl);
  await new Promise(ok => ws.addEventListener("open", ok));
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const [ok, fail] = pending.get(m.id);
      pending.delete(m.id);
      m.error ? fail(new Error(m.error.message)) : ok(m.result);
    }
  });
  const send = (method, params = {}, sessionId) => new Promise((ok, fail) => {
    pending.set(++id, [ok, fail]);
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const page = (m, p) => send(m, p, sessionId);
  await page("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const evaluate = async expr => {
    const r = await page("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const close = async () => {
    ws.close();
    const gone = new Promise(ok => proc.once("exit", ok));
    proc.kill();
    await gone;
    rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  };
  return { page, evaluate, close };
}

async function main(argv) {
  const opt = { size: "1080x1920" }, pos = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--size") opt.size = argv[++i];
    else if (argv[i] === "--preview") opt.preview = [argv[++i], argv[++i]];
    else pos.push(argv[i]);
  }
  const [name = "rain_outside", outArg] = pos;
  const [W, H] = opt.size.split("x").map(Number);
  const srv = await serve();
  const b = await browser(W, H);
  try {
    await b.page("Page.navigate", { url: `http://127.0.0.1:${srv.address().port}/video/canvas/scene.html?scene=${name}&w=${W}&h=${H}` });
    let dur;
    for (let i = 0; i < 100 && !dur; i++) {
      dur = await b.evaluate("window.ready").catch(() => null);
      if (!dur) await new Promise(r => setTimeout(r, 100));
    }
    if (!dur) throw new Error("scene never became ready");
    const png = async t => Buffer.from((await b.evaluate(`frame(${t})`)).split(",")[1], "base64");
    if (opt.preview) {
      const [dir, times] = opt.preview;
      mkdirSync(dir, { recursive: true });
      for (const t of times.split(",").map(Number)) writeFileSync(join(dir, `${t.toFixed(2)}.png`), await png(t));
      console.log(`stills in ${dir}`);
      return;
    }
    const scene = await import(`./scenes/${name}.mjs`);
    const out = outArg || join(ROOT, "inbox", "wildfocus", `${name}${W === H ? "-square" : ""}.mp4`);
    const base = out.replace(/\.mp4$/, "");
    mkdirSync(dirname(out), { recursive: true });
    const wav = `${base}.wav`;
    if (spawnSync(rainArgv(wav, dur, scene.SOUND)[0], rainArgv(wav, dur, scene.SOUND).slice(1), { stdio: "inherit" }).status) throw new Error("audio failed");
    const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-", "-i", wav,
      "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
      "-shortest", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
    const done = new Promise(ok => ff.on("exit", ok));
    const times = frameTimes(dur);
    for (const [i, t] of times.entries()) {
      if (!ff.stdin.write(await png(t))) await new Promise(r => ff.stdin.once("drain", r));
      if (i % 90 === 0) process.stdout.write(`\rframe ${i}/${times.length}`);
    }
    ff.stdin.end();
    if (await done) throw new Error("ffmpeg failed");
    rmSync(wav);
    spawnSync("ffmpeg", ["-v", "error", "-y", "-i", out, "-an", "-c:v", "copy", `${base}-silent.mp4`]);
    spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", String(scene.COVER ?? 1), "-i", out, "-frames:v", "1", "-q:v", "2", `${base}-cover.jpg`]);
    console.log(`\n${out} (${dur}s), ${base}-silent.mp4, ${base}-cover.jpg`);
  } finally {
    await b.close();
    srv.close();
  }
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] || "")) main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exit(1); });
