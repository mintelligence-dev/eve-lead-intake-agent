// The fixed part of a lead: its status, the Hot/Warm/Cold score and where the
// field values came from. The fields themselves are configured in
// lead-schema.ts. No database code here, so client components can import it.

export const LEAD_STATUSES = ["new", "contacted", "won", "lost", "spam"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SCORES = ["hot", "warm", "cold"] as const;
export type LeadScore = (typeof LEAD_SCORES)[number];

export const SCORE_LABELS = { hot: "Hot", warm: "Warm", cold: "Cold" } as const satisfies Record<LeadScore, string>;

/** Where the field values came from: the AI's reading of the email, or the customer's form. */
export type DetailsSource = "ai" | "customer";

/** What the agent saves for a real lead: its score plus the configured fields. */
export type LeadAnalysis = {
  readonly score: LeadScore | null;
  readonly scoreReason: string;
  readonly fields: Readonly<Record<string, string>>;
};

/** Narrows an untrusted string to one of `values`, else null. */
export function oneOf<T extends string>(values: readonly T[], value: unknown): T | null {
  return typeof value === "string" && (values as readonly string[]).includes(value) ? (value as T) : null;
}
