import { sql } from "./db";
import { type DetailsSource, LEAD_SCORES, type LeadAnalysis, type LeadScore, type LeadStatus, oneOf } from "./lead-details";
import type { LeadFieldValues } from "./lead-schema";

// Lead storage in Postgres (any provider; see db.ts). Shared by the agent's
// save_lead tool and the /leads page. The table is created on first use so a
// fresh database (or a "Deploy with Vercel" install) needs no manual migration.

export { LEAD_STATUSES, type LeadStatus } from "./lead-details";

/**
 * AI analysis of an inbound email. Email leads are saved raw first ("pending")
 * so a model outage can't lose them; save_lead completes them ("done"). null =
 * row predates this (always analyzed). "failed" = gave up after retries.
 */
export type AnalysisStatus = "pending" | "done" | "failed";

export type Lead = {
  readonly id: number;
  readonly createdAt: string;
  readonly fromEmail: string;
  readonly subject: string;
  readonly body: string;
  readonly enrichedContext: string;
  readonly intent: string;
  readonly status: LeadStatus;
  readonly notes: string;
  readonly updatedAt: string;
  readonly analysisStatus: AnalysisStatus | null;
  readonly score: LeadScore | null;
  readonly scoreReason: string;
  /** Values of the fields configured in lead-schema.ts (custom_fields JSON). */
  readonly fields: LeadFieldValues;
  /** null = no structured details yet (older leads, or still pending). */
  readonly detailsSource: DetailsSource | null;
  readonly formSentAt: string | null;
  readonly formSubmittedAt: string | null;
  /** Created from the AI test page: kept out of the main table. */
  readonly isTest: boolean;
};

export type NewLead = {
  readonly fromEmail: string;
  readonly subject: string;
  readonly body: string;
  readonly enrichedContext: string;
  readonly intent: string;
  readonly status?: LeadStatus;
  readonly createdAt?: string;
  readonly analysis?: LeadAnalysis;
  readonly isTest?: boolean;
};

export type LeadEdit = {
  readonly intent: string;
  readonly enrichedContext: string;
  readonly status: LeadStatus;
  readonly notes: string;
  readonly analysis: LeadAnalysis;
};

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    const db = sql();
    // Fast path: the last step below already exists, so everything before it
    // ran. One round trip instead of nine, and no ALTER TABLE locks on every
    // cold start. Keep this pointed at the newest step when adding one.
    const [ready] = await db`SELECT to_regclass('leads_active_created_idx') IS NOT NULL AS ok`;
    if ((ready as Row | undefined)?.ok) return;
    await db`
      CREATE TABLE IF NOT EXISTS leads (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        from_email TEXT NOT NULL,
        subject TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        enriched_context TEXT NOT NULL DEFAULT '',
        intent TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'new',
        notes TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ
      )`;
    // v2 adds 'spam'. Replaces the original inline check on existing tables.
    await db`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_status_check_v2') THEN
          ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
          ALTER TABLE leads ADD CONSTRAINT leads_status_check_v2
            CHECK (status IN ('new', 'contacted', 'won', 'lost', 'spam'));
        END IF;
      END $$`;
    // Raw-first email intake (added later; additive and idempotent).
    await db`
      ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS analysis_status TEXT,
        ADD COLUMN IF NOT EXISTS analysis_attempts INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS analysis_requested_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS resend_email_id TEXT,
        ADD COLUMN IF NOT EXISTS thread_id TEXT`;
    await db`
      CREATE UNIQUE INDEX IF NOT EXISTS leads_resend_email_id_idx ON leads (resend_email_id)`;
    // Score + customer contact form (added later; additive and idempotent).
    await db`
      ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS lead_score TEXT,
        ADD COLUMN IF NOT EXISTS score_reason TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS details_source TEXT,
        ADD COLUMN IF NOT EXISTS form_sent_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS form_submitted_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ`;
    // Configurable fields (lead-schema.ts) live in one JSON column.
    await db`ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb`;
    // One-time move of the earlier fixed detail columns into custom_fields, with
    // the old option keys turned into the labels lead-schema.ts now uses. Only
    // runs on tables that still have those columns; the columns are left as is.
    await db`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'leads' AND column_name = 'contact_name') THEN
          UPDATE leads SET custom_fields = jsonb_strip_nulls(jsonb_build_object(
            'contactName', NULLIF(contact_name, ''),
            'jobTitle', NULLIF(job_title, ''),
            'company', NULLIF(company, ''),
            'phone', NULLIF(phone, ''),
            'productInterest', NULLIF(product_interest, ''),
            'teamSize', NULLIF(team_size, ''),
            'budget', NULLIF(budget, ''),
            'timeline', NULLIF(timeline, ''),
            'requestType', CASE request_type WHEN 'demo' THEN 'นัดเดโม' WHEN 'quote' THEN 'ขอใบเสนอราคา'
              WHEN 'info' THEN 'สอบถามข้อมูล' WHEN 'meeting' THEN 'ขอคุย' WHEN 'other' THEN 'อื่นๆ' END,
            'urgency', CASE urgency WHEN 'high' THEN 'สูง' WHEN 'medium' THEN 'กลาง' WHEN 'low' THEN 'ต่ำ' END,
            'preferredTime', CASE preferred_time WHEN 'morning' THEN 'ช่วงเช้า (9:00–12:00)'
              WHEN 'afternoon' THEN 'ช่วงบ่าย (13:00–17:00)' WHEN 'evening' THEN 'ช่วงเย็น (17:00–19:00)'
              WHEN 'any' THEN 'เวลาไหนก็ได้' END,
            'preferredChannel', CASE preferred_channel WHEN 'phone' THEN 'โทรศัพท์' WHEN 'line' THEN 'LINE'
              WHEN 'email' THEN 'อีเมล' END,
            'customerMessage', NULLIF(customer_message, '')))
          WHERE custom_fields = '{}'::jsonb AND details_source IS NOT NULL;
        END IF;
      END $$`;
    // Leads from the test page (added later; additive and idempotent).
    await db`ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false`;
    await db`
      CREATE INDEX IF NOT EXISTS leads_active_created_idx
        ON leads (created_at DESC) WHERE deleted_at IS NULL`;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

