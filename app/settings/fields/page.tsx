import { SheetIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getLeadFields, usingDefaultFields } from "../../../agent/lib/field-config";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";
import { FieldsEditor } from "./fields-editor";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getI18n()).t.common.fieldSettings} · Lead Intake Bot` };
}

export default async function FieldSettingsPage() {
  const [fields, isDefault, { t }] = await Promise.all([
    getLeadFields(),
    usingDefaultFields().catch(() => true),
    getI18n(),
  ]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-medium text-2xl tracking-tight">{t.fields.pageTitle}</h1>
          <p className="text-muted-foreground text-sm">
            {t.fields.pageIntro}
            {isDefault ? t.fields.usingDefaults : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/leads">
              <SheetIcon className="size-4" />
              {t.common.leads}
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>
      <FieldsEditor initialFields={[...fields]} />
    </main>
  );
}
