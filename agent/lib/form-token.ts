import { appSecret } from "./app-secret";
import { hmac, safeEqual } from "./session";

// Signed, expiring links to the customer contact form: /f/<id>.<expiry>.<sig>.
// The signature binds the lead id, so changing the number in the URL fails —
// a link only ever opens its own lead. No login needed by the customer.

const FORM_LINK_DAYS = 14;

async function secret(): Promise<string | null> {
  return process.env.LEAD_FORM_SECRET || (await appSecret());
}

const sign = async (key: string, id: number, expiresAt: number) =>
  (await hmac(key, `lead-form:${id}:${expiresAt}`)).slice(0, 32);

export async function createFormToken(leadId: number): Promise<string | null> {
  const key = await secret();
  if (!key) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + FORM_LINK_DAYS * 24 * 60 * 60;
  return `${leadId}.${expiresAt}.${await sign(key, leadId, expiresAt)}`;
}

export type FormTokenCheck = { readonly ok: true; readonly leadId: number } | { readonly ok: false; readonly expired: boolean };

export async function verifyFormToken(token: string): Promise<FormTokenCheck> {
  const key = await secret();
  const match = /^(\d{1,12})\.(\d{1,12})\.([0-9a-f]{32})$/.exec(token);
  if (!key || !match) return { ok: false, expired: false };
  const leadId = Number(match[1]);
  const expiresAt = Number(match[2]);
  if (!(await safeEqual(match[3]!, await sign(key, leadId, expiresAt)))) return { ok: false, expired: false };
  if (expiresAt < Date.now() / 1000) return { ok: false, expired: true };
  return { ok: true, leadId };
}

/** The app's public origin for links in emails, or null if unknown. */
export function publicAppUrl(): string | null {
  const explicit = process.env.PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : null;
}

export async function formUrl(leadId: number): Promise<string | null> {
  const base = publicAppUrl();
  const token = await createFormToken(leadId);
  return base && token ? `${base}/f/${token}` : null;
}
