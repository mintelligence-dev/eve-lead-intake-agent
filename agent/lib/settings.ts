import { sql } from "./db";

// Small key → JSON store for app-wide settings (table app_settings, shared with
// the generated session secret in app-secret.ts).

async function ensureTable() {
  await sql()`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
}

export async function getSetting<T>(key: string): Promise<T | null> {
  await ensureTable();
  const [row] = await sql()`SELECT value FROM app_settings WHERE key = ${key}`;
  if (!row) return null;
  try {
    return JSON.parse(String(row.value)) as T;
  } catch {
    return null;
  }
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await ensureTable();
  const json = JSON.stringify(value);
  await sql()`
    INSERT INTO app_settings (key, value) VALUES (${key}, ${json})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}

export async function deleteSetting(key: string): Promise<void> {
  await ensureTable();
  await sql()`DELETE FROM app_settings WHERE key = ${key}`;
}
