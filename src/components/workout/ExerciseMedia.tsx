import React, { useEffect, useRef, useState } from "react";
import { BookOpen, PlayCircle } from "lucide-react";
import { mediaSchema, type ExerciseMedia as Media } from "../../../packages/contracts/media";
import LimitLogo from "@/components/limit/LimitLogo";
export default function ExerciseMedia({
  exercise,
  compact = false,
}: {
  exercise: Record<string, any>;
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    [media, setMedia] = useState<Media | null>(null),
    [failed, setFailed] = useState(false),
    [loaded, setLoaded] = useState(false);
  const key = exercise.catalogKey || exercise.id;
  useEffect(() => {
    setMedia(null);
    setFailed(false);
    setLoaded(false);
    if (!key) return;
    const controller = new AbortController();
    const load = () => {
      fetch("/api/media/" + encodeURIComponent(key), { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const result = mediaSchema.safeParse(data);
          if (result.success) setMedia(result.data);
        })
        .catch(() => {})
        .finally(() => setLoaded(true));
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          load();
          observer.disconnect();
        }
      },
      { rootMargin: "160px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [key]);
  const instructions = media?.textFallback?.length
    ? media.textFallback
    : exercise.instructions?.length
      ? exercise.instructions
      : [
          "Start with a comfortable setup and a light practice set.",
          "Move with control through a comfortable range. Stop if you feel sharp or unusual pain.",
        ];
  const video = media?.reviewStatus === "approved" && media.source && !failed;
  return (
    <div
      ref={ref}
      className="mt-4 overflow-hidden rounded-2xl border border-border bg-secondary/40"
    >
      {!compact &&
        (video ? (
          <video
            className="aspect-video w-full bg-black object-contain"
            controls
            playsInline
            preload="none"
            poster={media.poster ? `/api/media/${key}/${media.version}/poster` : undefined}
            onError={() => setFailed(true)}
            aria-label={`${exercise.name || exercise.exerciseName} instructional video`}
          >
            <source
              src={`/api/media/${key}/${media.version}/video`}
              type={`video/${media.format}`}
            />
            {media.caption}
          </video>
        ) : (
          <div
            className="flex aspect-video items-center justify-between gap-4 bg-gradient-to-br from-primary/10 to-card px-5"
            aria-label="Written exercise guide"
          >
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
                <BookOpen aria-hidden className="h-4 w-4" />
                Movement guide
              </span>
              <p className="mt-2 text-sm font-semibold">
                Learn the setup.
                <br />
                Find your rhythm.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {loaded ? "Video not available yet" : "Written guidance is ready"}
              </p>
            </div>
            <div className="opacity-80">
              <LimitLogo />
            </div>
          </div>
        ))}
      <div className="p-4">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
          {video ? (
            <PlayCircle className="h-4 w-4" aria-hidden />
          ) : (
            <BookOpen className="h-4 w-4" aria-hidden />
          )}
          Before your first set
        </p>
        <ol className="list-decimal space-y-2 pl-4 text-sm leading-relaxed text-muted-foreground">
          {instructions.slice(0, 3).map((cue: string, i: number) => (
            <li key={i}>{cue}</li>
          ))}
        </ol>
        {video && media.caption && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer py-2">Video transcript</summary>
            <p>{media.caption}</p>
          </details>
        )}
      </div>
    </div>
  );
}
