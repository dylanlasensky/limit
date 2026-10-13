const id = (name) => ({ id: name });
const scroll = (name, direction = "DOWN") => ({
  scrollUntilVisible: { element: id(name), direction, timeout: 15000, centerElement: true },
});
const textScroll = (text, direction = "UP") => ({
  scrollUntilVisible: { element: { text }, direction, timeout: 15000 },
});
const tap = (name) => ({ tapOn: id(name) });
const edit = (name, value) => [
  scroll(name),
  tap(name),
  { eraseText: 100 },
  { inputText: value },
  "hideKeyboard",
];
const link = (path) => [
  { openLink: "limit://" + path },
  {
    runFlow: {
      when: { visible: "Open in.*LIMIT.*" },
      // Select Open only after the named system sheet has had time to settle.
      // A successful wait is not acceptance: the following assertion must see it gone.
      commands: [
        { waitForAnimationToEnd: { timeout: 5000 } },
        { tapOn: { text: "Open", retryTapIfNoChange: true } },
      ],
    },
  },
  { assertNotVisible: "Open in.*LIMIT.*" },
];
const login = (who) => [
  { assertVisible: "Welcome back." },
  tap("input-email"),
  { inputText: "${MAESTRO_" + who + "_EMAIL}" },
  {
    assertVisible: {
      id: "input-email",
      // Pinned Maestro uses Kotlin Regex; quote the full fixture for exact matching.
      text: "\\Q${MAESTRO_" + who + "_EMAIL}\\E",
    },
  },
  tap("input-password-at-least-12-characters"),
  { inputText: "${MAESTRO_" + who + "_PASSWORD}" },
  // Page's handled-tap ScrollView dismisses input on this noninteractive heading.
  // Maestro's iOS hideKeyboard swipe failed before submission on the verified run.
  { tapOn: "Welcome back." },
  { assertVisible: { id: "action-sign-in", enabled: true } },
  { tapOn: { id: "action-sign-in", enabled: true } },
  {
    extendedWaitUntil: {
      visible: "Hi, Native" + (who === "ALPHA" ? "Alpha" : "Beta") + ".",
      timeout: 30000,
    },
  },
];
const shot = (name) => ({ takeScreenshot: name });
const alphaWorkout = () => link("workout/${MAESTRO_ALPHA_DAY}");
const loggedReps = (value) => [
  scroll("input-repetitions"),
  { assertVisible: { id: "input-repetitions", text: value } },
];
export function behaviorFlows() {
  return {
    "01-auth-and-save": [
      { extendedWaitUntil: { visible: "Welcome back.", timeout: 30000 } },
      ...alphaWorkout(),
      ...login("ALPHA"),
      { assertVisible: "NativeAlpha plan" },
      shot("01-alpha-account"),
      ...alphaWorkout(),
      { extendedWaitUntil: { visible: "NativeAlpha workout", timeout: 30000 } },
      ...edit("input-weight", "0"),
      ...edit("input-repetitions", "10"),
      scroll("action-complete-set"),
      tap("action-complete-set"),
      textScroll("All completed sets synced"),
      { assertVisible: "All completed sets synced" },
      shot("02-saved-set"),
    ],
    "02-background-relaunch": [
      ...edit("input-repetitions", "11"),
      { pressKey: "home" },
      { launchApp: { stopApp: false, permissions: { all: "deny" } } },
      ...loggedReps("11"),
      "stopApp",
      { launchApp: { permissions: { all: "deny" } } },
      ...alphaWorkout(),
      ...loggedReps("11"),
      scroll("action-pause-workout", "UP"),
      tap("action-pause-workout"),
      { pressKey: "home" },
      { launchApp: { stopApp: false, permissions: { all: "deny" } } },
      { assertVisible: id("action-resume-workout") },
      tap("action-resume-workout"),
      ...loggedReps("11"),
      shot("03-recovered-draft"),
    ],
    "03-finish": [
      ...alphaWorkout(),
      ...loggedReps("11"),
      scroll("action-retry-sync"),
      tap("action-retry-sync"),
      textScroll("All completed sets synced"),
      { assertVisible: "All completed sets synced" },
      ...edit("input-repetitions", "13"),
      scroll("action-finish-workout"),
      { doubleTapOn: id("action-finish-workout") },
      {
        extendedWaitUntil: {
          visible: "Consistency comes from a plan you can repeat.",
          timeout: 30000,
        },
      },
      ...link("history"),
      { extendedWaitUntil: { visible: "NativeAlpha workout", timeout: 30000 } },
      { tapOn: "View NativeAlpha workout.*" },
      { extendedWaitUntil: { visible: "Set 1: 13 reps.*complete", timeout: 30000 } },
      shot("05-completed-workout"),
    ],
    "04-prepare-private-draft": [
      ...link("workout/${MAESTRO_ALPHA_DRAFT_DAY}"),
      { extendedWaitUntil: { visible: "NativeAlpha workout", timeout: 30000 } },
      ...edit("input-weight", "0"),
      ...edit("input-repetitions", "17"),
      ...loggedReps("17"),
      "stopApp",
      { launchApp: { permissions: { all: "deny" } } },
      ...link("workout/${MAESTRO_ALPHA_DRAFT_DAY}"),
      ...loggedReps("17"),
      scroll("input-weight", "UP"),
      { assertVisible: { id: "input-weight", text: "0" } },
      ...loggedReps("17"),
      shot("06-unfinished-alpha-draft"),
    ],
    "05-account-isolation": [
      ...link(""),
      scroll("action-sign-out"),
      tap("action-sign-out"),
      ...link("history/${MAESTRO_ALPHA_SESSION}"),
      { assertVisible: "Welcome back." },
      ...login("BETA"),
      { assertVisible: "NativeBeta plan" },
      { assertNotVisible: "NativeAlpha.*" },
      ...link("history"),
      { extendedWaitUntil: { visible: "No completed workouts yet.", timeout: 30000 } },
      ...link("history/${MAESTRO_ALPHA_SESSION}"),
      { extendedWaitUntil: { visible: ".*[Nn]ot found.*", timeout: 30000 } },
      { assertNotVisible: "NativeAlpha workout" },
      { assertNotVisible: "Set 1: 13 reps.*" },
      shot("06-foreign-history-denied"),
      ...link("workout/${MAESTRO_ALPHA_DRAFT_DAY}"),
      { extendedWaitUntil: { visible: ".*[Nn]ot found.*", timeout: 30000 } },
      { assertNotVisible: "NativeAlpha workout" },
      ...link("workout/${MAESTRO_BETA_DAY}"),
      { extendedWaitUntil: { visible: "NativeBeta workout", timeout: 30000 } },
      { assertNotVisible: "NativeAlpha.*" },
      scroll("input-repetitions"),
      { assertNotVisible: { id: "input-repetitions", text: "17" } },
      shot("07-beta-workout"),
      ...link(""),
      scroll("action-sign-out"),
      tap("action-sign-out"),
      { assertVisible: "Welcome back." },
      ...link("workout/${MAESTRO_ALPHA_DRAFT_DAY}"),
      { assertVisible: "Welcome back." },
    ],
  };
}
