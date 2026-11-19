// ─────────────────────────────────────────────────────────────────────────────
// The DEFAULT lead fields. Admins change the live list on the web page
// /settings/fields (saved in the database); this list is what a new install
// starts with and what "คืนค่าเริ่มต้น" restores. Everything is built from the
// live list: what the AI extracts, the /leads table and edit dialog, the
// customer form, the Excel export and the AI test page.
//
// Values are stored in the leads.custom_fields JSON column, so adding or
// removing a field needs no database migration. Removing a field only hides
// it; data already saved under that key is kept.
//
// Each field:
//   key           Stable id used in the database. Don't change it once leads
//                 exist (that would orphan their saved values).
//   label         Shown in the UI and as the Excel column header.
//   labelEn       English label (optional; falls back to label).
//   type          "text" | "phone" | "number" | "textarea" | "select"
//   options       For "select": the choices (also the values saved).
//   optionsEn     English display text for the choices, same order (optional).
//   allowOther    For "select": also accept free text (the form shows an
//                 "อื่นๆ" box; the AI may write its own wording).
//   ai            What the AI should put here. Omit it and the AI never fills
//                 the field (e.g. fields only the customer answers). The AI is
//                 always told to leave a field out when the email doesn't say.
//   table         Where /leads shows it: "contact" (who) or "needs" (what they
//                 want). Omit to show it only in the edit dialog and export.
//   customerForm  "required" or "optional" to put it on the customer form.
//   export        false to leave it out of the Excel export (default: included).
//   hidden        true to hide the field everywhere (its saved values are kept).
// ─────────────────────────────────────────────────────────────────────────────

