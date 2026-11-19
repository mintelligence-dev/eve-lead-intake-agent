import { defineTool } from "eve/tools";
import { z } from "zod";
import { getLeadFields } from "../lib/field-config";
import { LEAD_SCORES, type LeadAnalysis } from "../lib/lead-details";
import { aiFields, cleanFieldValues } from "../lib/lead-schema";
import { completeAnalysis, findPendingAnalysis, insertLead } from "../lib/leads-db";

// The fields to fill are listed in the instructions (agent/instructions/
// lead-fields.ts, from the live list on /settings/fields), so the schema here
// takes any key and execute() keeps only the configured ones.
const detailsSchema = z
  .object({
    score: z.enum(LEAD_SCORES).describe("Lead score per the instructions' Hot/Warm/Cold rubric."),
    scoreReason: z.string().describe("One short sentence explaining the score, in the lead-data language from the instructions."),
    fields: z
      .record(z.string(), z.string())
      .optional()
      .describe("Values for the keys listed under \"Lead fields\" in the instructions. Leave out keys the email doesn't answer."),
  })
  .describe("Structured details for a real lead. Omit entirely for spam.");

export default defineTool({
  description:
    "Save one lead record to the leads database. Call this exactly once per new inbound lead " +
    "email (never for follow-ups), after `enrich_sender` has returned and you have extracted the " +
    "intent. If enrichment found nothing usable, still call it with an honest note.",
  inputSchema: z.object({
    fromEmail: z.string().describe("The lead's email address (the inbound email's From address)"),
    subject: z.string().describe("The inbound email's subject line"),
    body: z.string().describe("The inbound email's plain-text body"),
    enrichedContext: z
      .string()
      .describe("A short summary of what `enrich_sender` returned for this sender/domain"),
    intent: z
      .string()
      .describe("The lead's intent in a few words, e.g. 'interested in purchasing product'"),
    leadId: z
      .number()
      .int()
      .optional()
      .describe("The number on the message's `Lead-Id:` line, if there is one. Omit otherwise."),
    details: detailsSchema.optional(),
    isSpam: z
      .boolean()
      .describe(
        "True for spam, unsolicited marketing/sales pitches, phishing, or anything that is clearly " +
          "not a prospective customer. Spam is saved for review but never gets a reply.",
      ),
  }),
  label: {
    start: ({ fromEmail }) => `Save lead from ${fromEmail}`,
  },
  async execute({ isSpam, leadId, details: extracted, ...lead }, ctx) {
    const status = isSpam ? "spam" : "new";
    const analysis = extracted && !isSpam ? await toAnalysis(extracted) : undefined;
    // Email leads were saved raw before the agent ran; complete that row instead
    // of inserting a second one. Web-form leads have no raw row and are inserted.
    const pendingId = await findPendingAnalysis(lead.fromEmail, lead.subject, leadId);
    const saved = pendingId
      ? await completeAnalysis(pendingId, { enrichedContext: lead.enrichedContext, intent: lead.intent, status, analysis })
      : await insertLead({ ...lead, status, analysis, isTest: fromTestPage(ctx.session.auth.initiator) });
    return { saved: true, id: saved.id, status: saved.status };
  },
});

async function toAnalysis(details: { score: LeadAnalysis["score"]; scoreReason: string; fields?: Record<string, string> }): Promise<LeadAnalysis> {
  const fields = aiFields(await getLeadFields());
  // Empty strings are dropped too: the AI leaves a field out when unsure.
  const values = Object.fromEntries(Object.entries(cleanFieldValues(details.fields ?? {}, fields)).filter(([, v]) => v !== ""));
  return { score: details.score, scoreReason: details.scoreReason.trim(), fields: values };
}

/**
 * Email sessions start without auth, and stuck-email re-runs complete their
 * saved row instead of inserting. So a new row from a session a person (or
 * dev tool) started is a test-page lead, not a real customer.
 */
function fromTestPage(initiator: { principalId: string } | null | undefined): boolean {
  return initiator != null && initiator.principalId !== "eve:app";
}
