import React, { useCallback, useState } from "react";
import { Sparkles, Send, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import useModalHistory from "@/hooks/use-modal-history";
export default function CoachButton() {
  const [open, setOpen] = useState(false),
    [q, setQ] = useState(""),
    [answer, setAnswer] = useState(""),
    [loading, setLoading] = useState(false),
    dismiss = useCallback(() => setOpen(false), []),
    close = useModalHistory(open, dismiss);
  const ask = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke("askLimitCoach", { question: q });
      setAnswer(data.answer);
    } catch {
      setAnswer("I couldn’t reach your data just now. Try again.");
    }
    setLoading(false);
  };
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-950/50 transition-transform active:scale-95"
      >
        <Sparkles />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35">
          <section className="mx-auto w-full max-w-md rounded-t-[2rem] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] dark:bg-zinc-900">
            <header className="mb-5 flex items-center justify-between">
              <div>
                <b>LIMIT Coach</b>
                <p className="text-xs text-zinc-500">Uses your current LIMIT data</p>
              </div>
              <button onClick={close} className="p-3">
                <X />
              </button>
            </header>
            <div className="mb-4 min-h-28 rounded-2xl bg-zinc-100 p-4 text-sm dark:bg-zinc-800">
              {loading
                ? "Thinking…"
                : answer || "Ask about today’s training, nutrition, meal plan, or progress."}
            </div>
            <div className="flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="What should I eat tonight?"
                className="h-12 min-w-0 flex-1 rounded-xl border bg-transparent px-3"
              />
              <button onClick={ask} className="h-12 w-12 rounded-xl bg-blue-600 text-white">
                <Send className="mx-auto" />
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
