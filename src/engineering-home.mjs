import { ENGINEERING_TASK_ROUTER_VERSION, LIFECYCLE_CAPABILITIES, listEngineeringTasks } from "./engineering-task-router.mjs";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function taskCard(task) {
  return `<button type="button" class="task-card" data-task="${escapeHtml(task.id)}">
    <span class="availability ${escapeHtml(task.availability)}">${escapeHtml(task.availability)}</span>
    <strong>${escapeHtml(task.label)}</strong>
    <p>${escapeHtml(task.question)}</p>
  </button>`;
}

function lifecycleItem(item, index) {
  return `<article class="life ${escapeHtml(item.availability)}">
    <span>${index + 1}</span>
    <strong>${escapeHtml(item.label)}</strong>
    <small>${escapeHtml(item.availability)}</small>
    <p>${escapeHtml(item.note)}</p>
  </article>`;
}

export function renderEngineeringHome(options = {}) {
  const tasks = options.tasks ?? listEngineeringTasks();
  const lifecycle = options.lifecycle ?? LIFECYCLE_CAPABILITIES;
  const serializedTasks = JSON.stringify(tasks).replaceAll("<", "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Representation Router · Engineering Home</title>
  <style>
    :root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f5f7fb; }
    * { box-sizing: border-box; }
    body { margin: 0; min-width: 320px; }
    button, input, a { font: inherit; }
    button { cursor: pointer; }
    .top { background: #111827; color: white; padding: 30px 32px 27px; }
    .eyebrow { display: inline-block; text-transform: uppercase; letter-spacing: .11em; font-size: .72rem; font-weight: 850; color: #667085; }
    .top .eyebrow { color: #93c5fd; }
    h1 { margin: 6px 0 9px; font-size: clamp(1.9rem, 4vw, 2.9rem); }
    .top > p { margin: 0; max-width: 900px; color: #cbd5e1; line-height: 1.62; }
    .goal-box { margin-top: 22px; max-width: 820px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.15); border-radius: 15px; padding: 14px; }
    .goal-row { display: flex; gap: 9px; }
    .goal-row input { flex: 1; min-width: 0; border: 1px solid #d5dce7; border-radius: 10px; padding: 11px 12px; color: #172033; }
    .goal-row button { border: 0; border-radius: 10px; padding: 11px 15px; background: #3b82f6; color: white; font-weight: 820; }
    .route-result { margin-top: 9px; min-height: 20px; color: #dbeafe; font-size: .9rem; }
    main { max-width: 1280px; margin: 0 auto; padding: 24px; }
    .section-head { display: flex; justify-content: space-between; gap: 20px; align-items: end; margin-bottom: 12px; }
    .section-head h2 { margin: 4px 0 0; }
    .section-head p { margin: 0; max-width: 680px; color: #667085; }
    .task-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
    .task-card { position: relative; min-height: 160px; padding: 17px; background: white; border: 1px solid #dde3ec; border-radius: 16px; text-align: left; color: inherit; box-shadow: 0 7px 22px rgba(15,23,42,.05); }
    .task-card:hover, .task-card[aria-selected="true"] { border-color: #7692e8; box-shadow: 0 9px 28px rgba(37,99,235,.11); }
    .task-card strong { display: block; margin: 22px 0 7px; font-size: 1.06rem; }
    .task-card p { margin: 0; color: #667085; line-height: 1.48; font-size: .88rem; }
    .availability { position: absolute; top: 13px; right: 13px; border-radius: 999px; padding: 5px 8px; font-size: .7rem; text-transform: uppercase; font-weight: 850; letter-spacing: .04em; }
    .availability.ready, .pill.ready { background: #dcfce7; color: #166534; }
    .availability.partial, .pill.partial { background: #fff1d6; color: #92400e; }
    .availability.unavailable, .pill.unavailable { background: #fee2e2; color: #991b1b; }
    .detail { margin-top: 18px; display: grid; grid-template-columns: minmax(0,1.2fr) minmax(300px,.8fr); gap: 16px; }
    .panel { background: white; border: 1px solid #dde3ec; border-radius: 16px; padding: 20px; box-shadow: 0 7px 22px rgba(15,23,42,.05); }
    .panel h2, .panel h3 { margin: 5px 0 9px; }
    .panel p, .panel li { color: #475467; line-height: 1.55; }
    .panel ul { padding-left: 20px; }
    .pill { display: inline-block; border-radius: 999px; padding: 6px 9px; font-size: .75rem; text-transform: uppercase; font-weight: 850; }
    .routes { display: grid; gap: 9px; margin-top: 14px; }
    .route-link { display: block; text-decoration: none; padding: 11px 13px; border-radius: 10px; background: #1d4ed8; color: white; font-weight: 800; }
    .route-link.secondary { background: white; color: #1d4ed8; border: 1px solid #b9c8ff; }
    .no-route { background: #fff7ed; border: 1px solid #fed7aa; padding: 12px; border-radius: 10px; color: #9a3412; }
    .authority { border-left: 4px solid #8b5cf6; background: #f5f3ff; border-radius: 11px; padding: 12px 13px; color: #5b21b6; }
    .lifecycle { margin-top: 28px; }
    .life-grid { display: grid; grid-template-columns: repeat(8, minmax(0,1fr)); gap: 8px; }
    .life { background: white; border: 1px solid #dde3ec; border-top: 4px solid #94a3b8; border-radius: 13px; padding: 12px; min-height: 150px; }
    .life.ready { border-top-color: #16a34a; }
    .life.partial { border-top-color: #f59e0b; }
    .life.unavailable { border-top-color: #dc2626; }
    .life > span { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 50%; background: #eef2f7; font-weight: 850; margin-bottom: 7px; }
    .life strong, .life small { display: block; }
    .life small { color: #667085; text-transform: uppercase; font-size: .68rem; margin-top: 3px; font-weight: 800; }
    .life p { color: #667085; font-size: .78rem; line-height: 1.42; }
    .truth { margin-top: 22px; background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 12px; }
    .truth p { margin: 5px 0 0; color: #475467; line-height: 1.55; }
    footer { background: #111827; color: #cbd5e1; padding: 15px 24px; display: flex; justify-content: space-between; gap: 14px; }
    @media (max-width: 1050px) { .task-grid { grid-template-columns: repeat(3,1fr); } .life-grid { grid-template-columns: repeat(4,1fr); } }
    @media (max-width: 760px) { .top { padding: 23px 18px; } main { padding: 14px; } .goal-row { flex-direction: column; } .task-grid, .detail, .life-grid { grid-template-columns: 1fr; } .section-head { align-items: start; flex-direction: column; } footer { flex-direction: column; } }
  </style>
</head>
<body>
  <header class="top">
    <span class="eyebrow">Representation Router · Engineering Home v0</span>
    <h1>What are you trying to do?</h1>
    <p>Start with the software-engineering job. Representation Router will show what is actually supported today, where to work, what authority the surface has, and what is still missing.</p>
    <div class="goal-box">
      <div class="goal-row"><input id="goal" aria-label="Describe your engineering goal" placeholder="Example: I need to review whether this change has enough evidence" /><button id="route" type="button">Find workspace</button></div>
      <div id="route-result" class="route-result" aria-live="polite">Choose a job below or describe it here.</div>
    </div>
  </header>

  <main>
    <section>
      <div class="section-head"><div><span class="eyebrow">Jobs</span><h2>Choose the work, not the internal tool</h2></div><p>Availability is intentionally visible. A card existing does not mean the workflow is complete.</p></div>
      <div class="task-grid">${tasks.map(taskCard).join("")}</div>
    </section>

    <section class="detail" id="detail">
      <article class="panel" id="task-detail"></article>
      <aside class="panel" id="task-next"></aside>
    </section>

    <section class="lifecycle">
      <div class="section-head"><div><span class="eyebrow">End-to-end capability</span><h2>Where the engineering lifecycle is strong vs still open</h2></div><p>No single completion percentage: each stage has a different maturity and authority boundary.</p></div>
      <div class="life-grid">${lifecycle.map(lifecycleItem).join("")}</div>
    </section>

    <div class="truth"><strong>Capability truth</strong><p>Engineering Home is navigation/orchestration only. It cannot make an unsupported workflow real, grant Git or deployment authority, approve a review, or turn a partial capability into a ready one.</p></div>
  </main>

  <footer><span>${ENGINEERING_TASK_ROUTER_VERSION}</span><span>Task routing ≠ authority.</span></footer>

  <script>
    const tasks = ${serializedTasks};
    const byId = Object.fromEntries(tasks.map(task => [task.id, task]));
    const detail = document.getElementById('task-detail');
    const next = document.getElementById('task-next');
    const result = document.getElementById('route-result');
    let selected = 'understand';

    function esc(value) {
      return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    }
    function score(query, task) {
      const normalized = query.toLowerCase();
      let value = 0;
      for (const keyword of task.keywords) if (normalized.includes(keyword)) value += keyword.includes(' ') ? 3 : 2;
      if (normalized === task.id) value += 10;
      if (normalized.includes(task.label.toLowerCase())) value += 5;
      return value;
    }
    function routeQuery(query) {
      if (!query.trim()) return {status:'unrecognized', candidates:[]};
      const exact = byId[query.trim().toLowerCase()];
      if (exact) return {status:'matched', task:exact};
      const scored = tasks.map(task => ({task, score:score(query, task)})).filter(entry => entry.score > 0);
      if (!scored.length) return {status:'unrecognized', candidates:[]};
      const max = Math.max(...scored.map(entry => entry.score));
      const winners = scored.filter(entry => entry.score === max);
      if (winners.length > 1) return {status:'ambiguous', candidates:winners.map(entry => entry.task)};
      return {status:'matched', task:winners[0].task};
    }
    function render(task) {
      selected = task.id;
      document.querySelectorAll('[data-task]').forEach(button => button.setAttribute('aria-selected', button.dataset.task === task.id ? 'true' : 'false'));
      detail.innerHTML = '<span class="pill '+esc(task.availability)+'">'+esc(task.availability)+'</span><h2>'+esc(task.label)+'</h2><p>'+esc(task.question)+'</p><h3>What you can do now</h3><ul>'+task.canDoNow.map(item => '<li>'+esc(item)+'</li>').join('')+'</ul><div class="authority"><strong>Authority</strong><br>'+esc(task.authority)+'</div>';
      const missing = task.missing.length ? '<h3>What is still missing</h3><ul>'+task.missing.map(item => '<li>'+esc(item)+'</li>').join('')+'</ul>' : '<h3>Current gap</h3><p>No blocking capability gap is recorded for this proving workflow.</p>';
      const routes = task.routes.length ? '<div class="routes">'+task.routes.map((route, index) => '<a class="route-link '+(index ? 'secondary' : '')+'" href="'+esc(route.href)+'">'+esc(route.label)+' →</a>').join('')+'</div>' : '<div class="no-route"><strong>No executable route yet.</strong><br>This job remains visible so the gap is explicit rather than hidden.</div>';
      next.innerHTML = '<span class="eyebrow">Next</span>'+missing+routes+'<h3>Lifecycle stages</h3><p>'+task.lifecycleStages.map(esc).join(' → ')+'</p>';
    }
    document.querySelectorAll('[data-task]').forEach(button => button.addEventListener('click', () => render(byId[button.dataset.task])));
    document.getElementById('route').addEventListener('click', () => {
      const query = document.getElementById('goal').value;
      const routed = routeQuery(query);
      if (routed.status === 'matched') {
        render(routed.task);
        result.textContent = 'Matched: '+routed.task.label+' · '+routed.task.availability;
      } else if (routed.status === 'ambiguous') {
        result.textContent = 'This sounds like more than one job: '+routed.candidates.map(task => task.label).join(' or ')+'. Choose one below.';
      } else {
        result.textContent = 'No reliable task match. Choose one of the five jobs below instead of guessing.';
      }
    });
    document.getElementById('goal').addEventListener('keydown', event => { if (event.key === 'Enter') document.getElementById('route').click(); });
    render(byId[selected]);
  </script>
</body>
</html>`;
}
