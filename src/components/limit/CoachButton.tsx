import { proposalSchema, type PlanProposal } from "../../../packages/contracts/proposals";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useState } from "react";
import { Sparkles, Send, X } from "lucide-react";
import { limitApi } from "@/api/client";
import useModalHistory from "@/hooks/use-modal-history";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import AiConsent, { AI_CONSENT_VERSION } from "@/components/limit/AiConsent";
export default function CoachButton() {
  const queryClient = useQueryClient();
  const [proposal, setProposal] = useState<PlanProposal | null>(null);
  const [before, setBefore] = useState<string>("");
  const [proposalError, setProposalError] = useState("");
  const [requestPlan, setRequestPlan] = useState(false);
  const [approving, setApproving] = useState(false);
  const approve = async () => {
    if (!proposal || approving) return;
    setApproving(true);
    try {
      await limitApi.functions.invoke("approvePlan", { proposalId: proposal.id, approved: true });
      setProposal(null);
      setAnswer("Your new plan is active. Open Workout to see your week.");
      void queryClient.invalidateQueries();
    } catch (e: any) {
      setProposalError(e.message || "Could not activate this plan. Try again.");
    } finally {
      setApproving(false);
    }
  };
  const [open, setOpen] = useState(false),
    [q, setQ] = useState(""),
    [answer, setAnswer] = useState(""),
    [consent, setConsent] = useState(false),
    [loading, setLoading] = useState(false),
    dismiss = useCallback(() => {
      setOpen(false);
      setConsent(false);
      setQ("");
      setAnswer("");
      setProposal(null);
      setProposalError("");
    }, []),
    close = useModalHistory(open, dismiss);
  const ask = async () => {
    if (!q.trim() || loading || !consent) return;
    setLoading(true);
    try {
      const { data } = await limitApi.functions.invoke("askLimitCoach", {
        question: q,
        propose: requestPlan,
        aiConsent: AI_CONSENT_VERSION,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setAnswer(data.answer);
      setProposal(data.proposal ? proposalSchema.parse(data.proposal) : null);
      setBefore(
        data.before
          ? `${data.before.name} · ${data.before.daysPerWeek} days/week`
          : "No active plan"
      );
      setProposalError(data.proposalError || "");
    } catch {
      setAnswer("I couldn’t reach your data just now. Try again.");
    }
    setLoading(false);
  };
  return (
    <>
      <button
        aria-label="Open LIMIT Coach"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-[max(1rem,calc((100vw-36rem)/2+1.5rem))] z-30 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-lg transition-transform active:scale-95 md:right-[max(1.5rem,calc((100vw-48rem)/2+1.5rem))] lg:bottom-6 lg:right-6"
      >
        <Sparkles />
      </button>
      <Drawer
        autoFocus
        open={open}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <DrawerContent className="bg-card text-foreground">
          <section className="mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <header className="mb-5 flex items-center justify-between">
              <div>
                <DrawerTitle>LIMIT Coach</DrawerTitle>
                <DrawerDescription>
                  Suggestions based on your logged data. Not medical advice.
                </DrawerDescription>
              </div>
              <button aria-label="Close coach" onClick={close} className="p-3">
                <X />
              </button>
            </header>
            <div className="mb-4">
              <AiConsent
                checked={consent}
                onChange={setConsent}
                disabled={loading}
                purpose="answer your question"
                dataDescription="your question. LIMIT also uses your saved profile, recent workouts and dietary restrictions to personalize the response"
              />
            </div>
            <div
              role="status"
              className="mb-4 min-h-28 max-h-[45dvh] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-secondary p-4 text-sm leading-relaxed"
            >
              {loading
                ? "Thinking…"
                : answer || "Ask about today’s training, nutrition, meal plan, or progress."}
            </div>
            <label className="mb-3 flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={requestPlan}
                onChange={(e) => setRequestPlan(e.target.checked)}
              />
              Suggest a complete weekly plan
            </label>
            {proposalError && (
              <p role="alert" className="mb-4 rounded-xl border p-3 text-sm">
                {proposalError}
              </p>
            )}
            {proposal && (
              <section
                aria-label="Proposed plan"
                className="mb-5 rounded-2xl border border-primary/30 p-4 text-sm"
              >
                <p className="font-bold">Review your proposed week</p>
                <p className="mt-2 text-muted-foreground">Current: {before}</p>
                <p className="mt-1 font-semibold">
                  Proposed: {proposal.name} · {proposal.days.filter((d) => !d.isRest).length}{" "}
                  days/week
                </p>
                <p className="mt-2">{proposal.explanation}</p>
                <ol className="my-3 space-y-1">
                  {proposal.days.map((d) => (
                    <li key={d.weekday}>
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d.weekday]} · {d.name}
                      {!d.isRest && ` · ${d.exercises.length} movements`}
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-muted-foreground">
                  Your current plan stays active until you approve. Start any new movement with a
                  comfortable load.
                </p>
                <button
                  onClick={approve}
                  disabled={approving}
                  className="limit-button mt-3 min-h-12 w-full rounded-xl font-bold"
                >
                  {approving ? "Activating…" : "Approve and activate plan"}
                </button>
                <button onClick={() => setProposal(null)} className="min-h-11 w-full text-sm">
                  Keep my current plan
                </button>
              </section>
            )}
            <div className="flex gap-2">
              <input
                aria-label="Ask LIMIT Coach"
                maxLength={1000}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void ask();
                }}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="What should I eat tonight?"
                className="h-12 min-w-0 flex-1 rounded-xl border bg-transparent px-3"
              />
              <button
                aria-label="Send question"
                disabled={loading || !q.trim() || !consent}
                onClick={ask}
                className="h-12 w-12 rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
              >
                <Send className="mx-auto" />
              </button>
            </div>
          </section>
        </DrawerContent>
      </Drawer>
    </>
  );
}