type Row = Record<string, unknown>;

function toLead(row: Row): Lead {
  return {
    id: Number(row.id),
    createdAt: new Date(row.created_at as string).toISOString(),
    fromEmail: String(row.from_email),
    subject: String(row.subject),
    body: String(row.body),
    enrichedContext: String(row.enriched_context),
    intent: String(row.intent),
    status: row.status as LeadStatus,
    notes: String(row.notes),
    updatedAt: new Date(row.updated_at as string).toISOString(),
    analysisStatus: (row.analysis_status as AnalysisStatus | null) ?? null,
    score: oneOf(LEAD_SCORES, row.lead_score),
    scoreReason: typeof row.score_reason === "string" ? row.score_reason : "",
    fields: toFields(row.custom_fields),
    detailsSource: oneOf(["ai", "customer"] as const, row.details_source),
    formSentAt: row.form_sent_at ? new Date(row.form_sent_at as string).toISOString() : null,
    formSubmittedAt: row.form_submitted_at ? new Date(row.form_submitted_at as string).toISOString() : null,
    isTest: row.is_test === true,
  };
}

function toFields(value: unknown): LeadFieldValues {
  if (typeof value !== "object" || value === null) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  );
}

/** Saves the agent's analysis (score + fields) and stamps where it came from. */
async function writeAnalysis(id: number, analysis: LeadAnalysis, source: DetailsSource): Promise<void> {
  const db = sql();
  await db`
    UPDATE leads
    SET lead_score = ${analysis.score}, score_reason = ${analysis.scoreReason},
        custom_fields = custom_fields || ${db.json({ ...analysis.fields })},
        details_source = ${source}
    WHERE id = ${id}`;
}

export async function insertLead(lead: NewLead): Promise<Lead> {
  await ensureSchema();
  const createdAt = lead.createdAt ?? new Date().toISOString();
  const rows = await sql()`
    INSERT INTO leads (created_at, from_email, subject, body, enriched_context, intent, status, is_test)
    VALUES (${createdAt}, ${lead.fromEmail}, ${lead.subject}, ${lead.body},
            ${lead.enrichedContext}, ${lead.intent}, ${lead.status ?? "new"}, ${lead.isTest ?? false})
    RETURNING *`;
  const saved = toLead(rows[0] as Row);
  if (!lead.analysis) return saved;
  await writeAnalysis(saved.id, lead.analysis, "ai");
  return { ...saved, ...lead.analysis, detailsSource: "ai" };
}

/** leads: real, non-spam · spam: real spam · test: everything from the test page. */
export type LeadView = "leads" | "spam" | "test";
export type LeadFilters = { view?: LeadView; score?: LeadScore | null };

