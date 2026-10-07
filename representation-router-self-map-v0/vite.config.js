import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  root: "representation-router-self-map-v0",
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "../artifacts/representation-router-self-map-v0",
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000
  }
});
