#!/usr/bin/env node
// Draw a human-approvable sketch set through the ChatGPT browser bridge.
//
//   npm run sketch-set -- <spec.json> --out <dir> [--only id,id] [--dry-run]
//   npm run sketch-set -- <spec.json> --out <dir> --approve "ok this is fine" --approver brian
//
// Resumable: state.json in --out records sent threads and saved images, so a
// rerun after an interruption only does what is missing. Needs the bridge
// (chatgpt-conversation-manager) on BRIDGE_URL with BRIDGE_TOKEN, or its .env.

import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { composePrompts, draftAcceptance, applyApproval, sha256Hex, threadIdFrom } from "../src/sketch-set.mjs";

const args = process.argv.slice(2);
const valueAfter = (flag, fallback = null) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : fallback; };
const has = (flag) => args.includes(flag);
if (!args[0] || has("--help")) {
  console.error("Usage: node scripts/sketch-set.mjs <spec.json> --out <dir> [--only a,b] [--dry-run] [--approve \"words\" --approver NAME]");
  process.exit(1);
}

const specPath = resolve(args[0]);
const spec = JSON.parse(await readFile(specPath, "utf8"));
const outDir = resolve(valueAfter("--out", `artifacts/sketch-sets/${spec.id}`));
const only = valueAfter("--only")?.split(",").map((s) => s.trim()).filter(Boolean) ?? null;
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const compositionCatalog = JSON.parse(await readFile(resolve(rootDir, "catalog/composition-heuristics.json"), "utf8"));
const prompts = composePrompts(spec, { compositionCatalog }).filter((p) => !only || only.includes(p.id));

if (has("--dry-run")) {
  for (const p of prompts) console.log(`--- ${p.id}\n${p.text}\n`);
  process.exit(0);
}

await mkdir(outDir, { recursive: true });
const statePath = resolve(outDir, "state.json");
// State is written atomically (temp file + rename) so a machine restart in
// mid-write leaves the previous state, not a truncated file. An empty file is
// treated as no state; a non-empty unparsable file is an error, not a guess.
let state = { spec: basename(specPath), pictures: {} };
if (existsSync(statePath)) {
  const raw = await readFile(statePath, "utf8");
  if (raw.trim()) {
    try { state = JSON.parse(raw); }
    catch (error) { console.error(`state.json at ${statePath} is not valid JSON (${error.message}); move it aside to start over.`); process.exit(1); }
  } else {
    console.error(`state.json at ${statePath} is empty (interrupted write); starting from no state.`);
  }
}
const saveState = async () => {
  const tmp = `${statePath}.tmp`;
  await writeFile(tmp, JSON.stringify(state, null, 2) + "\n");
  await rename(tmp, statePath);
};

// --approve: stamp an existing draft and stop. No network needed.
if (has("--approve")) {
  const draftPath = resolve(outDir, "acceptance.json");
  const draft = JSON.parse(await readFile(draftPath, "utf8"));
  const stamped = applyApproval(draft, { approvedBy: valueAfter("--approver", process.env.USER || "owner"), approvedAt: new Date().toISOString(), words: valueAfter("--approve") });
  await writeFile(draftPath, JSON.stringify(stamped, null, 2) + "\n");
  console.log(`Approved ${stamped.references.length} reference(s) in ${draftPath}. Pass it as --acceptance to the disposition check.`);
  process.exit(0);
}

const bridgeUrl = process.env.BRIDGE_URL || "http://localhost:8787";
let token = process.env.BRIDGE_TOKEN || process.env.RENAMER_TOKEN;
if (!token) {
  const envPath = resolve(process.env.HOME || "", "code/chatgpt-conversation-manager-v0.2/.env");
  if (existsSync(envPath)) {
    const line = (await readFile(envPath, "utf8")).split("\n").find((l) => l.startsWith("RENAMER_TOKEN="));
    token = line?.slice("RENAMER_TOKEN=".length).trim();
  }
}
if (!token) { console.error("No bridge token: set BRIDGE_TOKEN or RENAMER_TOKEN, or keep chatgpt-conversation-manager-v0.2/.env in place."); process.exit(1); }
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

