import LimitLogo from "@/components/limit/LimitLogo";

export default function BrandLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-5 text-foreground">
      <LimitLogo size="lg" />
      <p role="status" className="text-sm text-muted-foreground">
        Loading your app…
      </p>
    </div>
  );
}
