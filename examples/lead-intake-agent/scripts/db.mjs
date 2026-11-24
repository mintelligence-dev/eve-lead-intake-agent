// Postgres client for the scripts in this folder (same options as packages/eve/extension/lib/db.ts).
import postgres from "postgres";

export function connect() {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!raw) throw new Error("DATABASE_URL (or POSTGRES_URL) is required");
  const url = new URL(raw);
  url.searchParams.delete("channel_binding");
  const mode = url.searchParams.get("sslmode");
  url.searchParams.delete("sslmode");
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
  const ssl =
    mode === "disable" ? false
    : ["allow", "prefer", "verify-full"].includes(mode) ? mode
    : mode ? "require"
    : local ? false : "require";
  return postgres(url.toString(), { ssl, prepare: false, max: 1, transform: { undefined: null }, onnotice: () => {} });
}
