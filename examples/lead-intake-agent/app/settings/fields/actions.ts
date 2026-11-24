"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/lib/i18n/server";
import { isAdmin } from "@/lib/require-admin";
import { desk } from "@/lead.desk";

export type SaveResult = { readonly error?: string };

export async function saveFieldConfig(fields: Record<string, unknown>[]): Promise<SaveResult> {
  const { locale, t } = await getI18n();
  if (!(await isAdmin())) return { error: t.common.loginAgain };
  if (!Array.isArray(fields)) return { error: t.fields.badData };
  try {
    const error = await desk.saveLeadFields(fields, locale);
    if (error) return { error };
  } catch {
    return { error: t.common.saveFailed };
  }
  revalidatePath("/settings/fields");
  revalidatePath("/leads");
  return {};
}

export async function resetFieldConfig(): Promise<SaveResult> {
  const { t } = await getI18n();
  if (!(await isAdmin())) return { error: t.common.loginAgain };
  try {
    await desk.resetLeadFields();
  } catch {
    return { error: t.fields.resetFailed };
  }
  revalidatePath("/settings/fields");
  revalidatePath("/leads");
  return {};
}
