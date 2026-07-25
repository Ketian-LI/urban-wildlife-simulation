import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let presenceSchemaPromise: Promise<void> | null = null;

export function getD1() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return env.DB;
}

export function getDb() {
  return drizzle(getD1(), { schema });
}

export function ensurePresenceSchema() {
  if (!presenceSchemaPromise) {
    const d1 = getD1();
    presenceSchemaPromise = d1
      .batch([
        d1.prepare(`
          CREATE TABLE IF NOT EXISTS presence_sessions (
            id TEXT PRIMARY KEY NOT NULL,
            last_seen INTEGER NOT NULL
          )
        `),
        d1.prepare(`
          CREATE INDEX IF NOT EXISTS presence_sessions_last_seen_idx
          ON presence_sessions (last_seen)
        `),
      ])
      .then(() => undefined)
      .catch((error) => {
        presenceSchemaPromise = null;
        throw error;
      });
  }

  return presenceSchemaPromise;
}
