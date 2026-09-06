import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    // Match the React studio: package edits should appear without a rebuild.
    alias: {
      "draw-svelte": fileURLToPath(new URL("../../packages/draw-svelte/src/lib", import.meta.url)),
    },
  },
});
