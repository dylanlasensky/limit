import { functionResponseSchema } from "../packages/contracts/functions";
import { aiFunction } from "./ai-functions";
import { requireAiConsent } from "../packages/domain/aiConsent.js";
import { z } from "zod";
import { authFor } from "./auth";
import { Repository } from "./repository";
import { ApiError, readJson } from "./errors";
import { rateLimit } from "./rate-limit";
import { entityNames, recordSchema, type EntityName } from "../packages/contracts/entities";
import { upload, privateFile, mediaInfo, mediaAsset } from "./files";
export { AccountCoordinator } from "./coordinator";
export { LimitCoach } from "./coach";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url),
      requestId = crypto.randomUUID(),
      started = Date.now();
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    let response: Response;
    let stage = "route";
    try {
      if (url.pathname === "/api/health")
        return Response.json(
          {
            status: "ok",
            environment: env.ENVIRONMENT,
            sourceRevision: env.SOURCE_REVISION,
            version: env.CF_VERSION_METADATA?.id || "local",
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      if (url.pathname === "/api/config")
        return Response.json({
          emailEnabled: env.EMAIL_ENABLED === "true" && !!env.EMAIL_FROM && !!env.RESEND_API_KEY,
          socialProviders: [],
        });
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
        const origin = request.headers.get("origin");
        if (
          origin &&
          origin !== env.APP_ORIGIN &&
          origin !== "limit://" &&
          !(
            env.ENVIRONMENT === "local" &&
            ["http://localhost:5173", "http://127.0.0.1:5173"].includes(origin)
          )
        )
          throw new ApiError("Untrusted origin.", 403, "ORIGIN_REJECTED");
      }
      if (url.pathname.startsWith("/api/auth/")) {
        stage = "auth-handler";
        if (
          !(env.EMAIL_ENABLED === "true" && env.EMAIL_FROM && env.RESEND_API_KEY) &&
          /request-password-reset|send-verification-email/.test(url.pathname)
        )
          throw new ApiError(
            "Email delivery has not been configured yet.",
            503,
            "EMAIL_NOT_CONFIGURED"
          );
        if (request.method === "POST") {
          const ip = request.headers.get("cf-connecting-ip") || "local";
          const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
          const key = Array.from(new Uint8Array(digest), (n) =>
            n.toString(16).padStart(2, "0")
          ).join("");
          await rateLimit(env.DB, "auth:" + key, 25);
        }
        response = await env.ACCOUNT_COORDINATOR.getByName("authentication").fetch(request);
      } else {
        const parts = url.pathname.split("/").filter(Boolean);
        const name = parts[2] as EntityName;
        if (parts[1] === "media") {
          if (request.method !== "GET") throw new ApiError("Method not allowed.", 405);
          response =
            parts.length === 3
              ? await mediaInfo(env, name)
              : await mediaAsset(request, env, name, Number(parts[3]), parts[4]);
        } else {
          const isPublic =
            request.method === "GET" && parts[1] === "entities" && name === "Exercise";
          if (!isPublic) stage = "session-lookup";
          const session = isPublic
            ? null
            : await authFor(env).api.getSession({ headers: request.headers });
          stage = "dispatch";
          if (!isPublic && !session)
            throw new ApiError("Sign in to continue.", 401, "UNAUTHORIZED");
          const user = session?.user;
          const repo = new Repository(env.DB, user?.id || "");
          if (parts[1] === "me" && request.method === "GET") response = Response.json(user);
          else if (parts[1] === "entities" && entityNames.includes(name)) {
            const entity = repo.entity(name),
              id = parts[3];
            if (request.method === "GET") {
              for (const key of url.searchParams.keys())
                if (!["filter", "sort", "limit", "skip"].includes(key))
                  throw new ApiError("Unknown query parameter.");
              let filter;
              try {
                filter = JSON.parse(url.searchParams.get("filter") || "{}");
              } catch {
                throw new ApiError("Invalid filter.");
              }
              const data = id
                ? await entity.get(id)
                : await entity.filter(
                    filter,
                    url.searchParams.get("sort") || "created_date",
                    Number(url.searchParams.get("limit") || 1000),
                    Number(url.searchParams.get("skip") || 0)
                  );
              response = Response.json(
                id ? recordSchema(name).parse(data) : recordSchema(name).array().parse(data)
              );
            } else {
              if (!user) throw new ApiError("Sign in to continue.", 401);
              const method =
                request.method === "DELETE"
                  ? "delete"
                  : request.method === "PATCH"
                    ? "update"
                    : request.method === "POST"
                      ? id || "create"
                      : "";
              const input = request.method === "DELETE" ? null : await readJson(request);
              stage = "entity-coordinator";
              const serialized = await env.ACCOUNT_COORDINATOR.getByName(user.id).execute(user, {
                kind: "entity",
                name,
                method,
                id,
                input,
              });
              const result = JSON.parse(serialized) as { data: unknown; status: number };
              stage = "entity-response";
              response = Response.json(result.data, { status: result.status });
            }
          } else if (parts[1] === "uploads" && user) {
            if (request.method === "POST") {
              await rateLimit(env.DB, "upload:" + user.id, 10);
              response = await upload(request, env, user.id);
            } else if (request.method === "GET" && parts[2])
              response = await privateFile(env, user.id, parts[2]);
            else throw new ApiError("Method not allowed.", 405);
          } else if (parts[1] === "functions" && user && request.method === "POST") {
            const input = await readJson(request);
            if (parts[2] === "askLimitCoach") {
              requireAiConsent(input);
              const query = z
                .object({ question: z.string().min(1).max(1000), propose: z.boolean().optional() })
                .parse(input);
              await rateLimit(env.DB, "ai:" + user.id, 8);
              const data = await env.COACH.getByName(user.id).advise(
                user.id,
                query.question,
                query.propose === true
              );
              response = new Response(
                JSON.stringify(functionResponseSchema(name, input).parse(JSON.parse(data))),
                {
                  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
                }
              );
            } else if (["parseWorkoutRegimen", "analyzeFoodPhoto"].includes(parts[2])) {
              await rateLimit(env.DB, "ai:" + user.id, 8);
              response = Response.json(
                functionResponseSchema(name, input).parse(
                  await aiFunction(parts[2], input, env, user.id)
                )
              );
            } else {
              const kind = (
                {
                  workoutCommand: "workout",
                  exportAccount: "export",
                  deleteAccount: "delete",
                  approvePlan: "approve",
                } as Record<string, string>
              )[name];
              if (!kind)
                throw new ApiError(
                  "This feature is temporarily unavailable. Your data is unchanged.",
                  503,
                  "FEATURE_UNAVAILABLE"
                );
              await rateLimit(env.DB, kind + ":" + user.id, kind === "workout" ? 120 : 3);
              const serialized = await env.ACCOUNT_COORDINATOR.getByName(user.id).execute(user, {
                kind,
                input,
              });
              const result = JSON.parse(serialized) as { data: unknown; status: number };
              response = Response.json(
                result.status === 200
                  ? functionResponseSchema(name, input).parse(result.data)
                  : result.data,
                { status: result.status }
              );
            }
          } else throw new ApiError("Route not found.", 404, "NOT_FOUND");
        }
      }
    } catch (error) {
      const e = error as Error & { status?: number; code?: string };
      if (error instanceof z.ZodError) {
        e.status = 400;
        e.message = "Invalid request data.";
      }
      if (!e.status || e.status >= 500)
        console.error(JSON.stringify({ event: "api_failure", stage }));
      response = Response.json(
        {
          error: e.status ? e.message : "Something went wrong. Please try again.",
          code: e.code || "REQUEST_FAILED",
          requestId,
        },
        { status: e.status || 500 }
      );
    }
    const headers = new Headers(response.headers);
    headers.set("X-Request-Id", requestId);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("X-Frame-Options", "DENY");
    if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");
    // Log operational metadata only. Never log paths with user IDs, bodies, prompts or cookies.
    console.log(
      JSON.stringify({
        event: "api_request",
        requestId,
        method: request.method,
        status: response.status,
        durationMs: Date.now() - started,
      })
    );
    ctx.waitUntil(
      env.DB.prepare("DELETE FROM api_rate_limits WHERE reset_at < ?")
        .bind(Date.now() - 86400000)
        .run()
        .catch(() => {})
    );
    return new Response(response.body, { status: response.status, headers });
  },
} satisfies ExportedHandler<Env>;
