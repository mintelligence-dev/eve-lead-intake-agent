import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@eve-lead-intake/eve/desk";
import { desk } from "@/lead.desk";

// Server actions and route handlers are reachable by direct POST/GET, so they
// check the admin session themselves instead of relying on proxy.ts alone.
// Matches proxy.ts: no login in local development.
export async function isAdmin(): Promise<boolean> {
  if (process.env.NODE_ENV === "development") return true;
  const cookieStore = await cookies();
  return desk.verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}
