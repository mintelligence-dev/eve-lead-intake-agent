"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { deleteLead, editLead } from "./actions";
import { useI18n } from "@/lib/i18n/client";
import { LEAD_STATUSES, SCORE_LABELS, fieldLabel, optionLabel, type LeadField } from "@eve-lead-intake/core";
import type { Lead } from "@eve-lead-intake/eve/desk";

type Props = { readonly lead: Lead; readonly fields: readonly LeadField[] };

export function LeadRowActions({ lead, fields }: Props) {
  return (
    <div className="flex items-center justify-end gap-1">
      <EditLeadDialog fields={fields} lead={lead} />
      <DeleteLeadDialog lead={lead} />
    </div>
  );
}

function EditLeadDialog({ lead, fields }: Props) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const submit = (form: FormData) => {
    setError(undefined);
    startTransition(async () => {
      const result = await editLead(lead.id, {
        intent: String(form.get("intent") ?? ""),
        enrichedContext: String(form.get("enrichedContext") ?? ""),
        status: String(form.get("status") ?? ""),
        notes: String(form.get("notes") ?? ""),
        details: Object.fromEntries(
          [...form.entries()]
            .filter(([key]) => key.startsWith("d."))
            .map(([key, value]) => [key.slice(2), String(value)]),
        ),
      });
      if (result.error) setError(result.error);
      else setOpen(false);
    });
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button aria-label={t.common.edit} size="icon-sm" title={t.common.edit} variant="ghost">
          <PencilIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.edit.title}</DialogTitle>
          <DialogDescription className="break-all">
            {lead.fromEmail} · {lead.subject}
          </DialogDescription>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          <Field label={t.edit.status}>
            <select
              className={SELECT_CLASS}
              defaultValue={lead.status}
              name="status"
            >
              {LEAD_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t.status[value]}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t.edit.score}>
              <Choice labels={SCORE_LABELS} name="d.score" value={lead.score} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t.edit.scoreReason}>
                <Input defaultValue={lead.scoreReason} name="d.scoreReason" />
              </Field>
            </div>
          </div>
          {/* Fields from the live list (/settings/fields) */}
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.filter((field) => field.type !== "textarea").map((field) => (
              <Field key={field.key} label={fieldLabel(field, locale)}>
                <FieldInput field={field} locale={locale} value={lead.fields[field.key] ?? ""} />
              </Field>
            ))}
          </div>
          {fields.filter((field) => field.type === "textarea").map((field) => (
            <Field key={field.key} label={fieldLabel(field, locale)}>
              <FieldInput field={field} locale={locale} value={lead.fields[field.key] ?? ""} />
            </Field>
          ))}
          <Field label={t.edit.intent}>
            <Textarea defaultValue={lead.intent} name="intent" rows={2} />
          </Field>
          <Field label={t.edit.company}>
            <Textarea defaultValue={lead.enrichedContext} name="enrichedContext" rows={3} />
          </Field>
          <Field label={t.edit.notes}>
            <Textarea defaultValue={lead.notes} name="notes" placeholder={t.edit.notesPlaceholder} rows={3} />
          </Field>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t.common.cancel}
              </Button>
            </DialogClose>
            <Button disabled={pending} type="submit">
              {pending ? <Spinner /> : null}
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteLeadDialog({ lead }: { readonly lead: Lead }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const confirmDelete = () => {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteLead(lead.id);
      if (result.error) setError(result.error);
      else setOpen(false);
    });
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button aria-label={t.common.delete} size="icon-sm" title={t.common.delete} variant="ghost">
          <Trash2Icon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.edit.deleteTitle}</DialogTitle>
          <DialogDescription className="break-all">
            {lead.fromEmail} · {lead.subject}
          </DialogDescription>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          {t.edit.deleteNote}
        </p>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t.common.cancel}
            </Button>
          </DialogClose>
          <Button disabled={pending} onClick={confirmDelete} type="button" variant="destructive">
            {pending ? <Spinner /> : null}
            {t.common.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-medium text-sm">{label}</span>
      {children}
    </label>
  );
}

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

function Choice<T extends string>({
  name,
  value,
  labels,
}: {
  readonly name: string;
  readonly value: T | null;
  readonly labels: Record<T, string>;
}) {
  return (
    <select className={SELECT_CLASS} defaultValue={value ?? ""} name={name}>
      <option value="">—</option>
      {(Object.entries(labels) as [T, string][]).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}

/** One configured field in the edit dialog (named "d.<key>"). */
function FieldInput({ field, value, locale }: { readonly field: LeadField; readonly value: string; readonly locale: "th" | "en" }) {
  const name = `d.${field.key}`;
  if (field.type === "textarea") return <Textarea defaultValue={value} name={name} rows={2} />;
  if (field.type === "select" && !field.allowOther) {
    // Keep a stored value that is no longer an option, so saving doesn't drop it silently.
    const options = [...(field.options ?? [])];
    if (value && !options.includes(value)) options.push(value);
    return (
      <select className={SELECT_CLASS} defaultValue={value} name={name}>
        <option value="">—</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabel(field, option, locale)}
          </option>
        ))}
      </select>
    );
  }
  const listId = field.options?.length ? `options-${field.key}` : undefined;
  return (
    <>
      <Input
        defaultValue={value}
        inputMode={field.type === "phone" ? "tel" : field.type === "number" ? "decimal" : undefined}
        list={listId}
        name={name}
      />
      {listId ? (
        <datalist id={listId}>
          {field.options?.map((option) => <option key={option} value={option} />)}
        </datalist>
      ) : null}
    </>
  );
}

