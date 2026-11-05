import { buildRenderPlan } from "../src/render-plan.mjs";

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const humanize = (value = "") => value
  .replaceAll("-", " ")
  .replace(/\b\w/g, (char) => char.toUpperCase());

function shell(plan, visual, details = "Select a mark to inspect it.") {
  return `
    <div class="preview-meta">
      <span class="adapter-pill">${escapeHtml(humanize(plan.adapter))}</span>
      <span>${escapeHtml(humanize(plan.dynamics))}</span>
    </div>
    <div class="preview-visual">${visual}</div>
    <p class="preview-note">${escapeHtml(plan.note)}</p>
    <div class="mark-details" aria-live="polite">${escapeHtml(details)}</div>`;
}

function svg(content, height = 300) {
  return `<svg class="preview-svg" viewBox="0 0 640 ${height}" role="img" aria-label="Schematic visualization preview">${content}</svg>`;
}
function graphVisual(plan) {
  const positions = [
    [90, 80], [310, 55], [540, 92], [170, 220], [390, 205], [560, 245]
  ];
  const byId = Object.fromEntries(plan.data.nodes.map((node, index) => [node.id, positions[index % positions.length]]));
  const edges = plan.data.edges.map((edge) => {
    const [x1, y1] = byId[edge.source];
    const [x2, y2] = byId[edge.target];
    return `<line class="viz-edge" data-source="${edge.source}" data-target="${edge.target}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
  }).join("");
  const nodes = plan.data.nodes.map((node, index) => {
    const [x, y] = positions[index % positions.length];
    return `<g class="viz-node selectable-mark" data-label="${escapeHtml(node.label)}" data-node="${node.id}" tabindex="0" role="button" aria-label="Inspect ${escapeHtml(node.label)}">
      <circle cx="${x}" cy="${y}" r="31"></circle>
      <text x="${x}" y="${y + 4}" text-anchor="middle">${escapeHtml(node.label.replace(/\s+\d+$/, ""))}</text>
    </g>`;
  }).join("");
  return svg(`${edges}${nodes}`, 300);
}

function matrixVisual(plan) {
  const headers = plan.data.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const rows = plan.data.rows.map((row) => {
    const cells = plan.data.columns.map((column) => {
      const cell = plan.data.cells.find((candidate) => candidate.row === row && candidate.column === column);
      return `<td><button class="matrix-cell selectable-mark ${cell?.active ? "active" : ""}" data-label="${escapeHtml(`${row} × ${column}`)}" type="button" aria-label="Inspect ${escapeHtml(row)} by ${escapeHtml(column)}">${cell?.active ? "●" : "·"}</button></td>`;
    }).join("");
    return `<tr><th>${escapeHtml(row)}</th>${cells}</tr>`;
  }).join("");
  return `<div class="table-scroll"><table class="matrix-table"><thead><tr><th></th>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function sequenceVisual(plan) {
  const xPositions = [85, 245, 405, 565];
  const actorLabels = plan.data.actors.slice(0, 4);
  const actors = actorLabels.map((actor, index) => {
    const x = xPositions[index];
    return `<g><rect class="lane-head" x="${x - 55}" y="18" width="110" height="34" rx="8"></rect><text x="${x}" y="40" text-anchor="middle">${escapeHtml(actor)}</text><line class="lifeline" x1="${x}" y1="52" x2="${x}" y2="278"></line></g>`;
  }).join("");
  const messages = plan.data.messages.slice(0, 6).map((message, index) => {
    const from = actorLabels.indexOf(message.from);
    const to = actorLabels.indexOf(message.to);
    const y = 82 + index * 32;
    const x1 = xPositions[from];
    const x2 = xPositions[to];
    const middle = (x1 + x2) / 2;
    return `<g class="selectable-mark sequence-mark" data-label="${escapeHtml(`${message.from} → ${message.to}: ${message.label}`)}" tabindex="0" role="button"><line class="message-line" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"></line><circle class="message-dot" cx="${x2}" cy="${y}" r="4"></circle><text x="${middle}" y="${y - 6}" text-anchor="middle">${escapeHtml(message.label)}</text></g>`;
  }).join("");
  return svg(`${actors}${messages}`, 300);
}

function timelineVisual(plan) {
  const events = plan.data.events.slice(0, 6);
  const spacing = 500 / Math.max(1, events.length - 1);
  const marks = events.map((event, index) => {
    const x = 70 + index * spacing;
    const y = index % 2 ? 195 : 110;
    return `<g class="selectable-mark timeline-mark" data-label="${escapeHtml(event.label)}" tabindex="0" role="button"><line class="event-stem" x1="${x}" y1="150" x2="${x}" y2="${y}"></line><circle cx="${x}" cy="150" r="7"></circle><text x="${x}" y="${y + (y < 150 ? -10 : 18)}" text-anchor="middle">${escapeHtml(event.label)}</text></g>`;
  }).join("");
  return svg(`<line class="timeline-axis" x1="55" y1="150" x2="585" y2="150"></line>${marks}`, 300);
}
function hierarchyVisual(plan, architecture = false) {
  const levels = plan.data.levels.map((level, index) => `
    <section class="hierarchy-level ${architecture ? "architecture-layer" : ""}">
      <div class="level-label">${escapeHtml(level.label)}</div>
      <div class="level-items">${level.items.map((item) => `<button type="button" class="level-item selectable-mark" data-label="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("")}</div>
    </section>`).join("");
  return `<div class="hierarchy-stack">${levels}</div>`;
}

function stateVisual(plan) {
  const positions = [[80, 145], [200, 75], [330, 145], [460, 75], [565, 145]];
  const byId = Object.fromEntries(plan.data.states.map((state, index) => [state.id, positions[index]]));
  const transitions = plan.data.transitions.map((transition) => {
    const [x1, y1] = byId[transition.source];
    const [x2, y2] = byId[transition.target];
    return `<line class="state-edge" x1="${x1 + 33}" y1="${y1}" x2="${x2 - 33}" y2="${y2}"></line>`;
  }).join("");
  const states = plan.data.states.map((state, index) => {
    const [x, y] = positions[index];
    return `<g class="state-node selectable-mark" data-label="${escapeHtml(state.label)}" tabindex="0" role="button"><rect x="${x - 42}" y="${y - 24}" width="84" height="48" rx="16"></rect><text x="${x}" y="${y + 4}" text-anchor="middle">${escapeHtml(state.label)}</text></g>`;
  }).join("");
  return svg(`${transitions}${states}`, 240);
}

function tableVisual(plan, masterDetail = false) {
  const head = plan.data.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const rows = plan.data.rows.map((row, index) => `<tr class="selectable-row" tabindex="0" data-label="Row ${index + 1}: ${escapeHtml(row[plan.data.columns[0]])}">${plan.data.columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`).join("");
  const table = `<div class="table-scroll"><table class="data-preview"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  return masterDetail ? `<div class="master-detail-preview">${table}<aside><strong>Inspector</strong><p id="inline-inspector">Select a row to reveal details.</p></aside></div>` : table;
}
function directoryVisual(plan) {
  const groups = plan.data.groups.map((group) => `<section class="directory-group"><h4>${escapeHtml(group.label)}</h4><ul>${group.items.map((item) => `<li><a class="selectable-mark" href="${escapeHtml(item.href)}" data-label="${escapeHtml(item.label)}">${escapeHtml(item.label)} ↗</a> <span>${escapeHtml(item.note)}</span></li>`).join("")}</ul></section>`).join("");
  return `<div class="directory-preview">${groups}</div>`;
}
// The answer first, the evidence under it, the receipt strip at the foot; a failed run keeps the same card.
function receiptVisual(plan) {
  const { question, headline, evidence, receipt, trace, failure } = plan.data;
  const card = (status, head) => `<article class="receipt-card ${status}"><p class="receipt-question">${escapeHtml(question)}</p><h4 class="receipt-headline">${escapeHtml(head)}</h4>${status === "failed" ? "" : `<ul class="receipt-evidence">${evidence.map((item) => `<li><a class="selectable-mark" href="${escapeHtml(item.source)}" data-label="${escapeHtml(`${item.label}: ${item.note}`)}">${escapeHtml(item.label)}</a> ${escapeHtml(item.note)}</li>`).join("")}</ul>`}<footer class="receipt-strip">${receipt.map((r) => `<span><b>${escapeHtml(r.field)}</b> ${escapeHtml(r.value)}</span>`).join("")}<a class="selectable-mark" href="${escapeHtml(trace)}" data-label="Full trace">full trace</a></footer></article>`;
  // One run, one card; the failed state is shown apart, labelled as what the same card says when a run fails.
  const main = plan.data.status === "failed" ? card("failed", failure.headline) : card("answered", headline);
  const variant = plan.data.status === "failed" ? "" : `<details class="receipt-variant"><summary>The same card when a run fails</summary>${card("failed", failure.headline)}</details>`;
  return `<div class="receipt-set">${main}${variant}</div>`;
}
function argumentVisual(plan) {
  const sections = plan.data.sections.map((section) => `<section class="argument-section selectable-mark" tabindex="0" data-label="${escapeHtml(section.claim)}"><h4>${escapeHtml(section.claim)}</h4><p>${escapeHtml(section.evidence)}</p></section>`).join("");
  return `<article class="argument-preview"><p class="argument-claim">${escapeHtml(plan.data.claim)}</p>${sections}</article>`;
}
function chartVisual(plan) {
  const { mark, points } = plan.data;
  const max = Math.max(...points.map((point) => point.value), 1);
  if (mark === "bar" || mark === "dot") {
    const rows = points.map((point) => {
      const width = Math.round((point.value / max) * 100);
      const glyph = mark === "bar" ? `<span class="chart-bar" style="width:${width}%"></span>` : `<span class="chart-dot" style="left:${width}%"></span>`;
      return `<button class="chart-row selectable-mark" type="button" data-label="${escapeHtml(point.label)}: ${point.value}"><span class="chart-label">${escapeHtml(point.label)}</span><span class="chart-track">${glyph}</span><span class="chart-value">${point.value}</span></button>`;
    }).join("");
    return `<div class="chart-rows">${rows}</div>`;
  }
  const maxX = Math.max(...points.map((point) => (mark === "line" ? point.x : point.value)), 1);
  const x = (value) => 24 + (value / maxX) * 264;
  const y = (value) => 130 - (value / max) * 112;
  const shapes = mark === "line"
    ? `<polyline points="${points.map((point) => `${x(point.x)},${y(point.value)}`).join(" ")}"></polyline>`
    : points.map((point) => `<circle cx="${x(point.value)}" cy="${y(point.y)}" r="5"><title>${escapeHtml(point.label)}</title></circle>`).join("");
  return `<svg class="chart-svg chart-${mark}" viewBox="0 0 300 150" role="img" aria-label="${escapeHtml(plan.title)}"><line x1="16" y1="136" x2="296" y2="136"></line><line x1="16" y1="8" x2="16" y2="136"></line>${shapes}</svg>`;
}
// Forest plot: a dot at each estimate, a line across its interval, and the reference line it must clear.
function intervalVisual(plan) {
  const { rows, reference, intervalLabel } = plan.data;
  const lo = Math.min(reference, ...rows.map((row) => row.low));
  const hi = Math.max(reference, ...rows.map((row) => row.high));
  const pct = (value) => (((value - lo) / (hi - lo || 1)) * 100).toFixed(1);
  const body = rows.map((row) => `<button class="interval-row selectable-mark ${row.crossesReference ? "crosses" : ""}" type="button" data-label="${escapeHtml(`${row.label}: ${row.estimate} (${row.low} to ${row.high})${row.crossesReference ? ", not clearly different from the reference" : ""}`)}"><span class="chart-label">${escapeHtml(row.label)}</span><span class="interval-track"><span class="interval-reference" style="left:${pct(reference)}%"></span><span class="interval-line" style="left:${pct(row.low)}%;width:${(pct(row.high) - pct(row.low)).toFixed(1)}%"></span><span class="interval-dot" style="left:${pct(row.estimate)}%"></span></span><span class="chart-value">${row.estimate}</span></button>`).join("");
  return `<div class="interval-rows">${body}<p class="interval-key">Dot: estimate. Line: ${escapeHtml(intervalLabel)}. Grey line: ${reference}; a range crossing it is not clearly different (shown faded).</p></div>`;
}
// Diverging matrix: blue one way, grey at zero, orange the other, the signed value printed so colour is never alone.
function signedMatrixVisual(plan) {
  const { rows, columns, cells, legend } = plan.data;
  const headers = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows.map((row) => `<tr><th>${escapeHtml(row)}</th>${columns.map((column) => {
    const value = cells.find((cell) => cell.row === row && cell.column === column)?.value ?? 0;
    const hue = value > 0 ? "var(--signed-positive)" : "var(--signed-negative)";
    const fill = value === 0 ? "var(--signed-zero)" : `color-mix(in srgb, ${hue} ${Math.round(Math.abs(value) * 85) + 15}%, var(--signed-zero))`;
    const text = value > 0 ? `+${value}` : `${value}`;
    return `<td><button class="signed-cell selectable-mark" style="background:${fill}" type="button" data-label="${escapeHtml(`${row} × ${column}: ${text}`)}">${text}</button></td>`;
  }).join("")}</tr>`).join("");
  return `<div class="table-scroll"><table class="matrix-table signed-matrix"><thead><tr><th></th>${headers}</tr></thead><tbody>${body}</tbody></table><p class="interval-key">${escapeHtml(legend.negative)} · ${escapeHtml(legend.zero)} · ${escapeHtml(legend.positive)}</p></div>`;
}
function smallMultiplesVisual(plan) {
  const cards = plan.data.facets.map((facet) => {
    const points = facet.values.map((value, index) => `${18 + index * 32},${72 - value * 7}`).join(" ");
    return `<button class="mini-chart selectable-mark" type="button" data-label="${escapeHtml(facet.label)}"><span>${escapeHtml(facet.label)}</span><svg viewBox="0 0 150 84" aria-hidden="true"><polyline points="${points}"></polyline></svg></button>`;
  }).join("");
  return `<div class="small-multiples-grid">${cards}</div>`;
}

function simulationVisual(plan) {
  const actorRows = plan.data.actors.map((actor, index) => `
    <div class="simulation-row">
      <span>${escapeHtml(actor)}</span>
      <div class="simulation-track"><i data-sim-bar="${index}"></i></div>
      <output data-sim-value="${index}">0</output>
    </div>`).join("");
  return `<div class="simulation-preview">
    <div class="simulation-controls">
      <button id="simulation-toggle" type="button">Play</button>
      <label>Step <input id="simulation-step" type="range" min="0" max="${plan.data.steps.length - 1}" value="0"></label>
    </div>
    <div class="simulation-rows">${actorRows}</div>
  </div>`;
}

/** Splits a label at the space nearest its middle; a single word stays on one line. */
function wrapInTwo(label) {
  const spaces = [...label.matchAll(/ /g)].map((m) => m.index);
  if (!spaces.length) return [label];
  const cut = spaces.reduce((best, i) => (Math.abs(i - label.length / 2) < Math.abs(best - label.length / 2) ? i : best));
  return [label.slice(0, cut), label.slice(cut + 1)];
}

function explanationVisual(plan) {
  const stages = plan.data.stages.slice(0, 8);
  // Each box is wide enough for its label (about 7px a character at this size) but never wider than twice the
  // gap between stage centres, and the first and last centres sit far enough in that their boxes stay inside.
  const labelWidth = (stage) => Math.max(76, stage.label.length * 7 + 20);
  const edge = Math.max(labelWidth(stages[0] ?? { label: "" }), labelWidth(stages.at(-1) ?? { label: "" })) / 2 + 4;
  const spacing = (640 - 2 * edge) / Math.max(1, stages.length - 1);
  const at = (index) => ({ x: edge + index * spacing, y: index % 2 ? 190 : 90 });
  const marks = stages.map((stage, index) => {
    const { x, y } = at(index);
    const cap = Math.max(76, spacing * 2 - 12);
    const lines = labelWidth(stage) > cap ? wrapInTwo(stage.label) : [stage.label];
    const boxWidth = Math.min(Math.max(...lines.map((line) => labelWidth({ label: line }))), cap);
    const text = lines.length === 1
      ? `<text x="${x}" y="${y + 4}" text-anchor="middle">${escapeHtml(stage.label)}</text>`
      : `<text x="${x}" y="${y - 3}" text-anchor="middle">${lines.map((line, i) => `<tspan x="${x}" dy="${i ? 14 : 0}">${escapeHtml(line)}</tspan>`).join("")}</text>`;
    return `<g class="selectable-mark explanation-stage" data-label="${escapeHtml(stage.label)}" tabindex="0" role="button">
      <rect x="${x - boxWidth / 2}" y="${y - 22}" width="${boxWidth}" height="44" rx="10"></rect>
      ${text}
    </g>`;
  }).join("");
  const path = stages.map((_, index) => `${index ? "L" : "M"}${at(index).x},${at(index).y}`).join(" ");
  // The token travels the track behind the stage boxes, so it never covers a label (it was drawn at the
  // first stage's centre, on top of its name, and never moved). With reduced motion it rests on the track
  // between the first two stages.
  const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const rest = stages.length > 1 ? { x: edge + spacing / 2, y: 140 } : { x: edge, y: 130 };
  const token = reduced || stages.length < 2
    ? `<circle class="message-dot explanation-token" cx="${rest.x}" cy="${rest.y}" r="7"></circle>`
    : `<circle class="message-dot explanation-token" r="7"><animateMotion dur="${stages.length * 1.4}s" repeatCount="indefinite" path="${path}"></animateMotion></circle>`;
  return svg(`<path class="explanation-track" d="${path}"></path>${token}${marks}`, 280);
}

function genericVisual(plan) {
  return `<div class="generic-preview">${(plan.data.labels ?? []).map((label) => `<button class="level-item selectable-mark" type="button" data-label="${escapeHtml(label)}">${escapeHtml(label)}</button>`).join("")}</div>`;
}

function visualFor(plan) {
  if (plan.adapter === "directory") return directoryVisual(plan);
  if (plan.adapter === "argument") return argumentVisual(plan);
  if (plan.adapter === "receipt") return receiptVisual(plan);
  if (plan.adapter === "graph") return graphVisual(plan);
  if (plan.adapter === "matrix") return matrixVisual(plan);
  if (plan.adapter === "sequence") return sequenceVisual(plan);
  if (plan.adapter === "timeline") return timelineVisual(plan);
  if (plan.adapter === "state") return stateVisual(plan);
  if (plan.adapter === "hierarchy") return hierarchyVisual(plan, false);
  if (plan.adapter === "architecture") return hierarchyVisual(plan, true);
  if (plan.adapter === "table") return tableVisual(plan, false);
  if (plan.adapter === "master-detail") return tableVisual(plan, true);
  if (plan.adapter === "small-multiples") return smallMultiplesVisual(plan);
  if (plan.adapter === "chart") return chartVisual(plan);
  if (plan.adapter === "interval") return intervalVisual(plan);
  if (plan.adapter === "signed-matrix") return signedMatrixVisual(plan);
  if (plan.adapter === "simulation") return simulationVisual(plan);
  if (plan.adapter === "explanation") return explanationVisual(plan);
  return genericVisual(plan);
}
function bindSelection(container) {
  const details = container.querySelector(".mark-details");
  const marks = [...container.querySelectorAll(".selectable-mark, .selectable-row")];
  const select = (mark) => {
    marks.forEach((candidate) => candidate.classList.toggle("mark-selected", candidate === mark));
    const label = mark.dataset.label || "Selected mark";
    details.textContent = `${label} — in a project-backed renderer this selection would resolve to semantic model elements and provenance.`;
    const inspector = container.querySelector("#inline-inspector");
    if (inspector) inspector.textContent = label;
    if (mark.dataset.node) {
      const nodeId = mark.dataset.node;
      container.querySelectorAll(".viz-edge").forEach((edge) => {
        edge.classList.toggle("edge-selected", edge.dataset.source === nodeId || edge.dataset.target === nodeId);
      });
    }
  };
  marks.forEach((mark) => {
    mark.addEventListener("click", () => select(mark));
    if (mark.tagName !== "BUTTON") mark.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select(mark);
      }
    });
  });
}

function bindSimulation(container, plan) {
  const toggle = container.querySelector("#simulation-toggle");
  const slider = container.querySelector("#simulation-step");
  if (!toggle || !slider) return () => {};
  let timer = null;
  const renderStep = () => {
    const step = plan.data.steps[Number(slider.value)] ?? plan.data.steps[0];
    step.values.forEach((value, index) => {
      const bar = container.querySelector(`[data-sim-bar="${index}"]`);
      const output = container.querySelector(`[data-sim-value="${index}"]`);
      if (bar) bar.style.width = `${value}%`;
      if (output) output.textContent = String(value);
    });
  };
  const stop = () => {
    if (timer) window.clearInterval(timer);
    timer = null;
    toggle.textContent = "Play";
  };
  const start = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    toggle.textContent = "Pause";
    timer = window.setInterval(() => {
      slider.value = String((Number(slider.value) + 1) % plan.data.steps.length);
      renderStep();
    }, 700);
  };
  toggle.addEventListener("click", () => timer ? stop() : start());
  slider.addEventListener("input", () => {
    stop();
    renderStep();
  });
  renderStep();
  return stop;
}

export function renderPreview(container, useCase, viewSpec) {
  container._rrCleanup?.();
  const plan = buildRenderPlan(useCase, viewSpec);
  container.innerHTML = shell(plan, visualFor(plan));
  bindSelection(container);
  container._rrCleanup = plan.adapter === "simulation" ? bindSimulation(container, plan) : () => {};
  return plan;
}
