import { expect, test, type Page } from "@playwright/test";
import { exerciseCatalog } from "../base44/shared/exerciseCatalog.js";

type Row = Record<string, any>;
async function mockApp(
  page: Page,
  {
    signedIn = true,
    failFood = false,
    expandedLibrary = false,
    failExercises = false,
    legacyLibrary = false,
    failPublicSettings = false,
  } = {}
) {
  const control = {
    failExercises,
    failExport: false,
    wrongExportAccount: false,
    failFoodEdit: false,
    failFoodDelete: false,
    failGrocerySave: false,
    failPlan: false,
    failOlderHistory: false,
    failHealth: false,
    failCheckIn: false,
    failTraining: false,
  };
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
    HealthMetric: [],
    DailyCheckIn: [],
    HealthConnection: [],
    HealthPreference: [],
    HealthImport: [],
    MealPlan: [],
    GroceryItem: [],
  };
  const writes: Row[] = [];
  if (expandedLibrary)
    entities.Exercise.push(...exerciseCatalog.map((row) => ({ ...row, id: row.catalogKey })));
  if (legacyLibrary)
    entities.Exercise = exerciseCatalog
      .slice(0, 18)
      .map((row, i) => ({ ...row, id: "legacy-" + i }));
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
      return failPublicSettings
        ? reply({ message: "Unavailable" }, 503)
        : reply({ id: "limit-browser-test", public_settings: {} });
    if (url.pathname.endsWith("/User/me"))
      return reply(signedIn ? user : { message: "Unauthorized" }, signedIn ? 200 : 401);
    if (url.pathname.includes("/functions/exportAccount")) {
      writes.push({ function: "exportAccount" });
      if (control.failExport) return reply({ error: "Unavailable" }, 503);
      return reply({
        schemaVersion: 1,
        account: { id: control.wrongExportAccount ? "not-my-account" : user.id },
        entities,
      });
    }
    if (url.pathname.includes("/functions/askLimitCoach")) {
      writes.push({ function: "askLimitCoach", ...request.postDataJSON() });
      return reply({ answer: "Your last logged workout is ready to review." });
    }
    if (url.pathname.includes("/functions/deleteAccount")) {
      writes.push({ function: "deleteAccount", ...request.postDataJSON() });
      return reply(
        { error: "Account deletion did not finish. Please retry before signing out." },
        503
      );
    }
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
      if (
        (name === "HealthMetric" && control.failHealth) ||
        (name === "DailyCheckIn" && control.failCheckIn)
      )
        return reply({ message: "Temporarily unavailable" }, 503);
      if (request.method() === "GET") {
        if (name === "ExerciseSet" && control.failTraining)
          return reply({ message: "Unavailable" }, 503);
        if (name === "WorkoutPlan" && control.failPlan)
          return reply({ message: "Unavailable" }, 503);
        if (
          name === "WorkoutSession" &&
          control.failOlderHistory &&
          Number(url.searchParams.get("skip") || 0) > 0
        )
          return reply({ message: "Unavailable" }, 503);
        if (name === "Exercise" && control.failExercises)
          return reply({ message: "Unavailable" }, 503);
        if (id)
          return reply(
            rows.find((row) => row.id === id) || {},
            rows.some((row) => row.id === id) ? 200 : 404
          );
        const query = JSON.parse(url.searchParams.get("q") || "{}");
        return reply(
          rows
            .filter((row) =>
              Object.entries(query).every(([key, value]) =>
                value && typeof value === "object" && "$in" in value
                  ? (value.$in as any[]).includes(row[key])
                  : value && typeof value === "object" && ("$gte" in value || "$lte" in value)
                    ? (!("$gte" in value) || row[key] >= (value as any).$gte) &&
                      (!("$lte" in value) || row[key] <= (value as any).$lte)
                    : row[key] === value
              )
            )
            .slice(
              Number(url.searchParams.get("skip") || 0),
              Number(url.searchParams.get("skip") || 0) +
                Number(url.searchParams.get("limit") || rows.length)
            )
        );
      }
      if (request.method() === "POST") {
        const body = request.postDataJSON();
        writes.push({ entity: name, ...body });
        if (name === "FoodEntry" && failFood)
          return reply({ message: "Temporarily unavailable" }, 503);
        const saved = {
          ...body,
          id: "saved-" + writes.length,
          created_by_id: user.id,
          updated_date: new Date().toISOString(),
        };
        entities[name] = [...rows, saved];
        return reply(saved);
      }
      if (request.method() === "PUT" && id) {
        const body = request.postDataJSON();
        writes.push({ entity: name, action: "update", id, ...body });
        if (name === "FoodEntry" && control.failFoodEdit)
          return reply({ message: "Unavailable" }, 503);
        const original = rows.find((row) => row.id === id);
        if (!original) return reply({ message: "Not found" }, 404);
        const saved = { ...original, ...body, updated_date: new Date().toISOString() };
        entities[name] = rows.map((row) => (row.id === id ? saved : row));
        return reply(saved);
      }
      if (request.method() === "DELETE" && id) {
        writes.push({ entity: name, action: "delete", id });
        if (name === "FoodEntry" && control.failFoodDelete)
          return reply({ message: "Unavailable" }, 503);
        entities[name] = rows.filter((row) => row.id !== id);
        return reply({ success: true });
      }
      if (request.method() === "PATCH" && id === "update-many") {
        const body = request.postDataJSON();
        writes.push({ entity: name, action: "updateMany", ...body });
        if (name === "GroceryList" && control.failGrocerySave)
          return reply({ message: "Unavailable" }, 503);
        let updated = 0;
        entities[name] = rows.map((row) => {
          if (!Object.entries(body.query).every(([key, value]) => row[key] === value)) return row;
          updated++;
          return { ...row, ...body.data.$set, updated_date: new Date().toISOString() };
        });
        return reply({ success: true, updated });
      }
    }
    return reply({ error: "Unmocked API request: " + url.pathname }, 500);
  });
  return { writes, errors, control, entities };
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
  await expect(page.getByText("39 results · 365 total", { exact: true })).toBeVisible();
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

