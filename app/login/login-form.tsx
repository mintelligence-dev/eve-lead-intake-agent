"use client";

import { AlertCircleIcon, EyeIcon, EyeOffIcon, LockIcon, MailboxIcon, UserIcon } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/lib/i18n/client";
import { type LoginState, login } from "./actions";

export function LoginForm({ next }: { readonly next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border bg-card p-8 shadow-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <MailboxIcon className="size-6" />
        </div>
        <h1 className="font-semibold text-xl tracking-tight">Lead Intake Bot</h1>
        <p className="mt-1 text-muted-foreground text-sm">{t.login.subtitle}</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <input name="next" type="hidden" value={next ?? ""} />

        <label className="flex flex-col gap-1.5">
          <span className="font-medium text-sm">{t.login.username}</span>
          <div className="relative">
            <UserIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
            <Input
              aria-invalid={state.error ? true : undefined}
              autoComplete="username"
              autoFocus
              className="h-10 pl-9"
              defaultValue={state.username}
              key={state.username}
              name="username"
              placeholder="Username"
              required
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-medium text-sm">{t.login.password}</span>
          <div className="relative">
            <LockIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
            <Input
              aria-invalid={state.error ? true : undefined}
              autoComplete="current-password"
              className="h-10 px-9"
              name="password"
              placeholder="••••••••"
              required
              type={showPassword ? "text" : "password"}
            />
            <button
              aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
              className="-translate-y-1/2 absolute top-1/2 right-2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
              type="button"
            >
              {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </div>
        </label>

        {state.error ? (
          <div
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm"
            role="alert"
          >
            <AlertCircleIcon className="size-4 shrink-0" />
            {state.error}
          </div>
        ) : null}

        <Button className="mt-2 h-10 w-full" disabled={pending} type="submit">
          {pending ? <Spinner /> : null}
          {pending ? t.login.submitting : t.login.submit}
        </Button>
      </form>
    </div>
  );
}
