import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  base: "./",
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "../artifacts/implementation-runner-evidence-gap-v0/candidate",
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000
  }
});
