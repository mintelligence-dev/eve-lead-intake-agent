// Admin login session: a signed, expiring cookie shared by the web pages and
// the extension's admin route. Signed with appSecret() (configured or
// generated, see app-secret.ts). An unavailable secret fails closed.
// Checking the username and password is up to the app that shows the login.

import { createSessionToken as sign, verifySessionToken as verify } from "@eve-lead-intake/core";
import { appSecret } from "./app-secret";

export const SESSION_COOKIE = "lead_admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** True when a login secret is available (configured, or loaded from the database). */
export async function sessionSecretAvailable(): Promise<boolean> {
  return (await appSecret()) !== null;
}

export async function createSessionToken(): Promise<string> {
  const secret = await appSecret();
  if (!secret) throw new Error("Session secret is unavailable (sessionSecret or the database).");
  return sign(secret, SESSION_MAX_AGE_SECONDS);
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const secret = await appSecret();
  return secret ? verify(secret, token) : false;
}

export function readSessionCookie(request: Request): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/**
 * True for a request that carries a valid admin session cookie. Cross-site
 * browser requests are rejected so the cookie can't be ridden.
 */
export async function isAdminRequest(request: Request): Promise<boolean> {
  if (request.headers.has("origin") && request.headers.get("sec-fetch-site") !== "same-origin") return false;
  return verifySessionToken(readSessionCookie(request));
}
