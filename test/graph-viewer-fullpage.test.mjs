import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { fitViewport } from "../graph-viewer/src/model.mjs";

test("inline fit: the whole drawing, centred, never enlarged past 100%", () => {
  const small = fitViewport({ width: 400, height: 200 }, { width: 1000, height: 600 });
  assert.equal(small.zoom, 1);
  assert.deepEqual([small.x, small.y], [300, 200]);
  const big = fitViewport({ width: 4000, height: 1000 }, { width: 1000, height: 600 });
  assert.ok(big.zoom < 0.25, `a wide drawing shrinks to fit inline (zoom ${big.zoom})`);
});

test("full page: a drawing too big to fit opens at a readable zoom from its top-left corner", () => {
  const vp = fitViewport({ width: 4000, height: 1000 }, { width: 1400, height: 900 }, { readable: 0.85 });
  assert.equal(vp.zoom, 0.85, "words stay readable; the reader pans to the rest");
  assert.equal(vp.x, 24, "too wide: starts at the left edge, with a margin");
  assert.equal(vp.y, (900 - 1000 * 0.85) / 2, "still fits vertically: centred on that axis");
});

test("full page: a drawing that fits at a readable size is fitted and centred as before", () => {
  const vp = fitViewport({ width: 1000, height: 500 }, { width: 1400, height: 900 }, { readable: 0.85 });
  assert.equal(vp.zoom, 1);
  assert.deepEqual([vp.x, vp.y], [200, 200]);
});

test("the built viewer offers the full-page button and reports version 0.14.0", async () => {
  const src = await readFile(new URL("../graph-viewer/src/index.jsx", import.meta.url), "utf8");
  assert.match(src, /gv-fullbtn/);
  assert.match(src, /Escape/);
  const dist = await readFile(new URL("../graph-viewer/dist/graph-viewer.js", import.meta.url), "utf8");
  assert.match(dist, /gv-fullpage/, "dist was rebuilt with full-page mode");
  assert.match(dist, /0\.14\.0/);
});
