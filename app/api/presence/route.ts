import { count, gte, lt } from "drizzle-orm";
import { presenceSessions } from "../../../db/schema";

const ACTIVE_WINDOW_MS = 45_000;
const STALE_SESSION_MS = 5 * 60_000;
const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{16,128}$/;

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { sessionId?: unknown };
    const sessionId =
      typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";

    if (!SESSION_ID_PATTERN.test(sessionId)) {
      return Response.json(
        { error: "A valid anonymous session id is required." },
        { status: 400 },
      );
    }

    const { ensurePresenceSchema, getDb } = await import("../../../db");
    await ensurePresenceSchema();
    const now = Date.now();
    const db = getDb();

    await db
      .insert(presenceSessions)
      .values({ id: sessionId, lastSeen: now })
      .onConflictDoUpdate({
        target: presenceSessions.id,
        set: { lastSeen: now },
      });

    await db
      .delete(presenceSessions)
      .where(lt(presenceSessions.lastSeen, now - STALE_SESSION_MS));

    const [result] = await db
      .select({ onlineCount: count() })
      .from(presenceSessions)
      .where(gte(presenceSessions.lastSeen, now - ACTIVE_WINDOW_MS));

    return Response.json(
      {
        activeWindowMs: ACTIVE_WINDOW_MS,
        heartbeatMs: 15_000,
        onlineCount: Math.max(1, Number(result?.onlineCount) || 1),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Presence is temporarily unavailable." },
      { status: 503 },
    );
  }
}
