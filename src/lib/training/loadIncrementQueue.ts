type LoadIncrements = Record<string, number>;

export class LoadIncrementQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private snapshot: { ownerId: string; profileId: string; values: LoadIncrements } | null = null;

  save(
    ownerId: string,
    profile: { id: string; loadIncrements?: LoadIncrements },
    exerciseId: string,
    increment: number,
    isCurrentOwner: (ownerId: string) => boolean,
    update: (profileId: string, values: LoadIncrements) => Promise<unknown>,
    onSaved: (values: LoadIncrements) => void
  ) {
    const task = this.tail.then(async () => {
      if (!isCurrentOwner(ownerId)) throw new Error("Your account changed. Save this step again.");
      const previous =
        this.snapshot?.ownerId === ownerId && this.snapshot.profileId === profile.id
          ? this.snapshot.values
          : {};
      const values = { ...profile.loadIncrements, ...previous, [exerciseId]: increment };
      await update(profile.id, values);
      this.snapshot = { ownerId, profileId: profile.id, values };
      if (isCurrentOwner(ownerId)) onSaved(values);
    });
    this.tail = task.catch(() => undefined);
    return task;
  }
}
