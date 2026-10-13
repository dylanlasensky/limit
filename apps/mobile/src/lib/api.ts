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
export function list<N extends EntityName>(
  name: N,
  filter: Record<string, unknown> = {},
  options: { sort?: string; limit?: number; skip?: number } = {}
) {
  const params = new URLSearchParams({ filter: JSON.stringify(filter) });
  if (options.sort) params.set("sort", options.sort);
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.skip !== undefined) params.set("skip", String(options.skip));
  return request("/entities/" + name + "?" + params, recordSchema(name).array());
}
export function get<N extends EntityName>(name: N, id: string) {
  return request("/entities/" + name + "/" + encodeURIComponent(id), recordSchema(name));
}
export function create<N extends EntityName>(name: N, data: unknown) {
  return request("/entities/" + name, recordSchema(name), data);
}
export function update<N extends EntityName>(name: N, id: string, data: unknown) {
  return requestWithMethod(
    "/entities/" + name + "/" + encodeURIComponent(id),
    "PATCH",
    recordSchema(name),
    data
  );
}
export function bulkCreate<N extends EntityName>(name: N, data: unknown[]) {
  return request("/entities/" + name + "/bulkCreate", recordSchema(name).array(), data);
}
async function requestWithMethod<T>(
  path: string,
  method: string,
  schema: z.ZodType<T>,
  body: unknown
): Promise<T> {
  const cookie = Platform.OS === "web" ? "" : await auth.getCookie();
  const response = await fetch(origin + "/api" + path, {
    method,
    credentials: Platform.OS === "web" ? "include" : "omit",
    headers: {
      ...(Platform.OS === "web" ? {} : { Cookie: cookie || "" }),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || "Could not save. Try again.");
  return schema.parse(data);
}
export function command(body: unknown) {
  return request("/functions/workoutCommand", functionResponseSchema("workoutCommand", body), body);
}
