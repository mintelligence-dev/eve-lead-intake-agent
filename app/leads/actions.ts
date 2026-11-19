"use server";

import { revalidatePath } from "next/cache";
import {
  getLead,
  type Lead,
  LEAD_STATUSES,
  type LeadStatus,
  softDeleteLead,
  updateLead,
} from "../../agent/lib/leads-db";
import { LEAD_SCORES, type LeadAnalysis, oneOf } from "../../agent/lib/lead-details";
import { getLeadFields } from "../../agent/lib/field-config";
import { aiFields, cleanFieldValues, type LeadField, visibleFields } from "../../agent/lib/lead-schema";
import { isAdmin } from "@/lib/require-admin";
import { getI18n } from "@/lib/i18n/server";

export type ActionResult = { readonly error?: string };

const MAX_TEXT = 5000;

function clean(value: unknown): string {
  return String(value ?? "").trim().slice(0, MAX_TEXT);
}

export async function editLead(
  id: number,
  input: { intent: string; enrichedContext: string; status: string; notes: string; details: Record<string, string> },
): Promise<ActionResult> {
  const { t } = await getI18n();
  if (!(await isAdmin())) return { error: t.common.loginAgain };
  if (!Number.isInteger(id) || id <= 0) return { error: t.common.notFound };
  if (!LEAD_STATUSES.includes(input.status as LeadStatus)) return { error: t.edit.badStatus };

  try {
    await updateLead(id, {
      intent: clean(input.intent),
      enrichedContext: clean(input.enrichedContext),
      status: input.status as LeadStatus,
      notes: clean(input.notes),
      analysis: cleanAnalysis(input.details, visibleFields(await getLeadFields())),
    });
  } catch {
    return { error: t.common.saveFailed };
  }
  revalidatePath("/leads");
  return {};
}

/** The edit dialog's score + field values, validated against the live field list. */
function cleanAnalysis({ score, scoreReason, ...values }: Record<string, string>, fields: readonly LeadField[]): LeadAnalysis {
  return {
    score: oneOf(LEAD_SCORES, score),
    scoreReason: clean(scoreReason).slice(0, 300),
    fields: cleanFieldValues(values, fields),
  };
}

export async function deleteLead(id: number): Promise<ActionResult> {
  const { t } = await getI18n();
  if (!(await isAdmin())) return { error: t.common.loginAgain };
  if (!Number.isInteger(id) || id <= 0) return { error: t.common.notFound };

  try {
    await softDeleteLead(id);
  } catch {
    return { error: t.edit.deleteFailed };
  }
  revalidatePath("/leads");
  return {};
}

/** One lead's saved analysis plus the AI fields to show, for the AI test page. */
export async function getLeadResult(id: number): Promise<{ lead: Lead; fields: LeadField[] } | null> {
  if (!(await isAdmin())) return null;
  if (!Number.isInteger(id) || id <= 0) return null;
  const lead = await getLead(id);
  return lead ? { lead, fields: [...aiFields(await getLeadFields())] } : null;
}
