import { entitySchemas, type EntityName } from "../packages/contracts/entities";
import { tables, relations } from "../packages/contracts/tables";
import { ApiError } from "./errors";

export type Data = Record<string, any>;
type Stored = {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  data: string;
};
const metadata = new Set(["id", "ownerId", "created_by_id", "created_date", "updated_date"]);
export const serverOnly = new Set<EntityName>([
  "Exercise",
  "ExerciseSet",
  "WorkoutSession",
  "PersonalRecord",
  "MuscleRatingSnapshot",
]);
function decoded(row: Stored): Data {
  return {
    ...JSON.parse(row.data),
    id: row.id,
    ownerId: row.owner_id || "",
    created_by_id: row.owner_id || "",
    created_date: row.created_at,
    updated_date: row.updated_at,
  };
}
export class Repository {
  constructor(
    private db: D1Database,
    readonly ownerId: string,
    private internal = false
  ) {}
  entity(name: EntityName) {
    const table = tables[name];
    if (!table) throw new ApiError("Unknown resource.", 404);
    const fields = new Set([...Object.keys(entitySchemas[name].shape), ...metadata]);
    const expr = (key: string) => {
      if (!fields.has(key)) throw new ApiError("Unknown query field.");
      return (
        (
          {
            id: "id",
            ownerId: "owner_id",
            created_by_id: "owner_id",
            created_date: "created_at",
            updated_date: "updated_at",
          } as Record<string, string>
        )[key] || `json_extract(data, '$.${key}')`
      );
    };
    const query = (
      filter: Data = {},
      depth = 0
    ): { sql: string; params: (string | number | null)[] } => {
      if (
        depth > 4 ||
        !filter ||
        Array.isArray(filter) ||
        typeof filter !== "object" ||
        Object.keys(filter).length > 30
      )
        throw new ApiError("Invalid filter.");
      const parts: string[] = [],
        params: (string | number | null)[] = [];
      const bind = (v: unknown): string | number | null => {
        if (typeof v === "boolean") return +v;
        if (v === null || typeof v === "string" || (typeof v === "number" && Number.isFinite(v)))
          return v;
        throw new ApiError("Invalid filter value.");
      };
      for (const [key, value] of Object.entries(filter)) {
        if (key === "$or" || key === "$and") {
          if (!Array.isArray(value) || value.length > 30 || !value.length)
            throw new ApiError("Invalid filter.");
          const clauses = value.map((v) => query(v, depth + 1));
          parts.push("(" + clauses.map((c) => c.sql).join(key === "$or" ? " OR " : " AND ") + ")");
          params.push(...clauses.flatMap((c) => c.params));
          continue;
        }
        const column = expr(key);
        if (value && typeof value === "object" && !Array.isArray(value)) {
          for (const [op, v] of Object.entries(value)) {
            if (op === "$in") {
              if (!Array.isArray(v) || v.length > 1000) throw new ApiError("Invalid list filter.");
              parts.push(v.length ? `${column} IN (${v.map(() => "?").join(",")})` : "0");
              params.push(...v.map(bind));
            } else if (op === "$exists" && typeof v === "boolean")
              parts.push(`${column} IS ${v ? "NOT " : ""}NULL`);
            else {
              const operators: Record<string, string> = {
                $gte: ">=",
                $lte: "<=",
                $gt: ">",
                $lt: "<",
                $ne: "!=",
              };
              if (!operators[op]) throw new ApiError("Unknown filter operator.");
              parts.push(`${column} ${operators[op]} ?`);
              params.push(bind(v));
            }
          }
        } else if (value === null) parts.push(`${column} IS NULL`);
        else {
          parts.push(`${column} = ?`);
          params.push(bind(value));
        }
      }
      return { sql: parts.join(" AND ") || "1", params };
    };
    const scope = name === "Exercise" ? "1" : "owner_id = ?";
    const scopeParams = name === "Exercise" ? [] : [this.ownerId];
    const get = async (id: string) => {
      if (typeof id !== "string" || !id || id.length > 150) throw new ApiError("Invalid ID.");
      const row = await this.db
        .prepare(`SELECT * FROM ${table} WHERE id = ? AND ${scope}`)
        .bind(id, ...scopeParams)
        .first<Stored>();
      if (!row) throw new ApiError("Record not found.", 404);
      return decoded(row);
    };
    const filter = async (where: Data = {}, sort = "created_date", limit = 1000, skip = 0) => {
      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 2000 ||
        !Number.isInteger(skip) ||
        skip < 0 ||
        skip > 100000
      )
        throw new ApiError("Invalid pagination.");
      const q = query(where);
      if (typeof sort !== "string") throw new ApiError("Invalid sort.");
      const desc = sort.startsWith("-");
      const order = expr(desc ? sort.slice(1) : sort);
      const result = await this.db
        .prepare(
          `SELECT * FROM ${table} WHERE ${scope} AND (${q.sql}) ORDER BY ${order} ${desc ? "DESC" : "ASC"}, id ASC LIMIT ? OFFSET ?`
        )
        .bind(...scopeParams, ...q.params, limit, skip)
        .all<Stored>();
      return result.results.map(decoded);
    };
    const writable = () => {
      if (!this.internal && serverOnly.has(name))
        throw new ApiError("This resource is managed by the server.", 403);
    };
    const clean = (input: Data, partial = false) => {
      if (!input || Array.isArray(input) || typeof input !== "object")
        throw new ApiError("Invalid record.");
      const forbidden = [
        "ownerId",
        "created_by_id",
        "role",
        "workoutLockToken",
        "workoutLockUntil",
      ];
      if (!this.internal && forbidden.some((k) => k in input))
        throw new ApiError("Server-owned fields cannot be changed.", 403);
      const candidate = Object.fromEntries(Object.entries(input).filter(([k]) => !metadata.has(k)));
      const parsed = (partial ? entitySchemas[name].partial() : entitySchemas[name]).safeParse(
        candidate
      );
      if (!parsed.success)
        throw new ApiError(
          "Invalid " +
            name +
            " data: " +
            parsed.error.issues
              .slice(0, 2)
              .map((i) => i.path.join(".") + " " + i.message)
              .join("; ")
        );
      if (name === "WorkoutPlan" && !this.internal && (parsed.data as Data).active)
        throw new ApiError("Activate a validated plan through the workout API.", 403);
      return parsed.data as Data;
    };
    const related = async (data: Data) => {
      for (const [field, target] of Object.entries(
        (relations as Record<string, Record<string, EntityName>>)[name] || {}
      )) {
        if (data[field]) await this.entity(target).get(data[field]);
        else if (["planId", "workoutDayId", "workoutSessionId"].includes(field))
          throw new ApiError("Missing " + field + ".");
      }
    };
    const create = async (input: Data) => {
      writable();
      const data = clean(input);
      await related(data);
      const id = crypto.randomUUID(),
        now = new Date().toISOString();
      const keys = Object.keys((relations as Record<string, Record<string, string>>)[name] || {});
      const columns = [
        "id",
        "owner_id",
        "created_at",
        "updated_at",
        "data",
        ...keys.map((k) => `"${k}"`),
      ];
      await this.db
        .prepare(
          `INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`
        )
        .bind(id, this.ownerId, now, now, JSON.stringify(data), ...keys.map((k) => data[k] || null))
        .run();
      return get(id);
    };
    const update = async (id: string, input: Data, condition?: Data) => {
      writable();
      const old = await get(id),
        patch = clean(input, true),
        data = clean({
          ...Object.fromEntries(Object.entries(old).filter(([key]) => !metadata.has(key))),
          ...patch,
        });
      await related(data);
      const keys = Object.keys((relations as Record<string, Record<string, string>>)[name] || {});
      const q = query(condition || {}),
        now = new Date().toISOString();
      const result = await this.db
        .prepare(
          `UPDATE ${table} SET data = ?, updated_at = ? ${keys.map((k) => `, "${k}" = ?`).join("")} WHERE id = ? AND ${scope} AND updated_at = ? AND (${q.sql})`
        )
        .bind(
          JSON.stringify(data),
          now,
          ...keys.map((k) => data[k] || null),
          id,
          ...scopeParams,
          old.updated_date,
          ...q.params
        )
        .run();
      if (!result.meta.changes)
        throw new ApiError("Record changed. Reload before saving.", 409, "CONFLICT");
      return get(id);
    };
    return {
      get,
      filter,
      list: (sort = "created_date", limit = 1000, skip = 0) => filter({}, sort, limit, skip),
      create,
      update,
      bulkCreate: async (rows: Data[]) => {
        if (!Array.isArray(rows) || rows.length > 100) throw new ApiError("Invalid batch.");
        const result = [];
        for (const row of rows) result.push(await create(row));
        return result;
      },
      delete: async (id: string) => {
        writable();
        await get(id);
        await this.db
          .prepare(`DELETE FROM ${table} WHERE id = ? AND ${scope}`)
          .bind(id, ...scopeParams)
          .run();
        return { success: true };
      },
      updateMany: async (where: Data, change: { $set: Data }) => {
        writable();
        if (!change?.$set) throw new ApiError("Invalid update.");
        const rows = await filter(where);
        for (const row of rows) await update(row.id, change.$set, where);
        return { success: true, modified_count: rows.length, updated: rows.length };
      },
      deleteMany: async (where: Data) => {
        writable();
        const q = query(where);
        await this.db
          .prepare(`DELETE FROM ${table} WHERE ${scope} AND (${q.sql})`)
          .bind(...scopeParams, ...q.params)
          .run();
        return { success: true };
      },
    };
  }
  get entities() {
    return Object.fromEntries(
      Object.keys(tables).map((name) => [name, this.entity(name as EntityName)])
    ) as Record<EntityName, ReturnType<Repository["entity"]>>;
  }
}
