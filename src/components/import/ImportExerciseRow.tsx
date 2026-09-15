import React, { useState } from "react";
import { exerciseSearch } from "@/lib/training/exerciseLibrary";
import { AlertCircle, Trash2 } from "lucide-react";
import NativeSelect from "@/components/limit/NativeSelect";
export interface CatalogExercise {
  id: string;
  name: string;
  primaryMuscle?: string;
  [key: string]: any;
}
export interface ImportExercise {
  key: string;
  exerciseId?: string;
  exerciseName: string;
  importedName?: string;
  primaryMuscle?: string;
  matchConfidence: number;
  candidates?: CatalogExercise[];
  sets?: number;
  repMin?: number;
  repMax?: number;
  restSeconds?: number;
  notes?: string;
  [key: string]: any;
}
interface ImportExerciseRowProps {
  exercise: ImportExercise;
  onChange: (patch: Partial<ImportExercise>) => void;
  onRemove: () => void;
  catalog: CatalogExercise[];
}
const muscles = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
];
export default function ImportExerciseRow({
  exercise,
  onChange,
  onRemove,
  catalog,
}: ImportExerciseRowProps) {
  const [search, setSearch] = useState("");
  const [changing, setChanging] = useState(false);
  const uncertain = !exercise.exerciseId || exercise.matchConfidence < 100,
    choose = (id: string) => {
      const match = catalog.find((item) => item.id === id);
      onChange(
        match
          ? {
              exerciseId: match.id,
              exerciseName: match.name,
              primaryMuscle: match.primaryMuscle,
              category: match.category,
              equipment: match.equipment,
              matchConfidence: 100,
            }
          : {
              exerciseId: "",
              exerciseName: exercise.importedName,
              primaryMuscle: "",
              matchConfidence: 0,
            }
      );
    };
  const options = [
    { value: "", label: `Keep “${exercise.importedName}”` },
    ...catalog
      .filter((item) => item.id === exercise.exerciseId || exerciseSearch(item, search))
      .map((item) => ({
        value: item.id,
        label: item.name,
      })),
  ];
  return (
    <div className="rounded-2xl border border-border/60 bg-background/45 p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <input
            value={exercise.exerciseName}
            onChange={(e) =>
              onChange({
                exerciseName: e.target.value,
                importedName: e.target.value,
                exerciseId: "",
                matchConfidence: 0,
              })
            }
            aria-label="Exercise name"
            className="w-full bg-transparent font-bold outline-none"
          />
          <p
            className={`mt-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${uncertain ? "text-amber-400" : "text-primary"}`}
          >
            {uncertain && <AlertCircle className="h-3 w-3" />}
            {uncertain ? "Confirm exercise match" : `${exercise.matchConfidence}% match`}
          </p>
        </div>
        <button
          onClick={onRemove}
          aria-label="Remove exercise"
          className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-muted-foreground"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {!uncertain && (
        <button
          onClick={() => setChanging(!changing)}
          className="min-h-11 text-xs font-semibold text-primary"
        >
          {changing ? "Done choosing" : "Change exercise match"}
        </button>
      )}
      {(uncertain || changing) && (
        <>
          <input
            aria-label="Search exercise library"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the full exercise library"
            className="mt-3 h-11 w-full rounded-xl border border-border bg-secondary px-3 text-sm"
          />
          <NativeSelect
            value={exercise.exerciseId || ""}
            onChange={choose}
            options={options}
            label="Match exercise"
            className="mt-3"
          />
          {!exercise.exerciseId && (
            <NativeSelect
              value={exercise.primaryMuscle || "Other"}
              onChange={(value) => onChange({ primaryMuscle: value })}
              options={[...muscles, "Other"]}
              label="Primary muscle"
              className="mt-2"
            />
          )}
        </>
      )}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {(
          [
            ["sets", "Sets"],
            ["repMin", "Min"],
            ["repMax", "Max"],
            ["restSeconds", "Rest s"],
          ] as Array<[string, string]>
        ).map(([key, label]) => (
          <label
            key={key}
            className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground"
          >
            {label}
            <input
              type="number"
              min="1"
              value={exercise[key]}
              onChange={(e) => onChange({ [key]: +e.target.value })}
              className="mt-1 h-10 w-full rounded-xl border border-border/60 bg-secondary/60 px-2 text-center text-sm font-bold text-foreground outline-none focus:border-primary/50"
            />
          </label>
        ))}
      </div>
      {exercise.category === "Power" && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Athletic power: confirm sets, reps, rest and load with your coach. Bodybuilding
          progression suggestions do not apply.
        </p>
      )}
      <input
        value={exercise.notes || ""}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder="Technique, tempo, or coach notes"
        className="mt-3 h-10 w-full rounded-xl border border-border/60 bg-secondary/40 px-3 text-xs outline-none focus:border-primary/50"
      />
    </div>
  );
}
