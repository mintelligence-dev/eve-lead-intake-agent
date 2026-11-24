import postgres from "postgres";
import { leadStoreConfig } from "./store-config";

// One Postgres client per server instance, for any provider (Neon, Supabase,
// Prisma Postgres, AWS RDS, self-hosted). Prefer the provider's *pooled* URL on
// serverless (Neon "-pooler" host, Supabase port 6543): each function instance
// keeps only a couple of connections.

let client: postgres.Sql | null = null;

/** The configured database URL, if any. */
export function databaseUrl(): string | undefined {
  return leadStoreConfig().databaseUrl || undefined;
}

export function sql(): postgres.Sql {
  if (client) return client;
  const raw = databaseUrl();
  if (!raw) throw new Error("No database is configured for the lead store (databaseUrl).");
  const { url, ssl } = connectionOptions(raw);
  client = postgres(url, {
    ssl,
    // Transaction-mode poolers (Neon -pooler, Supabase 6543, PgBouncer) don't
    // support prepared statements.
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    // Treat a missing value as NULL instead of throwing.
    transform: { undefined: null },
    // Schema setup uses IF NOT EXISTS; its "already exists" notices are noise.
    onnotice: () => {},
  });
  return client;
}

export type Ssl = "require" | "allow" | "prefer" | "verify-full" | false;

/**
 * Drops URL options the driver would forward to the server as settings
 * (Neon adds channel_binding) and turns sslmode into the driver's ssl option.
 * Without sslmode, TLS is required for every host except localhost.
 */
export function connectionOptions(raw: string): { url: string; ssl: Ssl } {
  const url = new URL(raw);
  url.searchParams.delete("channel_binding");
  const mode = url.searchParams.get("sslmode");
  url.searchParams.delete("sslmode");
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
  return { url: url.toString(), ssl: sslFor(mode, local) };
}

function sslFor(mode: string | null, local: boolean): Ssl {
  if (mode === "disable") return false;
  if (mode === "allow" || mode === "prefer" || mode === "verify-full") return mode;
  if (mode) return "require"; // require, verify-ca
  return local ? false : "require";
}
