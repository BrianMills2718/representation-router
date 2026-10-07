import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import puppeteer from "puppeteer-core";

const root = resolve("artifacts/representation-router-self-map-v0");
const out = resolve("artifacts/representation-router-self-map-review-v0");
await mkdir(out, { recursive: true });

const html = await readFile(resolve(root, "index.html"));
const server = createServer((req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }
  if (req.url === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  res.writeHead(404);
  res.end("not found");
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const address = server.address();
const url = `http://127.0.0.1:${address.port}/`;

const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
if (!executablePath) throw new Error("PUPPETEER_EXECUTABLE_PATH is required");

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});

const browserErrors = [];
const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") browserErrors.push(`console: ${msg.text()}`);
});
page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
page.on("requestfailed", (req) => browserErrors.push(`requestfailed: ${req.url()} ${req.failure()?.errorText ?? ""}`));

await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "networkidle0" });

const expectedCheckpoint = "Consolidation v0 / PR #23 landing review";
const bodyText = await page.evaluate(() => document.body.innerText);
if (!bodyText.includes(expectedCheckpoint)) {
  throw new Error(`Self Map does not show current checkpoint: ${expectedCheckpoint}`);
}

const views = [
  ["start", "Start here"],
  ["roadmap", "Roadmap"],
  ["architecture", "How RR works"],
  ["capabilities", "Capability map"],
  ["evidence", "Evidence"],
  ["plans", "Plans / next"]
];

for (const [id, label] of views) {
  const clicked = await page.evaluate((wanted) => {
    const buttons = [...document.querySelectorAll("nav.tabs button")];
    const button = buttons.find((item) => item.textContent?.trim() === wanted);
    if (!button) return false;
    button.click();
    return true;
  }, label);
  if (!clicked) throw new Error(`Unable to activate Self Map tab: ${label}`);
  await new Promise((ok) => setTimeout(ok, 250));
  await page.screenshot({ path: resolve(out, `${id}-desktop.png`), fullPage: true });
}

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "networkidle0" });
await page.screenshot({ path: resolve(out, "start-mobile.png"), fullPage: true });
await page.evaluate(() => {
  const buttons = [...document.querySelectorAll("nav.tabs button")];
  buttons.find((item) => item.textContent?.trim() === "How RR works")?.click();
});
await new Promise((ok) => setTimeout(ok, 250));
await page.screenshot({ path: resolve(out, "architecture-mobile.png"), fullPage: true });

const receipt = {
  schemaVersion: "rr-self-map-browser-review/v0",
  sourceRevision: process.env.RR_SOURCE_REVISION || process.env.GITHUB_SHA || "local",
  pullRequest: process.env.RR_PULL_REQUEST || "23",
  runId: process.env.GITHUB_RUN_ID || "local",
  expectedCheckpoint,
  desktopViews: views.map(([id]) => `${id}-desktop.png`),
  mobileViews: ["start-mobile.png", "architecture-mobile.png"],
  browserErrors
};

await writeFile(resolve(out, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n", "utf8");
await browser.close();
await new Promise((ok) => server.close(ok));

if (browserErrors.length) {
  throw new Error(`Self Map browser review produced errors:\n- ${browserErrors.join("\n- ")}`);
}

process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
