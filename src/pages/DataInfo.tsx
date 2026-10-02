import { Link } from "react-router-dom";
import LimitLogo from "@/components/limit/LimitLogo";
import PublicLinks from "@/components/limit/PublicLinks";
const content = {
  export: {
    title: "Export your data",
    paragraphs: [
      "Sign in, open Profile → Account, and choose Download account data. The JSON export includes your saved profile, plans, workout history, nutrition and progress records. Uploaded files can be downloaded separately while you are signed in.",
      "Exports contain sensitive personal information. Keep them private. If the account exceeds the export size limit, LIMIT reports an error instead of silently omitting records. Do not post exports in the public issue tracker.",
    ],
  },
  deletion: {
    title: "Delete your account",
    paragraphs: [
      "Sign in, open Profile → Account, and choose Delete account. Review the confirmation before continuing. Export any records you want to keep first.",
      "Successful deletion removes your live account, sessions, application records, coaching state and private uploaded files. LIMIT also clears account caches and drafts on this device. Cloudflare backups have separate retention, so deletion does not promise instant erasure of provider backups. Copies you downloaded or stored on other devices remain your responsibility.",
      "Deletion cannot be undone through LIMIT. If you cannot sign in, use password recovery when email delivery is enabled. A private support contact still requires operator configuration; never post account or health information publicly.",
    ],
  },
  disclosure: {
    title: "AI and movement guides",
    paragraphs: [
      "Optional coach and workout-text features use Cloudflare Workers AI only after consent. The coach classifies questions into bounded guidance. Deterministic rules enforce equipment, schedule, recovery and plan limits; you approve proposed plans before activation. AI may fail or be wrong. Manual logging and deterministic guidance remain available.",
      "Movement videos labeled Generated schematic are original computer-rendered diagrams. Technical checks cover mapping, format and playback; they do not establish human fitness approval. Human review is claimed only when a named reviewer records evidence against the exact video checksum. A schematic cannot show every angle or establish that an exercise is right for you.",
      "When a faithful movement render is unavailable, LIMIT retains written instructions. Stop for sharp or unusual pain and seek qualified guidance. This app does not diagnose or treat conditions. Photo nutrition estimation, scanned-PDF OCR, native health connections, push notifications and subscriptions are not enabled.",
      "Operational AI logs contain a random request reference, feature, model, timing, outcome and reported usage where available. They do not intentionally record your prompts, account identity or health records. Free-tier budgets can temporarily disable provider calls.",
    ],
  },
};
export default function DataInfo({ kind }: { kind: keyof typeof content }) {
  const page = content[kind];
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-8 text-foreground">
      <Link to="/" className="inline-flex min-h-11 items-center text-primary">
        Back to LIMIT
      </Link>
      <LimitLogo size="sm" />
      <h1 className="my-5 text-3xl font-bold">{page.title}</h1>
      <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
        {page.paragraphs.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </div>
      <Link
        to="/profile#account"
        className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
      >
        Open account controls
      </Link>
      <PublicLinks />
    </main>
  );
}
