import ExcelJS from "exceljs";
import { LEAD_SCORES, oneOf, SCORE_LABELS } from "../../../agent/lib/lead-details";
import { getLeadFields } from "../../../agent/lib/field-config";
import { exportFields, fieldLabel, optionLabel } from "../../../agent/lib/lead-schema";
import { type Lead, listLeads } from "../../../agent/lib/leads-db";
import { isAdmin } from "@/lib/require-admin";
import { formatLeadDate } from "../status";
import type { Messages } from "@/lib/i18n/messages";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// Downloads the leads table (respecting the current search) as an .xlsx file.
export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });

  const params = new URL(request.url).searchParams;
  const leads = await listLeads(params.get("q") ?? undefined, {
    view: (["spam", "test"] as const).find((v) => v === params.get("view")) ?? "leads",
    score: oneOf(LEAD_SCORES, params.get("score")),
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Leads");
  // Configured fields (lead-schema.ts) get "f_"-prefixed keys so a field can't
  // collide with a built-in column.
  const fields = exportFields(await getLeadFields());
  const { locale, t } = await getI18n();
  const h = t.export;
  sheet.columns = [
    { header: h.date, key: "createdAt", width: 22 },
    { header: h.score, key: "score", width: 10 },
    { header: h.scoreReason, key: "scoreReason", width: 36 },
    { header: h.email, key: "fromEmail", width: 32 },
    ...fields.map((field) => ({
      header: fieldLabel(field, locale),
      key: `f_${field.key}`,
      width: field.type === "textarea" ? 36 : 20,
    })),
    { header: h.source, key: "detailsSource", width: 18 },
    { header: h.subject, key: "subject", width: 30 },
    { header: h.body, key: "body", width: 50 },
    { header: h.company, key: "enrichedContext", width: 50 },
    { header: h.intent, key: "intent", width: 36 },
    { header: h.status, key: "status", width: 14 },
    { header: h.notes, key: "notes", width: 36 },
  ];
  for (const lead of leads) {
    sheet.addRow({
      createdAt: formatLeadDate(lead.createdAt, locale),
      score: lead.score ? SCORE_LABELS[lead.score] : "",
      scoreReason: lead.scoreReason,
      fromEmail: lead.fromEmail,
      ...Object.fromEntries(
        fields.map((field) => [`f_${field.key}`, optionLabel(field, lead.fields[field.key] ?? "", locale)]),
      ),
      detailsSource: sourceLabel(lead, t.source),
      subject: lead.subject,
      body: lead.body,
      enrichedContext: lead.enrichedContext,
      intent: lead.intent,
      status: t.status[lead.status],
      notes: lead.notes,
    });
  }
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="leads-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

function sourceLabel(lead: Lead, labels: Messages["source"]): string {
  if (lead.detailsSource === "customer") return labels.customer;
  if (lead.formSentAt) return labels.waiting;
  return lead.detailsSource === "ai" ? labels.ai : "";
}
