// Signed, expiring tokens: the admin login cookie and the customer form link.
// Web Crypto only, so this runs in Node.js, edge runtimes and browsers alike.

const encoder = new TextEncoder();

export async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
  return Array.from(signature, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Compares two strings in constant time by HMAC-ing both with a random key. */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const key = crypto.randomUUID();
  const [ha, hb] = await Promise.all([hmac(key, a), hmac(key, b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

// ── Admin session ────────────────────────────────────────────────────────────

/** A login token `<expiry>.<signature>` valid for `maxAgeSeconds`. */
export async function createSessionToken(secret: string, maxAgeSeconds: number): Promise<string> {
  const expiresAt = nowSeconds() + maxAgeSeconds;
  return `${expiresAt}.${await hmac(secret, `admin:${expiresAt}`)}`;
}

export async function verifySessionToken(secret: string, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature || !/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) < Date.now() / 1000) return false;
  return safeEqual(signature, await hmac(secret, `admin:${expiresAt}`));
}

// ── Customer form link ───────────────────────────────────────────────────────
// `<leadId>.<expiry>.<signature>`. The signature binds the lead id, so changing
// the number in the URL fails: a link only ever opens its own lead.

const signForm = async (secret: string, leadId: number, expiresAt: number) =>
  (await hmac(secret, `lead-form:${leadId}:${expiresAt}`)).slice(0, 32);

export async function createFormToken(secret: string, leadId: number, validDays: number): Promise<string> {
  const expiresAt = nowSeconds() + validDays * 24 * 60 * 60;
  return `${leadId}.${expiresAt}.${await signForm(secret, leadId, expiresAt)}`;
}

export type FormTokenCheck =
  | { readonly ok: true; readonly leadId: number }
  | { readonly ok: false; readonly expired: boolean };

export async function verifyFormToken(secret: string, token: string): Promise<FormTokenCheck> {
  const match = /^(\d{1,12})\.(\d{1,12})\.([0-9a-f]{32})$/.exec(token);
  if (!match) return { ok: false, expired: false };
  const leadId = Number(match[1]);
  const expiresAt = Number(match[2]);
  if (!(await safeEqual(match[3]!, await signForm(secret, leadId, expiresAt)))) return { ok: false, expired: false };
  if (expiresAt < Date.now() / 1000) return { ok: false, expired: true };
  return { ok: true, leadId };
}
