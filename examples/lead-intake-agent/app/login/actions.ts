"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@eve-lead-intake/eve/desk";
import { desk } from "@/lead.desk";
import { checkCredentials } from "@/lib/credentials";

export type LoginState = { readonly error?: string; readonly username?: string };

// Only allow redirects back to a path on this site.
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!(await checkCredentials(username, password))) {
    return { error: (await getI18n()).t.login.wrong, username };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await desk.createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
