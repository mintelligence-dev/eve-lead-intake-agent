"use server";

import { fmt, type Messages } from "@/lib/i18n/messages";
import { getI18n } from "@/lib/i18n/server";
import { OTHER_OPTION, otherInputName } from "./form-fields";
import { acceptsValue, cleanFieldValues, customerFormFields, fieldLabel, type LeadField } from "@eve-lead-intake-extension/core";
import { desk } from "@/lead.desk";

export type FormState = {
  readonly ok?: boolean;
  readonly error?: string;
  readonly fieldErrors?: Record<string, string>;
  /** What was submitted, to refill the form after an error (React resets it). */
  readonly values?: Record<string, string>;
};

const PHONE = /^\+?[\d\s\-()]{6,25}$/;

/** The submitted value of one configured field ("other" resolves to its text box). */
function submittedValue(field: LeadField, values: Record<string, string>): string {
  const value = (values[field.key] ?? "").trim();
  if (field.type === "select" && field.allowOther && value === OTHER_OPTION) {
    return (values[otherInputName(field.key)] ?? "").trim();
  }
  return value;
}

function fieldError(field: LeadField, value: string, t: Messages, locale: "th" | "en"): string | null {
  const name = fieldLabel(field, locale);
  if (!value) return field.customerForm === "required" ? fmt(t.form.required, { name }) : null;
  if (field.type === "phone" && (!PHONE.test(value) || value.replace(/\D/g, "").length < 6)) {
    return t.form.badPhone;
  }
  if (field.type === "number" && Number.isNaN(Number(value.replace(/,/g, "")))) return fmt(t.form.notNumber, { name });
  if (!acceptsValue(field, value)) return fmt(t.form.pickFromList, { name });
  return null;
}

// Public: authorized only by the signed link, which names exactly one lead.
// The fields come from the live list (those with customerForm set).
export async function submitLeadForm(token: string, _prev: FormState, form: FormData): Promise<FormState> {
  // Hidden "website" field: people never fill it, bots usually do. Pretend success.
  if (String(form.get("website") ?? "") !== "") return { ok: true };

  const { locale, t } = await getI18n();
  const check = await desk.verifyFormToken(token);
  if (!check.ok) return { error: check.expired ? t.form.expired : t.form.invalid };

  const values = Object.fromEntries(
    [...form.entries()].filter(([key]) => !key.startsWith("$")).map(([key, value]) => [key, String(value).slice(0, 2000)]),
  );

  const fieldErrors: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const formFields = customerFormFields(await desk.getLeadFields());
  for (const field of formFields) {
    const value = submittedValue(field, values);
    const error = fieldError(field, value, t, locale);
    if (error) fieldErrors[field.key] = error;
    else fields[field.key] = value;
  }
  if (values.consent !== "on") fieldErrors.consent = t.form.needConsent;
  if (Object.keys(fieldErrors).length > 0) return { error: t.form.checkInput, fieldErrors, values };

  try {
    const saved = await desk.submitCustomerDetails(check.leadId, cleanFieldValues(fields, formFields));
    if (!saved) return { error: t.form.notFound, values };
  } catch (error) {
    console.error("[lead-form] save failed", { leadId: check.leadId, error });
    return { error: t.common.saveFailed, values };
  }
  return { ok: true };
}
