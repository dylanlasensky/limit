import React, { useCallback, useState } from "react";
import { Sparkles, Send, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import useModalHistory from "@/hooks/use-modal-history";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
export default function CoachButton() {
  const [open, setOpen] = useState(false),
    [q, setQ] = useState(""),
    [answer, setAnswer] = useState(""),
    [loading, setLoading] = useState(false),
    dismiss = useCallback(() => setOpen(false), []),
    close = useModalHistory(open, dismiss);
  const ask = async () => {
    if (!q.trim() || loading) return;
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke("askLimitCoach", {
        question: q,
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
        className="fixed bottom-24 right-[max(1rem,calc((100vw-28rem)/2+1rem))] z-30 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-lg transition-transform active:scale-95"
      >
        <Sparkles />
      </button>
      <Drawer
        open={open}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <DrawerContent className="bg-card text-foreground">
          <section className="mx-auto w-full max-w-md p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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
                disabled={loading || !q.trim()}
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
