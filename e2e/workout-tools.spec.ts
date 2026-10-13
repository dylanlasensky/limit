import { expect, test, type Page } from "@playwright/test";

async function mockWorkout(page: Page, hasHistory = true, largeValues = false) {
  let failSaves = false;
  let releaseSave: (() => void) | undefined;
  let saveGate: Promise<void> | undefined;
  const writes: Record<string, any>[] = [];
  const errors: string[] = [];
  const previous = {
    id: "previous-set",
    workoutSessionId: "previous-session",
    exerciseId: "bench",
    exerciseName: largeValues
      ? "Long exercise name for narrow-screen workout logging"
      : "Bench Press",
    setNumber: 1,
    weight: largeValues ? 1250.5 : 135,
    reps: largeValues ? 100 : 8,
    rir: 2,
    completed: true,
  };
  const entities: Record<string, Record<string, any>[]> = {
    UserProfile: [
      { id: "profile", name: "Jordan", onboardingComplete: true, equipment: ["Full gym"] },
    ],
    WorkoutDay: [{ id: "day", planId: "plan", name: "Upper body", weekday: 0 }],
    WorkoutPlan: [{ id: "plan", name: "Strength", active: true }],
    WorkoutExercise: [
      {
        id: "template",
        workoutDayId: "day",
        exerciseId: "bench",
        exerciseName: largeValues
          ? "Long exercise name for narrow-screen workout logging"
          : "Bench Press",
        sets: 3,
        repMin: 8,
        repMax: 12,
        order: 0,
      },
    ],
    Exercise: [
      {
        id: "bench",
        name: "Bench Press",
        equipment: "Barbell",
        primaryMuscle: "Chest",
        category: "Compound",
      },
    ],
    WorkoutSession: hasHistory
      ? [{ id: "previous-session", name: "Upper body", date: "2026-09-26", status: "completed" }]
      : [],
    ExerciseSet: hasHistory ? [previous] : [],
  };
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:4173") return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const enrich = (value: any): any =>
      Array.isArray(value)
        ? value.map(enrich)
        : value && typeof value === "object"
          ? {
              ...(value.id
                ? {
                    ownerId: "qa-user",
                    created_by_id: "qa-user",
                    created_date: "2026-09-27T00:00:00Z",
                    updated_date: "2026-09-27T00:00:00Z",
                  }
                : {}),
              ...Object.fromEntries(Object.entries(value).map(([k, v]) => [k, enrich(v)])),
            }
          : value;
    const reply = (body: any, status = 200) => route.fulfill({ status, json: enrich(body) });
    if (url.pathname === "/api/auth/get-session")
      return reply({
        session: { id: "qa-session", userId: "qa-user", expiresAt: "2099-01-01T00:00:00Z" },
        user: { id: "qa-user", name: "Jordan", email: "qa@example.invalid", emailVerified: true },
      });
    if (url.pathname.includes("/functions/workoutCommand")) {
      const body = request.postDataJSON();
      writes.push(body);
      if (body.action === "start")
        return reply({
          session: {
            id: "session",
            name: "Upper body",
            date: "2026-09-27",
            status: "active",
            startedAt: new Date().toISOString(),
          },
        });
      if (body.action === "saveSet") {
        if (saveGate) await saveGate;
        if (failSaves)
          return reply({ error: "Unable to save. Your entries remain on this device." }, 503);
        return reply({
          set: {
            ...body.row,
            workoutSessionId: "session",
            exerciseName: "Bench Press",
            weight: Number(body.row.weight),
            reps: Number(body.row.reps),
            rir: body.row.rir === "" || body.row.rir == null ? undefined : Number(body.row.rir),
            id: "saved-set",
            revision: body.row.operationId,
          },
        });
      }
      return reply({ error: "Unexpected command" }, 400);
    }
    const match = url.pathname.match(/\/entities\/([^/]+)(?:\/([^/]+))?/);
    if (match && request.method() === "GET") {
      const [, name, id] = match;
      const rows = entities[name] || [];
      if (id) return reply(rows.find((row) => row.id === id) || {});
      const query = JSON.parse(url.searchParams.get("filter") || "{}");
      return reply(
        rows.filter((row) =>
          Object.entries(query).every(([key, value]) =>
            value && typeof value === "object" && "$in" in value
              ? (value.$in as unknown[]).includes(row[key])
              : row[key] === value
          )
        )
      );
    }
    return reply({ error: "Unexpected API request" }, 500);
  });
  return {
    writes,
    errors,
    fail: (value: boolean) => {
      failSaves = value;
    },
    hold: () => {
      saveGate = new Promise<void>((resolve) => {
        releaseSave = resolve;
      });
    },
    release: () => {
      releaseSave?.();
      saveGate = undefined;
    },
  };
}

