import React, { useCallback, useState } from "react";
import { Sparkles, Send, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import useModalHistory from "@/hooks/use-modal-history";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import AiConsent, { AI_CONSENT_VERSION } from "@/components/limit/AiConsent";
export default function CoachButton() {
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
    }, []),
    close = useModalHistory(open, dismiss);
  const ask = async () => {
    if (!q.trim() || loading || !consent) return;
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke("askLimitCoach", {
        question: q,
        aiConsent: AI_CONSENT_VERSION,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setAnswer(data.answer);
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
                dataDescription="your question, fitness goals, adult-age eligibility, recent workouts and records, dietary restrictions, and (for adults) weight trends and nutrition totals"
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
