import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [svelte({ configFile: false }), react()],
  build: {
    rolldownOptions: { input: ["fixtures/react.html", "fixtures/svelte.html", "fixtures/hydrate.html"] },
  },
});
