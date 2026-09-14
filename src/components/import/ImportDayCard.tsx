import React from "react";
import { Plus, Trash2 } from "lucide-react";
import NativeSelect from "@/components/limit/NativeSelect";
import ImportExerciseRow, {
  type CatalogExercise,
  type ImportExercise,
} from "@/components/import/ImportExerciseRow";
export interface ImportDay {
  key: string;
  name: string;
  weekday: number;
  coachMandated?: boolean;
  fixedSchedule?: boolean;
  exercises: ImportExercise[];
  [key: string]: any;
}
interface ImportDayCardProps {
  day: ImportDay;
  index: number;
  onChange: (patch: Partial<ImportDay>) => void;
  onRemove: () => void;
  onExercise: (exerciseIndex: number, patch: Partial<ImportExercise>) => void;
  onRemoveExercise: (exerciseIndex: number) => void;
  onAddExercise: () => void;
  catalog: CatalogExercise[];
}
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
  (label, value) => ({ label, value })
);
export default function ImportDayCard({
  day,
  index,
  onChange,
  onRemove,
  onExercise,
  onRemoveExercise,
  onAddExercise,
  catalog,
}: ImportDayCardProps) {
  return (
    <section className="limit-surface rounded-[2rem] p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-black text-primary">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <input
            value={day.name}
            onChange={(e) => onChange({ name: e.target.value })}
            aria-label={`Day ${index + 1} name`}
            className="w-full bg-transparent text-lg font-black outline-none"
          />
          <NativeSelect
            value={day.weekday}
            onChange={(value) => onChange({ weekday: +value })}
            options={weekdays}
            label="Training day"
            className="mt-2"
          />
        </div>
        <button
          onClick={onRemove}
          aria-label="Remove training day"
          className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-muted-foreground"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onChange({ coachMandated: !day.coachMandated })}
          className={`min-h-9 rounded-full px-3 text-[10px] font-bold ${day.coachMandated ? "limit-chip-active" : "limit-chip"}`}
        >
          COACH REQUIRED
        </button>
        <button
          onClick={() => onChange({ fixedSchedule: !day.fixedSchedule })}
          className={`min-h-9 rounded-full px-3 text-[10px] font-bold ${day.fixedSchedule ? "limit-chip-active" : "limit-chip"}`}
        >
          FIXED DAY
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {day.exercises.map((exercise, exerciseIndex) => (
          <ImportExerciseRow
            key={exercise.key}
            exercise={exercise}
            catalog={catalog}
            onChange={(patch) => onExercise(exerciseIndex, patch)}
            onRemove={() => onRemoveExercise(exerciseIndex)}
          />
        ))}
      </div>
      <button
        onClick={onAddExercise}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 text-xs font-black text-muted-foreground"
      >
        <Plus className="h-4 w-4" />
        ADD EXERCISE
      </button>
    </section>
  );
}
