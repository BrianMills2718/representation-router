// Wireframe sketches for every view in the router's catalog (catalog/representations.json; public/test checks every id has one).
// Each renderer draws a schematic of the recommended view, labelled with the visitor's own words where it has them.
// Labels that did not come from the visitor are drawn muted/italic (class "gen") so a sketch never passes generic
// placeholder text off as the visitor's data. Everything is escaped; nothing is executed from visitor text.
(function () {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const FS = 14; // font size in viewBox units; the viewBox is sized so this stays readable on a phone

  // ---- label helpers
  function makeLabels(marks, generics) {
    return (i) => {
      const m = marks[i];
      return m ? { t: m, gen: false } : { t: generics[i % generics.length] + (i >= generics.length ? " " + (Math.floor(i / generics.length) + 1) : ""), gen: true };
    };
  }
  function fit(s, px, fs = FS) {
    const max = Math.max(3, Math.floor(px / (fs * 0.56)));
    return s.length <= max ? s : s.slice(0, Math.max(1, max - 1)).trimEnd() + "…";
  }
  const text = (x, y, l, px, o = {}) => {
    const fs = o.fs || FS;
    return `<text x="${x}" y="${y}" class="t${l.gen ? " gen" : ""}${o.hi ? " hi" : ""}" text-anchor="${o.a || "middle"}" font-size="${fs}" dominant-baseline="middle"><title>${esc(l.t)}</title>${esc(fit(l.t, px, fs))}</text>`;
  };
  const rect = (x, y, w, h, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r ?? 6}" class="${o.hi ? "box hi" : o.soft ? "box soft" : "box"}"/>`;
  const line = (x1, y1, x2, y2, o = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="ln${o.hi ? " hi" : ""}${o.dash ? " dash" : ""}"${o.arrow ? ' marker-end="url(#ah)"' : ""}/>`;
  const bar = (x, y, w, h = 8, hi = false) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" class="${hi ? "fillhi" : "fill"}"/>`;
  const circle = (x, y, r, o = {}) => `<circle cx="${x}" cy="${y}" r="${r}" class="${o.hi ? "box hi" : o.fill ? "fill" : "box"}"/>`;
  const gtext = (x, y, s, o = {}) => `<text x="${x}" y="${y}" class="t gen" text-anchor="${o.a || "middle"}" font-size="${o.fs || 12}" dominant-baseline="middle">${esc(s)}</text>`;
  const wrap = (W, H, body) =>
    `<svg viewBox="0 0 ${W} ${H}" role="img" xmlns="http://www.w3.org/2000/svg"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="arrowhead"/></marker></defs>${body}</svg>`;

  const G_ITEMS = ["Item A", "Item B", "Item C", "Item D", "Item E", "Item F"];
  const G_STEPS = ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"];
  const G_COLS = ["Evidence A", "Evidence B", "Evidence C", "Evidence D"];

  const R = {};

  R["node-link-graph"] = ({ W, H, L, links, n }) => {
    const k = Math.min(Math.max(n, 5), W < 450 ? 5 : 6), cx = W / 2, cy = H / 2, rx = W / 2 - 70, ry = H / 2 - 50;
    const P = Array.from({ length: k }, (_, i) => { const a = (-Math.PI / 2) + (i * 2 * Math.PI) / k; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
    const es = (links.length ? links.filter((l) => l.source < k && l.target < k) : P.slice(1).map((_, i) => ({ source: 0, target: i + 1, label: "" })));
    let s = es.map((e) => line(P[e.source][0], P[e.source][1], P[e.target][0], P[e.target][1], { arrow: true, hi: e.source === 0 })).join("");
    s += es.filter((e) => e.label).map((e) => `<text x="${(P[e.source][0] + P[e.target][0]) / 2}" y="${(P[e.source][1] + P[e.target][1]) / 2 - 8}" class="t gen" font-size="12" text-anchor="middle">${esc(fit(e.label, 90, 12))}</text>`).join("");
    s += P.map((p, i) => circle(p[0], p[1], i === 0 ? 17 : 13, { hi: i === 0 }) + text(p[0], p[1] + (i === 0 ? 34 : 29), L(i), 170, { hi: i === 0 })).join("");
    return s;
  };

  R["adjacency-matrix"] = ({ W, H, L, links, n }) => {
    const k = Math.min(n, W < 450 ? 4 : 5), lw = W < 450 ? 90 : 130, cell = Math.min(54, (W - lw - 20) / k), x0 = lw + 10, y0 = 70;
    let s = "";
    for (let i = 0; i < k; i++) {
      s += `<text x="${x0 + i * cell + cell / 2 - 1}" y="${y0 - 16}" class="t" font-size="13" text-anchor="middle">${i + 1}</text>`;
      s += text(lw, y0 + i * cell + cell / 2, { t: `${i + 1}  ${L(i).t}`, gen: L(i).gen }, lw - 6, { a: "end", fs: 12 });
    }
    const on = new Set(links.map((l) => `${l.source},${l.target}`));
    for (let r = 0; r < k; r++) for (let c = 0; c < k; c++) {
      const filled = links.length ? on.has(`${r},${c}`) || on.has(`${c},${r}`) : (r + c) % 3 === 0 && r !== c;
      const hi = r === 0 && c === 1 % k;
      s += `<rect x="${x0 + c * cell}" y="${y0 + r * cell}" width="${cell - 3}" height="${cell - 3}" rx="3" class="${hi && filled ? "fillhi" : filled ? "fill" : "box soft"}"/>`;
    }
    return s;
  };

  R["requirements-traceability-matrix"] = ({ W, H, L, n }) => {
    const rows = Math.min(n, 5), cols = W < 450 ? 3 : 4, lw = W < 450 ? 110 : 160, cw = (W - lw - 20) / cols, y0 = 70, rh = 44;
    let s = "";
    for (let c = 0; c < cols; c++) s += gtext(lw + 10 + c * cw + cw / 2, y0 - 26, G_COLS[c], { fs: 12 });
    for (let r = 0; r < rows; r++) {
      s += text(lw, y0 + r * rh + rh / 2, L(r), lw - 8, { a: "end" }) + line(10, y0 + r * rh + rh - 2, W - 10, y0 + r * rh + rh - 2, { dash: true });
      for (let c = 0; c < cols; c++) {
        const gap = (r * 2 + c) % 5 === 1, cx = lw + 10 + c * cw + cw / 2, cy = y0 + r * rh + rh / 2 - 2;
        s += gap ? `<circle cx="${cx}" cy="${cy}" r="10" class="box hi"/><text x="${cx}" y="${cy + 1}" class="t hi" font-size="13" text-anchor="middle" dominant-baseline="middle">?</text>` : `<path d="M${cx - 8} ${cy}l6 6l11 -12" class="ln tick" fill="none"/>`;
      }
    }
    return s + gtext(W / 2, H - 14, "tick = supported     ? = gap to look at");
  };

  R["hierarchy-tree"] = ({ W, H, L, n }) => {
    const kids = Math.min(Math.max(n - 1, 2), W < 450 ? 2 : 3), bw = W < 450 ? 130 : 150, gap = (W - kids * bw) / (kids + 1);
    let s = rect(W / 2 - bw / 2, 30, bw, 40, { hi: true }) + text(W / 2, 50, L(0), bw - 10, { hi: true });
    for (let i = 0; i < kids; i++) {
      const x = gap + i * (bw + gap), cx = x + bw / 2;
      s += line(W / 2, 70, cx, 130, {}) + rect(x, 130, bw, 38) + text(cx, 149, L(i + 1), bw - 10);
      for (let j = 0; j < 2; j++) { const gx = x + j * (bw / 2) + 2; s += line(cx, 168, gx + bw / 4 - 2, 230) + rect(gx, 230, bw / 2 - 6, 30, { soft: true }) + gtext(gx + bw / 4 - 3, 245, "…"); }
    }
    return s;
  };

  R["sequence-diagram"] = ({ W, H, L, links, n }) => {
    const k = Math.min(n, 3), gap = W / (k + 1), bwid = Math.min(136, gap - 10);
    const X = Array.from({ length: k }, (_, i) => gap * (i + 1));
    let s = X.map((x, i) => rect(x - bwid / 2, 24, bwid, 34, i === 0 ? { hi: true } : {}) + text(x, 41, L(i), bwid - 8, { hi: i === 0, fs: W < 450 ? 12 : 14 }) + line(x, 58, x, H - 20, { dash: true })).join("");
    const msgs = (links.filter((l) => l.source < k && l.target < k).slice(0, 4));
    const seq = msgs.length ? msgs : [{ source: 0, target: 1 % k, label: "" }, { source: 1 % k, target: (2 % k) || 1, label: "" }, { source: (2 % k) || 1, target: 0, label: "" }];
    seq.forEach((m, i) => { const y = 96 + i * 62; s += line(X[m.source], y, X[m.target], y, { arrow: true, hi: i === 0 }); if (m.label) s += `<text x="${(X[m.source] + X[m.target]) / 2}" y="${y - 12}" class="t gen" font-size="12" text-anchor="middle">${esc(fit(m.label, 120, 12))}</text>`; });
    return s;
  };

  R["timeline"] = ({ W, H, L, n }) => {
    const k = Math.min(n, W < 450 ? 4 : 5), y = H / 2, x0 = 40, x1 = W - 40;
    let s = line(x0, y, x1, y, { arrow: true });
    for (let i = 0; i < k; i++) {
      const x = x0 + 50 + (i * (x1 - x0 - 100)) / Math.max(1, k - 1), up = i % 2 === 0, hi = i === 0;
      s += circle(x, y, hi ? 9 : 7, { hi }) + line(x, y + (up ? -9 : 9), x, y + (up ? -44 : 44)) + text(x, y + (up ? -60 : 60), L(i), Math.min(130, (x1 - x0) / k * 1.3), { hi }) + gtext(x, y + (up ? -96 : 96), "date");
    }
    return s;
  };

  R["project-schedule"] = ({ W, H, L, n }) => {
    const k = Math.min(n, 5), lw = W < 450 ? 100 : 150, rh = 48, y0 = 50, tw = W - lw - 20;
    let s = line(lw, y0 - 14, W - 10, y0 - 14) + [0, 1, 2, 3].map((i) => gtext(lw + (tw * (i + 0.5)) / 4, y0 - 28, ["wk 1", "wk 2", "wk 3", "wk 4"][i], { fs: 11 })).join("");
    const span = [[0, 0.3], [0.4, 0.7], [0.55, 0.85], [0.2, 0.45], [0.75, 1]];
    for (let i = 0; i < k; i++) {
      const y = y0 + i * rh, [a, b] = span[i];
      s += text(lw - 8, y + 14, L(i), lw - 10, { a: "end" }) + bar(lw + tw * a, y + 4, tw * (b - a), 20, i === 1) + line(10, y + rh - 10, W - 10, y + rh - 10, { dash: true });
      if (i === 1) s += `<path d="M${lw + tw * 0.3} ${y - rh + 14} H${lw + tw * 0.3 + 14} V${y + 14} H${lw + tw * a - 2}" class="ln hi" fill="none" marker-end="url(#ah)"/>`;
    }
    return s;
  };

  R["data-table"] = ({ W, H, L, n }) => {
    const rows = Math.min(n, 5), c0 = W < 450 ? 120 : 170, cw = (W - c0 - 30) / 2, y0 = 36, rh = 44;
    let s = rect(10, y0 - 6, W - 20, 34, { soft: true }) + gtext(22, y0 + 11, "Name", { a: "start" }) + `<text x="${c0 + 10 + cw / 2}" y="${y0 + 11}" class="t hi" font-size="12" text-anchor="middle" dominant-baseline="middle">Value ▼</text>` + gtext(c0 + 10 + cw * 1.5, y0 + 11, "Other");
    for (let r = 0; r < rows; r++) {
      const y = y0 + 40 + r * rh;
      s += text(22, y + 16, L(r), c0 - 14, { a: "start" }) + bar(c0 + 10, y + 11, cw * (0.9 - r * 0.15), 12, r === 0) + bar(c0 + 10 + cw, y + 11, cw * (0.3 + ((r * 37) % 50) / 100), 12) + line(10, y + rh - 4, W - 10, y + rh - 4, { dash: true });
    }
    return s;
  };

  R["master-detail"] = ({ W, H, L, n }) => {
    const k = Math.min(n, 5), lw = W < 450 ? 140 : 210;
    let s = rect(10, 24, lw, H - 48, { soft: true });
    for (let i = 0; i < k; i++) s += rect(18, 34 + i * 46, lw - 16, 38, i === 0 ? { hi: true } : {}) + text(28, 53 + i * 46, L(i), lw - 36, { a: "start", hi: i === 0 });
    const x = lw + 24, w = W - x - 10;
    s += rect(x, 24, w, H - 48) + text(x + 12, 52, L(0), w - 20, { a: "start", hi: true }) + bar(x + 12, 76, w - 24, 8) + bar(x + 12, 96, (w - 24) * 0.8, 8) + bar(x + 12, 116, (w - 24) * 0.6, 8) + gtext(x + 12, 160, "Details of the selected item", { a: "start", fs: 12 });
    return s + line(lw + 10, 53, x, 53, { arrow: true, hi: true });
  };

  // A grouped link index: no detail pane, every row is its own link out (↗).
  R["link-directory"] = ({ W, H, L, n }) => {
    const k = Math.min(Math.max(n, 4), 6), half = Math.ceil(k / 2), rh = 38, nw = W < 450 ? W * 0.5 : W * 0.38;
    let s = "", y = 26, i = 0;
    for (const [g, count] of [["Group 1", half], ["Group 2", k - half]]) {
      s += gtext(14, y, g, { a: "start", fs: 13 }) + line(10, y + 12, W - 10, y + 12);
      y += 30;
      for (let r = 0; r < count; r++, i++) {
        s += text(22, y, L(i), nw - 30, { a: "start", hi: i === 0 }) + gtext(22 + nw - 18, y, "↗", { a: "start", fs: 13 }) + bar(nw + 24, y - 4, (W - nw - 40) * (0.85 - (r % 3) * 0.2), 8);
        y += rh;
      }
      y += 8;
    }
    return s;
  };

  // An argument page: the claim on top, then sections each headed by the sub-claim it proves, with its evidence.
  R["argument-page"] = ({ W, H, L, n }) => {
    const k = 3, x = 14, w = W - 28;
    let s = rect(x, 14, w, 40, { hi: true }) + gtext(x + 12, 34, "The page's one claim", { a: "start", fs: 13 });
    for (let i = 0; i < k; i++) {
      const y = 70 + i * 62;
      s += text(x + 4, y + 8, L(i), w * 0.8, { a: "start" }) + bar(x + 4, y + 22, w * (0.9 - i * 0.12), 8) + rect(x + 4, y + 36, Math.min(110, w * 0.3), 16, { soft: true, r: 3 }) + gtext(x + 12, y + 44, "evidence", { a: "start", fs: 11 }) + line(x, y + 56, x + w, y + 56, { dash: true });
    }
    return s;
  };

  R["answer-receipt-card"] = ({ W, H, L }) => {
    const x = 14, w = W - 28, y = 14, h = H - 28;
    let s = rect(x, y, w, h) + gtext(x + 14, y + 18, "the question", { a: "start", fs: 11 });
    s += rect(x + 10, y + 32, w - 20, 40, { hi: true }) + gtext(x + 22, y + 52, "the answer, in one sentence", { a: "start", fs: 13 });
    for (let i = 0; i < 3; i++) {
      const ey = y + 92 + i * 30;
      s += circle(x + 22, ey, 4, { fill: true }) + text(x + 34, ey, L(i), w * 0.45, { a: "start" }) + bar(x + 34 + w * 0.47, ey - 4, w * (0.3 - i * 0.06), 8);
    }
    const fy = y + h - 30;
    s += line(x + 10, fy - 12, x + w - 10, fy - 12, { dash: true }) + gtext(x + 14, fy, W < 450 ? "ran · model · time · cost · trace" : "receipt: when it ran · on what model and data · how long · cost · full trace", { a: "start", fs: 11 });
    return s;
  };

  R["state-machine-view"] = ({ W, H, L, n }) => {
    const k = Math.min(n, 3), bw = W < 450 ? 92 : 140, gap = (W - k * bw) / (k + 1), y = H / 2 - 20;
    let s = circle(14, y + 20, 6, { fill: true }) + line(20, y + 20, gap, y + 20, { arrow: true });
    for (let i = 0; i < k; i++) {
      const x = gap + i * (bw + gap);
      s += rect(x, y, bw, 40, { r: 20, hi: i === 0 }) + text(x + bw / 2, y + 20, L(i), bw - 14, { hi: i === 0, fs: W < 450 ? 12 : 14 });
      if (i < k - 1) s += line(x + bw, y + 14, x + bw + gap, y + 14, { arrow: true }) + line(x + bw + gap, y + 28, x + bw, y + 28, { arrow: true, dash: true });
    }
    return s + gtext(W / 2, H - 28, "arrows = allowed moves between states");
  };

  R["explorable-simulation"] = ({ W, H }) => {
    let s = line(40, 40, W - 40, 40) + circle(40 + (W - 80) * 0.6, 40, 11, { hi: true }) + gtext(40, 18, "input you can drag", { a: "start" });
    s += line(50, 90, 50, H - 40) + line(50, H - 40, W - 30, H - 40);
    s += `<path d="M50 ${H - 60} C ${W * 0.3} ${H - 80}, ${W * 0.5} ${H - 200}, ${W - 40} ${H - 210}" class="ln hi" fill="none"/>` + `<path d="M50 ${H - 50} C ${W * 0.3} ${H - 70}, ${W * 0.6} ${H - 110}, ${W - 40} ${H - 120}" class="ln" fill="none"/>`;
    return s + gtext(W / 2, H - 14, "the picture changes as the input moves");
  };

  R["layered-architecture-view"] = ({ W, H, L, n }) => {
    const layers = 3, per = [2, 3, 2], lh = 76, y0 = 24; let i = 0, s = "";
    for (let l = 0; l < layers; l++) {
      const y = y0 + l * (lh + 14); s += rect(10, y, W - 20, lh, { soft: true }) + gtext(22, y + 14, ["Top layer", "Middle layer", "Base layer"][l], { a: "start", fs: 11 });
      const k = W < 450 ? Math.min(per[l], 2) : per[l], bw = (W - 40 - (k - 1) * 12) / k;
      for (let j = 0; j < k; j++) { s += rect(20 + j * (bw + 12), y + 26, bw, 38, i === 0 ? { hi: true } : {}) + text(20 + j * (bw + 12) + bw / 2, y + 45, L(i), bw - 10, { hi: i === 0 }); i++; }
    }
    return s;
  };

  R["small-multiples"] = ({ W, H, L }) => {
    const cols = W < 450 ? 2 : 3, rows = 2, cw = (W - 20 - (cols - 1) * 12) / cols, ch = (H - 40 - 12) / rows; let s = "";
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, x = 10 + c * (cw + 12), y = 14 + r * (ch + 12), hi = i === 0;
      s += rect(x, y, cw, ch, hi ? { hi: true } : {}) + text(x + 10, y + 16, L(i), cw - 16, { a: "start", fs: 12, hi });
      s += `<path d="M${x + 12} ${y + ch - 14} L${x + cw * 0.35} ${y + ch * 0.55 + (i % 3) * 8} L${x + cw * 0.65} ${y + ch * 0.7 - (i % 2) * 14} L${x + cw - 12} ${y + ch * 0.3 + (i % 3) * 10}" class="ln${hi ? " hi" : ""}" fill="none"/>`;
    }
    return s + gtext(W / 2, H - 10, "same axes in every panel, so you can compare", { fs: 11 });
  };

  R["staged-explanatory-machine"] = ({ W, H, L }) => {
    const k = W < 450 ? 2 : 3, fw = (W - 20 - (k - 1) * 14) / k; let s = "";
    for (let i = 0; i < k; i++) {
      const x = 10 + i * (fw + 14), y = 40, h = H - 110;
      s += rect(x, y, fw, h, i === 0 ? { hi: true } : {}) + circle(x + 16, y + 16, 11, { hi: i === 0 }) + `<text x="${x + 16}" y="${y + 17}" class="t${i === 0 ? " hi" : ""}" font-size="13" text-anchor="middle" dominant-baseline="middle">${i + 1}</text>`;
      s += rect(x + fw * 0.2, y + 50, fw * 0.6, 30, { soft: true }) + line(x + fw / 2, y + 80, x + fw / 2, y + 120, { arrow: true }) + rect(x + fw * 0.2, y + 120, fw * 0.6, 30, i === k - 1 ? { hi: true } : { soft: true });
      s += text(x + fw / 2, y + h + 26, L(i), fw - 6, { fs: 13 });
    }
    return s;
  };

  R["scroll-linked-explainer"] = ({ W, H, L }) => {
    const tw = W < 450 ? 120 : 190; let s = "";
    for (let i = 0; i < 3; i++) { const y = 30 + i * 100; s += rect(10, y, tw, 84, i === 1 ? { hi: true } : { soft: true }) + text(22, y + 18, L(i), tw - 20, { a: "start", fs: 13, hi: i === 1 }) + bar(22, y + 38, tw - 34, 7) + bar(22, y + 56, (tw - 34) * 0.7, 7); }
    const x = tw + 30, w = W - x - 10;
    s += rect(x, 30, w, H - 60) + gtext(x + w / 2, 50, "figure stays put", { fs: 11 }) + rect(x + w * 0.15, 80, w * 0.7, 50, { hi: true }) + line(x + w / 2, 130, x + w / 2, 180, { arrow: true }) + rect(x + w * 0.15, 180, w * 0.7, 50, { soft: true });
    return s + line(tw + 10, 172, x, 105, { arrow: true, hi: true });
  };

  R["directed-handoff-flow"] = ({ W, H, L, n }) => {
    const narrow = W < 450, k = Math.min(n, 4), per = narrow ? 2 : k, gp = narrow ? 34 : 30, bw = Math.min(150, (W - 20 - (per - 1) * gp) / per); let s = "";
    const pos = (i) => { const r = Math.floor(i / per), c = i % per; return [10 + c * (bw + gp) + (W - 20 - per * bw - (per - 1) * gp) / 2, 60 + r * 120]; };
    for (let i = 0; i < k; i++) {
      const [x, y] = pos(i); s += rect(x, y, bw, 50, i === 0 ? { hi: true } : {}) + text(x + bw / 2, y + 25, L(i), bw - 10, { hi: i === 0, fs: 13 });
      if (i < k - 1) { const [nx, ny] = pos(i + 1); s += ny === y ? line(x + bw, y + 25, nx, y + 25, { arrow: true }) : line(x + bw / 2, y + 50, nx + bw / 2, ny, { arrow: true, dash: true }); }
    }
    return s;
  };

  R["process-swimlane"] = ({ W, H, L, n }) => {
    const lanes = 3, lh = 100, lw = 92; let s = "";
    for (let i = 0; i < lanes; i++) { const y = 20 + i * lh; s += rect(10, y, W - 20, lh - 8, { soft: true }) + text(18, y + 14, L(i), 220, { a: "start", fs: 12 }); }
    const steps = W < 450 ? [[0, 0.0], [1, 0.5], [2, 1]] : [[0, 0.02], [1, 0.3], [1, 0.62], [2, 1]], bw = W < 450 ? 70 : 92; let prev = null;
    steps.forEach(([lane, f], i) => { const x = 24 + (W - 48 - bw) * f, y = 20 + lane * lh + 34; s += rect(x, y, bw, 34, i === 0 ? { hi: true } : {}) + gtext(x + bw / 2, y + 17, G_STEPS[i], { fs: 12 }); if (prev) s += line(prev[0] + bw, prev[1] + 17, x, y + 17, { arrow: true }); prev = [x, y]; });
    return s;
  };

  R["bpmn-process"] = ({ W, H, L }) => {
    const y = H / 2, bw = W < 450 ? 74 : 112, step = (W - 60) / 4; let s = circle(28, y, 12) + line(40, y, 28 + step - bw / 2, y, { arrow: true });
    const x1 = 28 + step, x2 = 28 + step * 2, x3 = 28 + step * 3;
    s += rect(x1 - bw / 2, y - 22, bw, 44, { hi: true }) + text(x1, y, L(0), bw - 8, { hi: true, fs: W < 450 ? 12 : 14 }) + line(x1 + bw / 2, y, x2 - 26, y, { arrow: true });
    s += `<path d="M${x2} ${y - 26} L${x2 + 26} ${y} L${x2} ${y + 26} L${x2 - 26} ${y}z" class="box"/>` + gtext(x2, y + 44, "decision", { fs: 11 });
    s += line(x2 + 26, y, x3 - bw / 2, y - 40, { arrow: true }) + rect(x3 - bw / 2, y - 62, bw, 44) + text(x3, y - 40, L(1), bw - 10) + line(x2 + 26, y, x3 - bw / 2, y + 40, { arrow: true, dash: true }) + rect(x3 - bw / 2, y + 18, bw, 44, { soft: true }) + text(x3, y + 40, L(2), bw - 10);
    return s + circle(W - 24, y, 12, { fill: true }) + line(x3 + bw / 2, y - 40, W - 28, y - 10, { arrow: true });
  };

  R["data-model-diagram"] = ({ W, H, L, n }) => {
    const k = Math.min(n, W < 450 ? 2 : 3), bw = W < 450 ? 130 : 150, gap = (W - k * bw) / (k + 1); let s = "";
    for (let i = 0; i < k; i++) {
      const x = gap + i * (bw + gap), y = 70 + (i === 1 ? 70 : 0);
      s += rect(x, y, bw, 120, { r: 6, ...(i === 0 ? { hi: true } : {}) }) + text(x + bw / 2, y + 18, L(i), bw - 10, { hi: i === 0 }) + line(x, y + 34, x + bw, y + 34);
      for (let j = 0; j < 3; j++) s += bar(x + 12, y + 50 + j * 22, bw * (0.7 - j * 0.12), 8);
      if (i < k - 1) s += line(x + bw, y + 60, x + bw + gap, 70 + ((i + 1) === 1 ? 70 : 0) + 60, { hi: i === 0 }) + gtext(x + bw + gap / 2, y + 44 + (i === 0 ? 34 : -20), "1 : n", { fs: 11 });
    }
    return s;
  };

  R["schema-explorer"] = ({ W, H, L, n }) => {
    const lw = W < 450 ? 150 : 210; let s = rect(10, 20, lw, 32, { soft: true }) + gtext(24, 36, "⌕ search fields", { a: "start", fs: 12 });
    for (let i = 0; i < Math.min(n, 4); i++) { if (i === 1) s += `<rect x="10" y="${82 + 38 - 16}" width="${lw}" height="32" rx="4" class="box hi"/>`; const ind = i % 2 ? 22 : 0; s += text(20 + ind, 82 + i * 38, L(i), lw - 20 - ind, { a: "start", hi: i === 1 }) + (i % 2 === 0 ? gtext(lw - 6, 82 + i * 38, "▾", { a: "end" }) : ""); }
    const x = lw + 24, w = W - x - 10;
    return s + rect(x, 20, w, H - 40) + text(x + 12, 46, L(1), w - 20, { a: "start", hi: true }) + bar(x + 12, 70, w - 24, 8) + bar(x + 12, 92, (w - 24) * 0.7, 8) + gtext(x + 12, 130, "type, meaning, example", { a: "start", fs: 12 });
  };

  R["geospatial-map"] = ({ W, H, L, n }) => {
    const pts = [[W * 0.3, H * 0.4], [W * 0.62, H * 0.3], [W * 0.5, H * 0.68]]; let s = `<path d="M${W * 0.12} ${H * 0.5} C ${W * 0.15} ${H * 0.15}, ${W * 0.5} ${H * 0.08}, ${W * 0.85} ${H * 0.25} C ${W * 0.95} ${H * 0.55}, ${W * 0.7} ${H * 0.9}, ${W * 0.4} ${H * 0.85} C ${W * 0.2} ${H * 0.8}, ${W * 0.1} ${H * 0.7}, ${W * 0.12} ${H * 0.5}z" class="box soft"/>`;
    pts.forEach(([x, y], i) => { s += `<path d="M${x} ${y} l-9 -22 a11 11 0 1 1 18 0z" class="${i === 0 ? "fillhi" : "fill"}"/>` + text(x, y + 14, L(i), 110, { hi: i === 0 }); });
    return s;
  };

  R["magnitude-flow"] = ({ W, H, L }) => {
    const x0 = W < 450 ? 110 : 140, x1 = W - (W < 450 ? 110 : 140), bandA = [[40, 110], [170, 210]], bandB = [[30, 90], [110, 170], [200, 230]];
    let s = "";
    const flows = [[0, 0, 70, 0], [0, 1, 40, 1], [1, 1, 40, 2], [1, 2, 0, 2]];
    const src = [[30, 120], [170, 230]], dst = [[24, 100], [130, 200], [250, 290]]; const ss = [0, 0], ds = [0, 0, 0];
    flows.forEach(([a, b, , ], i) => { const w = [58, 32, 38, 22][i], sy = src[a][0] + ss[a], dy = dst[b][0] + ds[b]; ss[a] += w + 4; ds[b] += w + 4;
      s += `<path d="M${x0} ${sy + 8} C ${(x0 + x1) / 2} ${sy + 8}, ${(x0 + x1) / 2} ${dy + 8}, ${x1} ${dy + 8} L${x1} ${dy + 8 + w * 0.6} C ${(x0 + x1) / 2} ${dy + 8 + w * 0.6}, ${(x0 + x1) / 2} ${sy + 8 + w * 0.6}, ${x0} ${sy + 8 + w * 0.6}z" class="${i === 0 ? "fillhi" : "fill"} flow"/>`; });
    src.forEach((r, i) => { s += rect(x0 - 12, r[0], 12, r[1] - r[0] - 10, { r: 2, soft: true }) + text(x0 - 18, (r[0] + r[1]) / 2 - 5, L(i), x0 - 26, { a: "end", fs: 13 }); });
    dst.forEach((r, i) => { s += rect(x1, r[0], 12, r[1] - r[0] - 10, { r: 2, soft: true }) + text(x1 + 18, (r[0] + r[1]) / 2 - 5, L(i + 2), x0 - 26, { a: "start", fs: 13 }); });
    return s + gtext(W / 2, H - 10, "band width = amount that flows", { fs: 11 });
  };

  R["composite-linked-view"] = ({ W, H, L, links, n }) => {
    const lw = W < 450 ? 140 : 190, k = Math.min(n, 4); let s = rect(10, 24, lw, H - 48, { soft: true });
    for (let i = 0; i < k; i++) s += rect(18, 34 + i * 44, lw - 16, 36, i === 1 ? { hi: true } : {}) + text(28, 52 + i * 44, L(i), lw - 36, { a: "start", hi: i === 1 });
    const x = lw + 50, w = W - x - 10; s += rect(x, 24, w, H - 48);
    const P = [[x + w * 0.2, 70], [x + w * 0.7, 60], [x + w * 0.45, 140], [x + w * 0.8, 170]];
    s += line(P[0][0], P[0][1], P[2][0], P[2][1]) + line(P[1][0], P[1][1], P[2][0], P[2][1]) + line(P[2][0], P[2][1], P[3][0], P[3][1]);
    P.forEach((p, i) => { s += circle(p[0], p[1], i === 1 ? 12 : 9, { hi: i === 1 }); });
    return s + `<path d="M${lw + 10} ${52 + 44} C ${lw + 30} ${96}, ${x - 20} ${60}, ${P[1][0] - 12} ${P[1][1]}" class="ln hi" fill="none" marker-end="url(#ah)"/>` + gtext(x + w / 2, H - 38, "select in one panel, see it in both", { fs: 11 });
  };

  // ---- views added to the catalog after the first 23 (the public tests now read the catalog size)
  const axes = (x0, y0, x1, y1) => line(x0, y1, x1, y1) + line(x0, y0, x0, y1);

  R["decision-table"] = ({ W, L, n }) => {
    const rows = Math.min(n, 4), c0 = W < 450 ? 110 : 160, cw = (W - c0 - 30) / 3, y0 = 36, rh = 52;
    let s = rect(10, y0 - 6, W - 20, 34, { soft: true }) + gtext(22, y0 + 11, "Rule", { a: "start" });
    ["If", "And", "Then"].forEach((h, i) => { s += gtext(c0 + cw * i + cw / 2, y0 + 11, h); });
    for (let r = 0; r < rows; r++) {
      const y = y0 + 40 + r * rh;
      s += text(22, y + 18, L(r), c0 - 14, { a: "start" });
      s += gtext(c0 + cw / 2, y + 18, r % 2 ? "no" : "yes") + gtext(c0 + cw * 1.5, y + 18, r < 2 ? "yes" : "–");
      s += rect(c0 + cw * 2 + 8, y + 4, cw - 16, 28, { hi: r === 0 }) + line(10, y + rh - 4, W - 10, y + rh - 4, { dash: true });
    }
    return s;
  };

  R["port-graph"] = ({ W, H, L, n }) => {
    const k = Math.min(n, W < 450 ? 3 : 4), bw = W < 450 ? 84 : 110, gap = (W - 20 - k * bw) / Math.max(1, k - 1), y = H / 2 - 50;
    let s = "";
    for (let i = 0; i < k; i++) {
      const x = 10 + i * (bw + gap);
      // A label wider than its box would run off the sketch at either end, so the end boxes keep theirs inside.
      const lw = i === 0 || i === k - 1 ? bw + gap / 2 - 10 : bw + gap - 10;
      s += rect(x, y, bw, 100, { hi: i === 0 }) + text(x + bw / 2, y - 16, L(i), Math.min(lw, bw + 2 * Math.min(x, W - x - bw)) * (i === 0 ? 0.8 : 1), { hi: i === 0 });
      [30, 70].forEach((py) => { s += circle(x, y + py, 5, { fill: true }) + circle(x + bw, y + py, 5, { fill: true }); });
      if (i < k - 1) s += line(x + bw + 5, y + 30, x + bw + gap - 5, y + 30, { arrow: true, hi: i === 0 }) + line(x + bw + 5, y + 70, x + bw + gap - 5, y + 70, { arrow: true });
    }
    return s + gtext(W / 2, y + 130, "lines join named ports on each box", { fs: 11 });
  };

  R["uml-component-diagram"] = ({ W, H, L, n }) => {
    const k = Math.min(n, 4), bw = (W - 50) / 2, bh = 80;
    let s = "";
    for (let i = 0; i < k; i++) {
      const x = 15 + (i % 2) * (bw + 20), y = 40 + Math.floor(i / 2) * (bh + 60);
      s += rect(x, y, bw, bh, { hi: i === 0 }) + rect(x + bw - 26, y + 8, 16, 12, { r: 2 }) + gtext(x + 12, y + 18, "«component»", { a: "start", fs: 11 }) + text(x + bw / 2, y + 50, L(i), bw - 20, { hi: i === 0 });
    }
    if (k > 1) s += line(15 + bw, 80, 35 + bw, 80, { arrow: true, hi: true });
    if (k > 2) s += line(15 + bw / 2, 120, 15 + bw / 2, 180, { arrow: true, dash: true });
    if (k > 3) s += line(35 + bw * 1.5, 120, 35 + bw * 1.5, 180, { arrow: true, dash: true });
    return s;
  };

  R["uml-class-diagram"] = ({ W, L, n }) => {
    const k = Math.min(n, W < 450 ? 2 : 3), bw = W < 450 ? 150 : 170, gap = (W - 20 - k * bw) / Math.max(1, k - 1), y = 50;
    let s = "";
    for (let i = 0; i < k; i++) {
      const x = 10 + i * (bw + gap);
      s += rect(x, y, bw, 170, { hi: i === 0, r: 2 }) + text(x + bw / 2, y + 20, L(i), bw - 12, { hi: i === 0 }) + line(x, y + 40, x + bw, y + 40) + line(x, y + 110, x + bw, y + 110);
      ["+ id", "+ name", "+ status"].forEach((f, j) => { s += gtext(x + 12, y + 58 + j * 18, f, { a: "start", fs: 11 }); });
      ["+ open()", "+ close()"].forEach((f, j) => { s += gtext(x + 12, y + 128 + j * 18, f, { a: "start", fs: 11 }); });
      if (i < k - 1) s += line(x + bw, y + 85, x + bw + gap, y + 85, { arrow: true, hi: i === 0 }) + gtext(x + bw + gap / 2, y + 74, "1..*", { fs: 11 });
    }
    return s;
  };

  R["relation-hub-graph"] = ({ W, H, L, n }) => {
    const k = Math.min(Math.max(n, 4), 6), cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 60;
    let s = rect(cx - 34, cy - 18, 68, 36, { soft: true, r: 18 }) + gtext(cx, cy, "relation", { fs: 12 });
    for (let i = 0; i < k; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / k, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      s += line(cx, cy, x, y, { hi: i === 0 }) + circle(x, y, 12, { hi: i === 0 }) + text(x, y + 28, L(i), 150, { hi: i === 0 });
    }
    return s + gtext(cx, H - 18, "one hub joins every member of a many-way link", { fs: 11 });
  };

  R["paoh-hypergraph"] = ({ W, H, L, n }) => {
    const rows = Math.min(n, 5), lw = W < 450 ? 100 : 140, cols = W < 450 ? 4 : 6, cw = (W - lw - 20) / cols, y0 = 40, rh = (H - 80) / rows;
    let s = "";
    for (let r = 0; r < rows; r++) s += text(lw - 8, y0 + r * rh + rh / 2, L(r), lw - 14, { a: "end" }) + line(lw, y0 + r * rh + rh / 2, W - 10, y0 + r * rh + rh / 2, { dash: true });
    for (let c = 0; c < cols; c++) {
      const members = Array.from({ length: rows }, (_, r) => r).filter((r) => (r + c) % 3 !== 1), x = lw + c * cw + cw / 2;
      if (members.length > 1) s += line(x, y0 + members[0] * rh + rh / 2, x, y0 + members[members.length - 1] * rh + rh / 2, { hi: c === 0 });
      members.forEach((r) => { s += circle(x, y0 + r * rh + rh / 2, 6, { hi: c === 0, fill: c !== 0 }); });
    }
    return s + gtext(lw + (W - lw) / 2, H - 16, W < 450 ? "a column = one group" : "each column is one group; dots mark its members", { fs: 11 });
  };

  R["upset-plot"] = ({ W, H, L, n }) => {
    const sets = Math.min(n, 4), lw = W < 450 ? 100 : 140, cols = W < 450 ? 4 : 6, cw = (W - lw - 20) / cols, top = 30, bh = 130, y0 = top + bh + 30, rh = 30;
    let s = "";
    for (let c = 0; c < cols; c++) {
      const x = lw + c * cw + cw / 2, h = bh * (0.95 - c * 0.13);
      s += `<rect x="${x - cw * 0.3}" y="${top + bh - h}" width="${cw * 0.6}" height="${h}" rx="2" class="${c === 0 ? "fillhi" : "fill"}"/>`;
      const on = Array.from({ length: sets }, (_, r) => r).filter((r) => ((c + 1) >> r) & 1);
      if (on.length > 1) s += line(x, y0 + on[0] * rh, x, y0 + on[on.length - 1] * rh, { hi: c === 0 });
      for (let r = 0; r < sets; r++) s += circle(x, y0 + r * rh, 6, { fill: on.includes(r), hi: c === 0 && on.includes(r) });
    }
    for (let r = 0; r < sets; r++) s += text(lw - 8, y0 + r * rh, L(r), lw - 14, { a: "end" });
    return s;
  };

  R["bar-chart"] = ({ W, H, L, n }) => {
    const k = Math.min(n, 5), lw = W < 450 ? 110 : 160, x1 = W - 30, rh = (H - 70) / k;
    let s = line(lw, 30, lw, H - 40);
    for (let i = 0; i < k; i++) {
      const y = 30 + i * rh;
      s += text(lw - 10, y + rh / 2, L(i), (lw - 16) * (i === 0 ? 0.8 : 1), { a: "end", hi: i === 0 }) + bar(lw, y + rh * 0.25, (x1 - lw) * (0.92 - i * 0.15), rh * 0.5, i === 0);
    }
    return s + gtext(lw + (x1 - lw) / 2, H - 18, "bar length = amount, from zero", { fs: 11 });
  };

  R["dot-plot"] = ({ W, H, L, n }) => {
    const k = Math.min(n, 5), lw = W < 450 ? 110 : 160, x1 = W - 30, rh = (H - 70) / k;
    let s = "";
    for (let i = 0; i < k; i++) {
      const y = 30 + i * rh + rh / 2, x = lw + (x1 - lw) * (0.85 - ((i * 23) % 60) / 100);
      s += text(lw - 10, y, L(i), (lw - 16) * (i === 0 ? 0.8 : 1), { a: "end", hi: i === 0 }) + line(lw, y, x1, y, { dash: true }) + circle(x, y, 7, { hi: i === 0, fill: i !== 0 });
    }
    return s + gtext(lw + (x1 - lw) / 2, H - 18, "dot = value, on one shared scale", { fs: 11 });
  };

  R["interval-plot"] = ({ W, H, L, n }) => {
    const k = Math.min(n, 5), lw = W < 450 ? 110 : 160, x1 = W - 30, rh = (H - 80) / k, ref = lw + (x1 - lw) * 0.4;
    const est = [[0.75, 0.6, 0.9], [0.62, 0.5, 0.74], [0.5, 0.3, 0.7], [0.45, 0.32, 0.58], [0.25, 0.12, 0.36]];
    let s = line(ref, 22, ref, 30 + k * rh, { dash: true }) + gtext(ref, 14, "0", { fs: 11 });
    for (let i = 0; i < k; i++) {
      const y = 30 + i * rh + rh / 2, [e, a, b] = est[i], at = (f) => lw + (x1 - lw) * f;
      s += text(lw - 10, y, L(i), (lw - 16) * (i === 0 ? 0.8 : 1), { a: "end", hi: i === 0 }) + line(at(a), y, at(b), y, { hi: i === 0 }) + circle(at(e), y, 7, { hi: i === 0, fill: i !== 0 });
    }
    return s + gtext(lw + (x1 - lw) / 2, H - 18, W < 450 ? "dot = estimate, line = range" : "dot = estimate; line = its range; crossing 0 = not clearly different", { fs: 11 });
  };

  R["signed-effect-matrix"] = ({ W, H, L, n }) => {
    const rows = Math.min(n, 4), lw = W < 450 ? 100 : 140, cols = W < 450 ? 4 : 6, cw = (W - lw - 20) / cols, rh = Math.min(48, (H - 90) / rows), y0 = 40;
    let s = "";
    for (let r = 0; r < rows; r++) {
      s += text(lw - 8, y0 + r * rh + rh / 2, L(r), lw - 14, { a: "end" });
      for (let c = 0; c < cols; c++) {
        const v = (((r * 5 + c * 7) % 9) - 4) / 4, cx = lw + c * cw, cy = y0 + r * rh;
        s += `<rect x="${cx}" y="${cy}" width="${cw - 3}" height="${rh - 3}" rx="2" class="${v === 0 ? "zero" : v > 0 ? "pos" : "neg"}" style="opacity:${v === 0 ? 1 : (0.3 + Math.abs(v) * 0.7).toFixed(2)}"/>`;
        s += `<text x="${cx + (cw - 3) / 2}" y="${cy + (rh - 3) / 2}" class="t" text-anchor="middle" dominant-baseline="middle" font-size="11">${v > 0 ? "+" : v < 0 ? "−" : "0"}</text>`;
      }
    }
    return s + gtext(lw + (W - lw - 20) / 2, H - 18, "blue = lowers, grey = no effect, orange = raises", { fs: 11 });
  };

  R["line-chart"] = ({ W, H, L }) => {
    const x0 = 50, x1 = W - 20, y0 = 30, y1 = H - 60, pts = 6;
    let s = axes(x0, y0, x1, y1);
    [[0.7, 0.55, 0.6, 0.4, 0.3, 0.2], [0.85, 0.8, 0.7, 0.75, 0.6, 0.65]].forEach((series, j) => {
      const d = series.map((v, i) => `${i ? "L" : "M"}${x0 + ((x1 - x0) * i) / (pts - 1)} ${y0 + (y1 - y0) * v}`).join(" ");
      s += `<path d="${d}" class="ln${j === 0 ? " hi" : ""}" fill="none"/>`;
      s += text(x1 - 4, y0 + (y1 - y0) * series[pts - 1] - 14, L(j), 160, { a: "end", hi: j === 0 });
    });
    return s + gtext((x0 + x1) / 2, y1 + 26, "time →", { fs: 12 });
  };

  R["scatter-plot"] = ({ W, H, L }) => {
    const x0 = 50, x1 = W - 20, y0 = 40, y1 = H - 60;
    let s = axes(x0, y0, x1, y1);
    for (let i = 0; i < 14; i++) {
      const fx = ((i * 37) % 100) / 100, fy = 1 - fx * 0.7 - ((i * 53) % 30) / 100;
      s += circle(x0 + 15 + (x1 - x0 - 30) * fx, y0 + (y1 - y0) * Math.max(0.05, Math.min(0.95, fy)), 6, { fill: true });
    }
    s += circle(x0 + (x1 - x0) * 0.8, y0 + (y1 - y0) * 0.2, 8, { hi: true }) + text(x0 + (x1 - x0) * 0.8, y0 + (y1 - y0) * 0.2 - 20, L(0), 160, { hi: true });
    return s + gtext((x0 + x1) / 2, y1 + 26, "one measure →", { fs: 12 }) + gtext(x0 + 6, y0 - 12, "other measure ↑", { a: "start", fs: 12 });
  };

  R["heatmap"] = ({ W, H, L, n }) => {
    const rows = Math.min(n, 5), lw = W < 450 ? 100 : 140, cols = W < 450 ? 5 : 8, cw = (W - lw - 20) / cols, rh = Math.min(48, (H - 80) / rows), y0 = 40;
    let s = "";
    for (let r = 0; r < rows; r++) {
      s += text(lw - 8, y0 + r * rh + rh / 2, L(r), lw - 14, { a: "end" });
      for (let c = 0; c < cols; c++) {
        const v = 0.15 + (((r * 7 + c * 11) % 10) / 10) * 0.85, hi = r === 0 && c === 2;
        s += `<rect x="${lw + c * cw}" y="${y0 + r * rh}" width="${cw - 3}" height="${rh - 3}" rx="2" class="${hi ? "fillhi" : "fill"}" style="opacity:${hi ? 1 : v.toFixed(2)}"/>`;
      }
    }
    return s + gtext(lw + (W - lw) / 2, y0 + rows * rh + 24, "darker = more", { fs: 11 });
  };

  R["animated-explainer-clip"] = ({ W, H, L }) => {
    const x = 20, w = W - 40, h = H - 110;
    let s = rect(x, 20, w, h, { soft: true }) + circle(W / 2, 20 + h / 2, 26, { hi: true }) + `<path d="M${W / 2 - 8} ${20 + h / 2 - 13} L${W / 2 + 14} ${20 + h / 2} L${W / 2 - 8} ${20 + h / 2 + 13} z" class="fillhi"/>`;
    s += text(W / 2, 20 + h / 2 + 50, L(0), w - 30, { hi: true }) + line(x, H - 60, x + w, H - 60) + bar(x, H - 64, w * 0.35, 8, true);
    [0.2, 0.5, 0.8].forEach((f, i) => { s += gtext(x + w * f, H - 36, `scene ${i + 1}`, { fs: 11 }); });
    return s;
  };

  // Plain-language names and one-line meanings for every catalog id.
  const NAMES = {
    "node-link-graph": ["a network diagram", "dots joined by lines, so you can see what connects to what"],
    "adjacency-matrix": ["a connection grid", "a grid where each filled cell means two things are linked"],
    "requirements-traceability-matrix": ["a checklist grid", "rows of things against the evidence for each, with gaps showing"],
    "hierarchy-tree": ["a tree", "one thing at the top, branching into parts and sub-parts"],
    "sequence-diagram": ["a who-talks-to-whom diagram", "actors in columns with arrows showing what happens in order"],
    "timeline": ["a timeline", "events placed along a line of time"],
    "project-schedule": ["a schedule chart", "bars on a calendar showing who does what, and when"],
    "data-table": ["a sortable table", "rows and columns you can sort and scan"],
    "answer-receipt-card": ["an answer card", "one run's answer first, the evidence under it, and a receipt of how it ran"],
    "argument-page": ["an argument page", "the claim first, then one section per reason, each with its evidence"],
    "link-directory": ["a list of links", "grouped rows, each one a link to where the thing lives"],
    "master-detail": ["a list with a detail panel", "pick an item on the left, read everything about it on the right"],
    "state-machine-view": ["a state diagram", "the states something can be in and the moves between them"],
    "explorable-simulation": ["an interactive simulation", "drag an input and watch the result change"],
    "layered-architecture-view": ["a layered diagram", "stacked bands showing what sits on top of what"],
    "small-multiples": ["a grid of small charts", "the same chart repeated, so you can compare at a glance"],
    "staged-explanatory-machine": ["a step-by-step diagram", "the same diagram in numbered stages"],
    "scroll-linked-explainer": ["a scroll-through explainer", "text you scroll while a picture changes beside it"],
    "directed-handoff-flow": ["a flow of hand-offs", "boxes joined by arrows, left to right"],
    "process-swimlane": ["a swimlane process map", "who does each step, in lanes"],
    "bpmn-process": ["a process flowchart", "start, tasks, decisions and end"],
    "data-model-diagram": ["a data-model diagram", "the record types and how they relate"],
    "schema-explorer": ["a searchable field browser", "a searchable tree of fields, with a panel for each"],
    "geospatial-map": ["a map", "things placed where they are"],
    "magnitude-flow": ["a flow-width diagram", "bands whose width shows how much moves from one place to another"],
    "composite-linked-view": ["linked panels", "two or more views of the same data that highlight together"],
    "decision-table": ["a decision table", "each row is a rule: these conditions give that outcome"],
    "port-graph": ["a wiring diagram", "boxes with named connection points and the wires between them"],
    "uml-component-diagram": ["a component diagram", "the parts of a system and the interfaces between them"],
    "uml-class-diagram": ["a class diagram", "record types with their fields and how they relate"],
    "relation-hub-graph": ["a hub diagram", "a hub for each many-way link, joined to every member"],
    "paoh-hypergraph": ["a group-membership grid", "one row per item, one column per group, dots for members"],
    "upset-plot": ["an overlap chart", "how big each combination of sets is, as bars over a dot grid"],
    "bar-chart": ["a bar chart", "bars whose length shows how much"],
    "dot-plot": ["a dot plot", "a dot for each value on one shared scale"],
    "interval-plot": ["an interval plot", "a dot for each estimate with a line for how sure it is, against a zero line"],
    "signed-effect-matrix": ["an effect grid", "a grid where blue means lowers, orange means raises, grey means no effect"],
    "line-chart": ["a line chart", "lines that show how values change over time"],
    "scatter-plot": ["a scatter plot", "one dot per item, placed by two measures"],
    "heatmap": ["a heat map", "a grid where shade shows how much"],
    "animated-explainer-clip": ["a short animated clip", "a few seconds of motion that plays by itself"],
  };

  window.RouterSketch = {
    NAMES,
    ids: Object.keys(R),
    render(id, sketch, narrow) {
      const fn = R[id];
      if (!fn) return wrap(600, 200, gtext(300, 100, "No sketch for this view"));
      const W = narrow ? 360 : 600, H = narrow ? 400 : 380;
      const marks = (sketch?.marks || []).slice(0, narrow ? 4 : 6);
      const links = sketch?.links || [];
      const generic = id === "process-swimlane" || id === "directed-handoff-flow" || id === "staged-explanatory-machine" || id === "bpmn-process" || id === "state-machine-view" ? G_STEPS : G_ITEMS;
      const L = makeLabels(marks, generic);
      return wrap(W, H, fn({ W, H, L, links, n: Math.max(marks.length, 3) }));
    },
    empty(narrow, slots) {
      const W = narrow ? 360 : 600, H = narrow ? 400 : 380;
      let s = `<rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="12" class="box dash"/>` + gtext(W / 2, 70, "Nothing to draw yet", { fs: 20 });
      slots.forEach((t, i) => { const y = 130 + i * 70; s += `<rect x="${W * 0.12}" y="${y}" width="${W * 0.76}" height="48" rx="8" class="box dash"/>` + `<text x="${W * 0.12 + 16}" y="${y + 24}" class="t" font-size="14" dominant-baseline="middle">${esc(t)}</text><text x="${W * 0.88 - 14}" y="${y + 24}" class="t hi" font-size="13" text-anchor="end" dominant-baseline="middle">missing</text>`; });
      return wrap(W, H, s);
    },
  };
})();