for (const appearance of ["light", "dark"]) {
  test(`workout shortcuts and plate calculator work in ${appearance} mode without altering logs`, async ({
    page,
  }, testInfo) => {
    const { writes, errors } = await mockWorkout(page);
    await page.addInitScript((mode) => localStorage.setItem("limit-appearance", mode), appearance);
    await page.goto("/live-workout/day");
    await expect(page.locator("html")).toHaveClass(new RegExp(appearance));
    await expect(page.getByRole("heading", { name: "Bench Press" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Finish", exact: true })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Show movement guide", exact: true })
    ).toBeVisible();
    const setType = await page.getByRole("button", { name: /Set 1 type:/ }).boundingBox();
    expect(setType!.width).toBeGreaterThanOrEqual(44);
    expect(setType!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({
      path: testInfo.outputPath(`workout-${appearance}.png`),
      fullPage: true,
    });
    await page
      .getByRole("button", {
        name: "Copy previous values for set 1: 135 pounds, 8 reps",
        exact: true,
      })
      .click();
    await expect(page.getByLabel("Set 1 weight in pounds", { exact: true })).toHaveValue("135");
    await expect(page.getByLabel("Set 1 repetitions", { exact: true })).toHaveValue("8");
    await expect(page.getByText("Left", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel(/reps left/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Finish", exact: true })).toBeDisabled();
    expect(writes.filter((item) => item.action === "saveSet")).toHaveLength(0);

    await page.getByText("Weight tools", { exact: true }).click();
    await page.getByRole("button", { name: "Plate calculator", exact: true }).click();
    const calculator = page.getByRole("dialog", { name: "Plate calculator" });
    await expect(calculator).toBeVisible();
    await expect(calculator.getByLabel("Total loaded weight (lb)")).toHaveValue("135");
    await expect(calculator.getByRole("list", { name: "Plates on each side" })).toContainText(
      "45 lb × 1"
    );
    await calculator.getByLabel("Total loaded weight (lb)").fill("137");
    await expect(calculator.getByRole("status")).toContainText("2 lb lighter");
    await calculator.getByRole("button", { name: "Kilograms (kg)" }).click();
    await calculator.getByLabel("Total loaded weight (kg)").fill("60");
    await expect(calculator.getByRole("list", { name: "Plates on each side" })).toContainText(
      "20 kg × 1"
    );
    await calculator.getByLabel("Bar weight (kg)").fill("15");
    await expect(calculator.getByRole("list", { name: "Plates on each side" })).toContainText(
      "2.5 kg × 1"
    );
    await calculator.screenshot({
      path: testInfo.outputPath(`plate-calculator-${appearance}.png`),
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
    await calculator.getByRole("button", { name: "Done", exact: true }).click();
    await expect(calculator).not.toBeVisible();
    await expect(page.getByLabel("Set 1 weight in pounds", { exact: true })).toHaveValue("135");
    await expect(page.getByLabel("Set 1 repetitions", { exact: true })).toHaveValue("8");
    await page.getByRole("button", { name: "Complete set 1", exact: true }).first().click();
    await expect(page.getByRole("button", { name: "Uncheck set 1", exact: true })).toBeVisible();
    await expect(page.getByText("All completed sets synced", { exact: true })).toBeVisible();
    expect(writes.filter((item) => item.action === "saveSet")).toHaveLength(1);
    expect(writes.find((item) => item.action === "saveSet")?.row).toMatchObject({
      weight: "135",
      reps: "8",
      completed: true,
    });
    expect(errors).toEqual([]);
  });
}

test("first workout guidance collapses into a focused logger and survives refresh", async ({
  page,
}, testInfo) => {
  await mockWorkout(page, false);
  await page.goto("/live-workout/day");
  const ready = page.getByRole("button", { name: "Ready to log sets", exact: true });
  await expect(ready).toBeVisible();
  await ready.click();
  const weight = page.getByLabel("Set 1 weight in pounds", { exact: true });
  await expect(weight).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Show movement guide", exact: true })
  ).toBeVisible();
  await expect(page.getByLabel("Load increase for Bench Press")).not.toBeVisible();
  const box = await weight.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("workout-ready.png"), fullPage: true });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Show movement guide", exact: true })
  ).toBeVisible();
  await expect(ready).toHaveCount(0);
  await page.getByRole("button", { name: "Show movement guide", exact: true }).click();
  await expect(ready).toBeVisible();
});

test("workout save states remain clear and retry preserves the set", async ({ page }, testInfo) => {
  const fixture = await mockWorkout(page);
  await page.goto("/live-workout/day");
  await page
    .getByRole("button", {
      name: "Copy previous values for set 1: 135 pounds, 8 reps",
      exact: true,
    })
    .click();
  fixture.hold();
  fixture.fail(true);
  await page.getByRole("button", { name: "Complete set 1", exact: true }).click();
  await expect(page.getByText("Syncing your sets…", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("workout-pending.png"), fullPage: true });
  fixture.release();
  const retry = page.getByRole("button", { name: "Retry", exact: true });
  await expect(retry).toBeVisible();
  await expect(page.getByLabel("Set 1 weight in pounds", { exact: true })).toHaveValue("135");
  await expect(page.getByRole("region", { name: "Rest timer", exact: true })).toHaveCSS(
    "opacity",
    "1"
  );
  await page.screenshot({ path: testInfo.outputPath("workout-retry.png"), fullPage: true });
  fixture.fail(false);
  await retry.click();
  await expect(page.getByText("All completed sets synced", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish workout", exact: true })).toBeEnabled();
  await expect(page.getByText("Rest phase", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("workout-saved-rest.png"), fullPage: true });
  const saves = fixture.writes.filter((row) => row.action === "saveSet");
  expect(saves).toHaveLength(2);
  expect(saves[1].row.operationId).toBe(saves[0].row.operationId);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(fixture.errors).toEqual([]);
});

test("a timed-out save keeps the workout draft and retries the same operation", async ({ page }) => {
  await page.clock.install();
  const fixture = await mockWorkout(page);
  await page.goto("/live-workout/day");
  await page.getByLabel("Set 1 weight in pounds", { exact: true }).fill("135");
  await page.getByLabel("Set 1 repetitions", { exact: true }).fill("8");
  fixture.hold();
  await page.getByRole("button", { name: "Complete set 1", exact: true }).click();
  await expect(page.getByText("Syncing your sets…", { exact: true })).toBeVisible();
  await expect.poll(() => fixture.writes.filter((row) => row.action === "saveSet").length).toBe(1);
  await page.clock.fastForward(30_001);
  const retry = page.getByRole("button", { name: "Retry", exact: true });
  await expect(retry).toBeVisible();
  await expect(page.getByLabel("Set 1 weight in pounds", { exact: true })).toHaveValue("135");
  await expect(page.getByLabel("Set 1 repetitions", { exact: true })).toHaveValue("8");
  await expect(page.getByRole("button", { name: "Uncheck set 1", exact: true })).toBeVisible();
  fixture.release();
  await retry.click();
  await expect(page.getByText("All completed sets synced", { exact: true })).toBeVisible();
  const saves = fixture.writes.filter((row) => row.action === "saveSet");
  expect(saves).toHaveLength(2);
  expect(saves[1].row.operationId).toBe(saves[0].row.operationId);
  expect(saves[1].row).toMatchObject({ weight: "135", reps: "8", completed: true });
  expect(fixture.errors).toEqual([]);
});

test("long names and large previous values fit with enlarged text and reduced viewport height", async ({
  page,
}, testInfo) => {
  await mockWorkout(page, true, true);
  await page.goto("/live-workout/day");
  await expect(
    page.getByRole("heading", { name: "Long exercise name for narrow-screen workout logging" })
  ).toBeVisible();
  const defaultCopy = page.getByRole("button", {
    name: "Copy previous values for set 1: 1250.5 pounds, 100 reps",
    exact: true,
  });
  await defaultCopy.click();
  const defaultFits = await page
    .getByLabel("Set 1 weight in pounds", { exact: true })
    .evaluate((element) => {
      const input = element as HTMLInputElement;
      const context = document.createElement("canvas").getContext("2d")!;
      context.font = getComputedStyle(input).font;
      return input.clientWidth >= context.measureText(input.value).width + 8;
    });
  expect(defaultFits).toBe(true);
  await page.addStyleTag({ content: "html { font-size: 24px !important; }" });
  const copy = page.getByRole("button", {
    name: "Copy previous values for set 1: 1250.5 pounds, 100 reps",
    exact: true,
  });
  await copy.click();
  await expect(page.getByLabel("Set 1 weight in pounds", { exact: true })).toHaveValue("1250.5");
  const fits = await copy.evaluate((element) => element.scrollWidth <= element.clientWidth);
  expect(fits).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const inputFits = await page
    .getByLabel("Set 1 weight in pounds", { exact: true })
    .evaluate((element) => {
      const input = element as HTMLInputElement;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      context.font = getComputedStyle(input).font;
      return input.clientWidth >= context.measureText(input.value).width + 8;
    });
  expect(inputFits).toBe(true);
  const previous = await page.getByRole("button", { name: "Previous", exact: true }).boundingBox();
  const finish = await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .boundingBox();
  expect(
    previous!.x + previous!.width <= finish!.x || previous!.y + previous!.height <= finish!.y
  ).toBe(true);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("workout-large-text.png"), fullPage: true });
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 420 });
  const reps = page.getByLabel("Set 1 repetitions", { exact: true });
  await reps.focus();
  await reps.scrollIntoViewIfNeeded();
  await expect(reps).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("workout-reduced-height.png") });
});
