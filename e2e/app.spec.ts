import { expect, test, type Page } from "@playwright/test";
import { exerciseCatalog } from "../base44/shared/exerciseCatalog.js";

type Row = Record<string, any>;
async function mockApp(
  page: Page,
  { signedIn = true, failFood = false, expandedLibrary = false, failExercises = false } = {}
) {
  const control = { failExercises };
  const today = new Date().toLocaleDateString("en-CA");
  const weekday = (new Date().getDay() + 6) % 7;
  const user = { id: "qa-user", email: "qa@example.invalid", full_name: "Jordan", role: "user" };
  const entities: Record<string, Row[]> = {
    UserProfile: [
      {
        id: "profile",
        name: "Jordan",
        onboardingComplete: true,
        currentWeight: 180,
        goalWeight: 185,
        heightFeet: 5,
        heightInches: 11,
        birthDate: "1995-01-01",
        measurementSystemVersion: "us_v1",
        units: "imperial",
        calorieTarget: 2500,
        proteinTarget: 170,
        carbTarget: 300,
        fatTarget: 70,
        trainingDays: ["Monday", "Wednesday", "Friday"],
        equipment: ["Full gym"],
      },
    ],
    DietaryProfile: [{ id: "diet", allergies: [], foodsToAvoid: [] }],
    WorkoutPlan: [{ id: "plan", name: "Strength foundation", active: true, daysPerWeek: 3 }],
    WorkoutDay: [{ id: "day", planId: "plan", name: "Full body A", weekday, isRest: false }],
    WorkoutExercise: [
      {
        id: "template",
        workoutDayId: "day",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        sets: 3,
        reps: "8-12",
        restSeconds: 60,
        order: 0,
      },
    ],
    Exercise: [
      {
        id: "bench",
        name: "Bench Press",
        primaryMuscle: "Chest",
        secondaryMuscles: ["Triceps"],
        equipment: "Barbell",
        category: "Compound",
      },
    ],
    FoodEntry: [],
    WeightEntry: [],
    ExerciseSet: [],
    WorkoutSession: [],
    PersonalRecord: [],
    MuscleRatingSnapshot: [],
    MealPlan: [],
    GroceryItem: [],
  };
  const writes: Row[] = [];
  if (expandedLibrary)
    entities.Exercise.push(...exerciseCatalog.map((row) => ({ ...row, id: row.catalogKey })));
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    // Explicitly block all non-local traffic, including analytics and AI uploads.
    if (url.origin !== "http://127.0.0.1:4173") return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const reply = (body: any, status = 200) => route.fulfill({ status, json: body });
    if (url.pathname.includes("public-settings"))
      return reply({ id: "limit-browser-test", public_settings: {} });
    if (url.pathname.endsWith("/User/me"))
      return reply(signedIn ? user : { message: "Unauthorized" }, signedIn ? 200 : 401);
    if (url.pathname.includes("/functions/workoutCommand")) {
      const body = request.postDataJSON();
      writes.push(body);
      if (body.action === "start") {
        const session = entities.WorkoutSession[0] || {
          id: "session",
          ownerId: user.id,
          workoutDayId: "day",
          planId: "plan",
          status: "active",
          startedAt: new Date().toISOString(),
          date: today,
        };
        entities.WorkoutSession = [session];
        return reply({ session });
      }
      if (body.action === "saveSet") {
        const saved = {
          ...body.row,
          id: "set-" + body.row.setNumber,
          revision: body.row.operationId,
          workoutSessionId: "session",
        };
        entities.ExerciseSet = [
          ...entities.ExerciseSet.filter((row) => row.id !== saved.id),
          saved,
        ];
        return reply({ set: saved });
      }
      if (body.action === "finish")
        return reply({
          summary: {
            name: "Full body A",
            durationMinutes: 1,
            workingSets: 1,
            volume: 1080,
            prs: [],
            ratingChanges: [],
          },
        });
      return reply({ error: "Unexpected command" }, 400);
    }
    const match = url.pathname.match(/\/entities\/([^/]+)(?:\/([^/]+))?/);
    if (match) {
      const [, name, id] = match;
      const rows = entities[name] || [];
      if (request.method() === "GET") {
        if (name === "Exercise" && control.failExercises)
          return reply({ message: "Unavailable" }, 503);
        if (id)
          return reply(
            rows.find((row) => row.id === id) || {},
            rows.some((row) => row.id === id) ? 200 : 404
          );
        const query = JSON.parse(url.searchParams.get("q") || "{}");
        return reply(
          rows.filter((row) =>
            Object.entries(query).every(([key, value]) =>
              value && typeof value === "object" && "$in" in value
                ? (value.$in as any[]).includes(row[key])
                : row[key] === value
            )
          )
        );
      }
      if (request.method() === "POST") {
        const body = request.postDataJSON();
        writes.push({ entity: name, ...body });
        if (name === "FoodEntry" && failFood)
          return reply({ message: "Temporarily unavailable" }, 503);
        const saved = { ...body, id: "saved-" + writes.length };
        entities[name] = [...rows, saved];
        return reply(saved);
      }
    }
    return reply({ error: "Unmocked API request: " + url.pathname }, 500);
  });
  return { writes, errors, control };
}

