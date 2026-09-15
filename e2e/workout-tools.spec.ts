import { expect, test, type Page } from "@playwright/test";

async function mockWorkout(page: Page) {
  const writes: Record<string, any>[] = [];
  const errors: string[] = [];
  const previous = {
    id: "previous-set",
    workoutSessionId: "previous-session",
    exerciseId: "bench",
    exerciseName: "Bench Press",
    setNumber: 1,
    weight: 135,
    reps: 8,
    rir: 2,
    completed: true,
  };
  const entities: Record<string, Record<string, any>[]> = {
    UserProfile: [{ id: "profile", onboardingComplete: true, equipment: ["Full gym"] }],
    WorkoutDay: [{ id: "day", planId: "plan", name: "Upper body" }],
    WorkoutPlan: [{ id: "plan", active: true }],
    WorkoutExercise: [
      {
        id: "template",
        workoutDayId: "day",
        exerciseId: "bench",
        exerciseName: "Bench Press",
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
    WorkoutSession: [{ id: "previous-session", status: "completed" }],
    ExerciseSet: [previous],
  };
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:4173") return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const reply = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (url.pathname.includes("public-settings"))
      return reply({ id: "limit-browser-test", public_settings: {} });
    if (url.pathname.endsWith("/User/me"))
      return reply({
        id: "tools-user",
        full_name: "Jordan",
        email: "tools@example.invalid",
        role: "user",
      });
    if (url.pathname.includes("/functions/workoutCommand")) {
      const body = request.postDataJSON();
      writes.push(body);
      if (body.action === "start")
        return reply({
          session: { id: "session", status: "active", startedAt: new Date().toISOString() },
        });
      if (body.action === "saveSet")
        return reply({ set: { ...body.row, id: "saved-set", revision: body.row.operationId } });
      return reply({ error: "Unexpected command" }, 400);
    }
    const match = url.pathname.match(/\/entities\/([^/]+)(?:\/([^/]+))?/);
    if (match && request.method() === "GET") {
      const [, name, id] = match;
      const rows = entities[name] || [];
      if (id) return reply(rows.find((row) => row.id === id) || {});
      const query = JSON.parse(url.searchParams.get("q") || "{}");
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
  return { writes, errors };
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
    await page
      .getByRole("button", {
        name: "Copy previous values for set 1: 135 pounds, 8 reps",
        exact: true,
      })
      .click();
    await expect(page.getByLabel("Set 1 weight in pounds", { exact: true })).toHaveValue("135");
    await expect(page.getByLabel("Set 1 repetitions", { exact: true })).toHaveValue("8");
    await expect(page.getByLabel("Set 1 reps in reserve, optional", { exact: true })).toHaveValue(
      ""
    );
    await expect(page.getByRole("button", { name: "Finish", exact: true })).toBeDisabled();
    expect(writes.filter((item) => item.action === "saveSet")).toHaveLength(0);

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
    await page.getByRole("button", { name: "Complete set", exact: true }).first().click();
    await expect(page.getByRole("button", { name: "Uncheck set", exact: true })).toBeVisible();
    expect(writes.filter((item) => item.action === "saveSet")).toHaveLength(1);
    expect(writes.find((item) => item.action === "saveSet")?.row).toMatchObject({
      weight: "135",
      reps: "8",
      completed: true,
    });
    expect(errors).toEqual([]);
  });
}
