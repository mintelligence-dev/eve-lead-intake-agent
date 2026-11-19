import type { Metadata } from "next";
import { verifyFormToken } from "../../../agent/lib/form-token";
import { getLeadForForm } from "../../../agent/lib/leads-db";
import { ThemeToggle } from "@/components/theme-toggle";
import { getLeadFields } from "../../../agent/lib/field-config";
import { customerFormFields } from "../../../agent/lib/lead-schema";
import { getI18n } from "@/lib/i18n/server";
import { LeadForm } from "./lead-form";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getI18n()).t.form.pageTitle,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

const COMPANY_NAME = process.env.COMPANY_NAME || "M Intelligence";

export default async function LeadFormPage({ params }: { readonly params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t } = await getI18n();
  const check = await verifyFormToken(token);
  const lead = check.ok ? await getLeadForForm(check.leadId).catch(() => null) : null;

  return (
    <main className="flex min-h-dvh justify-center bg-background px-4 py-10">
      <ThemeToggle className="fixed top-3 right-6" />
      <div className="w-full max-w-lg">
        {lead ? (
          <LeadForm
            alreadySubmitted={lead.formSubmittedAt !== null}
            companyName={COMPANY_NAME}
            fields={lead.fields}
            formFields={customerFormFields(await getLeadFields())}
            email={lead.fromEmail}
            privacyUrl={process.env.PRIVACY_POLICY_URL || null}
            token={token}
          />
        ) : (
          <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
            <h1 className="font-medium text-lg">{!check.ok && check.expired ? t.form.expiredTitle : t.form.invalid}</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              {t.form.invalidNote}
            </p>
          </div>
        )}
        <p className="mt-6 text-center text-muted-foreground text-xs">© {COMPANY_NAME}</p>
      </div>
    </main>
  );
}
