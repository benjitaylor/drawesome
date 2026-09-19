import { expect, test, type Page } from "@playwright/test";

const placements = ["bottom", "left", "right"] as const;
const aligns = ["start", "center", "end"] as const;
const ends = [undefined, "start", "end"] as const;
const disc = (page: Page) => page.getByRole("button", { name: "Show drawing tools" });
const hide = (page: Page) => page.getByRole("button", { name: "Hide tools" });

async function settle(page: Page) {
  await page.mouse.move(1150, 950);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
}

async function load(page: Page, props: object) {
  await page.goto(`/collapse.html?props=${encodeURIComponent(JSON.stringify(props))}`);
  await page.waitForFunction(() => window.fixture?.draw);
  await settle(page);
}

async function update(page: Page, props: object) {
  await page.evaluate((next) => window.fixture.setProps(next), props);
  await settle(page);
}

async function expectCorner(page: Page, placement: string, end: string) {
  await settle(page);
  const rect = (await disc(page).boundingBox())!;
  const frame = (await page.locator("#frame").boundingBox())!;
  const gap = await page.locator("[data-motion-in]").evaluate(
    (el, edge) => parseFloat(getComputedStyle(el).getPropertyValue(edge)), placement,
  );
  const near = placement === "bottom" ? rect.x - frame.x : rect.y - frame.y;
  const far = placement === "bottom"
    ? frame.x + frame.width - rect.x - rect.width
    : frame.y + frame.height - rect.y - rect.height;
  expect(Math.abs((end === "start" ? near : far) - gap)).toBeLessThan(0.6);
  expect(rect.x).toBeGreaterThanOrEqual(frame.x);
  expect(rect.y).toBeGreaterThanOrEqual(frame.y);
  expect(rect.x + rect.width).toBeLessThanOrEqual(frame.x + frame.width);
  expect(rect.y + rect.height).toBeLessThanOrEqual(frame.y + frame.height);
  expect(Math.abs(rect.width - 56)).toBeLessThan(0.1);
  expect(Math.abs(rect.height - 56)).toBeLessThan(0.1);
}

for (const placement of placements) for (const align of aligns) for (const minimizeAlign of ends) {
  test(`${placement}, ${align}, minimize ${minimizeAlign ?? "auto"}: click and initial collapse`, async ({ page }) => {
    const props = { placement, align, minimizeAlign };
    const end = minimizeAlign ?? (align === "start" ? "start" : "end");
    await load(page, props);
    const open = await page.locator("[data-motion-in]").boundingBox();
    await hide(page).click();
    await expectCorner(page, placement, end);
    await disc(page).click();
    await settle(page);
    expect(await page.locator("[data-motion-in]").boundingBox()).toEqual(open);
    await load(page, { ...props, startMinimized: true });
    await expectCorner(page, placement, end);
  });
}

for (const placement of placements) {
  test(`${placement}: retarget, change alignment, inset and container size`, async ({ page }) => {
    await load(page, { placement, minimizeAlign: "end", startMinimized: true, board: { w: 1600, h: 1000 } });
    await expectCorner(page, placement, "end");
    await update(page, { minimizeAlign: "start" });
    await expectCorner(page, placement, "start");
    await update(page, { minimizeAlign: "end", align: "start" });
    await expectCorner(page, placement, "end");
    for (const inset of [32, "2rem", "calc(2% + 12px)"]) {
      await update(page, { inset });
      await expectCorner(page, placement, "end");
    }
    await page.evaluate(() => window.fixture.resize(680, 620));
    await expectCorner(page, placement, "end");
    await update(page, { chrome: false });
    await expect(disc(page)).toHaveCount(0);
    await update(page, { chrome: true });
    await expectCorner(page, placement, "end");
  });

  test(`${placement}: interrupted motion remains in frame and returns to open position`, async ({ page }) => {
    await load(page, { placement, align: "end", minimizeAlign: "start" });
    const open = await page.locator("[data-motion-in]").boundingBox();
    const frames = await page.evaluate(async () => {
      const root = document.querySelector(".sd[data-placement]")!;
      const bar = document.querySelector("[data-motion-in]")!.firstElementChild!;
      (document.querySelector('[aria-label="Hide tools"]') as HTMLElement).click();
      const frames = [];
      const start = performance.now();
      while (performance.now() - start < 180) {
        await new Promise(requestAnimationFrame);
        const r = root.getBoundingClientRect();
        const b = bar.getBoundingClientRect();
        frames.push({ x: b.x - r.x, y: b.y - r.y, right: b.right - r.right, bottom: b.bottom - r.bottom });
      }
      (document.querySelector('[aria-label="Show drawing tools"]') as HTMLElement).click();
      return frames;
    });
    for (const frame of frames) {
      expect(frame.x).toBeGreaterThanOrEqual(-1);
      expect(frame.y).toBeGreaterThanOrEqual(-1);
      expect(frame.right).toBeLessThanOrEqual(1);
      expect(frame.bottom).toBeLessThanOrEqual(1);
    }
    await settle(page);
    expect(await page.locator("[data-motion-in]").boundingBox()).toEqual(open);
    await hide(page).click();
    await expectCorner(page, placement, "start");
  });

  test(`${placement}: dragged bar stays at its chosen location`, async ({ page }) => {
    await load(page, { placement, draggable: true, tools: ["pen", "pencil", "marker"], controls: { undo: false, clear: false } });
    const bar = page.locator("[data-draggable]");
    const before = (await bar.boundingBox())!;
    await page.mouse.move(before.x + 3, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(330, 410, { steps: 12 });
    await page.mouse.up();
    await settle(page);
    await hide(page).click();
    await settle(page);
    const first = await disc(page).boundingBox();
    await update(page, { minimizeAlign: "start" });
    expect(await disc(page).boundingBox()).toEqual(first);
    await update(page, { minimizeAlign: "end" });
    expect(await disc(page).boundingBox()).toEqual(first);
  });
}

test("mobile dark toolbar with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await load(page, { placement: "right", theme: "dark", background: "#17171a", tools: ["pen", "pencil", "marker"], controls: { undo: false, clear: false } });
  await page.evaluate(() => window.fixture.resize(330, 760));
  await settle(page);
  await hide(page).click();
  await expectCorner(page, "right", "end");
  await update(page, { minimizeAlign: "start" });
  await expectCorner(page, "right", "start");
});
