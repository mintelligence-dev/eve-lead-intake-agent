export type LeadPromptType = "new-lead" | "follow-up";

export type LeadPromptInput = {
  readonly type: LeadPromptType;
  readonly fromEmail: string;
  readonly subject: string;
  readonly body: string;
  readonly leadId?: number;
};

/** The plain-text message shape the extension's instructions expect for one email. */
export function leadPrompt(email: LeadPromptInput): string {
  return [
    `Type: ${email.type}`,
    ...(email.leadId !== undefined ? [`Lead-Id: ${email.leadId}`] : []),
    `From: ${email.fromEmail}`,
    `Subject: ${email.subject}`,
    "",
    email.body,
  ].join("\n");
}

/** Reads back a prompt made by `leadPrompt` (the Lead-Id line is optional). */
export function parseLeadPrompt(text: string): Omit<LeadPromptInput, "type" | "leadId"> & { type: string } | null {
  const match = /^Type: (.*)\n(?:Lead-Id: \d+\n)?From: (.*)\nSubject: (.*)\n\n([\s\S]*)$/.exec(text);
  return match ? { type: match[1] ?? "", fromEmail: match[2] ?? "", subject: match[3] ?? "", body: match[4] ?? "" } : null;
}
