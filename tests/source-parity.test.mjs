import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const react = new URL("../packages/draw/src/", import.meta.url);
const svelte = new URL("../packages/draw-svelte/src/lib/", import.meta.url);
for (const file of [...(await readdir(new URL("engine/", react))).map((name) => `engine/${name}`), "palette.ts", ...(await readdir(new URL("components/", react))).filter((name) => name.endsWith(".css")).map((name) => `components/${name}`)]) {
  test(`upstream engine/styles parity: ${file}`, async () => {
    const expected = await readFile(new URL(file, react), "utf8");
    const actual = await readFile(new URL(file, svelte), "utf8");
    assert.equal(actual.replace(/(from "[^"\n]+)\.js"/g, '$1"'), expected);
  });
}