test("expanded exercise library searches aliases, filters power and shows technique notes", async ({
  page,
}, testInfo) => {
  const { errors } = await mockApp(page, { expandedLibrary: true });
  await page.goto("/workout");
  await page.getByRole("tab", { name: "Exercises", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Find your next movement" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Show more/ })).toBeVisible();
  await page.getByRole("textbox", { name: "Search exercises", exact: true }).fill("DB RDL");
  await page.getByRole("button", { name: /^Dumbbell Romanian Deadlift/ }).click();
  await expect(page.getByRole("dialog").getByText("Movement notes")).toBeVisible();
  await expect(page.getByRole("dialog").getByText(/Keep the weights beside/)).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.getByRole("button", { name: "More filters", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Training focus", exact: true })
    .selectOption("Athletic power");
  await expect(page.getByText("39 exercises found", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Search exercises", exact: true }).fill("Power Clean");
  await page.getByRole("button", { name: /^Power Clean Quads/ }).click();
  await expect(page.getByRole("dialog").getByText(/Coaching recommended\./)).toBeVisible();
  await noOverflow(page);
  if (testInfo.project.name === "phone")
    await page.screenshot({ path: testInfo.outputPath("exercise-details.png"), fullPage: true });
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.getByRole("combobox", { name: "Muscle", exact: true }).selectOption("Adductors");
  await expect(page.getByRole("button", { name: /^Seated Hip Adduction/ })).toBeVisible();
  await page.getByRole("combobox", { name: "Equipment", exact: true }).selectOption("Barbell");
  await expect(page.getByRole("heading", { name: "No exercises found" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).first().click();
  await noOverflow(page);
  if (testInfo.project.name === "phone")
    await page.screenshot({ path: testInfo.outputPath("exercise-library.png"), fullPage: false });
  expect(errors).toEqual([]);
});

test("exercise library failure is visible and retry recovers", async ({ page }) => {
  const { control, errors } = await mockApp(page, { failExercises: true });
  await page.goto("/workout");
  await page.getByRole("tab", { name: "Exercises", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Couldn’t load the exercise library" })
  ).toBeVisible({ timeout: 15000 });
  control.failExercises = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Bench Press Chest/ })).toBeVisible();
  expect(errors).toEqual([]);
});

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  );
}

test("cookie-backed sign-in loads all five tabs without crashes or horizontal scroll", async ({
  page,
}, testInfo) => {
  const { errors } = await mockApp(page);
  for (const [path, heading] of [
    ["/home", /Good (morning|afternoon|evening)/],
    ["/workout", /Workout/],
    ["/nutrition", /Nutrition/],
    ["/progress", /Progress/],
    ["/profile", /Profile/],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    await noOverflow(page);
    if (testInfo.project.name === "phone")
      await page.screenshot({ path: testInfo.outputPath(path.slice(1) + ".png"), fullPage: true });
  }
  expect(errors).toEqual([]);
});

test("appearance changes persist across reload and food selection uses the selected option", async ({
  page,
}, testInfo) => {
  await mockApp(page);
  await page.goto("/profile");
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Light", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/light/);
  if (testInfo.project.name === "phone")
    await page.screenshot({ path: testInfo.outputPath("profile-light.png"), fullPage: true });
  await page.goto("/nutrition");
  await page.getByRole("button", { name: "Add Lunch", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Manual entry/ })
    .click();
  await page.getByRole("dialog").getByRole("button", { name: "Lunch", exact: true }).click();
  await page
    .getByRole("dialog")
    .last()
    .getByRole("button", { name: "Dinner", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Dinner", exact: true })
  ).toBeVisible();
});

test("signed-out users reach branded sign-in instead of a redirect loop", async ({ page }) => {
  const { errors } = await mockApp(page, { signedIn: false });
  await page.goto("/home");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back to Limit" })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("food logging keeps the selected meal and persists one validated entry", async ({ page }) => {
  const { writes, errors } = await mockApp(page);
  await page.goto("/nutrition");
  await page.getByRole("button", { name: "Add Lunch", exact: true }).click();
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: /Manual entry/ }).click();
  await drawer.getByLabel("Food name").fill("Chicken and rice");
  await drawer.getByLabel(/^calories$/i).fill("550");
  await drawer.getByLabel(/^protein \(g\)$/i).fill("42");
  await drawer.getByRole("button", { name: "ADD FOOD", exact: true }).click();
  await expect(drawer).not.toBeVisible();
  await expect(page.getByText("Chicken and rice", { exact: true })).toBeVisible();
  expect(writes.filter((row) => row.entity === "FoodEntry")).toMatchObject([
    { mealType: "Lunch", foodName: "Chicken and rice", calories: 550 },
  ]);
  expect(errors).toEqual([]);
});

test("failed food saves keep the form and permit retry without a false success", async ({
  page,
}) => {
  const { writes } = await mockApp(page, { failFood: true });
  await page.goto("/nutrition");
  await page.getByRole("button", { name: "Add Dinner", exact: true }).click();
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: /Manual entry/ }).click();
  await drawer.getByLabel("Food name").fill("Salmon");
  await drawer.getByLabel(/^calories$/i).fill("300");
  await drawer.getByRole("button", { name: "ADD FOOD", exact: true }).click();
  await expect(
    drawer.getByText("Couldn’t add this food. Check your connection and try again.")
  ).toBeVisible();
  await expect(drawer.getByLabel("Food name")).toHaveValue("Salmon");
  await expect(drawer.getByRole("button", { name: "ADD FOOD", exact: true })).toBeEnabled();
  expect(writes.filter((row) => row.entity === "FoodEntry")).toHaveLength(1);
});

test("a workout set survives reload and finishes only with its saved revision", async ({
  page,
}) => {
  const { writes, errors } = await mockApp(page);
  await page.goto("/live-workout/day");
  await page.getByLabel("Set 1 weight in pounds", { exact: true }).fill("135");
  await page.getByLabel("Set 1 repetitions", { exact: true }).fill("8");
  await page.getByRole("button", { name: "Complete set", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Uncheck set", exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByLabel("Set 1 weight in pounds", { exact: true })).toHaveValue("135");
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByText("Workout complete", { exact: true })).toBeVisible();
  const save = writes.find((row) => row.action === "saveSet");
  const finish = writes.find((row) => row.action === "finish");
  if (!save || !finish) throw new Error("Expected both a saved set and a finish command.");
  expect(finish.expectedSets).toEqual([{ id: "set-1", revision: save.row.operationId }]);
  await noOverflow(page);
  expect(errors).toEqual([]);
});
