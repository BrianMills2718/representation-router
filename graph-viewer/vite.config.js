import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// One self-contained script (React, React Flow, ELK and CSS inside) exposing
// window.GraphViewer, so any page can load it without a build step.
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL("./src/index.jsx", import.meta.url)),
      name: "GraphViewer",
      formats: ["iife"],
      fileName: () => "graph-viewer.js",
    },
    minify: true,
  },
});
