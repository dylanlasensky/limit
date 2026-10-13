import assert from "node:assert/strict";
export const previewOrigin = "https://limit-preview.limit-dylanlasensky.workers.dev";
export const acceptedRevision = "eb4cf12e2ca7500285058280ae62e0286f6da82a";
export function assertPreview(origin, health, config) {
  assert.equal(origin, previewOrigin, "Native fixtures may use only the existing preview");
  assert.equal(health.environment, "preview");
  assert.equal(health.sourceRevision, acceptedRevision, "Preview source changed");
  assert.equal(config.emailEnabled, false, "Synthetic mailboxes require email-disabled preview");
}
export function redact(text, values) {
  return values
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .reduce((result, value) => result.split(value).join("[REDACTED]"), text);
}
export function assertOneSavedSet(sets, owner, session, reps) {
  assert.equal(sets.length, 1, "The UI must save exactly one set, including after retries");
  assert.equal(sets[0].ownerId, owner);
  assert.equal(sets[0].workoutSessionId, session);
  assert.equal(sets[0].reps, reps);
  assert.equal(sets[0].completed, true);
}
