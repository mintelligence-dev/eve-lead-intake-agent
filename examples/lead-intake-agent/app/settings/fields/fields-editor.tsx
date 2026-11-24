"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  EyeIcon,
  EyeOffIcon,
  FlaskConicalIcon,
  GripVerticalIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  SaveIcon,
} from "lucide-react";
import Link from "next/link";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/client";
import { fmt, type Messages } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import { resetFieldConfig, saveFieldConfig } from "./actions";
import { FIELD_TYPES, fieldLabel, optionLabel, type FieldType, type LeadField } from "@eve-lead-intake/core";

const typeLabel = (t: Messages, type: FieldType) =>
  ({
    text: t.fields.typeText,
    phone: t.fields.typePhone,
    number: t.fields.typeNumber,
    textarea: t.fields.typeTextarea,
    select: t.fields.typeSelect,
  })[type];

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

/** New fields get a generated key; it never changes, so renaming can't orphan data. */
const newKey = () => `f_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function FieldsEditor({ initialFields }: { readonly initialFields: LeadField[] }) {
  const { locale, t } = useI18n();
  const [fields, setFields] = useState<LeadField[]>(initialFields);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState<{ field: LeadField; isNew: boolean } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string }>();
  const [pending, startTransition] = useTransition();

  const update = (next: LeadField[]) => {
    setFields(next);
    setDirty(true);
    setMessage(undefined);
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= fields.length || from === to) return;
    const next = [...fields];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    update(next);
  };
  const toggleHidden = (index: number) =>
    update(fields.map((f, i) => (i === index ? { ...f, hidden: !f.hidden } : f)));

  const save = () =>
    startTransition(async () => {
      const result = await saveFieldConfig(fields as unknown as Record<string, unknown>[]);
      if (result.error) setMessage({ kind: "error", text: result.error });
      else {
        setDirty(false);
        setMessage({ kind: "ok", text: t.fields.saved });
      }
    });

  const reset = () => {
    if (!window.confirm(t.fields.resetConfirm)) return;
    startTransition(async () => {
      const result = await resetFieldConfig();
      if (result.error) setMessage({ kind: "error", text: result.error });
      else window.location.reload();
    });
  };

  const rows = fields.map((field, index) => ({ field, index }));
  const visible = rows.filter(({ field }) => !field.hidden);
  const hidden = rows.filter(({ field }) => field.hidden);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() =>
            setEditing({ field: { key: newKey(), label: "", type: "text", table: "needs" }, isNew: true })
          }
          size="sm"
        >
          <PlusIcon className="size-4" />
          {t.fields.add}
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/s">
            <FlaskConicalIcon className="size-4" />
            {t.fields.tryOnTest}
          </Link>
        </Button>
        <Button disabled={pending} onClick={reset} size="sm" variant="ghost">
          <RotateCcwIcon className="size-4" />
          {t.fields.reset}
        </Button>
      </div>

      <ul className="flex flex-col divide-y rounded-xl border bg-card shadow-sm">
        {visible.map(({ field, index }) => (
          <li
            className={cn("flex flex-wrap items-center gap-2 px-3 py-2.5", dragIndex === index && "opacity-50")}
            draggable
            key={field.key}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(e) => e.preventDefault()}
            onDragStart={() => setDragIndex(index)}
            onDrop={() => {
              if (dragIndex !== null) move(dragIndex, index);
              setDragIndex(null);
            }}
          >
            <GripVerticalIcon aria-hidden className="size-4 cursor-grab text-muted-foreground" />
            <div className="min-w-40 flex-1">
              <p className="font-medium text-sm">{fieldLabel(field, locale)}</p>
              <p className="text-muted-foreground text-xs">
                {typeLabel(t, field.type)}
                {field.type === "select" && field.options?.length ? ` · ${field.options.map((option) => optionLabel(field, option, locale)).join(", ")}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {field.ai ? <Tag>{t.fields.tagAi}</Tag> : null}
              {field.table ? (
                <Tag>
                  {fmt(t.fields.tagTable, { where: field.table === "contact" ? t.fields.whereContact : t.fields.whereNeeds })}
                </Tag>
              ) : null}
              {field.customerForm ? (
                <Tag>
                  {t.fields.tagForm}
                  {field.customerForm === "required" ? t.fields.tagRequired : ""}
                </Tag>
              ) : null}
              {field.export === false ? <Tag>{t.fields.tagNoExport}</Tag> : null}
            </div>
            <div className="flex items-center">
              <Button aria-label={t.fields.moveUp} onClick={() => move(index, index - 1)} size="icon-sm" variant="ghost">
                <ArrowUpIcon className="size-4" />
              </Button>
              <Button aria-label={t.fields.moveDown} onClick={() => move(index, index + 1)} size="icon-sm" variant="ghost">
                <ArrowDownIcon className="size-4" />
              </Button>
              <Button aria-label={t.common.edit} onClick={() => setEditing({ field, isNew: false })} size="icon-sm" variant="ghost">
                <PencilIcon className="size-4" />
              </Button>
              <Button aria-label={t.fields.hide} onClick={() => toggleHidden(index)} size="icon-sm" title={t.fields.hideTitle} variant="ghost">
                <EyeOffIcon className="size-4" />
              </Button>
            </div>
          </li>
        ))}
        {visible.length === 0 ? <li className="px-3 py-6 text-center text-muted-foreground text-sm">{t.fields.none}</li> : null}
      </ul>

      {hidden.length ? (
        <section>
          <h2 className="mb-2 font-medium text-muted-foreground text-sm">{t.fields.hiddenTitle}</h2>
          <ul className="flex flex-col divide-y rounded-xl border border-dashed">
            {hidden.map(({ field, index }) => (
              <li className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-sm" key={field.key}>
                <span className="flex-1">{fieldLabel(field, locale)}</span>
                <Button onClick={() => toggleHidden(index)} size="sm" variant="ghost">
                  <EyeIcon className="size-4" />
                  {t.fields.show}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background py-3">
        <Button disabled={!dirty || pending} onClick={save}>
          {pending ? <Spinner /> : <SaveIcon className="size-4" />}
          {t.common.save}
        </Button>
        {dirty ? (
          <Button
            disabled={pending}
            onClick={() => {
              setFields(initialFields);
              setDirty(false);
            }}
            variant="ghost"
          >
            {t.fields.discard}
          </Button>
        ) : null}
        {message ? (
          <p className={cn("text-sm", message.kind === "error" ? "text-destructive" : "text-emerald-700 dark:text-emerald-300")} role="status">
            {message.text}
          </p>
        ) : dirty ? (
          <p className="text-muted-foreground text-sm">{t.fields.unsaved}</p>
        ) : null}
      </div>

      {editing ? (
        <FieldDialog
          field={editing.field}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSave={(field) => {
            update(
              editing.isNew ? [...fields, field] : fields.map((f) => (f.key === field.key ? field : f)),
            );
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Tag({ children }: { readonly children: React.ReactNode }) {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{children}</span>;
}

function FieldDialog({
  field,
  isNew,
  onClose,
  onSave,
}: {
  readonly field: LeadField;
  readonly isNew: boolean;
  readonly onClose: () => void;
  readonly onSave: (field: LeadField) => void;
}) {
  const { t: tr } = useI18n();
  const [label, setLabel] = useState(field.label);
  const [labelEn, setLabelEn] = useState(field.labelEn ?? "");
  const [optionsEn, setOptionsEn] = useState((field.optionsEn ?? []).join("\n"));
  const [type, setType] = useState<FieldType>(field.type);
  const [options, setOptions] = useState((field.options ?? []).join("\n"));
  const [allowOther, setAllowOther] = useState(field.allowOther === true);
  const [useAi, setUseAi] = useState(Boolean(field.ai) || isNew);
  const [ai, setAi] = useState(field.ai ?? "");
  const [table, setTable] = useState(field.table ?? "");
  const [customerForm, setCustomerForm] = useState(field.customerForm ?? "");
  const [exported, setExported] = useState(field.export !== false);
  const [error, setError] = useState<string>();

  const submit = () => {
    const optionList = [...new Set(options.split("\n").map((o) => o.trim()).filter(Boolean))];
    const optionEnList = optionsEn.split("\n").map((o) => o.trim());
    while (optionEnList.length && !optionEnList.at(-1)) optionEnList.pop();
    if (!label.trim()) return setError(tr.fields.needLabel);
    if (type === "select" && optionList.length === 0) return setError(tr.fields.needOptions);
    if (type === "select" && optionEnList.length && optionEnList.length !== optionList.length) {
      return setError(tr.fields.optionsEnMismatch);
    }
    if (useAi && !ai.trim()) return setError(tr.fields.needAi);
    onSave({
      key: field.key,
      label: label.trim(),
      ...(labelEn.trim() ? { labelEn: labelEn.trim() } : {}),
      type,
      ...(type === "select"
        ? {
            options: optionList,
            ...(optionEnList.some(Boolean) ? { optionsEn: optionEnList } : {}),
            ...(allowOther ? { allowOther: true } : {}),
          }
        : {}),
      ...(useAi ? { ai: ai.trim() } : {}),
      ...(table === "contact" || table === "needs" ? { table } : {}),
      ...(customerForm === "required" || customerForm === "optional" ? { customerForm } : {}),
      ...(exported ? {} : { export: false }),
      ...(field.hidden ? { hidden: true } : {}),
    });
  };

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? tr.fields.dialogAdd : fmt(tr.fields.dialogEdit, { name: field.label })}</DialogTitle>
          <DialogDescription>{fmt(tr.fields.keyNote, { key: field.key })}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr.fields.label}>
              <Input onChange={(e) => setLabel(e.target.value)} placeholder={tr.fields.labelPlaceholder} value={label} />
            </Field>
            <Field label={tr.fields.labelEn}>
              <Input onChange={(e) => setLabelEn(e.target.value)} placeholder="e.g. Preferred branch" value={labelEn} />
            </Field>
          </div>
          <Field label={tr.fields.type}>
            <select className={selectClass} onChange={(e) => setType(e.target.value as FieldType)} value={type}>
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {typeLabel(tr, t)}
                </option>
              ))}
            </select>
          </Field>
          {type === "select" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={tr.fields.options}>
                  <Textarea onChange={(e) => setOptions(e.target.value)} rows={4} value={options} />
                </Field>
                <Field label={tr.fields.optionsEn}>
                  <Textarea onChange={(e) => setOptionsEn(e.target.value)} rows={4} value={optionsEn} />
                </Field>
              </div>
              <Check checked={allowOther} label={tr.fields.allowOther} onChange={setAllowOther} />
            </>
          ) : null}
          <Check checked={useAi} label={tr.fields.useAi} onChange={setUseAi} />
          {useAi ? (
            <Field label={tr.fields.aiHint}>
              <Textarea
                onChange={(e) => setAi(e.target.value)}
                placeholder={tr.fields.aiPlaceholder}
                rows={2}
                value={ai}
              />
            </Field>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr.fields.showInTable}>
              <select className={selectClass} onChange={(e) => setTable(e.target.value as typeof table)} value={table}>
                <option value="">{tr.fields.tableNone}</option>
                <option value="contact">{tr.fields.tableContact}</option>
                <option value="needs">{tr.fields.tableNeeds}</option>
              </select>
            </Field>
            <Field label={tr.fields.customerForm}>
              <select
                className={selectClass}
                onChange={(e) => setCustomerForm(e.target.value as typeof customerForm)}
                value={customerForm}
              >
                <option value="">{tr.fields.formNone}</option>
                <option value="optional">{tr.fields.formOptional}</option>
                <option value="required">{tr.fields.formRequired}</option>
              </select>
            </Field>
          </div>
          {customerForm ? (
            <p className="rounded-md bg-amber-500/10 px-3 py-2 text-amber-800 text-xs dark:text-amber-300">
              {tr.fields.pdpaNote}
            </p>
          ) : null}
          <Check checked={exported} label={tr.fields.exportIt} onChange={setExported} />
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {tr.common.cancel}
            </Button>
          </DialogClose>
          <Button onClick={submit} type="button">
            {tr.common.ok}
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

function Check({
  checked,
  label,
  onChange,
}: {
  readonly checked: boolean;
  readonly label: string;
  readonly onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input checked={checked} className="size-4" onChange={(e) => onChange(e.target.checked)} type="checkbox" />
      {label}
    </label>
  );
}
