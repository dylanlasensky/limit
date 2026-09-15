export function ageFromBirthDate(value: unknown, now = new Date()): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const born = new Date(year, month - 1, day, 12);
  if (
    born.getFullYear() !== year ||
    born.getMonth() !== month - 1 ||
    born.getDate() !== day ||
    value > localDateInput(now)
  )
    return null;
  return (
    now.getFullYear() -
    year -
    (now.getMonth() < month - 1 || (now.getMonth() === month - 1 && now.getDate() < day) ? 1 : 0)
  );
}

export function localDateInput(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function bodyInputErrors(profile: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (typeof profile.name !== "string" || !profile.name.trim() || profile.name.trim().length > 100)
    errors.name = "Enter a name between 1 and 100 characters.";
  if (profile.birthDate && ageFromBirthDate(profile.birthDate) === null)
    errors.birthDate = "Enter a valid date of birth that is not in the future.";
  if (
    !Number.isInteger(+profile.heightFeet) ||
    +profile.heightFeet < 3 ||
    +profile.heightFeet > 8 ||
    !Number.isInteger(+(profile.heightInches ?? 0)) ||
    +(profile.heightInches ?? 0) < 0 ||
    +(profile.heightInches ?? 0) > 11
  )
    errors.height = "Check your height: use 3–8 feet and 0–11 inches.";
  const weight = profile.weightLb ?? profile.currentWeight;
  if (!Number.isFinite(+weight) || +weight <= 0 || +weight > 1500)
    errors.weight = "Weight must be above 0 and up to 1,500 lb.";
  const goal = profile.goalWeightLb ?? profile.goalWeight;
  if (goal != null && goal !== "" && (!Number.isFinite(+goal) || +goal <= 0 || +goal > 1500))
    errors.goalWeight = "Goal weight must be above 0 and up to 1,500 lb, or left blank.";
  return errors;
}
