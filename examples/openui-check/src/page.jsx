import React from "react";
import { createRoot } from "react-dom/client";
import { Renderer } from "@openuidev/react-lang";
import { openuiLibrary, ThemeProvider } from "@openuidev/react-ui";
import "@openuidev/react-ui/index.css";
import "@openuidev/react-ui/components.css";
import { libraryFor } from "./libraries.mjs";
import data from "./data.json"; // built from evidence/*/check.json by the README step

const params = new URLSearchParams(location.search);
const pick = data.filter((r) => (!params.get("case") || r.case === params.get("case")) && (!params.get("mode") || r.mode === params.get("mode")) && (!params.get("run") || r.run === params.get("run")));
function Panel({ r }) {
  const plan = { removeFromLibrary: Object.keys(openuiLibrary.components).filter((n) => !r.libraryComponents.includes(n)), customComponents: r.libraryComponents.includes("GraphViewer") ? [{ name: "GraphViewer" }] : [] };
  const library = React.useMemo(() => libraryFor(plan, r.mode), []);
  return (
    <section style={{ width: 560, border: "1px solid #ccc", borderRadius: 8, padding: 12, background: "#fff" }}>
      <div style={{ font: "600 13px sans-serif", marginBottom: 8, color: r.mode === "router" ? "#1f5fa8" : "#9a5a00" }}>
        {r.mode === "router" ? "WITH router" : "WITHOUT router"}{r.run.includes("companion") ? " + companion view" : ""} · {r.model} · {r.case}
      </div>
      <Renderer response={r.content} library={library} />
    </section>
  );
}
createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: 16, background: "#f4f4f4" }}>{pick.map((r) => <Panel key={r.file} r={r} />)}</div>
  </ThemeProvider>
);
