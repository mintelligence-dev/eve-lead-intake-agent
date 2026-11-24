import { sql } from "./db";
import { leadStoreConfig } from "./store-config";

// The secret that signs login cookies and customer form links. Taken from
// the configured sessionSecret when set; otherwise generated once and stored in the
// database (table app_settings), so a new deployment doesn't have to invent
// one. Every instance (Next.js pages and the eve service) reads the same row.
// Anyone with database access can read it, the same as the leads themselves.

let stored: Promise<string | null> | null = null;

export function appSecret(): Promise<string | null> {
  const configured = leadStoreConfig().sessionSecret;
  if (configured) return Promise.resolve(configured);
  stored ??= loadOrCreate().catch((error: unknown) => {
    // Fail closed (no login, no form links) and try again on the next call.
    stored = null;
    console.error("[auth] could not load the generated session secret", error);
    return null;
  });
  return stored;
}

async function loadOrCreate(): Promise<string | null> {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  // First writer wins, so concurrent cold starts agree on one secret.
  const random = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
  await db`
    INSERT INTO app_settings (key, value) VALUES ('session_secret', ${random})
    ON CONFLICT (key) DO NOTHING`;
  const [row] = await db`SELECT value FROM app_settings WHERE key = 'session_secret'`;
  return row ? String(row.value) : null;
}