export const FIELD_TYPES = ["text", "phone", "number", "textarea", "select"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export type LeadField = {
  readonly key: string;
  readonly label: string;
  readonly labelEn?: string;
  readonly type: FieldType;
  readonly options?: readonly string[];
  readonly optionsEn?: readonly string[];
  readonly allowOther?: boolean;
  readonly ai?: string;
  readonly table?: "contact" | "needs";
  readonly customerForm?: "required" | "optional";
  readonly export?: boolean;
  readonly hidden?: boolean;
};

export const DEFAULT_LEAD_FIELDS: readonly LeadField[] = [
  {
    key: "contactName",
    label: "ชื่อผู้ติดต่อ",
    labelEn: "Contact name",
    type: "text",
    ai: "Sender's name, from the signature or greeting.",
    table: "contact",
    customerForm: "required",
  },
  {
    key: "jobTitle",
    label: "ตำแหน่ง",
    labelEn: "Job title",
    type: "text",
    ai: "Sender's job title, from the signature.",
    table: "contact",
    customerForm: "optional",
  },
  {
    key: "company",
    label: "บริษัท",
    labelEn: "Company",
    type: "text",
    ai: "Company name: from the signature, else from the enrichment of a company domain. Leave out for gmail/hotmail-style addresses with no signature.",
    table: "contact",
    customerForm: "required",
  },
  {
    key: "phone",
    label: "เบอร์โทร",
    labelEn: "Phone",
    type: "phone",
    ai: "Phone number exactly as written in the email or signature.",
    table: "contact",
    customerForm: "required",
  },
  {
    key: "productInterest",
    label: "สินค้า/บริการที่สนใจ",
    labelEn: "Product/service of interest",
    type: "select",
    options: ["ระบบ CRM", "Salesforce", "AI & Automation", "ที่ปรึกษา / วางระบบ"],
    optionsEn: ["CRM system", "Salesforce", "AI & Automation", "Consulting / implementation"],
    allowOther: true,
    ai: "Product or service they are interested in: one of the options if it fits, else a few words.",
    table: "needs",
    customerForm: "required",
  },
  {
    key: "requestType",
    label: "สิ่งที่ขอ",
    labelEn: "Request",
    type: "select",
    options: ["นัดเดโม", "ขอใบเสนอราคา", "สอบถามข้อมูล", "ขอคุย", "อื่นๆ"],
    optionsEn: ["Demo", "Quote", "Information", "Meeting", "Other"],
    ai: "What they ask for.",
    table: "needs",
  },
  {
    key: "urgency",
    label: "ความเร่งด่วน",
    labelEn: "Urgency",
    type: "select",
    options: ["สูง", "กลาง", "ต่ำ"],
    optionsEn: ["High", "Medium", "Low"],
    ai: "สูง = needed within 2 weeks, \"urgent\", or a problem they must fix now; กลาง = within 1–3 months; ต่ำ = no time stated or later than 3 months. Separate from the score.",
    table: "needs",
  },
  {
    key: "teamSize",
    label: "ขนาดทีม / จำนวนผู้ใช้",
    labelEn: "Team size / users",
    type: "text",
    ai: "Team size or number of users as the sender stated it, e.g. \"20 คน\".",
    table: "needs",
    customerForm: "optional",
  },
  {
    key: "timeline",
    label: "ช่วงเวลาที่ต้องการ",
    labelEn: "Timeline",
    type: "text",
    ai: "When they want to buy or start, e.g. \"next week\".",
    table: "needs",
  },
  {
    key: "budget",
    label: "งบประมาณ",
    labelEn: "Budget",
    type: "text",
    ai: "Budget, only if the sender stated one.",
    table: "needs",
  },
  {
    key: "preferredTime",
    label: "ช่วงเวลาที่สะดวกให้ติดต่อ",
    labelEn: "Preferred contact time",
    type: "select",
    options: ["ช่วงเช้า (9:00–12:00)", "ช่วงบ่าย (13:00–17:00)", "ช่วงเย็น (17:00–19:00)", "เวลาไหนก็ได้"],
    optionsEn: ["Morning (9:00–12:00)", "Afternoon (13:00–17:00)", "Evening (17:00–19:00)", "Any time"],
    customerForm: "optional",
  },
  {
    key: "preferredChannel",
    label: "ช่องทางที่สะดวก",
    labelEn: "Preferred channel",
    type: "select",
    options: ["โทรศัพท์", "LINE", "อีเมล"],
    optionsEn: ["Phone", "LINE", "Email"],
    customerForm: "optional",
  },
  {
    key: "customerMessage",
    label: "ข้อความเพิ่มเติม",
    labelEn: "Additional message",
    type: "textarea",
    customerForm: "optional",
  },
];

// ---- Helpers (no need to edit below) ----

/** Field values as stored: key → text. Missing key = not filled. */
export type LeadFieldValues = Readonly<Record<string, string>>;

type Fields = readonly LeadField[];

export const visibleFields = (fields: Fields) => fields.filter((field) => !field.hidden);
export const aiFields = (fields: Fields) => visibleFields(fields).filter((field) => field.ai);
export const tableFields = (fields: Fields, where: "contact" | "needs") =>
  visibleFields(fields).filter((field) => field.table === where);
export const customerFormFields = (fields: Fields) => visibleFields(fields).filter((field) => field.customerForm);
export const exportFields = (fields: Fields) => visibleFields(fields).filter((field) => field.export !== false);

/** The field's label in the UI language. */
export const fieldLabel = (field: LeadField, locale: "th" | "en") =>
  (locale === "en" && field.labelEn) || field.label;

/** Display text for a saved select value (the saved value stays the Thai option). */
export function optionLabel(field: LeadField, value: string, locale: "th" | "en"): string {
  if (locale !== "en" || !field.optionsEn?.length) return value;
  const index = (field.options ?? []).indexOf(value);
  return (index >= 0 && field.optionsEn[index]) || value;
}

const maxLength = (field: LeadField) => (field.type === "textarea" ? 2000 : 300);

/** True if `value` is allowed for `field` (selects must match an option unless allowOther). */
export function acceptsValue(field: LeadField, value: string): boolean {
  if (field.type !== "select" || field.allowOther) return true;
  return (field.options ?? []).includes(value);
}

/**
 * Keeps only values of `fields` that are valid, trimmed and length-capped.
 * An empty string is kept (it clears the field); anything else invalid is dropped.
 */
export function cleanFieldValues(raw: Readonly<Record<string, unknown>>, fields: Fields): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of fields) {
    const value = raw[field.key];
    if (typeof value !== "string") continue;
    const text = value.trim().slice(0, maxLength(field));
    if (text === "" || acceptsValue(field, text)) out[field.key] = text;
  }
  return out;
}

/** Field keys: a letter, then letters, digits or "_" (they're JSON keys in the database). */
export const FIELD_KEY = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;

