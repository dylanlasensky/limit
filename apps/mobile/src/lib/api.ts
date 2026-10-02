import { functionResponseSchema } from "../../../../packages/contracts/functions";
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { z } from "zod";
import { recordSchema, type EntityName } from "../../../../packages/contracts/entities";
export const origin =
  (Platform.OS === "web" && typeof window !== "undefined"
    ? window.location.origin
    : process.env.EXPO_PUBLIC_API_URL) || "https://limit-preview.limit-dylanlasensky.workers.dev";
export const auth = createAuthClient({
  baseURL: origin,
  plugins: [expoClient({ scheme: "limit", storagePrefix: "limit", storage: SecureStore })],
});
export async function request<T>(path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
  const cookie = Platform.OS === "web" ? "" : await auth.getCookie();
  const response = await fetch(origin + "/api" + path, {
    method: body ? "POST" : "GET",
    credentials: Platform.OS === "web" ? "include" : "omit",
    headers: {
      ...(Platform.OS === "web" ? {} : { Cookie: cookie || "" }),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || data.message || "Could not connect. Your draft is safe.");
  return schema.parse(data);
}
export function list<N extends EntityName>(name: N, filter: Record<string, unknown> = {}) {
  return request(
    "/entities/" + name + "?" + new URLSearchParams({ filter: JSON.stringify(filter) }),
    recordSchema(name).array()
  );
}
export function get<N extends EntityName>(name: N, id: string) {
  return request("/entities/" + name + "/" + encodeURIComponent(id), recordSchema(name));
}
export function command(body: unknown) {
  return request("/functions/workoutCommand", functionResponseSchema("workoutCommand", body), body);
}
