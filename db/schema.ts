import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const presenceSessions = sqliteTable(
  "presence_sessions",
  {
    id: text("id").primaryKey(),
    lastSeen: integer("last_seen").notNull(),
  },
  (table) => [index("presence_sessions_last_seen_idx").on(table.lastSeen)],
);

export const simulationSaves = sqliteTable(
  "simulation_saves",
  {
    ownerId: text("owner_id").primaryKey(),
    stateJson: text("state_json").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("simulation_saves_updated_at_idx").on(table.updatedAt)],
);
