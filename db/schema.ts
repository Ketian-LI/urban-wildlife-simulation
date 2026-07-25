import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const presenceSessions = sqliteTable(
  "presence_sessions",
  {
    id: text("id").primaryKey(),
    lastSeen: integer("last_seen").notNull(),
  },
  (table) => [index("presence_sessions_last_seen_idx").on(table.lastSeen)],
);
