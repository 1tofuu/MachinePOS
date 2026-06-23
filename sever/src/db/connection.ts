import { drizzle } from "drizzle-orm/sqlite-proxy";
import sqlite3 from "sqlite3";
import * as schema from "./schema.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const dbUrl = process.env.DATABASE_URL || "sqlite.db";
const sqliteDb = new sqlite3.Database(dbUrl);

// Wrap the callback-based sqlite3 API into the async proxy callback
// that drizzle-orm/sqlite-proxy expects: (sql, params, method) => Promise<{ rows }>
const callback = (
  sql: string,
  params: unknown[],
  method: "run" | "all" | "get" | "values"
): Promise<{ rows: unknown[] }> => {
  return new Promise((resolve, reject) => {
    if (method === "run") {
      sqliteDb.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ rows: [] });
      });
    } else if (method === "all" || method === "values") {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve({ rows: rows as unknown[] });
      });
    } else {
      // "get" — return at most one row
      sqliteDb.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve({ rows: row ? [row] : [] });
      });
    }
  });
};

export const db = drizzle(callback, { schema });

