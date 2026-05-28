import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const dbUrl = process.env.DATABASE_URL || "sqlite.db";
const sqlite = new Database(dbUrl);
export const db = drizzle(sqlite, { schema });
