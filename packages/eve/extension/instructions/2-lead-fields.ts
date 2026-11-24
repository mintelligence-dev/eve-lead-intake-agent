import { defineDynamic, defineInstructions } from "eve/instructions";
import { aiFields, type LeadField } from "@eve-lead-intake-extension/core";
import { getLeadFields } from "../lib/field-config";
import { useMountedConfig } from "../lib/shared";

// Tells the agent which fields to fill in save_lead's `details.fields`, from
// the live list admins edit through the desk (saveLeadFields). Resolved once per session (one per email), so a saved change applies to the next email without
// a deploy.

function describe(field: LeadField): string {
  const options = field.options?.length ? field.options.map((o) => `"${o}"`).join(", ") : "";
  const allowed =
    field.type === "select" && options
      ? field.allowOther
        ? ` Prefer one of: ${options}; otherwise a few words.`
        : ` Must be exactly one of: ${options}.`
      : field.type === "phone"
        ? " A phone number as written."
        : field.type === "number"
          ? " A number."
          : "";
  return `- \`${field.key}\` (${field.label}): ${field.ai}${allowed}`;
}

export default defineDynamic(async (ctx) => {
  // Language for free-text lead data (scoreReason, text fields). The reply to
  // the customer always follows the customer's language.
  const DATA_LANGUAGE = useMountedConfig().dataLanguage;
  // Once per session (one session per email thread), like the old
  // session.started hook: a saved change applies to the next email.
  const fields = await ctx.memo(["lead-fields", ctx.session.id], async () => aiFields(await getLeadFields()));
  return defineInstructions({
    content: [
      "# Lead fields",
      "",
      `Write free-text values and \`scoreReason\` in ${DATA_LANGUAGE}. Choice values must stay exactly as listed.`,
      ...(fields.length
        ? [
            "",
            "Put these in `details.fields` (key → text). Use the key exactly as written. Leave a key out",
            "when the email doesn't say — never guess.",
            "",
            ...fields.map(describe),
          ]
        : []),
    ].join("\n"),
  });
});
