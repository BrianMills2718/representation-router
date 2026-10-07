export const RR_PROJECT_TEMPLATE_CSS = String.raw`
:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #edf2f8;
  background: #080d14;
  --page: #080d14;
  --panel: #101722;
  --panel-2: #121a26;
  --panel-3: #0a1018;
  --line: #263247;
  --line-strong: #35445b;
  --muted: #8d9ab0;
  --text: #edf2f8;
  --teal: #4fd1b5;
  --blue: #73a9ff;
  --amber: #f0b35a;
  --red: #e06b68;
  --sidebar: 228px;
  --inspector: 350px;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  color: var(--text);
  background: radial-gradient(circle at 65% -20%, #1c2940 0, transparent 38%), var(--page);
}
button, select { font: inherit; color: inherit; }
button { cursor: pointer; }
.shell { min-height: 100vh; }
.topbar {
  min-height: 78px;
  padding: 14px 24px;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto;
  align-items: center;
  gap: 22px;
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(8,13,20,.9);
  backdrop-filter: blur(18px);
}
.brand { display: flex; align-items: center; gap: 12px; min-width: 0; font-weight: 800; }
.brand-mark {
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid #44627a;
  border-radius: 12px;
  background: linear-gradient(135deg,#20334b,#10211f);
  color: var(--teal);
  font-size: 11px;
  letter-spacing: .08em;
}
.brand > span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 20px; letter-spacing: -.03em; }
.mode-switch {
  padding: 4px;
  display: flex;
  gap: 4px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #0c121c;
}
.mode-switch button {
  border: 0;
  border-radius: 9px;
  padding: 9px 14px;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}
.mode-switch button.active { background: #202c3e; color: #fff; box-shadow: inset 0 0 0 1px #32425a; }
.body { display: grid; grid-template-columns: var(--sidebar) minmax(0,1fr); }
.sidebar {
  position: sticky;
  top: 78px;
  height: calc(100vh - 78px);
  overflow: auto;
  padding: 22px 14px;
  border-right: 1px solid var(--line);
  background: #0b111a;
}
.side-label {
  margin: 6px 10px 10px;
  color: #718098;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
}
.side-nav { display: grid; gap: 5px; }
.side-nav button {
  width: 100%;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--muted);
  padding: 10px 12px;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
}
.side-nav button:hover { border-color: var(--line); background: #101722; color: #dbe4ef; }
.side-nav button.active { border-color: #33445c; background: #172232; color: #fff; box-shadow: inset 3px 0 0 var(--blue); }
.content { min-width: 0; padding: 28px 32px 42px; }
.page { display: none; }
.page.active { display: block; }
.page-head {
  max-width: 1280px;
  margin: 0 auto 22px;
  padding: 3px 0 18px;
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-end;
  border-bottom: 1px solid var(--line);
}
.eyebrow {
  display: block;
  margin: 0 0 6px;
  color: #718098;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
}
.page-head h1 {
  margin: 0;
  max-width: 880px;
  color: #f4f7fb;
  font-size: clamp(30px, 4vw, 48px);
  line-height: 1.02;
  letter-spacing: -.045em;
}
.page-head p { max-width: 760px; margin: 10px 0 0; color: #98a5b9; font-size: 13px; line-height: 1.55; }
.source-chip {
  flex: none;
  max-width: 310px;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel-3);
  color: #9fb8d5;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 9px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.panel {
  max-width: 1280px;
  margin: 0 auto;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: linear-gradient(180deg,#111925,#0d141e);
  box-shadow: 0 18px 46px rgba(0,0,0,.18);
  overflow: hidden;
}
.panel-pad { padding: 22px; }
.goal-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 10px; }
.goal, .slice, .gap-card, .run-card, .evidence-row {
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #0f1722;
}
.goal, .gap-card, .run-card { padding: 18px; }
.goal { box-shadow: inset 3px 0 0 var(--teal); }
.goal h3, .gap-card h3, .run-card h3 { margin: 0 0 7px; color: #f4f7fb; font-size: 16px; line-height: 1.2; letter-spacing: -.02em; }
.goal p, .gap-card p, .run-card p { margin: 0; color: #98a5b9; font-size: 12px; line-height: 1.5; }
.slice-list { display: grid; gap: 8px; }
.slice { padding: 14px 15px; display: grid; grid-template-columns: 48px minmax(0,1fr) 150px; gap: 14px; align-items: center; }
.slice strong { color: #f4f7fb; font-size: 13px; }
.slice p { margin: 4px 0 0; color: #98a5b9; font-size: 11px; line-height: 1.45; }
.num { color: var(--teal); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 16px; font-weight: 900; }
.state { text-align: right; color: var(--blue); font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.checkpoint-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 10px; }
.checkpoint-summary {
  grid-column: 1 / -1;
  padding: 18px;
  border: 1px solid #35445b;
  border-radius: 11px;
  background: linear-gradient(145deg,#182231,#111923);
  box-shadow: inset 4px 0 0 var(--amber);
}
.checkpoint-summary h2 { margin: 6px 0 7px; color: #f4f7fb; font-size: 22px; letter-spacing: -.035em; }
.checkpoint-summary > p { color: #aab6c9; font-size: 12px; line-height: 1.5; }
.checkpoint-meta { display: flex; flex-wrap: wrap; gap: 7px; color: #738097; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 9px; }
.gap-card { box-shadow: inset 3px 0 0 var(--amber); }
.list { margin: 8px 0 0; padding-left: 18px; color: #aab6c9; font-size: 12px; line-height: 1.55; }
.main-with-inspector { max-width: 1450px; margin: 0 auto; display: grid; grid-template-columns: minmax(0,1fr) var(--inspector); gap: 0; align-items: stretch; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: #0a1018; box-shadow: 0 18px 46px rgba(0,0,0,.22); }
.diagram-panel { min-height: 720px; padding: 18px; overflow: auto; background: #0a1018; }
.diagram-title { display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 10px; }
.diagram-title h2 { margin: 0; color: #edf2f8; font-size: 18px; letter-spacing: -.025em; }
.diagram-title small { color: #718098; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 9px; text-transform: uppercase; }
.diagram-canvas {
  min-width: 780px;
  min-height: 620px;
  display: grid;
  place-items: center;
  border: 1px solid #1d2839;
  border-radius: 11px;
  background-image: linear-gradient(rgba(40,51,72,.42) 1px,transparent 1px),linear-gradient(90deg,rgba(40,51,72,.42) 1px,transparent 1px);
  background-size: 24px 24px;
}
.inspector { min-height: 720px; max-height: calc(100vh - 116px); position: sticky; top: 96px; overflow: auto; padding: 22px; border-left: 1px solid var(--line); background: linear-gradient(180deg,#121a26,#0d141e); }
.inspector-head { padding-bottom: 14px; border-bottom: 1px solid var(--line); }
.inspector-body { padding-top: 16px; }
.inspector-body h2 { margin: 8px 0 10px; color: #f4f7fb; font-size: 23px; line-height: 1.08; letter-spacing: -.04em; }
.inspector-body > p { color: #aab6c9; font-size: 12px; line-height: 1.5; }
.detail { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--line); }
.detail h4 { margin: 0 0 6px; color: #718098; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; }
.detail p, .detail pre { margin: 0; color: #d7deea; font-size: 11px; line-height: 1.5; }
.detail pre { white-space: pre-wrap; padding: 9px 10px; border: 1px solid var(--line); border-radius: 8px; background: #0a1018; }
.svg-node, .svg-edge { cursor: pointer; }
.svg-node rect { fill: #182231; stroke: #3a4b64; stroke-width: 1.6; }
.svg-node.human_action rect { fill: #2b2519; stroke: #8b7446; }
.svg-node.source rect { fill: #122333; stroke: #356182; }
.svg-node.selected rect { stroke: #f4f7fb; stroke-width: 3; }
.node-title { fill: #f4f7fb; font: 700 12px Inter,system-ui; }
.node-kind { fill: #8fa0b8; font: 9px Inter,system-ui; letter-spacing: .06em; text-transform: uppercase; }
.edge-line { stroke: #68758d; stroke-width: 2; fill: none; marker-end: url(#arrow); }
.svg-edge.selected .edge-line { stroke: var(--blue); stroke-width: 4; }
.edge-hit { stroke: transparent; stroke-width: 18; fill: none; }
.edge-label { fill: #aab6ca; font: 10px Inter,system-ui; font-weight: 700; }
.product-wrap { max-width: 1450px; margin: 0 auto; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: var(--panel); box-shadow: 0 18px 46px rgba(0,0,0,.22); }
.product-meta { padding: 11px 14px; display: flex; justify-content: space-between; gap: 18px; border-bottom: 1px solid var(--line); background: #0d141e; color: #8d9ab0; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 9px; }
.product-frame { display: block; width: 100%; height: 780px; border: 0; background: #fff; isolation: isolate; }
.unavailable { max-width: 1000px; margin: 0 auto; padding: 42px; border: 1px dashed #3a4b64; border-radius: 13px; background: #0d141e; text-align: center; }
.unavailable h2 { margin: 6px 0; color: #edf2f8; font-size: 22px; }
.unavailable p { color: #98a5b9; font-size: 12px; line-height: 1.55; }
.unavailable code { display: block; margin-top: 14px; padding: 10px; border: 1px solid var(--line); border-radius: 8px; background: #0a1018; color: #9fb8d5; font-size: 9px; overflow-wrap: anywhere; }
.evidence-grid, .run-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; }
.evidence-row { padding: 15px; }
.evidence-row strong { display: block; color: #edf2f8; }
.evidence-row span { display: block; margin-top: 6px; color: #98a5b9; font-size: 11px; }
.run-card { box-shadow: inset 3px 0 0 var(--blue); }
.final-target { padding: 30px; box-shadow: inset 4px 0 0 var(--teal); }
.final-target h2 { margin: 4px 0 10px; color: #f4f7fb; font-size: 34px; line-height: 1.05; letter-spacing: -.045em; }
.final-target p { max-width: 760px; color: #aab6c9; font-size: 13px; line-height: 1.6; }
.checkpoint-picker { min-width: 260px; padding: 8px 10px; border: 1px solid var(--line-strong); border-radius: 8px; outline: none; color: #edf2f8; background: #0a1018; font-size: 11px; }
.checkpoint-picker:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(115,169,255,.12); }
@media (max-width: 1050px) {
  .body { grid-template-columns: 1fr; }
  .sidebar { position: static; height: auto; border-right: 0; border-bottom: 1px solid var(--line); }
  .side-nav { grid-template-columns: repeat(3,minmax(0,1fr)); }
  .content { padding: 22px; }
  .main-with-inspector { grid-template-columns: 1fr; }
  .inspector { position: static; min-height: auto; max-height: none; border-left: 0; border-top: 1px solid var(--line); }
  .goal-grid, .checkpoint-grid, .evidence-grid, .run-grid { grid-template-columns: 1fr; }
  .checkpoint-summary { grid-column: auto; }
}
@media (max-width: 680px) {
  .topbar { grid-template-columns: 1fr; }
  .mode-switch { width: 100%; }
  .mode-switch button { flex: 1; }
  .content { padding: 18px 14px 30px; }
  .page-head { align-items: flex-start; flex-direction: column; }
  .side-nav { grid-template-columns: 1fr 1fr; }
  .slice { grid-template-columns: 38px 1fr; }
  .slice .state { grid-column: 2; text-align: left; }
}
`;
