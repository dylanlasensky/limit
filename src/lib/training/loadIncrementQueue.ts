type LoadIncrements = Record<string, number>;

export class LoadIncrementQueue {
  private tail: Promise<unknown> = Promise.resolve();

  save(
    ownerId: string,
    exerciseId: string,
    increment: number,
    isCurrentOwner: (ownerId: string) => boolean,
    update: (exerciseId: string, increment: number) => Promise<LoadIncrements>,
    onSaved: (values: LoadIncrements) => void
  ) {
    const task = this.tail.then(async () => {
      if (!isCurrentOwner(ownerId)) throw new Error("Your account changed. Save this step again.");
      const values = await update(exerciseId, increment);
      if (isCurrentOwner(ownerId)) onSaved(values);
    });
    this.tail = task.catch(() => undefined);
    return task;
  }
}
