import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

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
  for (const chunk of chunks) {
    if (chunk && typeof chunk === "object" && "value" in chunk) {
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

  return row["id"] === value;
}

function createMemoryDb() {
  const rows: Record<TableName, Row[]> = {
    sketches: [],
    conversations: [],
    messages: [],
  };
  const nextIds: Record<TableName, number> = {
    sketches: 1,
    conversations: 1,
    messages: 1,
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
