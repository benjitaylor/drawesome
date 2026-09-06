import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const surface = (page: Page) => page.locator(".sd[data-placement] > svg");
const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });
const load = async (page: Page, framework: string, props = {}) => {
  await page.goto(`/fixtures/${framework}.html?props=${encodeURIComponent(JSON.stringify(props))}`);
  await page.waitForFunction(() => (window as any).fixture?.draw);
  await expect(surface(page)).toBeVisible();
};
const update = async (page: Page, props: object) => {
  await page.evaluate((next) => (window as any).fixture.setProps(next), props);
};
const strokes = (page: Page) => page.evaluate(() => (window as any).fixture.draw.getStrokes().map(({ id, ...stroke }: any) => stroke));
async function draw(page: Page, y = 160) {
  await page.mouse.move(100, y);
  await page.mouse.down();
  await page.mouse.move(240, y + 30, { steps: 12 });
  await page.mouse.move(340, y, { steps: 10 });
  await page.mouse.up();
}
async function settle(page: Page) {
  await page.mouse.move(0, 0);
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
  // Tooltips use a delayed exit independent of CSS animations.
  await expect(page.getByRole("tooltip")).toHaveCount(0);
}

const variants = [
  {}, { theme: "dark", background: "#17171a" }, { theme: "auto" },
  { placement: "left" }, { placement: "right" },
  { look: "studio", gauge: true }, { depth: "flat", align: "start" },
  { depth: "strong", align: "end" }, { settings: "tool" },
  { background: "checker" }, { background: "transparent" },
  { tools: ["highlighter", "pencil", "brush"], eraser: false, controls: { size: false, opacity: false, undo: false } },
];
for (const [index, props] of variants.entries()) {
  test(`React/Svelte layout and pixels ${index}: ${JSON.stringify(props)}`, async ({ page, context }, testInfo) => {
    const react = await context.newPage();
    await load(react, "react", props);
    await load(page, "svelte", props);
    await settle(react); await settle(page);
    const metrics = (p: Page) => p.locator("button").evaluateAll((elements) => elements.filter((e) => e.checkVisibility()).map((e) => {
      const r = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      return { label: e.getAttribute("aria-label"), pressed: e.getAttribute("aria-pressed"), x: r.x, y: r.y, w: r.width, h: r.height, color: s.color, background: s.backgroundColor };
    }));
    expect(await metrics(page)).toEqual(await metrics(react));
    const expected = await react.screenshot();
    const actual = await page.screenshot();
    await testInfo.attach("react", { body: expected, contentType: "image/png" });
    await testInfo.attach("svelte", { body: actual, contentType: "image/png" });
    expect(actual.equals(expected), "Settled React and Svelte screenshots must be identical").toBe(true);
    await react.close();
  });
}

