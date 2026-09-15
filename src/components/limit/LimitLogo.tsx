import { cn } from "@/lib/utils";

type LimitLogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: { image: "h-9 w-9 rounded-[10px]", text: "text-sm" },
  md: { image: "h-11 w-11 rounded-xl", text: "text-base" },
  lg: { image: "h-20 w-20 rounded-[22px]", text: "text-2xl" },
};

/** All brand placements use the approved cover artwork, including its safe margins. */
export default function LimitLogo({ size = "md", className }: LimitLogoProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-3 text-foreground", className)}>
      <img
        src="/brand/limit-icon-192.png"
        width={192}
        height={192}
        alt=""
        aria-hidden="true"
        className={cn("block shrink-0 object-contain", sizes[size].image)}
        draggable={false}
      />
      <span className={cn("font-heading font-extrabold tracking-[.18em]", sizes[size].text)}>
        LIMIT
      </span>
    </span>
  );
}
