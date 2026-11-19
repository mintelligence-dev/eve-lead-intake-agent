import type { StateAdapter } from "chat";

// Chat state (thread subjects, Message-IDs, dedupe, follow-up counts) lives in
// a shared store (Postgres, see chat-state.ts). If that store is unreachable,
// every call would fail or hang and no email could be taken in at all.
// Instead, fall back to in-memory state: the cost is weaker dedupe/threading
// across instances until the store is back.

const CALL_TIMEOUT_MS = 3_000;
const RETRY_PRIMARY_AFTER_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`state call timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function resilientState(primary: StateAdapter, fallback: StateAdapter): StateAdapter {
  // While degraded, skip the primary entirely (no 3 s wait per call); try it
  // again after RETRY_PRIMARY_AFTER_MS.
  let degradedUntil = 0;

  const degrade = (method: string, error: unknown) => {
    if (Date.now() >= degradedUntil) {
      console.error(
        `[lead-intake] Shared chat state unavailable (${method}); using in-memory state for ${RETRY_PRIMARY_AFTER_MS / 1000}s`,
        error instanceof Error ? error.message : error,
      );
    }
    degradedUntil = Date.now() + RETRY_PRIMARY_AFTER_MS;
  };

  return new Proxy(primary, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);
      if (typeof original !== "function") return original;
      const method = String(prop);
      return async (...args: unknown[]) => {
        const viaFallback = () =>
          (Reflect.get(fallback, prop) as (...a: unknown[]) => Promise<unknown>).apply(fallback, args);
        if (method === "connect") {
          await fallback.connect();
        } else if (Date.now() < degradedUntil) {
          return viaFallback();
        }
        const call = (original as (...a: unknown[]) => Promise<unknown>).apply(target, args);
        // A timed-out call may still reject later; don't let that go unhandled.
        Promise.resolve(call).catch(() => {});
        try {
          return await withTimeout(Promise.resolve(call), CALL_TIMEOUT_MS);
        } catch (error) {
          degrade(method, error);
          return method === "connect" ? undefined : viaFallback();
        }
      };
    },
  });
}
