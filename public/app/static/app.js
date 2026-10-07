(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NAMES = window.RouterSketch.NAMES;
  const nm = (id) => (NAMES[id] ? NAMES[id][0] : id);
  const narrow = () => window.matchMedia("(max-width:760px)").matches;
  let state = { result: null, adv: false, showAll: false, open: null, running: false };

  // ---------- examples + input
  fetch("/api/examples").then((r) => r.json()).then((d) => {
    $("chips").innerHTML = d.examples.map((e) => `<button type="button" class="chip${e.kind === "declines" ? " declines" : ""}" data-text="${esc(e.text)}" title="${e.kind === "declines" ? "A request with nothing to show. The router should decline." : "Runs a real example"}">${esc(e.label)}</button>`).join("");
    $("chips").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { $("q").value = b.dataset.text; upd(); run(); }));
  }).catch(() => { $("chips").textContent = "Examples could not load. You can still type your own."; });
  const upd = () => { $("count").textContent = `${$("q").value.length} / 600`; };
  $("q").addEventListener("input", upd); upd();
  $("go").addEventListener("click", run);
  $("q").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) run(); });
  $("t-simple").addEventListener("click", () => setAdv(false));
  $("t-adv").addEventListener("click", () => setAdv(true));
  function setAdv(v) { state.adv = v; $("t-simple").setAttribute("aria-pressed", String(!v)); $("t-adv").setAttribute("aria-pressed", String(v)); if (state.result) render(); }

  // ---------- strip
  function strip(done, doing) {
    document.querySelectorAll("#strip li").forEach((li) => { const i = +li.dataset.s; li.classList.toggle("on", i <= done); li.classList.toggle("doing", i === doing); });
  }
  function showErr(msg) { $("err").hidden = !msg; $("err").textContent = msg || ""; }

  // ---------- run
  async function run() {
    if (state.running) return;
    const text = $("q").value.trim();
    showErr("");
    if (text.length < 15) { showErr("Write at least a sentence: who will read it and what they must decide."); return; }
    state.running = true; $("go").disabled = true; document.querySelectorAll(".chip").forEach((b) => (b.disabled = true));
    state.result = null; state.showAll = false; state.open = null;
    $("out").hidden = true; strip(0, 1);
    let partial = {};
    try {
      const resp = await fetch("/api/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      if (!resp.ok) { let d = "Something went wrong. Please try again."; try { d = (await resp.json()).detail || d; } catch (_) {} throw new Error(d); }
      const reader = resp.body.getReader(), dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (line) handle(JSON.parse(line), partial); }
      }
      if (!state.result) throw new Error("The run ended without a result. Please try again.");
    } catch (e) {
      showErr(e.message || "Something went wrong. Please try again."); strip(-1, -1);
    } finally { state.running = false; $("go").disabled = false; document.querySelectorAll(".chip").forEach((b) => (b.disabled = false)); }
  }
  function handle(ev, partial) {
    if (ev.stage === "usecase") { Object.assign(partial, ev); strip(1, 2); }
    else if (ev.stage === "routed") {
      Object.assign(partial, ev); strip(2, partial.chosen ? 3 : -1);
      state.result = { ...partial, why: "", tradeoff: "", recommendation: null, usage: null, pending: true }; render();
    } else if (ev.stage === "done") { state.result = ev.result; strip(3, -1); render(); }
    else if (ev.stage === "error") { throw new Error(ev.detail); }
  }

  // ---------- render
  function render() {
    const r = state.result; if (!r) return;
    $("out").hidden = false;
    const declined = !r.chosen;
    const win = r.chosen, top = r.ranking[0];
    const isN = narrow();
    const slots = (r.useCase.semanticAvailability && r.useCase.semanticAvailability.missing) || ["Who reads it?", "What must they decide?", "What information?"];
    const sk = declined ? window.RouterSketch.empty(isN, slots.slice(0, 3).map((s) => s.replace(/^./, (c) => c.toUpperCase()))) : window.RouterSketch.render(win, r.sketch, isN);

    const heading = declined
      ? `<div class="pick"><span class="name" style="color:var(--warn)">The router declined to pick a view</span></div><div class="what" style="color:var(--muted)">${esc(r.why || "Nothing concrete to show.")}</div>`
      : `<div class="pick"><span class="name">${esc(nm(win))}</span><span class="what">${esc(NAMES[win] ? NAMES[win][1] : "")}</span></div>`;
    const why = r.pending ? `<div class="why">Explaining the pick…</div>`
      : declined ? `<div class="why">Add what is missing above, then run it again. The router would rather say no than draw something generic.</div>`
      : `<div class="why">${esc(r.why)}${r.tradeoff ? `<small><b>Trade-off:</b> ${esc(r.tradeoff)}</small>` : ""}</div>`;
    const note = !declined && r.sketch && r.sketch.marks && r.sketch.marks.length ? `<p class="note">Labels in the sketch are your words; greyed italic labels are generic placeholders.</p>` : declined ? "" : `<p class="note">Labels are generic placeholders (your description named no specific items).</p>`;
    $("left").className = "card" + (declined ? " decline" : "");
    $("left").innerHTML = heading + `<div class="sketch">${sk}</div>` + why + note;

    $("right").innerHTML = barsHtml(r);
    $("right").querySelectorAll("[data-id]").forEach((b) => b.addEventListener("click", () => { state.open = state.open === b.dataset.id ? null : b.dataset.id; render(); }));
    const more = $("right").querySelector("#more"); if (more) more.addEventListener("click", () => { state.showAll = !state.showAll; render(); });

    $("adv").hidden = !state.adv;
    if (state.adv) $("adv").innerHTML = advHtml(r);
  }

  function barsHtml(r) {
    const acc = r.ranking, max = Math.max(1, ...acc.map((x) => x.score));
    const showN = state.showAll || state.adv ? acc.length : Math.min(5, acc.length);
    const tied = (s) => acc.filter((x) => x.score === s).length > 1;
    const row = (x, i) => {
      const cls = i === 0 && r.chosen ? "win" : "";
      const open = state.open === x.id;
      return `<li class="${cls}"><button type="button" data-id="${esc(x.id)}" aria-expanded="${open}"><span class="top"><span class="nm">${esc(nm(x.id))}${tied(x.score) ? '<span class="tie" title="Several views have the same score">tie</span>' : ""}</span><span>${x.score}</span></span><span class="track" style="display:block"><span class="fill" style="display:block;width:${Math.max(3, Math.round((x.score / max) * 100))}%"></span></span></button>${open ? `<div class="det">Points for each match with your use case:<ul>${x.reasons.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>` : ""}</li>`;
    };
    const out = r.rejected || [];
    const rej = (x) => {
      const open = state.open === x.id;
      return `<li class="out"><button type="button" data-id="${esc(x.id)}" aria-expanded="${open}"><span class="top"><span class="nm">${esc(nm(x.id))}</span><span>ruled out</span></span><span class="track" style="display:block"></span></button>${open ? `<div class="det">Why the router ruled it out:<ul>${(x.reasons.length ? x.reasons : ["It does not satisfy a hard constraint."]).map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>` : ""}</li>`;
    };
    const head = r.chosen ? `<h2>How all ${r.catalogSize} kinds of view scored</h2><p class="legend"><span><i style="background:var(--accent)"></i>chosen</span><span><i style="background:var(--muted);opacity:.55"></i>scored</span><span><i style="background:var(--soft);border:1px solid var(--line)"></i>ruled out</span></p>`
      : `<h2>Why every view was ruled out</h2><p class="legend">Every one of the ${out.length} views failed the router's hard requirements for this request.</p>`;
    const collapsed = !r.chosen && !state.showAll && !state.adv;
    const list = collapsed ? "" : `<ul class="bars">${acc.slice(0, showN).map(row).join("")}${(state.showAll || state.adv || !r.chosen) ? out.map(rej).join("") : ""}</ul>`;
    const hidden = acc.length - showN + (state.showAll || state.adv ? 0 : out.length);
    const btn = collapsed ? `<button type="button" class="more" id="more">Show why each of the ${out.length} views was ruled out</button>` : !state.adv && r.chosen && (hidden > 0) ? `<button type="button" class="more" id="more">${state.showAll ? "Show fewer" : `Show all ${r.catalogSize} views`}</button>` : "";
    const runner = r.chosen && acc[1] && r.tradeoff ? "" : "";
    return head + list + btn + runner;
  }

  function advHtml(r) {
    const u = r.useCase, rec = r.recommendation;
    const chip = (k, v) => (v && (!Array.isArray(v) || v.length) ? `<span><b>${esc(k)}</b>${esc(Array.isArray(v) ? v.join(", ") : v)}</span>` : "");
    let h = `<section class="card"><h2>What the model understood (the structured use case)</h2><div class="kv">${chip("Reader", u.stakeholder)}${chip("Question", u.concern)}${chip("Goals", u.intent)}${chip("Information shape", u.informationStructure)}${chip("Tasks", u.tasks)}${chip("Items", u.scale && u.scale.items)}${chip("Density", u.scale && u.scale.density)}${chip("Interaction", u.interaction && `${u.interaction.mode}, ${u.interaction.dynamics}`)}${chip("Reader expertise", u.audience && u.audience.expertise)}${chip("Risk", u.consequence && `${u.consequence.risk}, ${u.consequence.reversibility}`)}${u.semanticAvailability ? chip("Availability", `${u.semanticAvailability.status}; missing: ${(u.semanticAvailability.missing || []).join(", ")}`) : ""}</div></section>`;
    if (rec && rec.compositionPlan) {
      const cp = rec.compositionPlan, b = cp.densityBudget;
      h += `<section class="card"><h2>The page plan the router wrote</h2><p class="note" style="margin-top:0">Reading order for a page that shows this view:</p><div class="flow">${(cp.readingOrder || []).map((x, i) => (i ? `<em>→</em>` : "") + `<span>${esc(String(x).replace(/-/g, " "))}</span>`).join("")}</div>`;
      if (b) h += `<p class="note">Density budget: ${b.items} of at most ${b.maxObjects} objects on one screen${b.withinBudget ? "" : " (over: aggregate or reveal on click)"}</p><div class="gauge" aria-hidden="true"><div style="width:${Math.min(100, Math.round((b.items / b.maxObjects) * 100))}%"></div></div>`;
      if (cp.emphasis) h += `<p class="note">Emphasis: ${esc(cp.emphasis.channel || "")}${cp.emphasis.state ? ` on the ${esc(cp.emphasis.state)} item` : ""}</p>`;
      if (cp.coldReadTarget) h += `<p class="note">Target: ${esc(cp.coldReadTarget)}</p>`;
      h += `</section>`;
    }
    if (rec && rec.primary) {
      h += `<section class="card"><h2>How it should behave</h2><div class="kv">${chip("Layout", rec.primary.layout)}${chip("Interaction", rec.primary.interaction)}${chip("Dynamics", rec.viewSpec && rec.viewSpec.dynamics)}</div>${(rec.interfacePatterns || []).length ? `<p class="note">Interface patterns to apply:</p><ul class="plain">${rec.interfacePatterns.slice(0, 3).map((p) => `<li><b>${esc(p.title)}</b> – ${esc(p.apply[0] || p.reason)}</li>`).join("")}</ul>` : ""}</section>`;
      const alts = (rec.alternatives || []);
      if (alts.length) h += `<section class="card"><h2>Runner-ups and how they relate</h2><ul class="plain">${alts.map((a) => `<li><b>${esc(nm(a.representation))}</b>: ${a.relationshipToPrimary === "unclassified" ? "no reviewed relationship is recorded for this pair" : esc(a.relationshipToPrimary) + ". " + esc(a.reason)}</li>`).join("")}</ul></section>`;
      if (rec.checks) h += `<section class="card"><h2>Checks a built page must pass</h2><p class="note" style="margin-top:0">${rec.checks.hard.length} must-pass, ${rec.checks.soft.length} should-pass (first ${rec.checks.soft.length} shown).</p><details><summary>Must-pass checks</summary><ul class="plain">${rec.checks.hard.map((c) => `<li>${esc(c.replace(/-/g, " "))}</li>`).join("")}</ul></details><details><summary>Should-pass checks</summary><ul class="plain">${rec.checks.soft.map((c) => `<li>${esc(c.replace(/-/g, " "))}</li>`).join("")}</ul></details></section>`;
    }
    if (r.usage) h += `<section class="card"><h2>This run</h2><div class="kv">${chip("Model", r.usage.model.replace("openrouter/", ""))}${chip("Model calls", r.usage.calls)}${chip("Time", r.usage.seconds + " s")}${chip("Cost", "$" + r.usage.costUsd.toFixed(4))}${chip("Tokens", `${r.usage.tokensIn} in / ${r.usage.tokensOut} out`)}</div><details><summary>Raw result (JSON)</summary><pre>${esc(JSON.stringify(r, null, 2))}</pre></details></section>`;
    return h;
  }

  // restore the last run for this browser session (server keeps it for 2 hours)
  fetch("/api/last").then((r) => r.json()).then((d) => { if (d.last) { $("q").value = d.last.text; upd(); state.result = d.last.result; strip(3, -1); render(); } }).catch(() => {});
  window.addEventListener("resize", () => { if (state.result) render(); });
  window.__routerTest = { render: (id, sketch, n) => window.RouterSketch.render(id, sketch, n) };
})();