for (const framework of ["react", "svelte"]) {
  test(`${framework}: every pen, pressure, erasing, history, SVG and PNG`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await load(page, framework, { board: { w: 1280, h: 720 } });
    const names = ["Pencil", "Pen", "Marker", "Highlighter", "Brush", "Fineliner", "Fountain pen"];
    // Take names from the public tool controls so this also tracks upstream naming.
    const toolNames = await page.locator('button[aria-pressed]').evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")!).filter((name) => name !== "Eraser"));
    expect(toolNames).toHaveLength(names.length);
    for (const [i, name] of toolNames.entries()) {
      await button(page, name).click();
      await draw(page, 80 + i * 45);
      await expect.poll(async () => (await strokes(page)).length).toBe(i + 1);
    }
    await button(page, "Eraser").click(); await draw(page);
    expect((await strokes(page)).at(-1).erase).toBe(true);
    const exported = await page.evaluate(() => (window as any).fixture.draw.toSvg());
    expect(exported).toContain("<mask");
    expect(exported).toContain("<svg");
    await button(page, "Undo").click(); expect(await strokes(page)).toHaveLength(7);
    await button(page, "Redo").click(); expect(await strokes(page)).toHaveLength(8);
    await page.evaluate(() => (window as any).fixture.draw.clear());
    await expect.poll(async () => (await strokes(page)).length).toBe(0);
    await page.evaluate(() => (window as any).fixture.draw.undo());
    await expect.poll(async () => (await strokes(page)).length).toBe(8);
    const png = await page.evaluate(async () => {
      const blob = await (window as any).fixture.draw.toPng(1);
      const bitmap = await createImageBitmap(blob);
      return { type: blob.type, size: blob.size, width: bitmap.width, height: bitmap.height };
    });
    expect(png.type).toBe("image/png"); expect(png.size).toBeGreaterThan(1000);
    expect([png.width, png.height]).toEqual([1280, 720]);
    for (const format of ["svg", "png"]) {
      const download = page.waitForEvent("download");
      await page.evaluate((format) => (window as any).fixture.draw.download("parity", format, 1), format);
      expect((await download).suggestedFilename()).toBe(`parity.${format}`);
    }
    expect(errors).toEqual([]);
  });

  test(`${framework}: settings, custom ink, minimize and reactive props`, async ({ page }) => {
    await load(page, framework);
    await button(page, "Size & opacity").click();
    const size = page.getByRole("slider", { name: "Size", exact: true });
    await expect(size).toBeVisible();
    const before = Number(await size.getAttribute("aria-valuenow"));
    await size.press("ArrowRight");
    await expect.poll(async () => Number(await size.getAttribute("aria-valuenow"))).toBeGreaterThan(before);
    await button(page, "Back to tools").click();
    await button(page, /Ink colour/).click();
    await button(page, "Pick any colour").click();
    await page.getByRole("textbox", { name: "Hex colour" }).fill("F00");
    await page.getByRole("textbox", { name: "Hex colour" }).press("Enter");
    await button(page, "Back to swatches").click();
    await button(page, "Back to tools").click();
    await expect(button(page, /Ink colour/)).toHaveAttribute("aria-label", /#ff0000/);
    await button(page, "Hide tools").click();
    await expect(button(page, "Show drawing tools")).toBeVisible();
    await draw(page); expect(await strokes(page)).toHaveLength(0);
    await button(page, "Show drawing tools").click();
    await draw(page); expect(await strokes(page)).toHaveLength(1);
    await update(page, { theme: "dark", placement: "left", look: "studio", gauge: true });
    await expect(page.locator('.sd[data-placement="left"]')).toHaveAttribute("data-theme", "dark");
    await update(page, { motion: "none", chrome: false });
    await expect(button(page, "Pen")).toHaveCount(0);
    await update(page, { chrome: true }); await expect(button(page, "Pen")).toBeVisible();
  });

  test(`${framework}: tool menu, keyboard, tooltip and controller transactions`, async ({ page }) => {
    await load(page, framework, { settings: "tool" });
    await button(page, "Pen").click();
    await expect(page.getByRole("dialog", { name: "Tool settings" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await button(page, "Pencil").hover();
    await expect(page.getByRole("tooltip")).toContainText("Pencil");
    await page.mouse.move(10, 10);
    await page.keyboard.press("e"); await expect(button(page, "Eraser")).toHaveAttribute("aria-pressed", "true");
    await button(page, "Pen").click(); await draw(page);
    await page.keyboard.press("Control+z"); await expect.poll(async () => (await strokes(page)).length).toBe(0);
    await page.keyboard.press("Control+Shift+z"); await expect.poll(async () => (await strokes(page)).length).toBe(1);
    const call = async (method: string, arg?: unknown) => {
      await page.evaluate(({ method, arg }) => (window as any).fixture.controller[method](arg), { method, arg });
      await page.waitForTimeout(30); // React commits the hook's next render before the next transaction step.
    };
    const state = () => page.evaluate(() => { const c = (window as any).fixture.controller; return { strokes: c.strokes, undo: c.canUndo, redo: c.canRedo }; });
    await call("begin"); await call("update", [{ id: "one" }]); await call("update", [{ id: "two" }]); await call("end");
    expect(await state()).toEqual({ strokes: [{ id: "two" }], undo: true, redo: false });
    await call("undo"); expect(await state()).toEqual({ strokes: [], undo: false, redo: true });
    await call("redo"); await call("reset", []);
    expect(await state()).toEqual({ strokes: [], undo: false, redo: false });
    await call("begin"); await call("end"); expect((await state()).undo).toBe(false);
  });
}

test("all pen paths and serialized drawing match React", async ({ page, context }) => {
  const react = await context.newPage();
  for (const p of [react, page]) {
    await load(p, p === react ? "react" : "svelte");
    const tools = await p.locator('button[aria-pressed]').evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")!));
    for (const name of tools) { await button(p, name).click(); await draw(p); }
  }
  expect(await strokes(page)).toEqual(await strokes(react));
  expect(await page.evaluate(() => (window as any).fixture.draw.toSvg())).toEqual(await react.evaluate(() => (window as any).fixture.draw.toSvg()));
  await react.close();
});

for (const placement of ["bottom", "left", "right"]) {
  test(`Svelte accessibility, mobile, reduced motion: ${placement}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await load(page, "svelte", { placement, tools: ["pen", "pencil", "highlighter"], controls: { undo: false, clear: false, custom: false } });
    const check = async () => {
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(results.violations).toEqual([]);
    };
    await check();
    await button(page, "Size & opacity").click(); await check();
    await button(page, "Back to tools").click();
    await button(page, /Ink colour/).click(); await check();
    await button(page, "Back to tools").click();
    await button(page, "Hide tools").click(); await check();
    await button(page, "Show drawing tools").click();
    await update(page, { chrome: false }); await expect(button(page, "Pen")).toHaveCount(0);
  });
}

test("Svelte pressure, pointer cancellation, palm rejection and straight lines", async ({ page }) => {
  await load(page, "svelte");
  const dispatch = async (type: string, extra = {}) => surface(page).dispatchEvent(type, {
    pointerId: 1, pointerType: "pen", clientX: 100, clientY: 100, pressure: 0.3, bubbles: true, ...extra,
  });
  await dispatch("pointerdown");
  await dispatch("pointermove", { clientX: 200, clientY: 160, pressure: 0.8 });
  await dispatch("pointercancel");
  expect((await strokes(page))[0].shape.simulatePressure).toBe(false);
  await dispatch("pointerdown", { pointerId: 2, pointerType: "touch" });
  await dispatch("pointerup", { pointerId: 2, pointerType: "touch" });
  expect(await strokes(page)).toHaveLength(1);
  await dispatch("pointerdown");
  await dispatch("pointermove", { clientX: 200, clientY: 110, shiftKey: true });
  await dispatch("pointerup");
  const straight = (await strokes(page))[1].points;
  expect(straight.length).toBeGreaterThan(2);
  expect(new Set(straight.map((p: number[]) => p[1])).size).toBe(1);
});

test("Svelte SSR hydrates two independent drawings without mismatches", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (["warning", "error"].includes(message.type())) errors.push(message.text()); });
  await page.goto("/fixtures/hydrate.html");
  await expect(surface(page)).toHaveCount(2);
  await expect(button(page, "Pen")).toHaveCount(2);
  await button(page, "Hide tools").first().click();
  await expect(button(page, "Show drawing tools")).toHaveCount(1);
  await expect(button(page, "Pen")).toHaveCount(1);
  const ids = await page.locator("[id]").evaluateAll((els) => els.map((e) => e.id));
  expect(new Set(ids).size).toBe(ids.length);
  expect(errors).toEqual([]);
});

test("Svelte restarts tooltip transitions for every tool swap", async ({ page }) => {
  await load(page, "svelte", { tooltips: { delay: 0 } });
  await button(page, "Pen").hover();
  await expect(page.getByRole("tooltip")).toContainText("Pen");
  await page.getByRole("tooltip").evaluate((el) => { (window as any).previousFace = el.lastElementChild; });
  await button(page, "Pencil").hover();
  await expect(page.getByRole("tooltip")).toContainText("Pencil");
  expect(await page.getByRole("tooltip").evaluate((el) => el.lastElementChild !== (window as any).previousFace)).toBe(true);
});

test("Svelte reanchors a tool menu reopened during its exit", async ({ page }) => {
  await load(page, "svelte", { settings: "tool" });
  await button(page, "Pen").click();
  const menu = page.getByRole("dialog");
  await expect(menu).toBeVisible();
  await button(page, "Pencil").evaluate((el: HTMLElement) => el.click());
  await button(page, "Pencil").evaluate((el: HTMLElement) => el.click());
  const art = await button(page, "Pencil").locator("svg").boundingBox();
  await expect.poll(async () => Number.parseFloat(await menu.evaluate((el) => (el as HTMLElement).style.left))).toBeCloseTo(art!.x + art!.width / 2, 0);
});

for (const placement of ["bottom", "left", "right"]) {
  test(`animation timing and keyframes match React: ${placement}`, async ({ page, context }) => {
    const react = await context.newPage();
    const frames = async (p: Page) => p.locator("[data-motion-in]").evaluate((el) => {
      const animation = el.getAnimations()[0];
      animation.pause();
      return { duration: animation.effect!.getTiming().duration, frames: (animation.effect as KeyframeEffect).getKeyframes() };
    });
    for (const p of [react, page]) {
      await load(p, p === react ? "react" : "svelte", { placement, motion: { duration: 10000 } });
    }
    expect(await frames(page)).toEqual(await frames(react));
    for (const p of [react, page]) {
      await update(p, { chrome: false });
      await expect(p.locator("[data-leaving=true]")).toHaveCount(1);
    }
    expect(await frames(page)).toEqual(await frames(react));
    for (const p of [react, page]) {
      await p.locator("[data-motion-in]").evaluate((el) => el.getAnimations()[0].finish());
      await expect(button(p, "Pen")).toHaveCount(0);
    }
    await react.close();
  });
}

test("Svelte dragged toolbar stays in bounds after resize", async ({ page }) => {
  await load(page, "svelte", { draggable: true });
  await settle(page);
  const bar = page.locator("[data-draggable]");
  const before = (await bar.boundingBox())!;
  await page.mouse.move(before.x + 4, before.y + before.height / 2);
  await page.mouse.down(); await page.mouse.move(20, 200, { steps: 12 }); await page.mouse.up();
  await expect.poll(async () => (await bar.boundingBox())!.y).toBeLessThan(before.y - 100);
  await page.setViewportSize({ width: 800, height: 600 });
  await settle(page);
  const after = (await bar.boundingBox())!;
  expect(after.x).toBeGreaterThanOrEqual(7);
  expect(after.x + after.width).toBeLessThanOrEqual(793);
  await button(page, "Hide tools").click();
  await expect(button(page, "Show drawing tools")).toBeVisible();
});
