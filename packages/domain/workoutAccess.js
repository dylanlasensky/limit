export const owned = (record, userId) => record && (record.ownerId === userId || (!record.ownerId && record.created_by_id === userId));
export const ownerFilter = userId => ({ $or: [{ ownerId: userId }, { created_by_id: userId }] });
export function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
export function localDate(timezone, now = new Date()) {
  if (typeof timezone !== 'string' || timezone.length > 100) fail('A valid timezone is required.');
  let parts;
  try { parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now); }
  catch { fail('A valid timezone is required.'); }
  const value = type => parts.find(p => p.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export async function withWorkoutLock(client, user, action) {
  const profiles = await client.entities.UserProfile.filter({ created_by_id: user.id }, 'created_date', 1);
  const profile = profiles[0];
  if (!profile) fail('Complete your profile before training.', 409);
  const entity = client.asServiceRole.entities.UserProfile;
  const token = crypto.randomUUID(), now = Date.now();
  if (profile.workoutLockToken && Number(profile.workoutLockUntil) > now) fail('Another workout change is syncing. Retry in a moment.', 409);
  const query = { id: profile.id, created_by_id: user.id, workoutLockToken: profile.workoutLockToken ?? null };
  await entity.updateMany(query, { $set: { workoutLockToken: token, workoutLockUntil: now + 300000 } });
  const locked = await entity.get(profile.id);
  if (locked.workoutLockToken !== token) fail('Another workout change is syncing. Retry in a moment.', 409);
  const assertLock = async () => {
    const current = await entity.get(profile.id);
    if (current.workoutLockToken !== token || Date.now() >= now + 240000) fail('Sync took too long. Your draft is preserved; retry.', 409);
  };
  try { return await action(assertLock, profile); }
  finally { await entity.updateMany({ id: profile.id, created_by_id: user.id, workoutLockToken: token }, { $set: { workoutLockToken: '', workoutLockUntil: 0 } }); }
}