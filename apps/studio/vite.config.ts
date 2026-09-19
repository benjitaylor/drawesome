import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pkg = (name: string) =>
  fileURLToPath(new URL(`../../packages/${name}/src`, import.meta.url));

export default defineConfig({
  server: { port: Number(process.env.PORT) || undefined },
  plugins: [react()],
  resolve: {
    // Point at package *source*, not dist — otherwise every engine tweak needs
    // a rebuild before it shows up here.
    alias: {
      "drawesome": pkg("draw"),
    },
  },
});
