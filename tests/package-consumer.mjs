import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "draw-svelte-consumer-"));
const run = (args, cwd = dir) => execFileSync("pnpm", args, { cwd, stdio: "inherit" });
try {
  run(["--filter", "draw-svelte", "pack", "--pack-destination", dir], root);
  const tarball = readdirSync(dir).find((file) => file.endsWith(".tgz"));
  const studio = JSON.parse(readFileSync(join(root, "apps/studio-svelte/package.json"), "utf8"));
  const dependencies = { ...studio.devDependencies, svelte: studio.dependencies.svelte, "draw-svelte": `file:./${tarball}` };
  writeFileSync(join(dir, "package.json"), JSON.stringify({ private: true, type: "module", dependencies }));
  writeFileSync(join(dir, "pnpm-workspace.yaml"), "allowBuilds:\n  esbuild: true\n  '@parcel/watcher': true\n");
  cpSync(join(root, "tests/fixtures/SSRFixture.svelte"), join(dir, "App.svelte"));
  writeFileSync(join(dir, "main.ts"), 'import { mount } from "svelte"; import App from "./App.svelte"; import "draw-svelte/styles.css"; mount(App, { target: document.getElementById("app")! });');
  writeFileSync(join(dir, "index.html"), '<!doctype html><html lang="en"><head><title>Packed consumer</title></head><body><main id="app"></main><script type="module" src="/main.ts"></script></body></html>');
  writeFileSync(join(dir, "svelte.config.js"), "export default {};\n");
  writeFileSync(join(dir, "vite.config.js"), 'import { svelte } from "@sveltejs/vite-plugin-svelte"; export default { plugins: [svelte()] };');
  writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "bundler", strict: true, allowJs: true, skipLibCheck: true, types: ["vite/client"], noEmit: true }, include: ["*.ts", "*.svelte"] }));
  writeFileSync(join(dir, "handle.ts"), 'import type { Draw, DrawHandle, DrawProps, ToolbarProps } from "draw-svelte"; import type { Snippet } from "svelte"; const instance = null as unknown as Draw; const handle: DrawHandle = instance; const png: Promise<Blob> = handle.toPng(); const props: DrawProps = { motion: { duration: 200 }, placement: "left" }; const icon: ToolbarProps["icon"] = null as unknown as Snippet; void [png, props, icon];');
  writeFileSync(join(dir, "ssr.js"), 'import { render } from "svelte/server"; import App from "./App.svelte"; export const html = render(App).body;');
  run(["install", "--ignore-workspace"]);
  run(["exec", "svelte-check", "--tsconfig", "tsconfig.json"]);
  run(["exec", "vite", "build"]);
  run(["exec", "vite", "build", "--ssr", "ssr.js", "--outDir", "dist-ssr"]);
  execFileSync(process.execPath, ["--input-type=module", "-e", 'import assert from "node:assert/strict"; const {html}=await import("./dist-ssr/ssr.js"); assert.equal((html.match(/role="application"/g)||[]).length,2); console.log("Packed consumer: types, client build and SSR passed");'], { cwd: dir, stdio: "inherit" });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
