import React from "react";
import { useSearchParams } from "react-router-dom";
import ScreenState from "@/components/limit/ScreenState";
import ImportSource from "@/components/import/ImportSource";
import ImportReview from "@/components/import/ImportReview";
import ImportSuccess from "@/components/import/ImportSuccess";
import useRegimenImport from "@/hooks/use-regimen-import";
export default function ImportWorkout() {
  const [params] = useSearchParams(),
    flow = useRegimenImport(params.get("plan"));
  if (flow.busy && !flow.draft && flow.editing) return <ScreenState loading />;
  if (flow.stage === "done") return <ImportSuccess />;
  if (flow.stage === "review" && flow.draft) return <ImportReview flow={flow} />;
  return (
    <ImportSource
      meta={flow.meta}
      setMeta={flow.setMeta}
      onBegin={flow.begin}
      busy={flow.busy}
      error={flow.error}
    />
  );
}
