import React from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  TextInput,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tokens from "../../../packages/design/tokens.json";
export const palette = tokens.dark;
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background },
  body: { padding: tokens.space.lg, gap: 16, paddingBottom: 48 },
  text: { color: palette.foreground, fontSize: 16, lineHeight: 24 },
  title: { color: palette.foreground, fontSize: 28, fontWeight: "800" },
  card: { padding: 16, borderRadius: 20, backgroundColor: palette.card, gap: 12 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: palette.border,
    color: palette.foreground,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  button: {
    minHeight: 48,
    backgroundColor: palette.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  muted: { color: palette.muted, fontSize: 14, lineHeight: 22 },
});
export function Page({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Image
            source={require("../../../public/brand/limit-logo.png")}
            accessibilityLabel="LIMIT"
            style={{ width: 64, height: 64, borderRadius: 16 }}
          />
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export const Title = ({ children }: { children: React.ReactNode }) => (
  <Text accessibilityRole="header" style={styles.title}>
    {children}
  </Text>
);
export const Copy = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.text}>{children}</Text>
);
export const Card = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.card}>{children}</View>
);
export function Action({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && { opacity: 0.5 }]}
    >
      <Text style={{ color: palette.primaryText, fontWeight: "700", fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}
export function Input({
  label,
  value,
  onChangeText,
  numeric = false,
  secret = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  numeric?: boolean;
  secret?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={numeric ? "decimal-pad" : "default"}
        secureTextEntry={secret}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}
