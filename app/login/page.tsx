import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getI18n()).t.login.title} · Lead Intake Bot` };
}

export default async function LoginPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const { t } = await getI18n();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <ThemeToggle className="fixed top-3 right-6" />
      <div className="w-full max-w-sm">
        <LoginForm next={next} />
        <p className="mt-6 text-center text-muted-foreground text-xs">
          © {process.env.COMPANY_NAME || "M Intelligence"} · {t.login.footer}
        </p>
      </div>
    </main>
  );
}