async function call(path, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${bridgeUrl}${path}`, { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
    return await res.text();
  } catch (error) {
    return JSON.stringify({ error: String(error) });
  } finally { clearTimeout(timer); }
}

const chromeExe = process.env.CHROME_EXE || "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe";
const health = JSON.parse(await call("/health", null, 5000));
if (!health.ok) { console.error(`Bridge not healthy at ${bridgeUrl}: ${JSON.stringify(health)}`); process.exit(1); }
if (!health.extension_connections) {
  // The bridge can only send from a visible ChatGPT tab. Try the documented remedy once.
  if (existsSync(chromeExe)) {
    console.error("No ChatGPT tab connected; opening the agent tab in Chrome and waiting up to 60s.");
    spawn(chromeExe, ["https://chatgpt.com/?ccm_agent=1"], { detached: true, stdio: "ignore" }).unref();
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const h = JSON.parse(await call("/health", null, 5000));
      if (h.extension_connections) break;
    }
  }
}

for (const p of prompts) {
  const entry = state.pictures[p.id] ??= {};
  if (entry.thread) { console.log(`${p.id}: already sent (${entry.thread})`); continue; }
  let body = await call("/api/ask", { text: p.text, timeout_seconds: 150 }, 330000);
  if (/visibilityState=hidden/.test(body) && existsSync(chromeExe)) {
    // The bridge only sends from a visible tab. Bring the agent tab forward once and retry.
    console.error(`${p.id}: agent tab was hidden; bringing it to the front and retrying once.`);
    spawn(chromeExe, ["https://chatgpt.com/?ccm_agent=1"], { detached: true, stdio: "ignore" }).unref();
    await new Promise((r) => setTimeout(r, 8000));
    body = await call("/api/ask", { text: p.text, timeout_seconds: 150 }, 330000);
  }
  entry.thread = threadIdFrom(body);
  entry.lastSend = body.slice(0, 300);
  await saveState();
  if (!entry.thread) {
    console.error(`${p.id}: send did not produce a thread. ${body.slice(0, 200)}`);
    if (/visibilityState=hidden/.test(body)) console.error("  Remedy: make the ChatGPT agent tab the visible tab in Chrome (open https://chatgpt.com/?ccm_agent=1) and rerun; the run resumes.");
  } else {
    console.log(`${p.id}: sent, thread ${entry.thread}`);
  }
  await new Promise((r) => setTimeout(r, 8000));
}

const saved = [];
for (let attempt = 0; attempt < 10; attempt++) {
  let pending = false;
  for (const p of prompts) {
    const entry = state.pictures[p.id];
    if (!entry?.thread) continue;
    if (entry.saved?.length) { continue; }
    const r = JSON.parse(await call(`/api/read/${entry.thread}?max_images=3`, null, 240000));
    const images = (r.images ?? []).filter((img) => img.path);
    console.log(`${p.id}: read attempt ${attempt}, ${r.messages?.length ?? 0} messages, ${images.length} image(s)${r.error ? `, ${r.error}` : ""}`);
    if (!images.length) { pending = true; continue; }
    entry.saved = [];
    for (const [i, img] of images.entries()) {
      const dest = resolve(outDir, `${p.id}-${i}.png`);
      await copyFile(img.path, dest);
      const bytes = await readFile(dest);
      entry.saved.push({ path: basename(dest), sha256: sha256Hex(bytes) });
    }
    await saveState();
  }
  if (!pending) break;
  await new Promise((r) => setTimeout(r, 45000));
}

for (const p of prompts) {
  const entry = state.pictures[p.id];
  for (const item of entry?.saved ?? []) saved.push({ id: p.id, path: item.path, sha256: item.sha256, thread: entry.thread });
}
const missing = prompts.filter((p) => !state.pictures[p.id]?.saved?.length).map((p) => p.id);
const draft = draftAcceptance(spec, saved);
await writeFile(resolve(outDir, "acceptance.json"), JSON.stringify(draft, null, 2) + "\n");
console.log(`\n${saved.length} image(s) saved under ${outDir}; acceptance draft written (approver fields empty).`);
if (missing.length) { console.error(`Missing pictures: ${missing.join(", ")}. Rerun to resume.`); process.exit(2); }
console.log(`Next: look at the pictures, then: npm run sketch-set -- ${args[0]} --out ${outDir} --approve "<your words>" --approver <name>`);
