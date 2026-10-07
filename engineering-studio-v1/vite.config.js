import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  base: "./",
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "../artifacts/engineering-studio-v1",
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000
  }
});
