import { createMemoryState } from "@chat-adapter/state-memory";
import { createPostgresState } from "@chat-adapter/state-pg";
import type { StateAdapter } from "chat";
import pg from "pg";
import { connectionOptions, databaseUrl, sql } from "./db";
import { resilientState } from "./resilient-state";

// Chat state (thread subjects, Message-IDs, subscriptions, locks, dedupe and
// follow-up counters) must survive across serverless instances, or replies
// lose "Re: <subject>" and threading. It lives in the same Postgres as the
// leads (tables chat_state_*), so no separate Redis is needed. In-memory state
// is only for local runs without a database, and the fallback when Postgres
// is unreachable (resilientState).

const KEY_PREFIX = "lead-intake";

export function createChatState(): StateAdapter {
  const raw = databaseUrl();
  if (!raw) return createMemoryState();
  const { url, ssl } = connectionOptions(raw);
  const client = new pg.Pool({
    connectionString: url,
    // Same TLS rules as db.ts: verify certificates only for verify-full.
    ssl: ssl === false ? false : { rejectUnauthorized: ssl === "verify-full" },
    // A separate pool from postgres.js; keep it small on serverless.
    max: 2,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });
  // An idle client that loses its connection must not crash the process.
  client.on("error", (error) => console.error("[lead-intake] chat state pool error", error.message));
  return resilientState(createPostgresState({ client, keyPrefix: KEY_PREFIX }), createMemoryState());
}

/**
 * Deletes expired chat state rows. The adapter only drops an expired row when
 * the same key is read again, so keys never read again (dedupe markers, daily
 * counters) would pile up. Returns the number of rows removed.
 */
export async function deleteExpiredChatState(): Promise<number> {
  const db = sql();
  const [ready] = await db`SELECT to_regclass('chat_state_cache') IS NOT NULL AS ok`;
  if (!ready?.ok) return 0;
  const results = await Promise.all([
    db`DELETE FROM chat_state_cache WHERE key_prefix = ${KEY_PREFIX} AND expires_at < now()`,
    db`DELETE FROM chat_state_locks WHERE key_prefix = ${KEY_PREFIX} AND expires_at < now()`,
    db`DELETE FROM chat_state_lists WHERE key_prefix = ${KEY_PREFIX} AND expires_at < now()`,
    db`DELETE FROM chat_state_queues WHERE key_prefix = ${KEY_PREFIX} AND expires_at < now()`,
  ]);
  return results.reduce((total, result) => total + result.count, 0);
}
