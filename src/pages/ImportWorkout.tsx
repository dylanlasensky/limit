import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ScreenState from "@/components/limit/ScreenState";
import ImportSource from "@/components/import/ImportSource";
import ImportReview from "@/components/import/ImportReview";
import ImportSuccess from "@/components/import/ImportSuccess";
import useRegimenImport from "@/hooks/use-regimen-import";
export default function ImportWorkout() {
  const nav = useNavigate();
  const [params] = useSearchParams(),
    flow = useRegimenImport(params.get("plan"));
  return (
    <div>
      <header>
        <button
          type="button"
          onClick={() => nav("/workout")}
          className="mb-5 flex min-h-11 items-center gap-2 text-sm font-bold text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Workouts
        </button>
      </header>
      {flow.busy && !flow.draft && flow.editing ? (
        <ScreenState loading />
      ) : flow.stage === "done" ? (
        <ImportSuccess />
      ) : flow.stage === "review" && flow.draft ? (
        <ImportReview flow={flow} />
      ) : (
        <ImportSource
          meta={flow.meta}
          setMeta={flow.setMeta}
          onBegin={flow.begin}
          busy={flow.busy}
          error={flow.error}
        />
      )}
    </div>
  );
}