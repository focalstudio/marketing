// Push one final clip or image to the public focalstudio/media repo. Plain Node 22, no dependencies.
//
//   node scripts/push-media.mjs <file> [app] [--force]
//
// <file> is a path, or a bare name in MEDIA_DIR (default ~/Desktop/FOCAL STUDIO/Focal_studio/media/final_videos).
// It lands at <app>/<clean-name> (app defaults to wildfocus) and prints the `media:` line for the queue post.
// Finals only, and never delete them: git history keeps the bytes anyway, and IG and Threads fetch late.
// Uploads through the GitHub contents API with your `gh` login, so no clone of the media repo is needed.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { isImage, isVideo, MAX_MEDIA, MEDIA_BASE } from "./publish.mjs";

const REPO = "focalstudio/media";
const MEDIA_DIR = process.env.MEDIA_DIR || join(homedir(), "Desktop", "FOCAL STUDIO", "Focal_studio", "media", "final_videos");

// "Stop Scrolling(1).MP4" -> "stop-scrolling-1.mp4": raw URLs stay readable and need no escaping.
export const cleanName = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-(?=\.)|^-|-$/g, "");

export const destPath = (file, app = "wildfocus") => `${cleanName(app)}/${cleanName(basename(file))}`;

// Returns the reason a file can't be pushed, or "" when it can.
export function refusal(file, size) {
  if (!isVideo(file) && !isImage(file)) return `${basename(file)} is not a video or image`;
  if (size > MAX_MEDIA) return `${basename(file)} is ${(size / 1048576).toFixed(1)} MB; keep media under 50 MB`;
  return "";
}

// The sha GitHub reports for a file: the git blob hash of its bytes.
const blobSha = (buf) => createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");

function remoteSha(path) {
  try {
    return execFileSync("gh", ["api", `repos/${REPO}/contents/${path}`, "--jq", ".sha"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (e) {
    if (/404|Not Found/.test(`${e.stderr}${e.stdout}`)) return "";
    throw new Error(`gh api failed: ${`${e.stderr}`.trim() || e.message}`);
  }
}

export function main(argv) {
  const force = argv.includes("--force");
  const [arg, app] = argv.filter((a) => a !== "--force");
  if (!arg) {
    console.error("usage: node scripts/push-media.mjs <file> [app] [--force]");
    return 2;
  }
  const file = existsSync(arg) ? arg : join(MEDIA_DIR, arg);
  if (!existsSync(file)) {
    console.error(`not found: ${arg} (also looked in ${MEDIA_DIR})`);
    return 1;
  }
  const why = refusal(file, statSync(file).size);
  if (why) {
    console.error(why);
    return 1;
  }

  const path = destPath(file, app);
  const buf = readFileSync(file);
  const sha = remoteSha(path);
  if (sha === blobSha(buf)) {
    console.log(`already there: ${path}`);
  } else if (sha && !force) {
    console.error(`${path} already exists with different content; rename the file or pass --force`);
    return 1;
  } else {
    const dir = mkdtempSync(join(tmpdir(), "push-media-"));
    try {
      const body = join(dir, "body.json");
      writeFileSync(body, JSON.stringify({ message: `${sha ? "update" : "add"} ${path}`, content: buf.toString("base64"), ...(sha && { sha }) }));
      execFileSync("gh", ["api", "-X", "PUT", `repos/${REPO}/contents/${path}`, "--input", body, "--silent"], { stdio: "inherit" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    console.log(`pushed: ${path}`);
  }
  console.log(`media: ${path}`);
  console.log(MEDIA_BASE + path);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
