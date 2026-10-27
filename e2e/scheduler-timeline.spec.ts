import { expect, test, type Locator, type Page } from "@playwright/test";

async function open(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem(
      "glass-ux.appearance.v1",
      JSON.stringify({
        mode: "light",
        palette: "graphite",
        density: "comfortable",
        motion: "full",
      }),
    ),
  );
  await page.goto("./components/scheduler");
  const planner = page
    .getByRole("region", { name: "Crew planner", exact: true })
    .first();
  await expect(planner.locator(".fa-sch-tl-row").first()).toBeVisible();
  await planner.scrollIntoViewIfNeeded();
  return planner;
}

const row = (planner: Locator, id: string) =>
  planner.locator(`[data-tl-zone$=":${id}"]`);

/** The centre of a day column (0 = Monday; weekends are hidden) in a resource's row. */
async function cell(planner: Locator, id: string, column: number, days = 5) {
  await row(planner, id).scrollIntoViewIfNeeded();
  const box = (await row(planner, id).boundingBox())!;
  return {
    x: box.x + ((column + 0.5) * box.width) / days,
    y: box.y + box.height / 2,
  };
}

async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 14,
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= steps; step++)
    await page.mouse.move(
      from.x + ((to.x - from.x) * step) / steps,
      from.y + ((to.y - from.y) * step) / steps,
    );
  await page.mouse.up();
}

const status = (page: Page) => page.getByTestId("timeline-status").first();

test.describe("Scheduler timeline", () => {
  test.skip(({ isMobile }) => isMobile, "pointer drags on the wide planner");

  test("moves a job to another person and day by dragging", async ({
    page,
  }) => {
    const planner = await open(page);
    const target = await cell(planner, "dee", 2);
    const job = planner.getByRole("button", { name: /^Pine removal/ });
    const box = (await job.boundingBox())!;
    await drag(page, { x: box.x + 20, y: box.y + box.height / 2 }, target);
    await expect(status(page)).toHaveText("Moved Pine removal");
    await expect(
      row(planner, "dee").getByRole("button", {
        name: /^Pine removal, Wednesday/,
      }),
    ).toBeVisible();
  });

  test("plans work dragged from the list onto a person and day", async ({
    page,
  }) => {
    const planner = await open(page);
    const target = await cell(planner, "ari", 0);
    const item = page
      .getByRole("button", { name: "Replace bench slats" })
      .first();
    const box = (await item.boundingBox())!;
    await drag(
      page,
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      target,
    );
    await expect(status(page)).toHaveText("Planned Replace bench slats");
    await expect(
      row(planner, "ari").getByRole("button", {
        name: /^Replace bench slats, Monday/,
      }),
    ).toBeVisible();
  });

  test("refuses a drop onto leave and leaves the job where it was", async ({
    page,
  }) => {
    const planner = await open(page);
    const target = await cell(planner, "cal", 3);
    const job = planner.getByRole("button", { name: /^Excavator to depot/ });
    const box = (await job.boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await page.mouse.down();
    for (let step = 1; step <= 14; step++)
      await page.mouse.move(
        box.x + 20 + ((target.x - box.x - 20) * step) / 14,
        box.y +
          box.height / 2 +
          ((target.y - box.y - box.height / 2) * step) / 14,
      );
    await expect(row(planner, "cal")).toHaveAttribute(
      "data-drop-state",
      "error",
    );
    await page.mouse.up();
    await expect(status(page)).not.toHaveText(/Moved Excavator/);
    await expect(
      row(planner, "cal").getByRole("button", {
        name: /^Excavator to depot, Tuesday/,
      }),
    ).toBeVisible();
  });

  test("changes a job's days from its end edge", async ({ page }) => {
    const planner = await open(page);
    const card = planner.locator(".fa-sch-tl-ev", {
      has: page.getByRole("button", { name: /^Hedge line, east gate/ }),
    });
    const target = await cell(planner, "fay", 2);
    const edge = card.locator('[data-edge="end"]');
    const box = (await edge.boundingBox())!;
    await drag(
      page,
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      target,
    );
    await expect(status(page)).toHaveText("Resized Hedge line, east gate");
    await expect(
      planner.getByRole("button", {
        name: /^Hedge line, east gate, Mon,? 26 Oct to Wed,? 28 Oct|^Hedge line, east gate, .* to Wed/,
      }),
    ).toBeVisible();
  });

  test("selects days in a row to add a job there", async ({ page }) => {
    const planner = await open(page);
    const from = await cell(planner, "gus", 0);
    const to = await cell(planner, "gus", 1);
    await drag(page, from, to, 6);
    await expect(status(page)).toHaveText("Added a job");
    await expect(
      row(planner, "gus").getByRole("button", { name: /^New job, Mon/ }),
    ).toBeVisible();
  });

  test("drags a job back to the list", async ({ page }) => {
    const planner = await open(page);
    const job = planner.getByRole("button", { name: /^Leaf blowing, courts/ });
    const box = (await job.boundingBox())!;
    const list = (await page
      .getByRole("list")
      .filter({ hasText: "Replace bench slats" })
      .first()
      .boundingBox())!;
    await drag(
      page,
      { x: box.x + 20, y: box.y + box.height / 2 },
      { x: list.x + list.width - 30, y: list.y + list.height / 2 },
    );
    await expect(status(page)).toHaveText(
      "Moved Leaf blowing, courts back to the list",
    );
    await expect(
      planner.getByRole("button", { name: /^Leaf blowing/ }),
    ).toHaveCount(0);
  });

  test("lifts a job with Space and puts it back with Escape", async ({
    page,
  }) => {
    const planner = await open(page);
    const job = planner.getByRole("button", { name: /^Pine removal/ });
    await job.focus();
    await page.keyboard.press("Space");
    await expect(page.locator("html")).toHaveAttribute("data-dnd", "dragging");
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).not.toHaveAttribute("data-dnd", /./);
    await expect(
      row(planner, "bea").getByRole("button", {
        name: /^Pine removal, Thursday/,
      }),
    ).toBeVisible();
  });
});