/**
 * Active (not deleted) leads, newest first, optionally filtered by a search term.
 * `view` picks real leads (default), real spam, or test-page leads.
 */
export async function listLeads(search?: string, filters: LeadFilters = {}): Promise<Lead[]> {
  return (await queryLeads(search, filters, null, 0)).leads;
}

/** One page of `listLeads` plus the total number of matching leads. */
export async function listLeadsPage(
  search: string | undefined,
  filters: LeadFilters,
  page: number,
  pageSize: number,
): Promise<{ leads: Lead[]; total: number }> {
  return queryLeads(search, filters, pageSize, (page - 1) * pageSize);
}

async function queryLeads(
  search: string | undefined,
  { view = "leads", score = null }: LeadFilters,
  limit: number | null,
  offset: number,
): Promise<{ leads: Lead[]; total: number }> {
  await ensureSchema();
  const term = search?.trim() ? `%${search.trim()}%` : null;
  // count(*) OVER () gives the total before LIMIT, in the same round trip.
  // LIMIT NULL = no limit (the export wants every row).
  const rows = await sql()`
    SELECT *, count(*) OVER () AS total_count FROM leads
    WHERE deleted_at IS NULL
      AND is_test = ${view === "test"}
      AND (${view === "test"} OR (status = 'spam') = ${view === "spam"})
      AND (${score}::text IS NULL OR lead_score = ${score})
      AND (${term}::text IS NULL
           OR from_email ILIKE ${term} OR subject ILIKE ${term} OR body ILIKE ${term}
           OR intent ILIKE ${term} OR enriched_context ILIKE ${term} OR notes ILIKE ${term}
           OR custom_fields::text ILIKE ${term})
    ORDER BY created_at DESC, id DESC
    LIMIT ${limit} OFFSET ${offset}`;
  const total = rows.length > 0 ? Number((rows[0] as Row).total_count) : 0;
  return { leads: (rows as Row[]).map(toLead), total };
}

/** Sizes of the spam and test views, in one query. */
export async function countSpamAndTest(): Promise<{ spam: number; test: number }> {
  await ensureSchema();
  const rows = await sql()`
    SELECT count(*) FILTER (WHERE status = 'spam' AND NOT is_test)::int AS spam,
           count(*) FILTER (WHERE is_test)::int AS test
    FROM leads WHERE deleted_at IS NULL`;
  const row = rows[0] as Row;
  return { spam: Number(row.spam), test: Number(row.test) };
}

/**
 * True if the reply in this email thread must not be sent because the lead is
 * spam. Judged by the thread's own lead, so one spam email from a sender never
 * silences their other, real threads. Threads without a saved lead (older
 * rows) fall back to the sender's most recent lead within `withinMs`.
 */
export async function threadLeadIsSpam(threadId: string, email: string, withinMs: number): Promise<boolean> {
  await ensureSchema();
  const byThread = await sql()`
    SELECT status FROM leads
    WHERE thread_id = ${threadId} AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1`;
  if (byThread.length > 0) return (byThread[0] as Row).status === "spam";
  const since = new Date(Date.now() - withinMs).toISOString();
  const rows = await sql()`
    SELECT status FROM leads
    WHERE lower(from_email) = lower(${email}) AND deleted_at IS NULL AND created_at >= ${since}
    ORDER BY created_at DESC
    LIMIT 1`;
  return rows.length > 0 && (rows[0] as Row).status === "spam";
}

/** The original subject of an email thread, for replies when chat state no longer has it. */
export async function subjectForThread(threadId: string): Promise<string | null> {
  await ensureSchema();
  const rows = await sql()`
    SELECT subject FROM leads
    WHERE thread_id = ${threadId} AND deleted_at IS NULL AND subject <> ''
    ORDER BY created_at ASC
    LIMIT 1`;
  return rows.length > 0 ? String((rows[0] as Row).subject) : null;
}

export async function updateLead(id: number, edit: LeadEdit): Promise<void> {
  await ensureSchema();
  await sql()`
    UPDATE leads
    SET intent = ${edit.intent}, enriched_context = ${edit.enrichedContext},
        status = ${edit.status}, notes = ${edit.notes}, updated_at = now()
    WHERE id = ${id} AND deleted_at IS NULL`;
  // Admin edits keep the source: customer-confirmed details stay "customer".
  // Fields merge, so values of fields removed from lead-schema.ts are kept.
  const db = sql();
  await db`
    UPDATE leads
    SET lead_score = ${edit.analysis.score}, score_reason = ${edit.analysis.scoreReason},
        custom_fields = custom_fields || ${db.json({ ...edit.analysis.fields })},
        details_source = COALESCE(details_source, 'ai')
    WHERE id = ${id} AND deleted_at IS NULL`;
}

