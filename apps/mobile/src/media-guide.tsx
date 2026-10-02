import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { mediaSchema, playableMedia, type ExerciseMedia } from "../../../packages/contracts/media";
import { origin, request } from "./lib/api";
import { Action, Copy, styles } from "./ui";

function Player({ uri, caption, onRetry }: { uri: string; caption: string; onRetry: () => void }) {
  const player = useVideoPlayer(uri, (video) => {
    video.loop = true;
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });
  useEffect(() => () => player.pause(), [player]);
  return (
    <View style={{ gap: 10 }}>
      {(status === "idle" || status === "loading") && <Copy>Loading demonstration…</Copy>}
      {status === "error" ? (
        <>
          <Text accessibilityRole="alert" style={styles.text}>
            Video could not load. Use the written movement cues below.
          </Text>
          <Action label="Retry demonstration" onPress={onRetry} />
        </>
      ) : (
        <>
          <VideoView
            player={player}
            nativeControls={false}
            contentFit="contain"
            style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 12 }}
          />
          <Action
            label={isPlaying ? "Pause demonstration" : "Play demonstration"}
            disabled={status !== "readyToPlay"}
            onPress={() => (isPlaying ? player.pause() : player.play())}
          />
        </>
      )}
      {!!caption && <Copy>Caption: {caption}</Copy>}
    </View>
  );
}

export function MediaGuide({
  catalogKey,
  instructions,
}: {
  catalogKey: string;
  instructions: string[];
}) {
  const [media, setMedia] = useState<ExerciseMedia | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [active, setActive] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void request("/media/" + encodeURIComponent(catalogKey), mediaSchema)
      .then((result) => {
        if (!cancelled) {
          setMedia(result);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMedia(null);
          setError("Movement media could not load. Written cues remain available.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogKey, retry]);
  const playable = media && playableMedia(media);
  const uri = playable
    ? `${origin}/api/media/${encodeURIComponent(catalogKey)}/${media.version}/video`
    : null;
  return (
    <View style={{ gap: 10 }}>
      {loading && <Copy>Loading movement guide…</Copy>}
      {!!error && (
        <>
          <Text accessibilityRole="alert" style={styles.text}>
            {error}
          </Text>
          <Action
            label="Retry movement media"
            onPress={() => {
              setLoading(true);
              setError("");
              setActive(false);
              setRetry((value) => value + 1);
            }}
          />
        </>
      )}
      {!loading && !error && !uri && <Copy>Video not available yet. Follow these setup cues:</Copy>}
      {!!uri && (
        <>
          <Copy>
            {media?.reviewStatus === "approved"
              ? "Reviewed movement demonstration"
              : "Generated demonstration · technically checked, not human fitness-reviewed"}
          </Copy>
          {!active ? (
            <Action label="Load demonstration" onPress={() => setActive(true)} />
          ) : (
            <Player uri={uri} caption={media?.caption || ""} onRetry={() => setActive(false)} />
          )}
        </>
      )}
      {instructions.map((cue, index) => (
        <Copy key={index}>
          {index + 1}. {cue}
        </Copy>
      ))}
    </View>
  );
}
