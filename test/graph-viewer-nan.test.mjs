// world-substrate#316: the Network view drew every box but no links, and the browser logged
// `<path> attribute d: Expected number, "MNaN,NaN C..."` for every link (two paths per link).
// Cause: fitting a hidden (0-size) frame set zoom 0; React Flow measures each box's link handles as
// (screen offset / zoom), so once the panel was shown again every handle was 0/0 = NaN.
import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { fitViewport, forceLayout, layoutSize, positionsFromElk } from "../graph-viewer/src/model.mjs";

const finite = (p) => Number.isFinite(p.x) && Number.isFinite(p.y);

test("fitViewport: a frame with no width or height gives no viewport, never zoom 0", () => {
  assert.equal(fitViewport({ width: 900, height: 700 }, { width: 0, height: 600 }), null);
  assert.equal(fitViewport({ width: 900, height: 700 }, { width: 1000, height: 0 }), null);
  assert.equal(fitViewport({ width: 900, height: 700 }, { width: 0, height: 0 }, { readable: 0.85 }), null);
  assert.equal(fitViewport({ width: Number.NaN, height: 700 }, { width: 1000, height: 600 }), null);
  const ok = fitViewport({ width: 900, height: 700 }, { width: 1000, height: 600 });
  assert.ok(ok.zoom > 0 && Number.isFinite(ok.x) && Number.isFinite(ok.y));
});

test("forceLayout: one NaN or missing box size no longer turns every position into NaN", () => {
  const nodes = Array.from({ length: 60 }, (_, i) => ({ id: `n${i}`, label: `n${i}` }));
  const edges = nodes.slice(1).map((n, i) => ({ id: `e${i}`, source: "n0", target: n.id }));
  const graph = { nodes, edges };
  for (const bad of [{ width: Number.NaN, height: 40 }, { height: 40 }, { width: 0, height: 0 }, { width: -5, height: Infinity }]) {
    const sizes = Object.fromEntries(nodes.map((n) => [n.id, { width: 120, height: 40 }]));
    sizes.n7 = bad;
    const layout = forceLayout(graph, sizes, { ticks: 60 });
    const bad_ = layout.children.filter((c) => !finite(c));
    assert.equal(layout.children.length, 60);
    assert.equal(bad_.length, 0, `size ${JSON.stringify(bad)} left ${bad_.length} non-finite positions`);
    assert.ok(Number.isFinite(layout.width) && Number.isFinite(layout.height));
  }
  assert.deepEqual(layoutSize({ width: Number.NaN }), { width: 160, height: 48 });
  assert.deepEqual(layoutSize({ width: 90, height: 30 }), { width: 90, height: 30 });
});

test("positionsFromElk: a non-finite coordinate becomes 0", () => {
  const pos = positionsFromElk({ children: [{ id: "a", x: Number.NaN, y: 4 }, { id: "b", x: 3, y: Infinity }, { id: "c" }] });
  assert.deepEqual(pos, { a: { x: 0, y: 4 }, b: { x: 3, y: 0 }, c: { x: 0, y: 0 } });
});

test("the built viewer reports version 0.14.2", async () => {
  const dist = await readFile(new URL("../graph-viewer/dist/graph-viewer.js", import.meta.url), "utf8");
  assert.match(dist, /0\.14\.2/);
});

// Browser reproduction: mount a force-layout graph (77 boxes, 770 links, like the issue's world),
// hide or collapse the panel after the first layout, update it, show it again, and count link
// paths whose `d` holds NaN. Before 0.14.2 every link (two paths each) held NaN: 1546 paths.
function chromePath() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const cache = join(homedir(), ".cache", "ms-playwright");
  if (existsSync(cache)) {
    for (const dir of ["chromium-1254", "chromium-1248", "chromium-1243"]) {
      const p = join(cache, dir, "chrome-linux64", "chrome");
      if (existsSync(p)) return p;
    }
  }
  for (const p of ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]) if (existsSync(p)) return p;
  return null;
}

