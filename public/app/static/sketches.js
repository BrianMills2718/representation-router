// Wireframe sketches for every view in the router's catalog (catalog/representations.json, 23 ids).
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
