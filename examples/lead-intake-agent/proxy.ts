import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@eve-lead-intake-extension/eve/desk";
import { desk } from "@/lead.desk";

// Sends visitors without a valid admin session to /login. eve API routes
// (including the Resend webhook) keep their own channel auth and are not matched here.
export async function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === "development") return NextResponse.next();
  if (await desk.verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") loginUrl.searchParams.set("next", next);
  return NextResponse.redirect(loginUrl);
}

export const config = { matcher: ["/", "/s/:path*", "/leads/:path*", "/settings/:path*"] };