/** Soft delete: hidden from the app and exports, kept in the table for recovery. */
export async function softDeleteLead(id: number): Promise<void> {
  await ensureSchema();
  await sql()`
    UPDATE leads SET deleted_at = now(), updated_at = now()
    WHERE id = ${id} AND deleted_at IS NULL`;
}

export async function getLead(id: number): Promise<Lead | null> {
  await ensureSchema();
  const rows = await sql()`SELECT * FROM leads WHERE id = ${id} AND deleted_at IS NULL`;
  const row = rows[0] as Row | undefined;
  return row ? toLead(row) : null;
}

// ---- Raw-first email intake ----

export type InboundEmail = {
  readonly resendEmailId: string;
  readonly threadId: string;
  readonly fromEmail: string;
  readonly subject: string;
  readonly body: string;
};

/**
 * Saves an inbound email before the agent runs. Idempotent per Resend email id.
 */
export async function recordInboundEmail(email: InboundEmail): Promise<number> {
  await ensureSchema();
  const rows = await sql()`
    INSERT INTO leads (from_email, subject, body, analysis_status, analysis_attempts,
                       analysis_requested_at, resend_email_id, thread_id)
    VALUES (${email.fromEmail}, ${email.subject}, ${email.body}, 'pending', 1, now(),
            ${email.resendEmailId}, ${email.threadId})
    ON CONFLICT (resend_email_id) DO UPDATE SET resend_email_id = EXCLUDED.resend_email_id
    RETURNING id`;
  return Number((rows[0] as Row).id);
}

/**
 * The pending email row save_lead should complete: by id (from the prompt's
 * Lead-Id line) when it belongs to the same sender, else the sender's latest
 * pending row with that subject from the last hour.
 */
export async function findPendingAnalysis(fromEmail: string, subject: string, leadId?: number): Promise<number | null> {
  await ensureSchema();
  if (leadId !== undefined && Number.isInteger(leadId)) {
    const byId = await sql()`
      SELECT id FROM leads
      WHERE id = ${leadId} AND lower(from_email) = lower(${fromEmail})
        AND analysis_status IN ('pending', 'failed') AND deleted_at IS NULL`;
    if (byId.length) return Number((byId[0] as Row).id);
  }
  const bySubject = await sql()`
    SELECT id FROM leads
    WHERE lower(from_email) = lower(${fromEmail}) AND subject = ${subject}
      AND analysis_status IN ('pending', 'failed') AND deleted_at IS NULL
      AND created_at > now() - interval '1 hour'
    ORDER BY created_at DESC LIMIT 1`;
  return bySubject.length ? Number((bySubject[0] as Row).id) : null;
}

/** Fills in the agent's analysis on a raw-first row (keeps the original subject/body). */
export async function completeAnalysis(
  id: number,
  result: {
    readonly enrichedContext: string;
    readonly intent: string;
    readonly status: LeadStatus;
    readonly analysis?: LeadAnalysis;
  },
): Promise<Lead> {
  await ensureSchema();
  const rows = await sql()`
    UPDATE leads
    SET enriched_context = ${result.enrichedContext}, intent = ${result.intent},
        status = ${result.status}, analysis_status = 'done', updated_at = now()
    WHERE id = ${id}
    RETURNING *`;
  const saved = toLead(rows[0] as Row);
  // A re-analysis never overwrites details the customer already confirmed.
  if (!result.analysis || saved.detailsSource === "customer") return saved;
  await writeAnalysis(id, result.analysis, "ai");
  return { ...saved, ...result.analysis, fields: { ...saved.fields, ...result.analysis.fields }, detailsSource: "ai" };
}

export type StuckAnalysis = {
  readonly id: number;
  readonly threadId: string;
  readonly fromEmail: string;
  readonly subject: string;
  readonly body: string;
};

/**
 * Pending email rows whose analysis didn't finish within `staleMinutes`.
 * Rows that used up `maxAttempts` are marked "failed" (still visible to the
 * team, with a retry button) instead of being returned.
 */
