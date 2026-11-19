// Admin login session: a signed, expiring cookie shared by the Next.js pages
// (proxy.ts, the login action) and the eve channel auth. Signed with
// appSecret() (env or generated, see app-secret.ts). Missing login settings or
// an unavailable secret fail closed.

import { appSecret } from "./app-secret";

export const SESSION_COOKIE = "lead_admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

export async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
  return Array.from(signature, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Compares two strings in constant time by HMAC-ing both with a random key.
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const key = crypto.randomUUID();
  const [ha, hb] = await Promise.all([hmac(key, a), hmac(key, b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

export async function checkCredentials(username: string, password: string): Promise<boolean> {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass || !(await appSecret())) return false;
  const [userOk, passOk] = await Promise.all([
    safeEqual(username.normalize("NFC"), expectedUser.normalize("NFC")),
    safeEqual(password.normalize("NFC"), expectedPass.normalize("NFC")),
  ]);
  return userOk && passOk;
}

export async function createSessionToken(): Promise<string> {
  const secret = await appSecret();
  if (!secret) throw new Error("Session secret is unavailable (ADMIN_SESSION_SECRET or the database).");
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  return `${expiresAt}.${await hmac(secret, `admin:${expiresAt}`)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = await appSecret();
  if (!secret) return false;
  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature || !/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) < Date.now() / 1000) return false;
  return safeEqual(signature, await hmac(secret, `admin:${expiresAt}`));
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
