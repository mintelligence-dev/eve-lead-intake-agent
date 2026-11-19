"use client";

import { AlertCircleIcon, CheckCircle2Icon, SendIcon } from "lucide-react";
import { useActionState, useState } from "react";
import { fieldLabel, type LeadField, type LeadFieldValues, optionLabel } from "../../../agent/lib/lead-schema";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { type FormState, submitLeadForm } from "./actions";
import { OTHER_OPTION, otherInputName } from "./form-fields";

const selectClass =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

/** Prefill for a select with allowOther: a known option, or "other" + the text. */
function splitOther(field: LeadField, value: string): { choice: string; other: string } {
  if (!value || (field.options ?? []).includes(value)) return { choice: value, other: "" };
  const match = field.options?.find((option) => value.includes(option));
  return match ? { choice: match, other: "" } : { choice: OTHER_OPTION, other: value };
}

export function LeadForm({
  token,
  email,
  fields,
  formFields,
  alreadySubmitted,
  companyName,
  privacyUrl,
}: {
  readonly token: string;
  readonly email: string;
  readonly fields: LeadFieldValues;
  /** The fields to show (customerForm set), from the live list. */
  readonly formFields: readonly LeadField[];
  readonly alreadySubmitted: boolean;
  readonly companyName: string;
  readonly privacyUrl: string | null;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitLeadForm.bind(null, token), {});
  const { t } = useI18n();
  const v = (name: string, fallback: string) => state.values?.[name] ?? fallback;

  if (state.ok) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <CheckCircle2Icon className="mx-auto size-12 text-emerald-600" />
        <h1 className="mt-4 font-semibold text-xl">{t.form.thanksTitle}</h1>
        <p className="mt-2 text-muted-foreground text-sm">{t.form.thanksBody}</p>
      </div>
    );
  }

  const error = (name: string) =>
    state.fieldErrors?.[name] ? (
      <span className="text-destructive text-xs" role="alert">
        {state.fieldErrors[name]}
      </span>
    ) : null;

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <h1 className="font-semibold text-xl tracking-tight">{t.form.title}</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        {t.form.intro}
      </p>
      {alreadySubmitted ? (
        <p className="mt-3 rounded-md bg-emerald-500/10 px-3 py-2 text-emerald-700 text-sm dark:text-emerald-300">
          {t.form.already}
        </p>
      ) : null}

      {/* key: remount with the submitted values after an error (React resets forms). */}
      <form action={action} className="mt-6 flex flex-col gap-4" key={JSON.stringify(state.values ?? {})} noValidate>
        {/* Honeypot: hidden from people, tempting to bots. */}
        <input aria-hidden autoComplete="off" className="hidden" name="website" tabIndex={-1} />

        <Field label={t.form.email}>
          <Input className="h-10" disabled readOnly value={email} />
        </Field>
        {/* Fields from the live list (those with customerForm set) */}
        {formFields.map((field) => (
          <FormField error={error(field.key)} field={field} key={field.key} prefill={fields[field.key] ?? ""} v={v} />
        ))}

        <label className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm">
          <input className="mt-1 size-4 shrink-0" defaultChecked={v("consent", "") === "on"} name="consent" type="checkbox" />
          <span>
            {fmt(t.form.consent, { company: companyName })}
            {privacyUrl ? (
              <>
                {" "}
                ·{" "}
                <a className="underline" href={privacyUrl} rel="noreferrer" target="_blank">
                  {t.form.privacy}
                </a>
              </>
            ) : null}
            {error("consent")}
          </span>
        </label>

        {state.error ? (
          <p className="flex items-center gap-2 text-destructive text-sm" role="alert">
            <AlertCircleIcon className="size-4 shrink-0" />
            {state.error}
          </p>
        ) : null}

        <Button className="h-10" disabled={pending} type="submit">
          {pending ? <Spinner /> : <SendIcon className="size-4" />}
          {t.form.submit}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  readonly label: string;
  readonly required?: boolean;
  readonly error?: React.ReactNode;
  readonly children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-medium text-sm">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
      {error}
    </label>
  );
}

function FormField({
  field,
  prefill,
  v,
  error,
}: {
  readonly field: LeadField;
  readonly prefill: string;
  readonly v: (name: string, fallback: string) => string;
  readonly error: React.ReactNode;
}) {
  const { locale } = useI18n();
  const required = field.customerForm === "required";
  const label = fieldLabel(field, locale);
  if (field.type === "select") {
    return <SelectField error={error} field={field} prefill={prefill} required={required} v={v} />;
  }
  if (field.type === "textarea") {
    return (
      <Field error={error} label={label} required={required}>
        <Textarea defaultValue={v(field.key, prefill)} name={field.key} rows={3} />
      </Field>
    );
  }
  return (
    <Field error={error} label={label} required={required}>
      <Input
        autoComplete={field.type === "phone" ? "tel" : undefined}
        className="h-10"
        defaultValue={v(field.key, prefill)}
        inputMode={field.type === "phone" ? "tel" : field.type === "number" ? "decimal" : undefined}
        name={field.key}
      />
    </Field>
  );
}

function SelectField({
  field,
  prefill,
  required,
  v,
  error,
}: {
  readonly field: LeadField;
  readonly prefill: string;
  readonly required: boolean;
  readonly v: (name: string, fallback: string) => string;
  readonly error: React.ReactNode;
}) {
  const { locale, t } = useI18n();
  const label = fieldLabel(field, locale);
  const initial = field.allowOther ? splitOther(field, prefill) : { choice: prefill, other: "" };
  const [choice, setChoice] = useState(v(field.key, initial.choice));
  return (
    <>
      <Field error={error} label={label} required={required}>
        <select className={selectClass} name={field.key} onChange={(e) => setChoice(e.target.value)} value={choice}>
          <option value="">{required ? t.form.choose : t.form.notSpecified}</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {optionLabel(field, option, locale)}
            </option>
          ))}
          {field.allowOther ? <option value={OTHER_OPTION}>{t.form.other}</option> : null}
        </select>
      </Field>
      {field.allowOther && choice === OTHER_OPTION ? (
        <Field label={fmt(t.form.specify, { name: label })}>
          <Input className="h-10" defaultValue={v(otherInputName(field.key), initial.other)} name={otherInputName(field.key)} />
        </Field>
      ) : null}
    </>
  );
}

