import { route, buildViewSpec } from "../src/router.mjs";
import { renderPreview } from "./renderers.js";

const scenarioFiles = [
  "requirements-verification.json",
  "failure-propagation.json",
  "startup-sequence.json",
  "large-dependency-network.json",
  "architecture-communication.json",
  "state-lifecycle.json",
  "comparative-variants.json",
  "evidence-review.json",
  "policy-simulation.json"
];

const options = {
  intent: ["inspect", "compare", "understand", "decide", "create", "modify", "navigate", "monitor", "troubleshoot", "communicate", "trace"],
  structure: ["scalar", "list", "table", "hierarchy", "network", "timeline", "sequence", "spatial", "document", "process", "state-machine", "matrix"],
  task: ["lookup", "locate", "filter", "sort", "rank", "correlate", "trace", "aggregate", "annotate", "select", "enter", "confirm", "compare", "inspect", "edit", "simulate", "scrub"],
  density: ["low", "medium", "high"],
  mode: ["read-only", "exploratory", "direct-manipulation", "authoring", "collaborative"],
  dynamics: ["static", "interactive", "animated", "simulated"],
  accessibility: ["baseline", "high"]
};

const $ = (id) => document.getElementById(id);
const [catalog, heuristics, ...scenarios] = await Promise.all([
  fetch("../catalog/representations.json").then((r) => r.json()),
  fetch("../heuristics/core.json").then((r) => r.json()),
  ...scenarioFiles.map((file) => fetch(`../examples/${file}`).then((r) => r.json()))
]);
let baseScenario = structuredClone(scenarios[0]);

function humanize(value) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fillSelect(id, values) {
  $(id).innerHTML = values.map((value) => `<option value="${value}">${humanize(value)}</option>`).join("");
}

function fillChips(containerId, name, values) {
  $(containerId).innerHTML = values.map((value) => `
    <label class="chip">
      <input type="checkbox" name="${name}" value="${value}">
      <span>${humanize(value)}</span>
    </label>`).join("");
}

fillSelect("density", options.density);
fillSelect("mode", options.mode);
fillSelect("dynamics", options.dynamics);
fillSelect("accessibility", options.accessibility);
fillChips("intent-options", "intent", options.intent);
fillChips("structure-options", "structure", options.structure);
fillChips("task-options", "task", options.task);

$("scenario").innerHTML = scenarios.map((scenario, index) =>
  `<option value="${index}">${humanize(scenario.id)}</option>`
).join("");

function setChecked(name, selected = []) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.checked = selected.includes(input.value);
  });
}
function loadScenario(scenario) {
  baseScenario = structuredClone(scenario);
  $("concern").value = scenario.concern;
  $("stakeholder").value = scenario.stakeholder ?? "";
  $("items").value = scenario.scale.items;
  $("density").value = scenario.scale.density;
  $("mode").value = scenario.interaction.mode;
  $("dynamics").value = scenario.interaction.dynamics;
  $("accessibility").value = scenario.constraints?.accessibility ?? "baseline";
  $("provenance").checked = Boolean(scenario.constraints?.provenance);
  $("aggregation").checked = Boolean(scenario.constraints?.allowAggregation);
  $("mobile").checked = Boolean(scenario.constraints?.mobile);
  setChecked("intent", scenario.intent);
  setChecked("structure", scenario.informationStructure);
  setChecked("task", scenario.tasks);
  render();
}

function checkedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

function readUseCase() {
  return {
    ...structuredClone(baseScenario),
    concern: $("concern").value.trim() || "Untitled concern",
    stakeholder: $("stakeholder").value.trim() || "unspecified stakeholder",
    intent: checkedValues("intent"),
    informationStructure: checkedValues("structure"),
    tasks: checkedValues("task"),
    scale: { items: Math.max(0, Number.parseInt($("items").value || "0", 10)), density: $("density").value },
    interaction: { mode: $("mode").value, dynamics: $("dynamics").value },
    constraints: {
      ...(baseScenario.constraints ?? {}),
      accessibility: $("accessibility").value,
      provenance: $("provenance").checked,
      allowAggregation: $("aggregation").checked,
      mobile: $("mobile").checked
    }
  };
}
let selectedCandidateId = null;

function renderRanking(results) {
  if (!results.accepted.length) {
    $("ranking").innerHTML = '<p class="empty">No candidate satisfies the current hard constraints.</p>';
    return null;
  }

  if (!results.accepted.some((result) => result.candidate.id === selectedCandidateId)) {
    selectedCandidateId = results.accepted[0].candidate.id;
  }

  $("ranking").innerHTML = results.accepted.map((result, index) => `
    <article class="rank-card ${result.candidate.id === selectedCandidateId ? "selected" : ""}">
      <button class="rank-choice" type="button" data-candidate="${result.candidate.id}" aria-label="Use ${humanize(result.candidate.id)} for the ViewSpec">
        <span><span class="rank-number">${String(index + 1).padStart(2, "0")}</span> ${humanize(result.candidate.id)}</span>
        <span class="score">${result.score} pts</span>
      </button>
      <p class="family">${humanize(result.candidate.family)} · ${humanize(result.candidate.defaultLayout ?? "unspecified layout")}</p>
      <ul class="reasons">${result.reasons.map((reason) => `<li>${reason}</li>`).join("")}</ul>
    </article>`).join("");

  document.querySelectorAll(".rank-choice").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCandidateId = button.dataset.candidate;
      render();
    });
  });

  return results.accepted.find((result) => result.candidate.id === selectedCandidateId);
}

function renderRejected(results) {
  $("rejection-summary").textContent = `Rejected candidates (${results.rejected.length})`;
  $("rejected").innerHTML = results.rejected.length
    ? results.rejected.map((result) => `<div class="reject-item"><strong>${humanize(result.candidate.id)}</strong><br>${result.rejectedBecause.join("; ")}</div>`).join("")
    : '<p class="empty">No hard rejections.</p>';
}
function render() {
  const useCase = readUseCase();
  const results = route(useCase, catalog, heuristics, { limit: 5 });
  const selected = renderRanking(results);
  renderRejected(results);

  if (!selected) {
    $("winner").innerHTML = '<strong>No ViewSpec generated</strong><span>Relax a hard constraint or select additional task/intent information.</span>';
    $("preview").innerHTML = '<p class="empty">No renderer preview is available until a candidate satisfies the hard constraints.</p>';
    $("view-spec").textContent = "{}";
    return;
  }

  const spec = buildViewSpec(useCase, selected);
  $("winner").innerHTML = `<strong>${humanize(selected.candidate.id)}</strong><span>${selected.score} points · ${humanize(selected.candidate.family)} · click another candidate to compare specs</span>`;
  renderPreview($("preview"), useCase, spec);
  $("view-spec").textContent = JSON.stringify(spec, null, 2);
}

$("controls").addEventListener("input", render);
$("controls").addEventListener("change", render);
$("scenario").addEventListener("change", () => {
  selectedCandidateId = null;
  loadScenario(scenarios[Number.parseInt($("scenario").value, 10)]);
});
$("reset").addEventListener("click", () => {
  selectedCandidateId = null;
  loadScenario(scenarios[Number.parseInt($("scenario").value, 10)]);
});

loadScenario(scenarios[0]);
