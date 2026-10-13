import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { auth } from "../lib/api";
import { finishNativeOnboarding, validateAnswers, type OnboardingAnswers } from "../lib/onboarding";
import { Page, Title, Copy, Card, Input, Action, palette, styles } from "../ui";
import {
  WEEKDAYS,
  orderedTrainingDays,
  scoreProgramStructures,
} from "../../../../packages/domain/programEngine";

const goals = [
  ["Build muscle", "gain muscle"],
  ["Get stronger", "get stronger"],
  ["Muscle and strength", "muscle and strength"],
  ["Lose fat", "lose fat"],
  ["General fitness", "general fitness"],
] as const;
const equipment = [
  "Full commercial gym",
  "Barbell + rack",
  "Dumbbells",
  "Cables",
  "Machines",
  "Bodyweight only",
];

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: 48,
        padding: 12,
        borderWidth: 1,
        borderColor: selected ? palette.primary : palette.border,
        borderRadius: 12,
        justifyContent: "center",
      }}
    >
      <Text style={styles.text}>
        {selected ? "✓ " : ""}
        {label}
      </Text>
    </Pressable>
  );
}

export default function Onboarding() {
  const { data: session, isPending } = auth.useSession();
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    name: session?.user.name || "",
    fitnessGoal: "",
    experienceLevel: "beginner",
    sessionLength: 60,
    equipment: ["Full commercial gym"],
    availableDays: [],
  });
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!session && !isPending) return <Redirect href="/sign-in" />;
  const set = (patch: Partial<OnboardingAnswers>) => {
    setAnswers((current) => ({ ...current, ...patch }));
    setPreview(false);
    setError("");
  };
  const toggle = (field: "equipment" | "availableDays", value: string) =>
    set({
      [field]: answers[field].includes(value)
        ? answers[field].filter((item) => item !== value)
        : [...answers[field], value],
    });
  const recommendation = preview ? scoreProgramStructures(answers).best : null;
  const save = async () => {
    if (!session || busy) return;
    setBusy(true);
    setError("");
    try {
      await finishNativeOnboarding(answers, session.user.id);
      router.replace("/plan");
    } catch (cause) {
      setError((cause as Error).message || "Could not finish setup. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Title>Build your starting plan</Title>
      <Copy>Choose what fits your training. Review the schedule before saving.</Copy>
      <Input label="Name" value={answers.name} onChangeText={(name) => set({ name })} />
      <Card>
        <Title>Goal</Title>
        {goals.map(([label, value]) => (
          <Choice
            key={value}
            label={label}
            selected={answers.fitnessGoal === value}
            onPress={() => set({ fitnessGoal: value })}
          />
        ))}
      </Card>
      <Card>
        <Title>Experience</Title>
        {(["beginner", "intermediate", "advanced"] as const).map((value) => (
          <Choice
            key={value}
            label={value}
            selected={answers.experienceLevel === value}
            onPress={() => set({ experienceLevel: value })}
          />
        ))}
      </Card>
      <Card>
        <Title>Session length</Title>
        {[30, 45, 60, 75, 90].map((value) => (
          <Choice
            key={value}
            label={`${value} minutes`}
            selected={answers.sessionLength === value}
            onPress={() => set({ sessionLength: value })}
          />
        ))}
      </Card>
      <Card>
        <Title>Available equipment</Title>
        {equipment.map((value) => (
          <Choice
            key={value}
            label={value}
            selected={answers.equipment.includes(value)}
            onPress={() => toggle("equipment", value)}
          />
        ))}
      </Card>
      <Card>
        <Title>Training days</Title>
        <Copy>Pick 2–6 days. Your other days stay as rest days.</Copy>
        {WEEKDAYS.map((value) => (
          <Choice
            key={value}
            label={value}
            selected={answers.availableDays.includes(value)}
            onPress={() => toggle("availableDays", value)}
          />
        ))}
      </Card>
      {!!error && (
        <Text accessibilityRole="alert" style={styles.text}>
          {error}
        </Text>
      )}
      {!preview ? (
        <Action
          label="Preview my plan"
          onPress={() => {
            const invalid = validateAnswers(answers);
            if (invalid) setError(invalid);
            else {
              setError("");
              setPreview(true);
            }
          }}
        />
      ) : (
        <Card>
          <Title>{recommendation?.name}</Title>
          <Copy>{recommendation?.why}</Copy>
          {recommendation?.dayNames.map((name, index) => (
            <View key={index}>
              <Copy>
                {WEEKDAYS[orderedTrainingDays(answers)[index]]} · {name}
              </Copy>
            </View>
          ))}
          <Copy>
            Your existing plan stays active until this new plan is fully saved and activated.
          </Copy>
          <Action
            label={busy ? "Saving plan…" : "Save and activate plan"}
            onPress={() => void save()}
            disabled={busy}
          />
          <Action label="Change choices" onPress={() => setPreview(false)} disabled={busy} />
        </Card>
      )}
    </Page>
  );
}