function dateAgo(days: number) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return value.toLocaleDateString("en-CA");
}

test("workout previews are read-only until an explicit start", async ({ page }, testInfo) => {
  const { writes, errors } = await mockApp(page);
  await page.goto("/workout");
  await page.getByRole("button", { name: "Preview today’s workout", exact: true }).click();
  const preview = page.getByRole("dialog");
  await expect(preview.getByRole("heading", { name: "Bench Press", exact: true })).toBeVisible();
  await expect(preview.getByText("3 sets × 8-12 reps", { exact: true })).toBeVisible();
  await expect(preview.getByText(/Barbell · Chest · 60s rest/)).toBeVisible();
  expect(writes).toEqual([]);
  await noOverflow(page);
  if (testInfo.project.name === "phone")
    await page.screenshot({ path: testInfo.outputPath("workout-preview.png"), fullPage: true });
  await preview.getByRole("button", { name: "Back to schedule", exact: true }).click();
  expect(writes).toEqual([]);
  await page.getByRole("button", { name: "Light mode", exact: true }).click();
  await page.getByRole("button", { name: "Preview today’s workout", exact: true }).click();
  await noOverflow(page);
  if (testInfo.project.name === "phone")
    await page.screenshot({
      path: testInfo.outputPath("workout-preview-light.png"),
      fullPage: false,
    });
  await preview.getByRole("button", { name: "Start this workout", exact: true }).click();
  await expect(page).toHaveURL(/\/live-workout\/day$/);
  await expect(page.getByLabel("Set 1 weight in pounds", { exact: true })).toBeVisible();
  expect(writes.filter((row) => row.action === "start")).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("history loads beyond 30 sessions, keeps old pages on failure and works without schedule", async ({
  page,
}, testInfo) => {
  const { entities, control, writes, errors } = await mockApp(page);
  entities.WorkoutSession = Array.from({ length: 45 }, (_, i) => ({
    id: `history-${i}`,
    status: "completed",
    name: i === 44 ? "First foundation session" : "Strength session",
    date: dateAgo(i),
    durationMinutes: 45,
    setCount: 12,
    totalVolume: 2500,
    prCount: i === 1 ? 1 : 0,
  }));
  await page.goto("/workout?tab=history");
  await expect(page.getByTestId("history-workout")).toHaveCount(30);
  control.failOlderHistory = true;
  await page.getByRole("button", { name: "Load older workouts", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Couldn’t load more history", {
    timeout: 15000,
  });
  await expect(page.getByTestId("history-workout")).toHaveCount(30);
  await page.getByRole("tab", { name: "Schedule", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Preview today’s workout", exact: true })
  ).toBeVisible();
  await page.getByRole("tab", { name: "History", exact: true }).click();
  control.failOlderHistory = false;
  await page.getByRole("button", { name: "Load older workouts", exact: true }).click();
  await expect(page.getByTestId("history-workout")).toHaveCount(45);
  await page.getByRole("textbox", { name: "Search workout history" }).fill("First foundation");
  await expect(page.getByTestId("history-workout")).toHaveCount(1);
  await page.getByRole("button", { name: "30 days", exact: true }).click();
  await expect(page.getByText("No matching workouts found", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "All dates", exact: true }).click();
  await noOverflow(page);
  if (testInfo.project.name === "phone")
    await page.screenshot({ path: testInfo.outputPath("training-journal.png"), fullPage: true });
  await page.getByTestId("history-workout").click();
  await expect(
    page.getByRole("heading", { name: "First foundation session", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page).toHaveURL(/\/workout\?tab=history$/);
  control.failPlan = true;
  await page.reload();
  await expect(page.getByTestId("history-workout")).toHaveCount(30);
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test("food diary backfills, edits and confirms removal with safe retry", async ({
  page,
}, testInfo) => {
  const { entities, control, writes, errors } = await mockApp(page);
  entities.FoodEntry = [
    {
      id: "food-edit",
      foodName: "Yogurt",
      date: dateAgo(1),
      mealType: "Breakfast",
      quantity: 1,
      unit: "cup",
      calories: 180,
      protein: 12,
      carbs: 20,
      fat: 5,
      estimated: true,
      entryMethod: "scan_meal",
    },
  ];
  await page.goto("/nutrition");
  await expect(page.getByRole("button", { name: "Next diary day" })).toBeDisabled();
  await page.getByRole("button", { name: "Previous diary day" }).click();
  await expect(page.getByLabel("Choose diary date")).toHaveValue(dateAgo(1));
  await page.getByRole("button", { name: "Edit Yogurt", exact: true }).click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Food name", { exact: true }).fill("Greek yogurt");
  await editor.getByLabel("calories", { exact: true }).fill("200");
  control.failFoodEdit = true;
  await editor.getByRole("button", { name: "Save food changes" }).click();
  await expect(editor.getByRole("alert")).toContainText("Couldn’t save");
  await expect(editor.getByLabel("Food name", { exact: true })).toHaveValue("Greek yogurt");
  control.failFoodEdit = false;
  await editor.getByRole("button", { name: "Save food changes" }).click();
  await expect(editor).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Greek yogurt", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Greek yogurt", exact: true })).toBeFocused();
  expect(entities.FoodEntry[0]).toMatchObject({
    calories: 200,
    estimated: true,
    entryMethod: "scan_meal",
    date: dateAgo(1),
  });
  await page.getByRole("button", { name: "Add Lunch", exact: true }).click();
  await editor.getByRole("button", { name: /Manual entry/ }).click();
  await editor.getByLabel("Food name", { exact: true }).fill("Chicken and rice");
  await editor.getByLabel(/^calories$/i).fill("500");
  await editor.getByRole("button", { name: "ADD FOOD", exact: true }).click();
  await expect(editor).not.toBeVisible();
  expect(writes.find((row) => row.foodName === "Chicken and rice")).toMatchObject({
    date: dateAgo(1),
    mealType: "Lunch",
  });
  await expect(page.getByRole("button", { name: "Add Lunch", exact: true })).toBeFocused();
  await noOverflow(page);
  if (testInfo.project.name === "phone")
    await page.screenshot({ path: testInfo.outputPath("food-diary.png"), fullPage: true });
  await page.getByRole("button", { name: "Light mode", exact: true }).click();
  await page.getByRole("button", { name: "Edit Greek yogurt", exact: true }).click();
  await noOverflow(page);
  if (testInfo.project.name === "phone")
    await page.screenshot({ path: testInfo.outputPath("food-editor-light.png"), fullPage: false });
  await editor.getByRole("button", { name: "Remove from diary" }).click();
  expect(writes.filter((row) => row.action === "delete")).toHaveLength(0);
  control.failFoodDelete = true;
  await editor.getByRole("button", { name: "Confirm removal" }).click();
  await expect(editor.getByRole("alert")).toContainText("Couldn’t confirm removal");
  control.failFoodDelete = false;
  await editor.getByRole("button", { name: "Confirm removal" }).click();
  await expect(editor).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Greek yogurt", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Log food", exact: true })).toBeFocused();
  await page.reload();
  await page.getByRole("button", { name: "Previous diary day" }).click();
  await expect(
    page.getByRole("button", { name: "Edit Chicken and rice", exact: true })
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("food drawers restore keyboard focus after cancel and moving an entry", async ({ page }) => {
  const { entities, writes, errors } = await mockApp(page);
  entities.FoodEntry = [
    {
      id: "focus-food",
      foodName: "Oats",
      date: dateAgo(0),
      mealType: "Breakfast",
      quantity: 1,
      unit: "cup",
      calories: 150,
      protein: 5,
      carbs: 27,
      fat: 3,
    },
  ];
  await page.goto("/nutrition");
  const lunch = page.getByRole("button", { name: "Add Lunch", exact: true });
  const logFood = page.getByRole("button", { name: "Log food", exact: true });
  const oats = page.getByRole("button", { name: "Edit Oats", exact: true });
  const dialog = page.getByRole("dialog");
  await lunch.focus();
  await lunch.press("Enter");
  await dialog.getByRole("button", { name: "Close add food" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(lunch).toBeFocused();
  await logFood.focus();
  await logFood.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close add food" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(logFood).toBeFocused();
  await oats.focus();
  await oats.press("Enter");
  await expect(dialog.getByRole("button", { name: "Close food editor" })).toBeFocused();
  await dialog.getByRole("button", { name: "Close food editor" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(oats).toBeFocused();
  expect(writes).toEqual([]);
  await oats.press("Enter");
  await dialog.getByLabel("Diary date", { exact: true }).fill(dateAgo(1));
  await dialog.getByRole("button", { name: "Save food changes" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(oats).toHaveCount(0);
  await expect(logFood).toBeFocused();
  expect(entities.FoodEntry[0].date).toBe(dateAgo(1));
  expect(errors).toEqual([]);
});

test("strength trends show ordinary workouts without PRs and switch display units", async ({
  page,
}, testInfo) => {
  const { entities, writes, errors } = await mockApp(page);
  entities.WorkoutSession = [
    { id: "strength-new", status: "completed", name: "Upper B", date: dateAgo(1) },
    { id: "strength-old", status: "completed", name: "Upper A", date: dateAgo(5) },
  ];
  entities.ExerciseSet = [
    {
      id: "s1",
      workoutSessionId: "strength-old",
      exerciseId: "bench",
      exerciseName: "Bench Press",
      completed: true,
      setType: "working",
      weight: 135,
      reps: 8,
      setNumber: 1,
    },
    {
      id: "s2",
      workoutSessionId: "strength-new",
      exerciseId: "bench",
      exerciseName: "Bench Press",
      completed: true,
      setType: "working",
      weight: 150,
      reps: 6,
      setNumber: 1,
    },
    {
      id: "warmup",
      workoutSessionId: "strength-new",
      exerciseId: "bench",
      exerciseName: "Bench Press",
      completed: true,
      setType: "warmup",
      weight: 1000,
      reps: 1,
      setNumber: 0,
    },
  ];
  await page.goto("/progress?tab=strength");
  await expect(page.getByRole("heading", { name: "Every session tells a story" })).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Heaviest load across 2 sessions. Latest 150 lb/ })
  ).toBeVisible();
  await page.getByRole("button", { name: "Display strength in kilograms" }).click();
  await expect(page.getByRole("img", { name: /Latest 68 kg/ })).toBeVisible();
  await page.getByRole("button", { name: "Volume", exact: true }).click();
  await expect(page.getByRole("img", { name: /Volume across 2 sessions/ })).toBeVisible();
  await noOverflow(page);
  if (testInfo.project.name === "phone")
    await page.screenshot({ path: testInfo.outputPath("strength-trends.png"), fullPage: true });
  await page.getByRole("button", { name: "Light mode", exact: true }).click();
  await noOverflow(page);
  if (testInfo.project.name === "phone")
    await page.screenshot({
      path: testInfo.outputPath("strength-trends-light.png"),
      fullPage: true,
    });
  await page.getByRole("button", { name: /Open Upper B on/ }).click();
  await expect(page).toHaveURL(/\/workout\/history\/strength-new$/);
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test("grocery lists restore checkmarks and retain the saved list on failed writes", async ({
  page,
}, testInfo) => {
  const { entities, control, writes, errors } = await mockApp(page);
  const monday = dateAgo((new Date().getDay() + 6) % 7);
  entities.GroceryList = [
    {
      id: "groceries",
      created_by_id: "qa-user",
      updated_date: "2026-09-01T12:00:00Z",
      weekStart: monday,
      sourceMealIds: [],
      items: [
        { name: "Rice", qty: 2, unit: "recipe portion(s)", category: "Grains", checked: false },
        { name: "Chicken", qty: 1, unit: "recipe portion(s)", category: "Protein", checked: true },
      ],
    },
  ];
  await page.goto("/nutrition");
  await page.getByRole("tab", { name: "Meal Ideas", exact: true }).click();
  const list = page.getByRole("region", { name: "Saved grocery list" });
  await expect(list.getByRole("checkbox", { name: /Chicken/ })).toBeChecked();
  control.failGrocerySave = true;
  await list.getByRole("checkbox", { name: /Rice/ }).click();
  await expect(list.getByRole("alert")).toBeVisible();
  await expect(list.getByRole("checkbox", { name: /Rice/ })).not.toBeChecked();
  control.failGrocerySave = false;
  await list.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(list.getByRole("checkbox", { name: /Rice/ })).toBeChecked();
  await page.reload();
  await page.getByRole("tab", { name: "Meal Ideas", exact: true }).click();
  await expect(list.getByText("2 of 2 ingredients checked", { exact: true })).toBeVisible();
  await noOverflow(page);
  if (testInfo.project.name === "phone")
    await list.screenshot({ path: testInfo.outputPath("saved-groceries.png") });
  expect(entities.GroceryList).toHaveLength(1);
  expect(
    writes.filter((row) => row.entity === "GroceryList").every((row) => row.action === "updateMany")
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("exercise library failure keeps all references visible and retry reconnects saved rows", async ({
  page,
}) => {
  const { control, errors } = await mockApp(page, { failExercises: true });
  await page.goto("/workout");
  await page.getByRole("tab", { name: "Exercises", exact: true }).click();
  await expect(page.getByText("365 total exercises", { exact: true })).toBeVisible();
  await expect(page.getByText(/Saved exercise data couldn’t load/)).toBeVisible({ timeout: 15000 });
  control.failExercises = false;
  await page.getByRole("button", { name: "Retry saved exercises", exact: true }).click();
  await page.getByRole("textbox", { name: "Search exercises", exact: true }).fill("Bench Press");
  await expect(page.getByRole("button", { name: /^Bench Press Chest/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("18 saved exercises still expose the entire catalog with persistent favorites", async ({
  page,
}) => {
  const { writes, errors } = await mockApp(page, { legacyLibrary: true });
  await page.goto("/workout?tab=exercises");
  await expect(page.getByText("365 total exercises", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show all 365 results", exact: true }).click();
  await expect(page.getByTestId("exercise-row")).toHaveCount(365);
  await expect(page.getByText("365 results · 365 total", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Search exercises", exact: true }).fill("Zottman Curl");
  await page.getByRole("button", { name: "Favorite Zottman Curl", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /^Favorites · 1$/ }).click();
  await expect(page.getByRole("button", { name: /^Zottman Curl Biceps/ })).toBeVisible();
  await page.getByRole("button", { name: /^Zottman Curl Biceps/ }).click();
  await expect(page.getByRole("dialog").getByText(/Reference preview/)).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await noOverflow(page);
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test("light and dark controls work on every main screen without horizontal overflow", async ({
  page,
}, testInfo) => {
  const { errors } = await mockApp(page, { expandedLibrary: true });
  for (const mode of ["light", "dark"]) {
    await page.goto("/home");
    await page
      .getByRole("button", { name: mode === "light" ? "Light mode" : "Dark mode", exact: true })
      .click();
    for (const path of ["/home", "/workout?tab=exercises", "/nutrition", "/progress", "/profile"]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveClass(new RegExp(mode));
      await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
      const logo = page.getByRole("link", { name: "LIMIT home" }).locator("img");
      await expect(logo).toHaveAttribute("src", "/brand/limit-icon-192.png");
      await expect(logo).toBeVisible();
      await expect(logo).toHaveJSProperty("naturalWidth", 192);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await noOverflow(page);
      if (testInfo.project.name === "phone")
        await page.screenshot({
          path: testInfo.outputPath(mode + "-" + path.split("?")[0].slice(1) + ".png"),
          fullPage: false,
        });
    }
  }
  expect(errors).toEqual([]);
});

test("legacy muscles and duplicate saved IDs stay discoverable in recent exercise history", async ({
  page,
}) => {
  const { entities, errors } = await mockApp(page, { expandedLibrary: true });
  const bench = exerciseCatalog.find((row) => row.name === "Barbell Bench Press")!;
  const lat = exerciseCatalog.find((row) => row.name === "Lat Pulldown")!;
  entities.Exercise.unshift({
    ...lat,
    id: "old-lat",
    catalogKey: undefined,
    primaryMuscle: "Back",
  });
  entities.ExerciseSet = [
    { id: "one", exerciseId: bench.catalogKey, completed: true, timestamp: "2026-09-14T11:00:00Z" },
    { id: "two", exerciseId: lat.catalogKey, completed: true, timestamp: "2026-09-14T12:00:00Z" },
  ];
  await page.goto("/workout?tab=exercises");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("textbox", { name: "Search exercises", exact: true }).fill("Lat Pulldown");
  await expect(page.getByRole("button", { name: /^Lat Pulldown Back/ })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.getByRole("button", { name: "Recent", exact: true }).click();
  await expect(page.getByTestId("exercise-row")).toHaveCount(2);
  await expect(page.getByTestId("exercise-row").first()).toContainText("Lat Pulldown");
  await page.getByRole("combobox", { name: "Sort", exact: true }).selectOption("name");
  await expect(page.getByTestId("exercise-row").first()).toContainText("Bench Press");
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
    ["/progress", /Health/],
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

test("optional health data stays concise while training, body, and recovery remain discoverable", async ({
  page,
}) => {
  const { entities, errors } = await mockApp(page);
  const today = new Date().toLocaleDateString("en-CA");
  entities.HealthMetric = [
    {
      id: "steps",
      date: today,
      metric: "steps",
      value: 8234,
      unit: "steps",
      source: "health_connect",
      aggregation: "daily",
    },
    {
      id: "sleep",
      date: today,
      metric: "sleep_duration",
      value: 455,
      unit: "min",
      source: "health_connect",
      aggregation: "daily",
    },
  ];
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Health", exact: true })).toBeVisible();
  await expect(page.getByText("8,234", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("7h 35m", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/browser cannot read Apple Health/i)).toBeVisible();
  await noOverflow(page);

  await page.getByRole("tab", { name: "Training", exact: true }).click();
  await expect(page.getByRole("button", { name: "Strength trends" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Muscle balance" })).toBeVisible();
  await page.getByRole("tab", { name: "Body", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add body metrics" })).toBeVisible();
  await page.getByRole("tab", { name: "Recovery", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Seven-night sleep" })).toBeVisible();
  await noOverflow(page);
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
  await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
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

test("health logging stays focused, preserves dates and edits existing daily records", async ({
  page,
}, testInfo) => {
  const { entities, errors } = await mockApp(page);
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const yesterday = date.toLocaleDateString("en-CA");
  await page.goto(`/progress?date=${yesterday}`);
  await expect(page.getByLabel("Health date", { exact: true })).toHaveValue(yesterday);
  await page.getByRole("button", { name: "Add activity or sleep", exact: true }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("tab", { name: "Activity", exact: true })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(drawer.getByLabel("Steps (steps)", { exact: true })).toBeVisible();
  await expect(drawer.getByLabel("Sleep (hours)", { exact: true })).toBeHidden();
  await drawer.getByLabel("Steps (steps)", { exact: true }).fill("4321");
  await drawer.getByRole("tab", { name: "Sleep", exact: true }).click();
  await drawer.getByLabel("Sleep (hours)", { exact: true }).fill("7.5");
  await expect(drawer.getByLabel("Steps (steps)", { exact: true })).toBeHidden();
  await noOverflow(page);
  if (testInfo.project.name === "phone")
    await page.screenshot({ path: testInfo.outputPath("health-sleep-log.png"), fullPage: false });
  await drawer.getByRole("button", { name: "Save health metrics", exact: true }).click();
  await expect(drawer).toBeHidden();
  expect(entities.HealthMetric).toHaveLength(2);
  expect(entities.HealthMetric.find((row) => row.metric === "steps")).toMatchObject({
    date: yesterday,
    value: 4321,
    source: "manual",
  });
  expect(entities.HealthMetric.find((row) => row.metric === "sleep_duration")).toMatchObject({
    date: yesterday,
    value: 450,
    unit: "min",
  });
  await page.reload();
  await expect(page.getByText("4,321", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("7h 30m", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Add activity or sleep", exact: true }).click();
  await expect(drawer.getByLabel("Steps (steps)", { exact: true })).toHaveValue("4321");
  await drawer.getByLabel("Steps (steps)", { exact: true }).fill("5000");
  await drawer.getByRole("button", { name: "Save health metrics", exact: true }).click();
  await expect(drawer).toBeHidden();
  expect(entities.HealthMetric).toHaveLength(2);
  expect(entities.HealthMetric.filter((row) => row.metric === "steps")).toHaveLength(1);
  expect(entities.HealthMetric.find((row) => row.metric === "steps")?.value).toBe(5000);

  await page.getByRole("button", { name: /How did you feel\?/ }).click();
  await drawer.getByRole("button", { name: "Energy 4 of 5", exact: true }).click();
  await drawer.getByRole("button", { name: "Save check-in", exact: true }).click();
  await expect(drawer).toBeHidden();
  await page.getByRole("button", { name: /Your check-in/ }).click();
  await expect(drawer.getByRole("button", { name: "Energy 4 of 5", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await drawer.getByRole("button", { name: "Energy 4 of 5", exact: true }).click();
  await drawer.getByRole("button", { name: "Mood 3 of 5", exact: true }).click();
  await drawer.getByRole("button", { name: "Update check-in", exact: true }).click();
  await expect(drawer).toBeHidden();
  expect(entities.DailyCheckIn).toHaveLength(1);
  expect(entities.DailyCheckIn[0]).toMatchObject({ date: yesterday, energy: null, mood: 3 });
  await page.reload();
  await page.getByRole("button", { name: /Your check-in/ }).click();
  await expect(drawer.getByRole("button", { name: "Energy 4 of 5", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
  await expect(drawer.getByRole("button", { name: "Mood 3 of 5", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await drawer.getByRole("button", { name: "Close daily check-in", exact: true }).click();
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("health and training failures stay within their own views and retry preserves saved data", async ({
  page,
}) => {
  test.setTimeout(90000);
  const { control, entities, errors } = await mockApp(page);
  const today = new Date().toLocaleDateString("en-CA");
  entities.HealthMetric = [
    {
      id: "today-steps",
      date: today,
      metric: "steps",
      value: 8123,
      unit: "steps",
      source: "manual",
      aggregation: "daily",
    },
  ];
  control.failTraining = true;
  await page.goto("/progress");
  await expect(page.getByText("8,123", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Training", exact: true }).click();
  await expect(page.getByText("Couldn’t load training history", { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole("tab", { name: "Today", exact: true }).click();
  await expect(page.getByText("8,123", { exact: true })).toBeVisible();
  control.failTraining = false;
  control.failHealth = true;
  await page.reload();
  await expect(page.getByText("Couldn’t load health data", { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole("tab", { name: "Training", exact: true }).click();
  await expect(page.getByRole("button", { name: "Strength trends", exact: true })).toBeVisible();
  control.failHealth = false;
  control.failCheckIn = true;
  await page.goto("/progress");
  await expect(page.getByText("Couldn’t load health data", { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByRole("button", { name: /How do you feel\?/ })).toBeHidden();
  control.failCheckIn = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("8,123", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /How do you feel\?/ })).toBeVisible();
  expect(entities.HealthMetric).toHaveLength(1);
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("body measurements normalize imported units and keep manual edits visible", async ({
  page,
}, testInfo) => {
  const { entities, errors } = await mockApp(page);
  const today = new Date().toLocaleDateString("en-CA");
  entities.HealthMetric = [
    {
      id: "scale-weight",
      date: today,
      metric: "weight",
      value: 80,
      unit: "kg",
      source: "withings",
      aggregation: "daily",
    },
  ];
  await page.goto("/progress?tab=body");
  await expect(page.getByText("176.4 lb", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Add body metrics", exact: true }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByLabel("Weight (lb)", { exact: true })).toHaveValue("");
  await drawer.getByLabel("Weight (lb)", { exact: true }).fill("180");
  await drawer.getByLabel("Body fat (%)", { exact: true }).fill("20");
  await drawer.getByLabel("Waist (in)", { exact: true }).fill("34");
  await drawer.getByText("More measurements", { exact: true }).click();
  await drawer.getByLabel("Bone mass (lb)", { exact: true }).fill("7");
  await drawer.getByLabel("Hips (in)", { exact: true }).fill("38");
  await noOverflow(page);
  if (testInfo.project.name === "phone")
    await page.screenshot({ path: testInfo.outputPath("body-log.png"), fullPage: false });
  await drawer.getByRole("button", { name: "Save body metrics", exact: true }).click();
  await expect(drawer).toBeHidden();
  await page.reload();
  await expect(page.getByText("180 lb", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("34 in", { exact: true })).toBeVisible();
  await page.getByText("More measurements", { exact: true }).click();
  await expect(page.getByText("38 in", { exact: true })).toBeVisible();
  expect(entities.WeightEntry).toHaveLength(1);
  expect(entities.HealthMetric).toHaveLength(5);
  await page.getByRole("button", { name: "Add body metrics", exact: true }).click();
  await expect(drawer.getByLabel("Weight (lb)", { exact: true })).toHaveValue("180");
  await expect(drawer.getByLabel("Waist (in)", { exact: true })).toHaveValue("34");
  await drawer.getByRole("button", { name: "Close body metrics", exact: true }).click();
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("health preferences select one source, hide metrics and remove only health records", async ({
  page,
}) => {
  const { entities, errors } = await mockApp(page);
  const today = new Date().toLocaleDateString("en-CA");
  entities.HealthMetric = [
    {
      id: "manual-steps",
      date: today,
      metric: "steps",
      value: 6000,
      unit: "steps",
      source: "manual",
      aggregation: "daily",
      created_by_id: "qa-user",
    },
    {
      id: "ring-steps",
      date: today,
      metric: "steps",
      value: 7000,
      unit: "steps",
      source: "oura",
      aggregation: "daily",
      created_by_id: "qa-user",
    },
  ];
  entities.WeightEntry = [
    { id: "weight", date: today, weight: 175, unit: "lb", created_by_id: "qa-user" },
  ];
  entities.BodyMeasurement = [{ id: "legacy-body", date: today, created_by_id: "qa-user" }];
  await page.goto("/progress?tab=body");
  await expect(page.getByText("175 lb", { exact: true }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Today", exact: true }).click();
  await expect(page.getByText("6,000", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Health settings & data", exact: true }).click();
  const drawer = page.getByRole("dialog");
  await drawer.getByText("Preferred sources · optional", { exact: true }).click();
  await drawer.getByLabel("Preferred source for Steps", { exact: true }).selectOption("oura");
  await drawer.getByRole("button", { name: "Save health preferences", exact: true }).click();
  await expect(drawer.getByText("Health preferences saved.", { exact: true })).toBeVisible();
  await drawer.getByRole("button", { name: "Close health settings", exact: true }).click();
  await expect(page.getByText("7,000", { exact: true })).toBeVisible();
  await expect(page.getByText("6,000", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Health settings & data", exact: true }).click();
  await drawer.getByText("Metric visibility", { exact: true }).click();
  await drawer.getByLabel("Show Steps", { exact: true }).uncheck();
  await drawer.getByRole("button", { name: "Save health preferences", exact: true }).click();
  await expect(drawer.getByText("Health preferences saved.", { exact: true })).toBeVisible();
  await drawer.getByRole("button", { name: "Close health settings", exact: true }).click();
  await expect(page.getByText("7,000", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Health settings & data", exact: true }).click();
  await drawer.getByText("Remove health data", { exact: true }).click();
  await drawer.getByRole("button", { name: "Delete health data from LIMIT", exact: true }).click();
  await drawer.getByRole("checkbox", { name: /I understand which records/ }).check();
  await drawer.getByRole("button", { name: "Confirm health data deletion", exact: true }).click();
  await expect(drawer.getByText(/Health records removed from LIMIT/)).toBeVisible();
  expect(entities.HealthMetric).toHaveLength(0);
  expect(entities.WeightEntry).toHaveLength(0);
  expect(entities.BodyMeasurement).toHaveLength(0);
  expect(entities.HealthPreference).toHaveLength(1);
  expect(entities.UserProfile).toHaveLength(1);
  expect(entities.WorkoutPlan).toHaveLength(1);
  await drawer.getByRole("button", { name: "Close health settings", exact: true }).click();
  await page.getByRole("tab", { name: "Body", exact: true }).click();
  await expect(page.getByText("175 lb", { exact: true })).toBeHidden();
  await expect(page.getByText(/Your measurements will appear here/)).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("Profile reveals one settings section at a time and keeps edits while switching", async ({
  page,
}, testInfo) => {
  const { entities, writes, errors } = await mockApp(page);
  await page.goto("/profile#nutrition");
  await expect(
    page.getByRole("button", { name: "Nutrition settings", exact: true })
  ).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("Name", { exact: true })).toBeHidden();
  await page
    .getByLabel("Other foods to avoid, separated by commas", { exact: true })
    .fill("Mushrooms, olives");
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeEnabled();
  if (testInfo.project.name === "phone" || testInfo.project.name === "small-phone")
    await page.screenshot({ path: testInfo.outputPath("profile-nutrition.png"), fullPage: false });
  await page.getByRole("button", { name: "About you settings", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Jordan Taylor");
  await page.getByRole("button", { name: "Nutrition settings", exact: true }).click();
  await expect(
    page.getByLabel("Other foods to avoid, separated by commas", { exact: true })
  ).toHaveValue("Mushrooms, olives");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeDisabled();
  expect(entities.UserProfile[0].name).toBe("Jordan Taylor");
  expect(entities.DietaryProfile[0].foodsToAvoid).toEqual(["Mushrooms", "olives"]);
  expect(
    writes.some((row) => row.entity === "WorkoutPlan" || row.function === "createPersonalizedPlan")
  ).toBe(false);
  await noOverflow(page);
  expect(errors).toEqual([]);
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

test("public information and the full exercise library work without sign-in or auth services", async ({
  page,
}, testInfo) => {
  const { writes, errors } = await mockApp(page, { signedIn: false, failPublicSettings: true });
  for (const [path, title] of [
    ["/privacy", "Your privacy"],
    ["/terms", "Using LIMIT safely"],
    ["/support", "Help & support"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByText(/Pre-release information:/)).toBeVisible();
    await noOverflow(page);
  }
  await page.goto("/exercises");
  await expect(page.getByText("365 total exercises", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show all 365 results", exact: true }).click();
  await expect(page.getByTestId("exercise-row")).toHaveCount(365);
  await expect(page.getByRole("navigation", { name: "Exercise collections" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Favorite / })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search exercises", exact: true }).fill("Zottman Curl");
  await page.getByRole("button", { name: /^Zottman Curl Biceps/ }).click();
  await expect(page.getByRole("dialog").getByText(/Sign in to select movements/)).toBeVisible();
  await noOverflow(page);
  if (testInfo.project.name === "phone")
    await page.screenshot({ path: testInfo.outputPath("public-library.png"), fullPage: true });
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test("account export is explicit, private, downloadable and rejects failure or wrong identity", async ({
  page,
}) => {
  const { control, errors } = await mockApp(page);
  await page.goto("/profile");
  await page.getByRole("button", { name: "Account settings", exact: true }).click();
  await expect(page.getByRole("link", { name: "Privacy", exact: true })).toBeVisible();
  control.failExport = true;
  await page.getByRole("button", { name: "Export my data", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Couldn’t prepare your complete export");
  await expect(page.getByRole("link", { name: "Download data file" })).toHaveCount(0);
  control.failExport = false;
  control.wrongExportAccount = true;
  await page.getByRole("button", { name: "Export my data", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Couldn’t prepare your complete export");
  await expect(page.getByRole("link", { name: "Download data file" })).toHaveCount(0);
  control.wrongExportAccount = false;
  await page.getByRole("button", { name: "Export my data", exact: true }).click();
  const link = page.getByRole("link", { name: "Download data file" });
  await expect(link).toBeVisible();
  const data = await link.evaluate(async (element: HTMLAnchorElement) =>
    (await fetch(element.href)).json()
  );
  expect(data.account.id).toBe("qa-user");
  expect(data.entities.UserProfile[0].name).toBe("Jordan");
  const downloadPromise = page.waitForEvent("download");
  await link.click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^limit-data-.*\.json$/);
  await page.getByRole("button", { name: "Delete account", exact: true }).click();
  await page.getByRole("button", { name: "Permanently delete account", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("did not finish");
  await expect(
    page.getByRole("button", { name: "Permanently delete account", exact: true })
  ).toBeEnabled();
  await page.getByRole("button", { name: "Keep my account", exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  expect(errors).toEqual([]);
});

test("Coach, photo scanning and import require optional consent and retain manual alternatives", async ({
  page,
}) => {
  const { writes, errors } = await mockApp(page);
  await page.goto("/home");
  await page.getByRole("button", { name: "Open LIMIT Coach" }).click();
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("textbox", { name: "Ask LIMIT Coach" }).fill("What did I log?");
  await expect(drawer.getByRole("button", { name: "Send question" })).toBeDisabled();
  await expect(
    drawer.getByRole("checkbox", { name: "Allow this AI data sharing" })
  ).not.toBeChecked();
  await drawer.getByRole("checkbox", { name: "Allow this AI data sharing" }).check();
  await drawer.getByRole("button", { name: "Send question" }).click();
  await expect(drawer.getByRole("status")).toContainText("Your last logged workout");
  expect(writes.filter((row) => row.function === "askLimitCoach")).toMatchObject([
    { aiConsent: "openai-v1", question: "What did I log?" },
  ]);
  await drawer.getByRole("button", { name: "Close coach" }).click();
  await page.getByRole("button", { name: "Open LIMIT Coach" }).click();
  await expect(
    drawer.getByRole("checkbox", { name: "Allow this AI data sharing" })
  ).not.toBeChecked();
  await drawer.getByRole("button", { name: "Close coach" }).click();
  await page.goto("/nutrition");
  await page.getByRole("button", { name: "Add Lunch", exact: true }).click();
  await drawer.getByRole("button", { name: /Nutrition label/ }).click();
  await expect(drawer.getByLabel("Camera", { exact: true })).toBeDisabled();
  await expect(drawer.getByLabel("Photo Library", { exact: true })).toBeDisabled();
  await drawer.getByRole("checkbox", { name: "Allow this AI data sharing" }).check();
  await expect(drawer.getByLabel("Camera", { exact: true })).toBeEnabled();
  await drawer.getByRole("checkbox", { name: "Allow this AI data sharing" }).uncheck();
  await expect(drawer.getByLabel("Camera", { exact: true })).toBeDisabled();
  await page.goto("/workout/import");
  await page.getByRole("textbox", { name: "Workout program text" }).fill("Monday: Squat 3 x 5");
  await expect(page.getByRole("button", { name: "PARSE REGIMEN", exact: true })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Allow this AI data sharing" }).check();
  await expect(page.getByRole("button", { name: "PARSE REGIMEN", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: /Build manually/ }).click();
  await expect(page.getByRole("button", { name: "BUILD MY SPLIT", exact: true })).toBeEnabled();
  await expect(page.getByRole("checkbox", { name: "Allow this AI data sharing" })).toHaveCount(0);
  await noOverflow(page);
  expect(writes.filter((row) => row.function !== "askLimitCoach")).toEqual([]);
  expect(errors).toEqual([]);
});
