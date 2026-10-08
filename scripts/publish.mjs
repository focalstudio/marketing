// Focal Studio publisher. Plain Node 22, no dependencies.
// Usage: node scripts/publish.mjs check
// `check` only reads: it proves each key works and dumps Buffer's live input schema.
// It never posts, and it never prints a secret.

const env = (k) => process.env[k] ?? "";
const results = [];

async function step(name, fn) {
  try {
    const out = await fn();
    results.push({ name, ok: true });
    console.log(`✅ ${name}${out ? `: ${out}` : ""}`);
  } catch (e) {
    results.push({ name, ok: false });
    console.log(`❌ ${name}: ${e.message}`);
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

async function checkBufferSchema() {
  need("BUFFER_API_KEY");
  for (const n of ["Service", "CreatePostInput", "PostInputMetaData", "AssetInput", "VideoAssetInput"]) {
    await dumpType(n);
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

// ---------- CLI ----------
const cmd = process.argv[2];
if (cmd === "check") {
  await step("Buffer: organisations + channels", checkBuffer);
  await step("Bluesky: login", checkBluesky);
  await step("dev.to: login", checkDevto);
  await step("Threads: token", checkThreads);
  console.log("\nBuffer input schema (what createPost accepts):");
  await step("Buffer: schema introspection", checkBufferSchema);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
} else {
  console.error("usage: node scripts/publish.mjs check");
  process.exit(2);
}
