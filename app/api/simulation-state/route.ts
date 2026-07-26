import { eq } from "drizzle-orm";
import { simulationSaves } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

const MAX_STATE_BYTES = 256_000;
const MAX_PIGEONS = 50;

async function ownerIdForEmail(email: string) {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function noStoreJson(body: unknown, status = 200) {
  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) {
    return noStoreJson({ error: "Sign in is required." }, 401);
  }

  try {
    const { ensureSimulationSaveSchema, getDb } = await import("../../../db");
    await ensureSimulationSaveSchema();
    const ownerId = await ownerIdForEmail(user.email);
    const [saved] = await getDb()
      .select({
        stateJson: simulationSaves.stateJson,
        updatedAt: simulationSaves.updatedAt,
      })
      .from(simulationSaves)
      .where(eq(simulationSaves.ownerId, ownerId))
      .limit(1);

    if (!saved) {
      return noStoreJson({ state: null, updatedAt: null });
    }

    return noStoreJson({
      state: JSON.parse(saved.stateJson),
      updatedAt: saved.updatedAt,
    });
  } catch {
    return noStoreJson({ error: "Cloud save is temporarily unavailable." }, 503);
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return noStoreJson({ error: "Sign in is required." }, 401);
  }

  try {
    const rawPayload = await request.text();
    if (new TextEncoder().encode(rawPayload).byteLength > MAX_STATE_BYTES) {
      return noStoreJson({ error: "The save is too large." }, 413);
    }

    const payload = JSON.parse(rawPayload) as { state?: unknown };
    const state = payload.state;
    if (
      !state ||
      typeof state !== "object" ||
      !Array.isArray((state as { pigeons?: unknown }).pigeons) ||
      (state as { pigeons: unknown[] }).pigeons.length > MAX_PIGEONS
    ) {
      return noStoreJson({ error: "A valid simulation state is required." }, 400);
    }

    const { ensureSimulationSaveSchema, getDb } = await import("../../../db");
    await ensureSimulationSaveSchema();
    const ownerId = await ownerIdForEmail(user.email);
    const updatedAt = Date.now();
    const stateJson = JSON.stringify(state);

    await getDb()
      .insert(simulationSaves)
      .values({ ownerId, stateJson, updatedAt })
      .onConflictDoUpdate({
        target: simulationSaves.ownerId,
        set: { stateJson, updatedAt },
      });

    return noStoreJson({ updatedAt });
  } catch {
    return noStoreJson({ error: "Cloud save is temporarily unavailable." }, 503);
  }
}
