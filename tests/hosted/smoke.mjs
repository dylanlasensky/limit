import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const origin = process.env.LIMIT_API_URL || "http://localhost:8787";
const output = process.env.LIMIT_SCREENSHOTS || "/tmp/limit-hosted-screenshots";
const configResponse=await fetch(origin+'/api/config');
assert.ok(configResponse.ok);
const emailEnabled=(await configResponse.json()).emailEnabled===true;
if(emailEnabled)assert.equal(process.env.LIMIT_TEST_ACCOUNTS_DISPOSABLE,'true','Email-enabled acceptance deletes its account; explicitly mark the verified mailbox disposable');
const email = emailEnabled?process.env.LIMIT_TEST_EMAIL_BROWSER:`browser-${crypto.randomUUID()}@example.invalid`,
  password = emailEnabled?process.env.LIMIT_TEST_PASSWORD_BROWSER:crypto.randomUUID() + "Aa1!";
assert.ok(email&&password,'A verified disposable browser test account is required when email is enabled');
let cookie = "";
async function api(path, body) {
  const response = await fetch(origin + "/api" + path, {
    method: body ? "POST" : "GET",
    headers: { cookie, origin, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = await response.json();
  assert.ok(response.ok, `${path}: ${response.status} ${JSON.stringify(value)}`);
  return { value, response };
}
const auth = await api(emailEnabled?"/auth/sign-in/email":"/auth/sign-up/email", emailEnabled?{email,password}:{ name: "Browser test", email, password });
cookie = auth.response.headers
  .getSetCookie()
  .map((v) => v.split(";")[0])
  .join("; ");
const browser = await chromium.launch({ headless: true });
try {
  await api("/entities/UserProfile", {
    name: "Browser test",
    experienceLevel: "beginner",
    equipment: ["Bodyweight"],
    availableDays: ["Monday", "Thursday"],
    sessionLength: 30,
    onboardingComplete: true,
  });
  const exercises = (await api("/entities/Exercise")).value.filter(
    (e) => e.equipment === "Bodyweight" && e.programEligible !== false
  );
  const plan = (
    await api("/entities/WorkoutPlan", { name: "Browser test week", active: false, daysPerWeek: 2 })
  ).value;
  const days = (
    await api(
      "/entities/WorkoutDay/bulkCreate",
      Array.from({ length: 7 }, (_, weekday) => ({
        planId: plan.id,
        name: weekday === 0 || weekday === 3 ? "Full body" : "Rest",
        weekday,
        isRest: weekday !== 0 && weekday !== 3,
      }))
    )
  ).value;
  for (const day of days.filter((d) => !d.isRest))
    for (const [i, e] of exercises.slice(0, 2).entries())
      await api("/entities/WorkoutExercise", {
        workoutDayId: day.id,
        exerciseId: e.id,
        exerciseName: e.name,
        primaryMuscle: e.primaryMuscle,
        order: i,
        sets: 2,
        repMin: 8,
        repMax: 12,
        restSeconds: 60,
      });
  await api("/functions/workoutCommand", { action: "activatePlan", planId: plan.id });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    page = await context.newPage(),
    errors = [],
    hosts = new Set();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => hosts.add(new URL(r.url()).hostname));
  await page.goto(origin + "/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL("**/home");
  await page.getByRole("heading", { name: /Good (morning|afternoon|evening), Browser/ }).waitFor();
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: output + "/home-390.png", fullPage: true });
  await page.goto(origin + "/live-workout/" + days[0].id);
  await page.getByRole("button", { name: "Pause workout", exact: true }).waitFor();
  await page.getByLabel("Set 1 weight in pounds", { exact: true }).fill("0");
  await page.getByLabel("Set 1 repetitions", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Pause workout", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Resume workout", exact: true }).waitFor();
  await page.getByRole("button", { name: "Resume workout", exact: true }).click();
  assert.equal(await page.getByLabel("Set 1 repetitions", { exact: true }).inputValue(), "10");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.getByLabel("Set 1 repetitions", { exact: true }).fill("11");
  await page.reload();
  await page.getByLabel("Set 1 repetitions", { exact: true }).waitFor();
  assert.equal(await page.getByLabel("Set 1 repetitions", { exact: true }).inputValue(), "11");
  await context.setOffline(false);
  await page.reload();
  await page.getByLabel("Set 1 repetitions", { exact: true }).waitFor();
  assert.equal(await page.getByLabel("Set 1 repetitions", { exact: true }).inputValue(), "11");
  for (const width of [320, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `overflow at ${width}`
    );
    await page.screenshot({ path: output + `/workout-${width}.png`, fullPage: true });
  }
  await page.getByRole("button", { name: "Complete set", exact: true }).first().click();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await page.getByText("Workout complete", { exact: false }).first().waitFor({ timeout: 30000 });
  assert.deepEqual(errors, []);
  assert.ok(
    [...hosts].every((host) =>
      [new URL(origin).hostname, "fonts.googleapis.com", "fonts.gstatic.com"].includes(host)
    ),
    `Unexpected network destinations: ${[...hosts].join(", ")}`
  );
  console.log(
    JSON.stringify({
      passed: true,
      checks: [
        "sign-in",
        "pause and reload",
        "offline reload and recovery",
        "set sync",
        "finish",
        "320/390/430/1280 widths",
        "network destinations",
      ],
      hosts: [...hosts],
      screenshots: output,
    })
  );
} finally {
  await browser.close();
  await api("/functions/deleteAccount", { confirm: true });
}
