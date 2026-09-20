import { expect, test, type Page } from "@playwright/test";

/** A drag of the same shape every time, so two runs are comparable. */
const path = [
  [160, 140],
  [240, 180],
  [330, 260],
  [430, 250],
  [520, 320],
  [600, 300],
] as const;

async function load(page: Page, query = "") {
  await page.goto(`/progress.html${query}`);
  await page.waitForFunction(() => window.progress?.draw());
}

/** Draws the path. `hold` leaves the pointer down at the end of it. */
async function draw(page: Page, hold = false) {
  const [start, ...rest] = path;
  await page.mouse.move(start[0], start[1]);
  await page.mouse.down();
  for (const [x, y] of rest) await page.mouse.move(x, y, { steps: 10 });
  if (!hold) await page.mouse.up();
}

/** The committed drawing, minus the ids, which only count from the mount. */
const drawn = (page: Page) =>
  page.evaluate(() =>
    window.progress.committed.map(({ id: _id, ...rest }) => rest),
  );

test("reports the stroke as it grows, and stops at the release", async ({ page }) => {
  await load(page);
  await draw(page, true);

  const drawing = await page.evaluate(() =>
    window.progress.calls.map((c) => ({
      length: c.points.length,
      last: c.points[c.points.length - 1],
      tool: c.tool,
    })),
  );
  // Where the pointer went down, then every move that extended the stroke.
  expect(drawing.length).toBeGreaterThan(10);
  expect(drawing[0].length).toBe(1);
  // Board coordinates: the frame sits 30px in from the corner of the page.
  expect(drawing[0].last[0]).toBeCloseTo(path[0][0] - 30, 0);
  expect(drawing[0].last[1]).toBeCloseTo(path[0][1] - 30, 0);
  for (let i = 1; i < drawing.length; i++) {
    expect(drawing[i].length).toBeGreaterThan(drawing[i - 1].length);
  }
  for (const call of drawing) {
    expect(call.tool).toMatchObject({ kind: "pen", pen: "pen" });
  }
  expect(await page.evaluate(() => window.progress.committed.length)).toBe(0);

  await page.mouse.up();
  // The release says nothing; the stroke turning up in onChange is the end.
  expect(await page.evaluate(() => window.progress.calls.length)).toBe(drawing.length);
  expect(await page.evaluate(() => window.progress.committed.length)).toBe(1);
  const [stroke] = await drawn(page);
  expect(stroke.points.length).toBe(drawing[drawing.length - 1].length);
});

test("reports the tool in hand", async ({ page }) => {
  await load(page);
  await page.getByRole("button", { name: "Eraser" }).click();
  await draw(page);
  const tools = await page.evaluate(() =>
    window.progress.calls.map((c) => c.tool.kind),
  );
  expect(new Set(tools)).toEqual(new Set(["eraser"]));
  expect(await page.evaluate(() => window.progress.calls[0].tool)).toMatchObject({
    kind: "eraser",
  });
});

test("a kept array cannot reach inside the finished stroke", async ({ page }) => {
  await load(page);
  await draw(page);
  const kept = await page.evaluate(() => {
    const last = window.progress.calls[window.progress.calls.length - 1].points;
    const stroke = window.progress.committed[0];
    const before = stroke.points.length;
    (last as unknown[]).push([0, 0, 1]);
    return {
      shared: stroke.points === last,
      matched: before === last.length - 1,
      after: window.progress.draw()!.getStrokes()[0].points.length,
      before,
    };
  });
  expect(kept.shared).toBe(false);
  expect(kept.matched).toBe(true);
  expect(kept.after).toBe(kept.before);
});

test("a drag with no listener draws exactly the same stroke", async ({ page }) => {
  await load(page);
  await draw(page);
  const listened = await drawn(page);
  expect(listened).toHaveLength(1);
  expect(listened[0].points.length).toBeGreaterThan(10);
  const svg = await page.evaluate(() => window.progress.draw()!.toSvg());

  await load(page, "?listen=0");
  await draw(page);
  expect(await page.evaluate(() => window.progress.calls.length)).toBe(0);
  expect(await drawn(page)).toEqual(listened);
  expect(await page.evaluate(() => window.progress.draw()!.toSvg())).toBe(svg);
});
