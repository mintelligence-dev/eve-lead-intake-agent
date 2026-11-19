import type { AuthFn } from "eve/channels/auth";
import { readSessionCookie, verifySessionToken } from "./session";

// Accepts requests carrying a valid admin session cookie (set by /login).
// Cross-site browser requests are rejected so the cookie can't be ridden.
export const appAuth: AuthFn<Request> = async (request) => {
  if (request.headers.has("origin") && request.headers.get("sec-fetch-site") !== "same-origin")
    return null;

  if (!(await verifySessionToken(readSessionCookie(request)))) return null;

  return {
    attributes: {},
    authenticator: "admin-session",
    issuer: "lead-intake-admin",
    principalId: "admin",
    principalType: "user",
  };
};
