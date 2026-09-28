import { functionResponseSchema } from "../../packages/contracts/functions";
import { z } from "zod";
import { createAuthClient } from "better-auth/react";
import {
  entityNames,
  recordSchema,
  type EntityName,
  type SavedRecord,
  type ApiUser,
} from "../../packages/contracts/entities";
export const authClient = createAuthClient();
export class ApiError extends Error {
  response: { status: number; data: { error: string } };
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.response = { status, data: { error: message } };
  }
}
export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch("/api" + path, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body && typeof options.body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      data?.error || data?.message || "Could not complete this request.",
      response.status
    );
  const parsed = schema.safeParse(data);
  if (!parsed.success)
    throw new ApiError("The server returned an invalid response. Please retry.", 502);
  return parsed.data;
}
const resultSchema = z.object({
  success: z.boolean(),
  modified_count: z.number().optional(),
  updated: z.number().optional(),
});
function entity<N extends EntityName>(name: N) {
  const schema = recordSchema(name) as z.ZodType<SavedRecord<N>>;
  const route = "/entities/" + name;
  const filter = (
    filter: Record<string, unknown> = {},
    sort = "created_date",
    limit = 1000,
    skip = 0
  ) =>
    apiRequest(
      route +
        "?" +
        new URLSearchParams({
          filter: JSON.stringify(filter),
          sort,
          limit: String(limit),
          skip: String(skip),
        }),
      schema.array()
    );
  return {
    filter,
    list: (sort = "created_date", limit = 1000, skip = 0) => filter({}, sort, limit, skip),
    get: (id: string) => apiRequest(route + "/" + encodeURIComponent(id), schema),
    create: (data: object) =>
      apiRequest(route, schema, { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: object) =>
      apiRequest(route + "/" + encodeURIComponent(id), schema, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiRequest(route + "/" + encodeURIComponent(id), resultSchema, { method: "DELETE" }),
    bulkCreate: (data: object[]) =>
      apiRequest(route + "/bulkCreate", schema.array(), {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateMany: (filter: Record<string, unknown>, update: Record<string, unknown>) =>
      apiRequest(route + "/updateMany", resultSchema, {
        method: "POST",
        body: JSON.stringify({ filter, update }),
      }),
    deleteMany: (filter: Record<string, unknown>) =>
      apiRequest(route + "/deleteMany", resultSchema, {
        method: "POST",
        body: JSON.stringify({ filter }),
      }),
  };
}
type Entities = { [N in EntityName]: ReturnType<typeof entity<N>> };
async function unwrap<T>(
  promise: Promise<{ data: T; error: { message?: string; status?: number } | null }>
) {
  const result = await promise;
  if (result.error)
    throw new ApiError(result.error.message || "Sign-in failed.", result.error.status || 400);
  return result.data;
}
export const limitApi = {
  entities: Object.fromEntries(entityNames.map((name) => [name, entity(name)])) as Entities,
  auth: {
    me: async (): Promise<ApiUser> => {
      const result = await authClient.getSession();
      if (result.error)
        throw new ApiError(
          result.error.message || "Sign-in unavailable",
          result.error.status || 503
        );
      if (!result.data) throw new ApiError("Sign in to continue.", 401);
      return result.data.user;
    },
    loginViaEmailPassword: (email: string, password: string) =>
      unwrap(authClient.signIn.email({ email, password })),
    register: ({ email, password, name }: { email: string; password: string; name?: string }) =>
      unwrap(
        authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
          callbackURL: "/",
        })
      ),
    resetPasswordRequest: (email: string) =>
      unwrap(authClient.requestPasswordReset({ email, redirectTo: "/reset-password" })),
    resetPassword: ({ resetToken, newPassword }: { resetToken: string; newPassword: string }) =>
      unwrap(authClient.resetPassword({ token: resetToken, newPassword })),
    logout: async (redirect?: string) => {
      await unwrap(authClient.signOut());
      if (redirect) window.location.assign(redirect);
    },
    redirectToLogin: (returnTo = "/") =>
      window.location.assign("/login?returnTo=" + encodeURIComponent(returnTo)),
  },
  functions: {
    invoke: async (name: string, input: unknown) => ({
      data: await apiRequest(
        "/functions/" + encodeURIComponent(name),
        functionResponseSchema(name, input),
        { method: "POST", body: JSON.stringify(input) }
      ),
    }),
  },
  integrations: {
    Core: {
      UploadPrivateFile: async ({ file }: { file: File }) =>
        apiRequest("/uploads", z.object({ file_uri: z.string(), id: z.string() }), {
          method: "POST",
          headers: { "Content-Type": file.type || "text/plain" },
          body: file,
        }),
    },
  },
};
