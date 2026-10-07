// Drives the REAL page in a browser (real model calls unless the server is a stub). Usage:
//   node public/test/e2e.mjs <base-url> <out-dir> [--skip-limit]
// Needs Playwright (e.g. ~/.npm/_npx/*/node_modules/playwright; set PLAYWRIGHT_DIR to that node_modules folder).
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire((process.env.PLAYWRIGHT_DIR || "/home/brian/.npm/_npx/86170c4cd1c5da32/node_modules") + "/");
const { chromium } = require("playwright");
const [base, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${m}`); };
const keyShaped = /\bsk-[A-Za-z0-9_-]{16,}|\bsk-or-[A-Za-z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._-]{20,}/;

const browser = await chromium.launch();
const bodies = [];
async function session(width, height, tag) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  page.on("response", async (r) => { try { bodies.push(await r.text()); } catch (_) {} });
  await page.goto(base);
  return { ctx, page };
}
const done = (page) => page.waitForSelector("#out:not([hidden]) .why:not(:has-text('Explaining'))", { timeout: 120000 });

for (const [w, h, tag] of [[1440, 1000, "desktop"], [390, 844, "phone"]]) {
  const { ctx, page } = await session(w, h, tag);
  const t0 = Date.now();
  await page.getByRole("button", { name: "Who is hit if payments goes down?" }).click();
  await done(page);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  ok(await page.locator(".sketch svg").count() === 1, `${tag}: a sketch is drawn after one click (${secs}s)`);
  ok(await page.locator(".bars li").count() >= 5, `${tag}: at least 5 score bars`);
  ok(await page.locator(".pick .name").innerText() !== "", `${tag}: the winner is named in plain words: "${await page.locator(".pick .name").innerText()}"`);
  ok(!/^[a-z]+(-[a-z]+)+$/.test(await page.locator(".pick .name").innerText()), `${tag}: no raw catalog id as the name`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${tag}: no horizontal page scroll`);
  await page.screenshot({ path: `${out}/${tag}-simple.png`, fullPage: true });
  await page.click("#t-adv");
  ok(await page.locator("#adv .card").count() >= 3, `${tag}: advanced view shows extra panels`);
  ok(await page.locator(".bars li").count() === 23 || await page.locator(".bars li").count() >= 23, `${tag}: advanced view lists all 23 views`);
  await page.screenshot({ path: `${out}/${tag}-advanced.png`, fullPage: true });
  await page.click("#t-simple");
  await page.getByRole("button", { name: "Make our website look nicer" }).click();
  await done(page);
  ok((await page.locator(".pick .name").innerText()).includes("declined"), `${tag}: the vague request is declined`);
  ok(await page.locator(".sketch:has-text('Nothing to draw yet')").count() === 1, `${tag}: refusal draws the empty frame`);
  await page.screenshot({ path: `${out}/${tag}-refusal.png`, fullPage: true });
  await ctx.close();
}

// plain paths
for (const p of ["/docs", "/openapi.json", "/redoc", "/static/server.py", "/catalog/representations.json", "/.env", "/public/route.mjs"]) {
  const r = await fetch(base + p); ok(r.status === 404, `GET ${p} -> ${r.status} (want 404)`);
}
const lim = await fetch(base + "/limits"); ok(lim.status === 200 && (await lim.json()).rules?.length >= 1, "/limits publishes today's usage");
const bad = bodies.find((b) => keyShaped.test(b)); if (bad) console.log("MATCH:", bad.match(keyShaped)[0]);
ok(!bad, `no key-shaped strings in ${bodies.length} responses seen by the browser`);

if (!process.argv.includes("--skip-limit")) {
  // hammer the run endpoint with a fixed too-short body (400s are cheap but still counted by the gateway) until 429
  let got429 = false, n = 0;
  for (; n < 200 && !got429; n++) { const r = await fetch(base + "/api/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "x" }) }); if (r.status === 429) { got429 = true; ok(typeof (await r.json()).detail === "string", "429 body is one plain sentence"); } }
  ok(got429, `per-visitor limit returns 429 (after ${n} requests)`);
}
await browser.close();
console.log(`RESULT passed=${pass} failed=${fail}`);
process.exit(fail ? 1 : 0);
