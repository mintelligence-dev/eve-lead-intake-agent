import { createFormToken as sign, type FormTokenCheck, verifyFormToken as verify } from "@eve-lead-intake/core";
import { appSecret } from "./app-secret";
import { leadStoreConfig } from "./store-config";

// Signed, expiring links to the customer contact form: /f/<id>.<expiry>.<sig>.
// No login needed by the customer; a link only opens its own lead.

const DEFAULT_FORM_LINK_DAYS = 14;

async function secret(): Promise<string | null> {
  return leadStoreConfig().form?.secret || (await appSecret());
}

export type { FormTokenCheck };

export async function createFormToken(leadId: number): Promise<string | null> {
  const key = await secret();
  if (!key) return null;
  return sign(key, leadId, leadStoreConfig().form?.validDays ?? DEFAULT_FORM_LINK_DAYS);
}

export async function verifyFormToken(token: string): Promise<FormTokenCheck> {
  const key = await secret();
  if (!key) return { ok: false, expired: false };
  return verify(key, token);
}

/** The app's public origin for links in emails, or null if not configured. */
export function publicAppUrl(): string | null {
  return leadStoreConfig().form?.baseUrl?.replace(/\/+$/, "") || null;
}

export async function formUrl(leadId: number): Promise<string | null> {
  const base = publicAppUrl();
  const token = await createFormToken(leadId);
  return base && token ? `${base}/f/${token}` : null;
}