export async function claimStuckAnalyses(maxAttempts: number, staleMinutes: number, limit: number): Promise<StuckAnalysis[]> {
  await ensureSchema();
  await sql()`
    UPDATE leads SET analysis_status = 'failed'
    WHERE analysis_status = 'pending' AND analysis_attempts >= ${maxAttempts}
      AND analysis_requested_at < now() - make_interval(mins => ${staleMinutes})`;
  // Claim by bumping attempts + timestamp so concurrent sweeps don't double-send.
  const rows = await sql()`
    UPDATE leads SET analysis_attempts = analysis_attempts + 1, analysis_requested_at = now()
    WHERE id IN (
      SELECT id FROM leads
      WHERE analysis_status = 'pending' AND deleted_at IS NULL AND thread_id IS NOT NULL
        AND analysis_attempts < ${maxAttempts}
        AND analysis_requested_at < now() - make_interval(mins => ${staleMinutes})
      ORDER BY created_at ASC LIMIT ${limit}
      FOR UPDATE SKIP LOCKED)
    RETURNING id, thread_id, from_email, subject, body`;
  return (rows as Row[]).map((row) => ({
    id: Number(row.id),
    threadId: String(row.thread_id),
    fromEmail: String(row.from_email),
    subject: String(row.subject),
    body: String(row.body),
  }));
}

/**
 * Manual "analyze now" from /leads: claims one pending/failed email row for an
 * immediate re-dispatch. Returns null if it doesn't exist, is already analyzed,
 * or was dispatched less than 30 s ago (guards against double clicks).
 */
export async function claimAnalysisNow(id: number): Promise<StuckAnalysis | null> {
  await ensureSchema();
  const rows = await sql()`
    UPDATE leads
    SET analysis_status = 'pending', analysis_attempts = 1, analysis_requested_at = now()
    WHERE id = ${id} AND deleted_at IS NULL AND thread_id IS NOT NULL
      AND analysis_status IN ('pending', 'failed')
      AND (analysis_requested_at IS NULL OR analysis_requested_at < now() - interval '30 seconds')
    RETURNING id, thread_id, from_email, subject, body`;
  const row = (rows as Row[])[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    threadId: String(row.thread_id),
    fromEmail: String(row.from_email),
    subject: String(row.subject),
    body: String(row.body),
  };
}

// ---- Customer contact form ----

/**
 * Marks the form link as sent for the thread's lead and returns its id — only
 * once per lead, only for analyzed, non-spam email leads. Called right before
 * the first reply goes out, so the link is added to that reply only.
 */
export async function claimFormLink(threadId: string): Promise<number | null> {
  await ensureSchema();
  const rows = await sql()`
    UPDATE leads SET form_sent_at = now()
    WHERE id = (
      SELECT id FROM leads
      WHERE thread_id = ${threadId} AND deleted_at IS NULL AND status <> 'spam'
        AND analysis_status = 'done' AND form_sent_at IS NULL
      ORDER BY created_at DESC LIMIT 1)
      AND form_sent_at IS NULL
    RETURNING id`;
  return rows.length > 0 ? Number((rows[0] as Row).id) : null;
}

export type FormLead = {
  readonly id: number;
  readonly fromEmail: string;
  readonly fields: LeadFieldValues;
  readonly formSubmittedAt: string | null;
};

/** What the public form may show: only this lead's own contact details. */
export async function getLeadForForm(id: number): Promise<FormLead | null> {
  await ensureSchema();
  const rows = await sql()`
    SELECT * FROM leads WHERE id = ${id} AND deleted_at IS NULL AND status <> 'spam'`;
  const row = rows[0] as Row | undefined;
  if (!row) return null;
  const lead = toLead(row);
  return { id: lead.id, fromEmail: lead.fromEmail, fields: lead.fields, formSubmittedAt: lead.formSubmittedAt };
}

/**
 * Saves what the customer entered on the form (with their consent), merged
 * over the AI's values. The AI's score is kept.
 */
export async function submitCustomerDetails(id: number, fields: LeadFieldValues): Promise<boolean> {
  await ensureSchema();
  const db = sql();
  const rows = await db`
    UPDATE leads
    SET custom_fields = custom_fields || ${db.json({ ...fields })}, details_source = 'customer',
        form_submitted_at = now(), consent_at = now(), updated_at = now()
    WHERE id = ${id} AND deleted_at IS NULL AND status <> 'spam'
    RETURNING id`;
  return rows.length > 0;
}
