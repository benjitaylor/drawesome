import { build } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

await build({
  configFile: false,
  plugins: [svelte({ configFile: false })],
  ssr: { noExternal: ["draw-svelte"] },
  build: { ssr: "fixtures/ssr.ts", outDir: ".svelte-kit/ssr" },
});
const { html } = await import("./.svelte-kit/ssr/ssr.js");
const markup = html();
assert.equal((markup.match(/role="application"/g) ?? []).length, 2);
const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, "SSR SVG IDs must be unique across Draw instances");
await build({
  configFile: fileURLToPath(new URL("./vite.config.mjs", import.meta.url)),
  plugins: [{ name: "ssr-fixture", transformIndexHtml: (html) => html.replace("<!--ssr-->", markup) }],
});
