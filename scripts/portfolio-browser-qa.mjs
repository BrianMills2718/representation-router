import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import puppeteer from "puppeteer-core";

const url = process.env.PORTFOLIO_REVIEW_URL;
const executablePath = process.env.CHROME_PATH;
const outputDirectory = process.env.QA_OUTPUT_DIR ? resolve(process.env.QA_OUTPUT_DIR) : null;
if (!url || !executablePath) throw new Error("Set PORTFOLIO_REVIEW_URL and CHROME_PATH");
if (outputDirectory) await mkdir(outputDirectory, { recursive: true });

const browser = await puppeteer.launch({ executablePath, headless: true });
const cases = [
  { project: "Mock-Call-Agent", field: "Goal", slug: "mock-call-goal" },
  { project: "Team-Brains", field: "Observed state", slug: "team-brains-observed-state" },
  // Slack-sourced evidence must say when it was said, so old messages are not read as current state.
  { project: "appointment-setting-bot", field: "Owner and authority", slug: "appointment-owner-observed", observed: "2026-08-11" }
];
const viewports = [
  { name: "desktop", width: 1440, height: 1000, internalScroll: true },
  { name: "mobile", width: 390, height: 844, internalScroll: false }
];
const results = [];

for (const viewport of viewports) {
  const page = await browser.newPage();
  await page.setViewport({ width: viewport.width, height: viewport.height });
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator("#view-review").click();

  for (const testCase of cases) {
    await page.locator('input[aria-label="Search projects"], label.portfolio-search input').fill(testCase.project);
    assert.equal((await page.$$(".portfolio-list li button")).length, 1, `${viewport.name} ${testCase.project}: search did not select one project`);
    await page.locator(".portfolio-list li button").click();
    const field = (await page.evaluateHandle((label) => [...document.querySelectorAll(".portfolio-field")].find((element) => element.querySelector("summary")?.textContent.includes(label)), testCase.field)).asElement();
    assert.ok(field, `${viewport.name} ${testCase.project}: ${testCase.field} field missing`);
    if (await field.evaluate((element) => !element.open)) await (await field.$("summary")).click();
    assert.ok(await field.$('a[href*="/blob/"]'), `${viewport.name} ${testCase.project}: exact source link missing`);
    if (testCase.observed) {
      const observed = await field.$eval(".field-observed", (element) => {
        const box = element.getBoundingClientRect();
        return { text: element.textContent, visible: box.width > 0 && box.height > 0 };
      }).catch(() => null);
      assert.ok(observed?.visible && observed.text.includes(testCase.observed), `${viewport.name} ${testCase.project}: observation date not shown`);
    }
    await field.evaluate((element) => element.scrollIntoView({ block: "nearest" }));
    const geometry = await page.evaluate(() => {
      const bounds = (selector) => document.querySelector(selector).getBoundingClientRect().toJSON();
      const detail = document.querySelector(".portfolio-detail");
      return {
        workspace: bounds(".workspace"), canvas: bounds(".canvas-panel"), inspector: bounds(".inspector"), lowerGrid: bounds(".lower-grid"),
        detail: { clientHeight: detail.clientHeight, scrollHeight: detail.scrollHeight },
        document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }
      };
    });
    assert.ok(geometry.canvas.bottom <= geometry.workspace.bottom + 1, `${viewport.name} ${testCase.project}: canvas escapes workspace`);
    assert.ok(geometry.inspector.bottom <= geometry.workspace.bottom + 1, `${viewport.name} ${testCase.project}: inspector escapes workspace`);
    assert.ok(geometry.lowerGrid.top >= geometry.workspace.bottom - 1, `${viewport.name} ${testCase.project}: lower grid overlaps workspace`);
    assert.ok(geometry.document.scrollWidth <= geometry.document.clientWidth + 1, `${viewport.name} ${testCase.project}: horizontal page overflow`);
    if (viewport.internalScroll) {
      assert.ok(geometry.detail.scrollHeight > geometry.detail.clientHeight, `${viewport.name} ${testCase.project}: long detail did not become an internal scroll region`);
      await page.$eval(".inspector", (element) => { element.scrollTop = element.scrollHeight; });
    } else {
      await page.evaluate(() => (document.querySelector(".review-actions") ?? document.querySelector(".decision-receipt")
        ?? document.querySelector(".inspector")?.lastElementChild)?.scrollIntoView({ block: "center" }));
    }
    // Buttons render only for an undecided awaiting_review node; any other state
    // must still leave the end of the inspector reachable inside the workspace.
    const reachable = await page.evaluate(() => {
      const actions = document.querySelector(".review-actions");
      const target = actions ?? document.querySelector(".decision-receipt") ?? document.querySelector(".inspector")?.lastElementChild;
      if (!target) return { control: "none", visible: false };
      const box = target.getBoundingClientRect();
      return { control: actions ? "review-actions" : target.className || target.tagName.toLowerCase(),
               visible: box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < window.innerHeight };
    });
    assert.equal(reachable.visible, true, `${viewport.name} ${testCase.project}: end of inspector (${reachable.control}) is not reachable`);
    if (outputDirectory) await page.screenshot({ path: resolve(outputDirectory, `${viewport.name}-${testCase.slug}.png`), fullPage: true });
    results.push({ viewport: `${viewport.width}x${viewport.height}`, ...testCase, geometry, inspectorEndReachable: reachable });
  }
  assert.deepEqual(consoleErrors, [], `${viewport.name}: browser console errors`);
  assert.deepEqual(failedRequests, [], `${viewport.name}: failed browser requests`);
  await page.close();
}
await browser.close();
const receipt = { schemaVersion: "portfolio-containment-qa/v2", url, viewports: viewports.map(({ width, height }) => `${width}x${height}`), results };
if (outputDirectory) await writeFile(resolve(outputDirectory, "portfolio-containment-qa.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
