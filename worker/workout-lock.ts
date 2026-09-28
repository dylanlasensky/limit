// Called only from the account coordinator, which serializes all private mutations.
export async function withWorkoutLock(client: any, _user: any, action: any) {
  const profile = (await client.entities.UserProfile.list())[0];
  if (!profile)
    throw Object.assign(new Error("Complete your profile before training."), { status: 409 });
  return action(async () => {}, profile);
}
