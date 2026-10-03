import { Stack } from "expo-router";
import { Platform } from "react-native";
import { palette } from "../ui";
export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: Platform.OS !== "web",
        headerStyle: { backgroundColor: palette.background },
        headerTintColor: palette.foreground,
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Today" }} />
      <Stack.Screen name="sign-in" options={{ title: "Your account" }} />
      <Stack.Screen name="plan" options={{ title: "Your week" }} />
      <Stack.Screen name="history/index" options={{ title: "Workout history" }} />
      <Stack.Screen name="history/[id]" options={{ title: "Workout details" }} />
      <Stack.Screen name="workout/[id]" options={{ title: "Active workout" }} />
    </Stack>
  );
}
