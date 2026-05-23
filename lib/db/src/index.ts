import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function resolvePersistPath(): string {
  const candidates = [
    path.join(WORKSPACE_ROOT, ".local", "imagica-db.json"),
    path.resolve(process.cwd(), ".local", "imagica-db.json"),
    path.resolve(process.cwd(), "..", "..", "..", ".local", "imagica-db.json"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

const WORKSPACE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PERSIST_PATH = resolvePersistPath();

type Row = Record<string, unknown>;
type TableName = "sketches" | "conversations" | "messages";

const tableNames = new Map<object, TableName>([
  [schema.sketchesTable, "sketches"],
  [schema.conversations, "conversations"],
  [schema.messages, "messages"],
]);

const now = () => new Date();

function getConditionValue(condition: unknown): unknown {
  const chunks = (condition as { queryChunks?: unknown[] })?.queryChunks ?? [];
  // Drizzle `eq()` stores the bound value in a Param chunk (not StringChunk/SQL fragments).
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (!chunk || typeof chunk !== "object") continue;
    if ("encoder" in chunk && "value" in chunk) {
      return (chunk as { value: unknown }).value;
    }
  }
  return undefined;
}

function matchesCondition(tableName: TableName, row: Row, condition: unknown): boolean {
  const value = getConditionValue(condition);
  if (value === undefined) return true;

  if (tableName === "conversations" && typeof value === "string") {
    return row["title"] === value;
  }

  if (tableName === "messages") {
    return row["conversationId"] === value;
  }

  return Number(row["id"]) === Number(value);
}

function reviveRow(row: Row): Row {
  const revived = { ...row };
  for (const key of ["createdAt", "updatedAt"] as const) {
    const val = revived[key];
    if (typeof val === "string") {
      revived[key] = new Date(val);
    }
  }
  return revived;
}

function loadPersistedState(): {
  rows: Record<TableName, Row[]>;
  nextIds: Record<TableName, number>;
} | null {
  try {
    if (!fs.existsSync(PERSIST_PATH)) return null;
    const raw = fs.readFileSync(PERSIST_PATH, "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(raw) as {
      rows: Record<TableName, Row[]>;
      nextIds: Record<TableName, number>;
    };
    for (const tableName of Object.keys(parsed.rows) as TableName[]) {
      parsed.rows[tableName] = parsed.rows[tableName].map(reviveRow);
    }
    return parsed;
  } catch {
    return null;
  }
}

function createMemoryDb() {
  const persisted = loadPersistedState();
  const rows: Record<TableName, Row[]> = persisted?.rows ?? {
    sketches: [],
    conversations: [],
    messages: [],
  };
  const nextIds: Record<TableName, number> = persisted?.nextIds ?? {
    sketches: 1,
    conversations: 1,
    messages: 1,
  };

  const persist = () => {
    try {
      fs.mkdirSync(path.dirname(PERSIST_PATH), { recursive: true });
      fs.writeFileSync(PERSIST_PATH, JSON.stringify({ rows, nextIds }));
    } catch {
      // Best-effort persistence for local dev without DATABASE_URL.
    }
  };

  const tableNameFor = (table: object): TableName => {
    const tableName = tableNames.get(table);
    if (!tableName) {
      throw new Error("Unsupported in-memory table");
    }
    return tableName;
  };

  const withDefaults = (tableName: TableName, values: Row): Row => {
    const timestamp = now();
    const row: Row = {
      id: nextIds[tableName]++,
      ...values,
      createdAt: values["createdAt"] ?? timestamp,
    };

    if (tableName === "sketches") {
      row["updatedAt"] = values["updatedAt"] ?? timestamp;
      row["framework"] = values["framework"] ?? "react-tailwind";
    }

    return row;
  };

  return {
    select() {
      return {
        from(table: object) {
          const tableName = tableNameFor(table);
          let result = [...rows[tableName]];

          const builder = {
            where(condition: unknown) {
              result = result.filter((row) => matchesCondition(tableName, row, condition));
              return Promise.resolve([...result]);
            },
            orderBy() {
              result = [...result].sort((a, b) => {
                const aDate = a["createdAt"] instanceof Date ? a["createdAt"].getTime() : 0;
                const bDate = b["createdAt"] instanceof Date ? b["createdAt"].getTime() : 0;
                return tableName === "messages" ? aDate - bDate : bDate - aDate;
              });
              return Promise.resolve([...result]);
            },
            then(resolve: (value: Row[]) => unknown, reject?: (reason: unknown) => unknown) {
              return Promise.resolve([...result]).then(resolve, reject);
            },
          };

          return builder;
        },
      };
    },
    insert(table: object) {
      const tableName = tableNameFor(table);
      return {
        values(values: Row) {
          const inserted = withDefaults(tableName, values);
          rows[tableName].push(inserted);
          persist();
          return {
            returning() {
              return Promise.resolve([inserted]);
            },
            then(resolve: (value: Row[]) => unknown, reject?: (reason: unknown) => unknown) {
              return Promise.resolve([inserted]).then(resolve, reject);
            },
          };
        },
      };
    },
    update(table: object) {
      const tableName = tableNameFor(table);
      return {
        set(values: Row) {
          const apply = (condition: unknown) => {
            const updated: Row[] = [];
            rows[tableName] = rows[tableName].map((row) => {
              if (!matchesCondition(tableName, row, condition)) return row;
              const next = {
                ...row,
                ...values,
                ...(tableName === "sketches" ? { updatedAt: now() } : {}),
              };
              updated.push(next);
              return next;
            });
            persist();
            return updated;
          };

          return {
            where(condition: unknown) {
              const updated = apply(condition);
              return {
                returning() {
                  return Promise.resolve(updated);
                },
                then(resolve: (value: Row[]) => unknown, reject?: (reason: unknown) => unknown) {
                  return Promise.resolve(updated).then(resolve, reject);
                },
              };
            },
          };
        },
      };
    },
    delete(table: object) {
      const tableName = tableNameFor(table);
      return {
        where(condition: unknown) {
          const deleted = rows[tableName].filter((row) =>
            matchesCondition(tableName, row, condition),
          );
          rows[tableName] = rows[tableName].filter((row) =>
            !matchesCondition(tableName, row, condition),
          );
          persist();
          return {
            returning() {
              return Promise.resolve(deleted);
            },
          };
        },
      };
    },
  };
}

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : null;

export const db: any = pool ? drizzle(pool, { schema }) : createMemoryDb();

export * from "./schema";
