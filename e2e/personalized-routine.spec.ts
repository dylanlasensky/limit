import { expect, test, type Page } from "@playwright/test";
import { exerciseCatalog } from "../base44/shared/exerciseCatalog.js";

type Row = Record<string, any>;

async function mockNewMember(page: Page, { failExerciseSave = false } = {}) {
  const user = {
    id: "routine-member",
    full_name: "Jordan",
    email: "routine@example.invalid",
    role: "user",
  };
  const entities: Record<string, Row[]> = {
    Exercise: exerciseCatalog.map((row, index) => ({
      ...row,
      id: `persisted-exercise-${index + 1000}`,
    })),
    UserProfile: [],
    DietaryProfile: [],
    WorkoutPlan: [],
    WorkoutDay: [],
    WorkoutExercise: [],
    WorkoutSession: [],
    ExerciseSet: [],
    FoodEntry: [],
    HealthMetric: [],
    DailyCheckIn: [],
    HealthPreference: [],
    HealthImport: [],
    HealthConnection: [],
  };
  const writes: Row[] = [];
  const errors: string[] = [];
  const unexpected: string[] = [];
  const control = { failExerciseSave };
  let sequence = 0;
  const saved = (name: string, value: Row) => ({
    ...value,
    id: `${name.toLowerCase()}-${++sequence}`,
    created_by_id: user.id,
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    // This suite never sends onboarding or exercise data to a real account.
    if (url.origin !== "http://127.0.0.1:4173") return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const reply = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (url.pathname.includes("public-settings"))
      return reply({ id: "limit-browser-test", public_settings: {} });
    if (url.pathname.endsWith("/User/me")) return reply(user);
    if (
      url.pathname.includes("/analytics/track/batch") ||
      url.pathname.startsWith("/api/app-logs/")
    )
      return reply({ success: true });
    if (url.pathname.includes("/functions/workoutCommand")) {
      const body = request.postDataJSON();
      if (body.action === "activatePlan") {
        const plan = entities.WorkoutPlan.find((row) => row.id === body.planId);
        const days = entities.WorkoutDay.filter((row) => row.planId === body.planId);
        const workoutDays = days.filter((row) => !row.isRest);
        const complete =
          days.length === 7 &&
          workoutDays.length === 3 &&
          workoutDays.every((day) =>
            entities.WorkoutExercise.some((row) => row.workoutDayId === day.id)
          );
        writes.push({ function: "workoutCommand", ...body, completeBeforeActivation: complete });
        if (!plan || !complete)
          return reply({ error: "Incomplete program must not activate" }, 409);
        entities.WorkoutPlan = entities.WorkoutPlan.map((row) => ({
          ...row,
          active: row.id === plan.id,
        }));
        return reply({ plan: entities.WorkoutPlan.find((row) => row.id === plan.id) });
      }
    }
    const match = url.pathname.match(/\/entities\/([^/]+)(?:\/([^/]+))?/);
    if (match) {
      const [, name, id] = match;
      const rows = entities[name] || [];
      if (request.method() === "GET") {
        if (id)
          return reply(
            rows.find((row) => row.id === id) || {},
            rows.some((row) => row.id === id) ? 200 : 404
          );
        const query = JSON.parse(url.searchParams.get("q") || "{}");
        const filtered = rows.filter((row) =>
          Object.entries(query).every(([key, value]) => {
            if (value && typeof value === "object") {
              if ("$in" in value) return (value.$in as unknown[]).includes(row[key]);
              return (
                (!("$gte" in value) || row[key] >= (value as Row).$gte) &&
                (!("$lte" in value) || row[key] <= (value as Row).$lte)
              );
            }
            return row[key] === value;
          })
        );
        const skip = Number(url.searchParams.get("skip") || 0);
        return reply(
          filtered.slice(skip, skip + Number(url.searchParams.get("limit") || filtered.length))
        );
      }
      if (request.method() === "POST") {
        const body = request.postDataJSON();
        writes.push({ entity: name, action: id === "bulk" ? "bulkCreate" : "create", body });
        if (id === "bulk") {
          if (name === "WorkoutExercise" && control.failExerciseSave)
            return reply({ message: "Temporary save failure" }, 503);
          const records = body.map((value: Row) => saved(name, value));
          entities[name] = [...rows, ...records];
          // API response order must not be mistaken for the requested weekdays.
          return reply(name === "WorkoutDay" ? [...records].reverse() : records);
        }
        const record = saved(name, body);
        entities[name] = [...rows, record];
        return reply(record);
      }
      if (request.method() === "PUT" && id) {
        const body = request.postDataJSON();
        writes.push({ entity: name, action: "update", id, body });
        const existing = rows.find((row) => row.id === id);
        if (!existing) return reply({ message: "Not found" }, 404);
        const record = { ...existing, ...body, updated_date: new Date().toISOString() };
        entities[name] = rows.map((row) => (row.id === id ? record : row));
        return reply(record);
      }
    }
    unexpected.push(`${request.method()} ${url.pathname}`);
    return reply({ message: "Unexpected synthetic API request" }, 500);
  });
  return { entities, writes, errors, unexpected, control };
}

