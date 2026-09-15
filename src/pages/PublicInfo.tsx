import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import PublicLinks from "@/components/limit/PublicLinks";
import { publicInfo } from "@/lib/public-info";

type InfoKind = "privacy" | "terms" | "support";
const titles = { privacy: "Your privacy", terms: "Using LIMIT safely", support: "Help & support" };
const destinations = {
  privacy: publicInfo.privacyUrl,
  terms: publicInfo.termsUrl,
  support: publicInfo.supportUrl,
};

export default function PublicInfo({ kind }: { kind: InfoKind }) {
  const destination = destinations[kind];
  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 pb-10 md:max-w-3xl md:px-8 lg:max-w-5xl pt-[max(1rem,env(safe-area-inset-top))] text-foreground">
      <Link
        to="/"
        className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Back to LIMIT
      </Link>
      <p className="limit-kicker">LIMIT</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">{titles[kind]}</h1>
      {destination ? (
        <a
          href={destination}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          {kind === "support"
            ? "Contact support"
            : kind === "privacy"
              ? "Read the full privacy policy"
              : "Read the full terms of use"}
          <ExternalLink aria-hidden className="h-4 w-4" />
        </a>
      ) : (
        <p
          role="note"
          className="mt-5 rounded-2xl border border-border bg-secondary/40 p-4 text-sm leading-relaxed text-muted-foreground"
        >
          Pre-release information:{" "}
          {kind === "support"
            ? "a verified support contact has not been configured yet. The guides below are available now."
            : "the business-approved " +
              (kind === "privacy" ? "privacy policy" : "terms of use") +
              " has not been configured yet. This summary is not a substitute for it."}{" "}
          App Store release remains blocked until this is completed.
        </p>
      )}
      <div className="mt-6 space-y-6 text-sm leading-relaxed text-muted-foreground lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
        {kind === "privacy" && (
          <>
            <InfoSection title="What you choose to record">
              <p>
                Your account identifies you by name and email. Your profile can include birth date,
                body measurements, training goals and dietary preferences. Workouts, sets, food
                entries and progress are stored with your account on Base44 so LIMIT can show your
                history and plans. Optional activity, sleep, body measurements and daily check-ins
                are also stored with your account, along with their source and your health-view
                preferences.
              </p>
            </InfoSection>
            <InfoSection title="Optional AI features">
              <p>
                Coach questions, food-photo analysis and plan import can send the information
                described in their consent prompt to Base44 and OpenAI. They require an explicit
                choice before sharing. Manual workout and food logging remain available without AI.
                Do not upload someone else’s private information or medical documents.
              </p>
            </InfoSection>
            <InfoSection title="Photos and uploaded files">
              <p>
                Only a file you select is uploaded. Uploads use private storage and short-lived
                access links for analysis. Storage-provider retention, deletion and backup behavior
                still require release verification; do not assume that deleting an account has
                already erased every uploaded file or provider backup.
              </p>
            </InfoSection>
            <InfoSection title="Your controls">
              <p>
                Use Profile → Account to download your account data or initiate account deletion.
                The export contains sensitive personal information; keep it somewhere private.
                Health settings also let you hide metrics, choose preferred sources, and remove
                health logs without removing workouts or nutrition. Hiding a metric does not delete
                its records, and removing LIMIT health logs does not erase device records or revoke
                device permissions. Appearance, exercise favorites, and recovery drafts are saved on
                your device. Signing out clears the active account session and cached data, but
                retains account-specific favorites and recovery drafts so unfinished work is not
                lost. Account deletion also removes those favorites and drafts from this device.
              </p>
              <Link
                to="/profile#account"
                className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary"
              >
                Open account controls
              </Link>
            </InfoSection>
            <InfoSection title="Service data">
              <p>
                The hosting and sign-in services may process technical information such as requests,
                device/browser details and usage logs. The final privacy policy and App Store
                privacy disclosures must reflect the verified practices of those services, including
                any AI provider. LIMIT does not currently connect to Apple Health, contacts or
                location services.
              </p>
            </InfoSection>
          </>
        )}
        {kind === "terms" && (
          <>
            <InfoSection title="Fitness reference, not medical care">
              <p>
                LIMIT helps organize training and food records. Exercise cues, calorie estimates, AI
                answers and strength scores are informational estimates—not a diagnosis, treatment
                plan, medical clearance or guarantee of results. Consult a qualified professional
                for individual health, injury or nutrition needs.
              </p>
            </InfoSection>
            <InfoSection title="Train within your ability">
              <p>
                Check equipment and use appropriate technique and supervision. Stop for sharp or
                unusual pain. Advanced lifts and power movements require appropriate coaching; a
                place in the library does not mean a movement is suitable for everyone.
              </p>
            </InfoSection>
            <InfoSection title="Food and nutrition estimates">
              <p>
                Check quantities, nutrition labels and allergen/cross-contact information yourself.
                Photo analysis and meal suggestions cannot guarantee allergy safety. Automatic
                calorie targets are not provided for under-18s; qualified guidance may be needed for
                minors, pregnancy, breastfeeding, eating disorders and other health conditions.
              </p>
            </InfoSection>
            <InfoSection title="Connectivity and saving">
              <p>
                A connection is required for account access and cloud synchronization. An
                already-open workout can keep a device draft during interruptions, but LIMIT does
                not promise full offline operation. Wait for saved confirmation before closing a
                workout or switching devices.
              </p>
            </InfoSection>
            <InfoSection title="Payments and store availability">
              <p>
                This version does not contain an active purchase or subscription checkout. Any paid
                App Store release needs a separately verified commercial model, purchase
                restoration, cancellation information and applicable store billing compliance. No
                subscription terms are created by this information page.
              </p>
            </InfoSection>
          </>
        )}
        {kind === "support" && (
          <>
            <InfoSection title="Finding every exercise">
              <p>
                Open Workout → Exercises. “All” includes the complete reference library. Clear
                filters to see the full count, or choose “Show all” beneath the results. Stars save
                favorites on this device; Recent uses your latest logged sets.
              </p>
              <Link
                to="/exercises"
                className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary"
              >
                Browse without an account
              </Link>
            </InfoSection>
            <InfoSection title="A set hasn’t saved">
              <p>
                Keep the workout open and restore your connection. Use Retry in the workout’s save
                status. If a conflict appears, compare the device draft and saved version before
                choosing; do not assume an unchecked or pending set reached the server.
              </p>
            </InfoSection>
            <InfoSection title="Signing in">
              <p>
                Use the same sign-in method as when you created your account. Check your email and
                spam folder for verification or password-reset messages. Never share your password,
                verification code or account export in a public issue or chat.
              </p>
              <Link
                to="/forgot-password"
                className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary"
              >
                Reset your password
              </Link>
            </InfoSection>
            <InfoSection title="Changing the appearance">
              <p>
                Use the Light/Dark switch at the top of the main screens, or Profile → Appearance →
                Match device. Preferences are saved on this device.
              </p>
            </InfoSection>
            <InfoSection title="Your data">
              <p>
                Profile → Account contains data export and account deletion. Deletion is permanent
                for the account records removed. See Privacy for the current limits on verifying
                uploaded-file and backup deletion.
              </p>
              <Link
                to="/profile#account"
                className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary"
              >
                Manage your account
              </Link>
            </InfoSection>
          </>
        )}
      </div>
      <PublicLinks />
    </main>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-2 text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