const browser = chromePath();
test("browser: links keep finite paths after the panel is hidden or collapsed, updated and shown again", { skip: browser ? false : "no Chrome found (set CHROME_PATH)", timeout: 90000 }, async () => {
  const { default: puppeteer } = await import("puppeteer-core");
  const bundle = await readFile(new URL("../graph-viewer/dist/graph-viewer.js", import.meta.url), "utf8");
  const b = await puppeteer.launch({ executablePath: browser, headless: true, args: ["--no-sandbox"] });
  try {
    const page = await b.newPage();
    await page.setViewport({ width: 1200, height: 900 });
    const errors = [];
    page.on("console", (m) => { if (/NaN/.test(m.text())) errors.push(m.text()); });
    await page.setContent(`<!doctype html><html><body><div id="stage"><div id="net" style="width:1000px;height:700px"></div></div></body></html>`);
    await page.addScriptTag({ content: bundle });
    const nan = () => page.evaluate(() => [...document.querySelectorAll("#net path")].filter((p) => /NaN/.test(p.getAttribute("d") ?? "")).length);
    const zoom = () => page.evaluate(() => {
      const vp = document.querySelector("#net .react-flow__viewport");
      return vp ? new DOMMatrixReadOnly(getComputedStyle(vp).transform).m22 : -1;
    });
    await page.evaluate(() => {
      const make = (extra) => {
        const nodes = Array.from({ length: 77 }, (_, i) => ({ id: `n${i}`, label: `Node number ${i}`, kind: i % 3 ? "thing" : "actor" }));
        const edges = [];
        for (let i = 0; i < 77; i++) for (let k = 1; k <= 10; k++) edges.push({ id: `e${i}-${k}`, source: `n${i}`, target: `n${(i * 7 + k * 13) % 77}`, label: "uses" });
        for (let j = 0; j < extra; j++) edges.push({ id: `x${j}`, source: `n${j}`, target: `n${(j + 3) % 77}` });
        return { schema: "typed-graph/v1", kinds: { actor: { label: "Actor" }, thing: { label: "Thing" } }, nodes, edges, layout: { algorithm: "force" } };
      };
      window.make = make;
      window.laid = 0;
      window.viewer = window.GraphViewer.mount(document.getElementById("net"), { graph: make(0), onLayout: () => { window.laid++; } });
    });
    await page.waitForFunction(() => window.laid > 0 && document.querySelectorAll("#net .react-flow__edge path").length > 0, { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 800));
    assert.equal(await nan(), 0, "first drawing has no NaN links");
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // 1. The run stage is hidden (display:none), the world is updated while hidden, then shown again.
    await page.evaluate(() => { document.getElementById("stage").hidden = true; });
    await sleep(300);
    await page.evaluate(() => { window.viewer.update(window.make(3)); });
    await sleep(1500);
    await page.evaluate(() => { document.getElementById("stage").hidden = false; });
    await sleep(1500);
    let count = await nan(), z = await zoom();
    assert.equal(count, 0, `hide, update, show: ${count} link paths hold NaN (zoom ${z})`);
    assert.ok(z > 0, `hide, update, show: zoom stays above 0 (got ${z})`);

    // 2. The frame collapses to 0 height while still displayed, the world is updated, then it is restored.
    await page.evaluate(() => { document.getElementById("net").style.height = "0px"; });
    await sleep(300);
    await page.evaluate(() => { window.viewer.update(window.make(5)); });
    await sleep(1500);
    await page.evaluate(() => { document.getElementById("net").style.height = "700px"; });
    await sleep(1500);
    count = await nan(); z = await zoom();
    assert.equal(count, 0, `collapse, update, restore: ${count} link paths hold NaN (zoom ${z})`);
    assert.ok(z > 0, `collapse, update, restore: zoom stays above 0 (got ${z})`);
    assert.equal(errors.length, 0, `${errors.length} NaN errors in the browser console`);
  } finally {
    await b.close();
  }
});