async function completeAnswers(page: Page) {
  await page.goto("/onboarding");
  await page.getByRole("button", { name: /^Build Muscle/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Jordan");
  await page.getByLabel("Feet", { exact: true }).fill("5");
  await page.getByLabel("Inches", { exact: true }).fill("7");
  await page.getByLabel("Weight (lb)", { exact: true }).fill("150");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: /^Beginner/ }).click();
  await page.getByRole("button", { name: "30 minutes", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Full commercial gym", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Dumbbells", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Full commercial gym", exact: true })
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Dumbbells", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  for (const day of ["Monday", "Wednesday", "Friday"])
    await page.getByRole("button", { name: day, exact: true }).click();
  await expect(page.getByText("3 days per week", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Anything to emphasize?" })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Food that fits" })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Built for you" })).toBeVisible();
}

test("onboarding builds a complete, usable dumbbell routine from the full persisted catalog", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  const fixture = await mockNewMember(page);
  await completeAnswers(page);
  await page.screenshot({
    path: testInfo.outputPath("personalized-plan-reveal.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "START MY LIMIT PLAN", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  const { entities, writes } = fixture;
  expect(entities.Exercise).toHaveLength(365);
  expect(entities.UserProfile).toHaveLength(1);
  expect(entities.UserProfile[0]).toMatchObject({
    onboardingComplete: true,
    fitnessGoal: "gain muscle",
    sessionLength: 30,
    equipment: ["Dumbbells"],
    trainingDays: ["Monday", "Wednesday", "Friday"],
  });
  const active = entities.WorkoutPlan.find((row) => row.active);
  expect(active).toMatchObject({ goal: "gain muscle", sessionDurationTarget: 30, daysPerWeek: 3 });
  const days = entities.WorkoutDay.filter((row) => row.planId === active!.id);
  expect(days).toHaveLength(7);
  expect(
    days
      .filter((row) => !row.isRest)
      .map((row) => row.weekday)
      .sort()
  ).toEqual([0, 2, 4]);
  expect(days.filter((row) => row.isRest)).toHaveLength(4);
  const catalogIds = new Set(entities.Exercise.map((row) => row.id));
  const oldSubset = new Set(entities.Exercise.slice(0, 18).map((row) => row.id));
  expect(entities.WorkoutExercise.some((row) => !oldSubset.has(row.exerciseId))).toBe(true);
  for (const row of entities.WorkoutExercise) {
    expect(catalogIds.has(row.exerciseId)).toBe(true);
    expect(row.sets).toBeGreaterThanOrEqual(2);
    expect(row.repMin).toBeGreaterThan(0);
    expect(row.repMax).toBeGreaterThanOrEqual(row.repMin);
    expect(["Dumbbell", "Bodyweight"]).toContain(row.equipment);
    expect(row.exerciseName).not.toMatch(
      /bench|incline|decline|chest.supported|seal row|bulgarian|hip thrust|seated dumbbell|pull.up|dip station/i
    );
  }
  const activation = writes.findIndex((row) => row.action === "activatePlan");
  const exerciseSave = writes.findIndex(
    (row) => row.entity === "WorkoutExercise" && row.action === "bulkCreate"
  );
  expect(activation).toBeGreaterThan(exerciseSave);
  expect(writes[activation].completeBeforeActivation).toBe(true);
  expect(
    writes.findIndex((row) => row.entity === "UserProfile" && row.body.onboardingComplete === true)
  ).toBeGreaterThan(activation);

  await page.goto("/workout");
  await expect(page.getByRole("heading", { name: "Workout", exact: true })).toBeVisible();
  await page.getByText("About your plan", { exact: true }).click();
  await expect(
    page.getByText(/A personalized starting plan\. Session times include/)
  ).toBeVisible();
  for (const weekday of ["Monday", "Wednesday", "Friday"])
    await expect(
      page.getByRole("button", { name: new RegExp(`^Preview ${weekday} `) })
    ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("personalized-workout-schedule.png"),
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await page.getByRole("button", { name: /^Preview Monday / }).click();
  const preview = page.getByRole("dialog");
  await expect(preview).toBeVisible();
  const monday = days.find((row) => row.weekday === 0)!;
  const mondayRows = entities.WorkoutExercise.filter((row) => row.workoutDayId === monday.id);
  expect(mondayRows.length).toBeGreaterThanOrEqual(3);
  await expect(preview.getByRole("heading", { level: 3 })).toHaveCount(mondayRows.length);
  for (const row of mondayRows)
    await expect(
      preview.getByRole("heading", { name: row.exerciseName, exact: true })
    ).toBeVisible();
  const minutes = await preview.getByText(/^About \d+ min$/).innerText();
  expect(Number(minutes.match(/\d+/)?.[0])).toBeLessThanOrEqual(30);
  await preview.screenshot({ path: testInfo.outputPath("personalized-workout-preview.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  expect(fixture.errors).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test("a failed routine save cannot activate a partial program and onboarding can retry", async ({
  page,
}) => {
  test.setTimeout(60000);
  const fixture = await mockNewMember(page, { failExerciseSave: true });
  await completeAnswers(page);
  await page.getByRole("button", { name: "START MY LIMIT PLAN", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Temporary save failure");
  await expect(page).toHaveURL(/\/onboarding$/);
  expect(fixture.entities.WorkoutPlan.every((row) => row.active === false)).toBe(true);
  expect(fixture.writes.some((row) => row.action === "activatePlan")).toBe(false);
  expect(fixture.entities.UserProfile[0].onboardingComplete).toBe(false);
  fixture.control.failExerciseSave = false;
  await page.getByRole("button", { name: "START MY LIMIT PLAN", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(fixture.entities.WorkoutPlan.filter((row) => row.active)).toHaveLength(1);
  expect(fixture.entities.UserProfile).toHaveLength(1);
  expect(fixture.entities.DietaryProfile).toHaveLength(1);
  expect(fixture.entities.UserProfile[0].onboardingComplete).toBe(true);
  expect(fixture.writes.filter((row) => row.action === "activatePlan")).toHaveLength(1);
  expect(fixture.errors).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});
