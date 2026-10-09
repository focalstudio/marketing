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
  await dumpType("PostsFiltersInput", new Set(), 1);
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

// ---------- CLI ----------
const cmd = process.argv[2];
if (cmd === "check") {
  await step("Buffer: organisations + channels", checkBuffer);
  await step("Bluesky: login", checkBluesky);
  await step("dev.to: login", checkDevto);
  await step("Threads: token", checkThreads);
  await step("Instagram: token + publish scope", checkInstagram);
  console.log("\nBuffer input schema (what createPost accepts):");
  await step("Buffer: schema introspection", checkBufferSchema);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
} else {
  console.error("usage: node scripts/publish.mjs check");
  process.exit(2);
}
