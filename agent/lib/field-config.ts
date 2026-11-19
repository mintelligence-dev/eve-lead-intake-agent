import { DEFAULT_LEAD_FIELDS, fieldListError, type LeadField, normalizeField } from "./lead-schema";
import { deleteSetting, getSetting, setSetting } from "./settings";

// The live lead-field list: what admins saved on /settings/fields, or the
// defaults from lead-schema.ts until they save one. Cached briefly per server
// instance; a save takes effect everywhere within CACHE_MS.

const SETTING_KEY = "lead_fields";
const CACHE_MS = 15_000;

let cache: { fields: readonly LeadField[]; at: number } | null = null;

/** All fields, including hidden ones, in display order. Never throws. */
export async function getLeadFields(): Promise<readonly LeadField[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.fields;
  let fields: readonly LeadField[] = DEFAULT_LEAD_FIELDS;
  try {
    const stored = await getSetting<unknown[]>(SETTING_KEY);
    if (Array.isArray(stored)) {
      const parsed = stored.filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null).map(normalizeField);
      if (!fieldListError(parsed)) fields = parsed;
      else console.error("[fields] stored field list is invalid; using defaults");
    }
  } catch (error) {
    console.error("[fields] could not load the field list; using defaults", error);
  }
  cache = { fields, at: Date.now() };
  return fields;
}

/** True when the list is the built-in default (nothing saved yet). */
export async function usingDefaultFields(): Promise<boolean> {
  return (await getSetting<unknown>(SETTING_KEY)) === null;
}

/** Saves a new list; returns an error message (in `locale`) or null. */
export async function saveLeadFields(
  input: readonly Record<string, unknown>[],
  locale: "th" | "en" = "th",
): Promise<string | null> {
  const fields = input.map(normalizeField);
  const error = fieldListError(fields, locale);
  if (error) return error;
  await setSetting(SETTING_KEY, fields);
  cache = { fields, at: Date.now() };
  return null;
}

export async function resetLeadFields(): Promise<void> {
  await deleteSetting(SETTING_KEY);
  cache = null;
}