test("the narrow timeline shows one day without overflowing @responsive", async ({
  page,
}) => {
  await page.goto("./components/scheduler");
  const narrow = page
    .getByRole("region", { name: "Crew planner", exact: true })
    .last();
  await narrow.scrollIntoViewIfNeeded();
  await expect(narrow.locator(".fa-sch-tl-day")).toHaveCount(1);
  const scroll = narrow.locator(".fa-sch-tl-scroll");
  const overflow = await scroll.evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("a rolling month follows the scroll into the next month and keeps its place", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "the wide strip");
  await page.goto("./components/scheduler");
  const strip = page.getByRole("region", {
    name: "Team availability",
    exact: true,
  });
  const scroll = strip.locator(".fa-sch-tl-scroll");
  await scroll.scrollIntoViewIfNeeded();
  await expect(strip.locator(".fa-sch-tl-row").first()).toBeVisible();
  const title = strip.locator(".fa-sch-title");
  const before = await title.textContent();
  // Only the rows in view render.
  expect(await strip.locator(".fa-sch-tl-row").count()).toBeLessThan(40);
  // Scroll about a month later; once the window re-centres, the same day is still at the leading edge.
  const leading = () =>
    scroll.evaluate((element) => {
      const corner = element
        .querySelector<HTMLElement>(".fa-sch-tl-corner")!
        .getBoundingClientRect();
      const x = corner.right + 4;
      const days = [...element.querySelectorAll<HTMLElement>(".fa-sch-tl-day")];
      const day = days.find((cell) => {
        const box = cell.getBoundingClientRect();
        return box.left <= x && box.right > x;
      });
      return day
        ? `${day.querySelector(".fa-sch-tl-day-weekday")?.textContent} ${day.querySelector(".fa-sch-tl-day-number")?.textContent}`
        : null;
    });
  await scroll.evaluate((element) => {
    element.scrollLeft += element.clientWidth;
  });
  const scrolledTo = await leading();
  await expect(title).not.toHaveText(before ?? "");
  await expect.poll(leading).toBe(scrolledTo);
  const range = await page.getByTestId("availability-range").textContent();
  expect(range).toMatch(/Loaded \d{4}-\d{2}-01 – \d{4}-\d{2}-\d{2}/);
});

test("sticky rows stay pinned on a wide timeline while they leave room", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "the wide planner");
  const planner = await open(page);
  await expect(planner.locator(".fa-sch-tl-pinned")).toHaveAttribute(
    "data-pinned",
    "",
  );
});

test("the narrow timeline scrolls sticky rows away so every person can be reached @responsive", async ({
  page,
}) => {
  await page.goto("./components/scheduler");
  const narrow = page
    .getByRole("region", { name: "Crew planner", exact: true })
    .last();
  await narrow.scrollIntoViewIfNeeded();
  await expect(narrow.locator(".fa-sch-tl-pinned")).not.toHaveAttribute(
    "data-pinned",
    /.*/,
  );
  const last = narrow.locator(".fa-sch-tl-row").last();
  await last.scrollIntoViewIfNeeded();
  // What is under the last person's heading is that row, not a sticky row drawn over it.
  const hit = await last.locator(".fa-sch-tl-resource").evaluate((element) => {
    const box = element.getBoundingClientRect();
    const under = document.elementFromPoint(
      box.left + box.width / 2,
      box.top + box.height / 2,
    );
    return under?.closest(".fa-sch-tl-row")?.getAttribute("aria-label") ?? null;
  });
  expect(hit).toBe(await last.getAttribute("aria-label"));
});

test("choosing an item in a job's menu does not select the row's days", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "the wide planner");
  const planner = await open(page);
  await planner.getByRole("button", { name: "More for Pine removal" }).click();
  await page.getByRole("menuitem", { name: "Remove" }).click();
  await expect(status(page)).toHaveText("Removed Pine removal");
  await expect(
    planner.getByRole("button", { name: /^Pine removal/ }),
  ).toHaveCount(0);
  await expect(planner.locator(".fa-sch-tl-selection[data-show]")).toHaveCount(
    0,
  );
});