const ERRORS = {
  th: {
    tooMany: "มีฟิลด์ได้ไม่เกิน 60 ฟิลด์",
    badKey: 'รหัสฟิลด์ "{key}" ไม่ถูกต้อง',
    dupKey: 'รหัสฟิลด์ "{key}" ซ้ำกัน',
    badLabel: "ชื่อฟิลด์ต้องมี 1–60 ตัวอักษร",
    badType: 'ประเภทของ "{name}" ไม่ถูกต้อง',
    noOptions: '"{name}" ต้องมีตัวเลือกอย่างน้อย 1 รายการ',
    bigOptions: 'ตัวเลือกของ "{name}" ยาวหรือเยอะเกินไป',
    dupOptions: 'ตัวเลือกของ "{name}" ซ้ำกัน',
    optionsEn: 'ตัวเลือกภาษาอังกฤษของ "{name}" ต้องมีจำนวนเท่ากับตัวเลือก',
    longAi: 'คำอธิบายให้ AI ของ "{name}" ยาวเกิน 500 ตัวอักษร',
    badTable: 'ตำแหน่งในตารางของ "{name}" ไม่ถูกต้อง',
    badForm: 'การตั้งค่าฟอร์มลูกค้าของ "{name}" ไม่ถูกต้อง',
  },
  en: {
    tooMany: "At most 60 fields",
    badKey: 'Invalid field key "{key}"',
    dupKey: 'Duplicate field key "{key}"',
    badLabel: "Field names must be 1–60 characters",
    badType: 'Invalid type for "{name}"',
    noOptions: '"{name}" needs at least one choice',
    bigOptions: 'Choices of "{name}" are too long or too many',
    dupOptions: 'Choices of "{name}" repeat',
    optionsEn: 'English choices of "{name}" must match the number of choices',
    longAi: 'The AI description of "{name}" is over 500 characters',
    badTable: 'Invalid table position for "{name}"',
    badForm: 'Invalid customer-form setting for "{name}"',
  },
} as const;

/**
 * Checks a field list (e.g. from the settings page). Returns an error message
 * in `locale`, or null when it's valid.
 */
export function fieldListError(fields: Fields, locale: "th" | "en" = "th"): string | null {
  const m = ERRORS[locale];
  const say = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
  if (fields.length > 60) return m.tooMany;
  const keys = new Set<string>();
  for (const field of fields) {
    const name = field.label || field.key;
    if (!FIELD_KEY.test(field.key)) return say(m.badKey, { key: field.key });
    if (keys.has(field.key)) return say(m.dupKey, { key: field.key });
    keys.add(field.key);
    if (!field.label.trim() || field.label.length > 60 || (field.labelEn ?? "").length > 60) return m.badLabel;
    if (!FIELD_TYPES.includes(field.type)) return say(m.badType, { name });
    const options = field.options ?? [];
    if (field.type === "select" && options.filter((o) => o.trim()).length === 0) return say(m.noOptions, { name });
    if (options.length > 50 || options.some((o) => o.length > 100) || (field.optionsEn ?? []).some((o) => o.length > 100)) {
      return say(m.bigOptions, { name });
    }
    if (new Set(options).size !== options.length) return say(m.dupOptions, { name });
    if (field.optionsEn?.length && field.optionsEn.length !== options.length) return say(m.optionsEn, { name });
    if ((field.ai ?? "").length > 500) return say(m.longAi, { name });
    if (field.table && field.table !== "contact" && field.table !== "needs") return say(m.badTable, { name });
    if (field.customerForm && field.customerForm !== "required" && field.customerForm !== "optional") {
      return say(m.badForm, { name });
    }
  }
  return null;
}

/** Copies only the known properties, so stored JSON can't carry anything else. */
export function normalizeField(input: Record<string, unknown>): LeadField {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const type = FIELD_TYPES.find((t) => t === input.type) ?? "text";
  const options = Array.isArray(input.options) ? input.options.map(str).filter(Boolean) : [];
  const optionsEn = Array.isArray(input.optionsEn) ? input.optionsEn.map(str) : [];
  return {
    key: str(input.key),
    label: str(input.label),
    ...(str(input.labelEn) ? { labelEn: str(input.labelEn) } : {}),
    type,
    ...(type === "select"
      ? {
          options,
          ...(optionsEn.some(Boolean) ? { optionsEn } : {}),
          ...(input.allowOther === true ? { allowOther: true } : {}),
        }
      : {}),
    ...(str(input.ai) ? { ai: str(input.ai) } : {}),
    ...(input.table === "contact" || input.table === "needs" ? { table: input.table } : {}),
    ...(input.customerForm === "required" || input.customerForm === "optional" ? { customerForm: input.customerForm } : {}),
    ...(input.export === false ? { export: false } : {}),
    ...(input.hidden === true ? { hidden: true } : {}),
  };
}

const defaultsError = fieldListError(DEFAULT_LEAD_FIELDS);
if (defaultsError) throw new Error(`lead-schema.ts: ${defaultsError}`);
