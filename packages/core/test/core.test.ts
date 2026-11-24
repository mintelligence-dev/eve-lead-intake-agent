import { describe, expect, it } from "vitest";
import {
  cleanFieldValues,
  createFormToken,
  createSessionToken,
  DEFAULT_LEAD_FIELDS,
  fieldListError,
  isAutomatedEmail,
  leadPrompt,
  parseLeadPrompt,
  verifyFormToken,
  verifySessionToken,
} from "../src/index";

describe("isAutomatedEmail", () => {
  it("lets a person's email through", () => {
    expect(isAutomatedEmail({ from: "somchai@acme.co.th", headers: { "Message-ID": "<1@acme>" } })).toBe(false);
  });

  it.each([
    [{ from: "no-reply@shop.test" }],
    [{ from: "MAILER-DAEMON@mx.test" }],
    [{ from: "bounces+abc@list.test" }],
    [{ from: "a@b.test", headers: { "Auto-Submitted": "auto-replied" } }],
    [{ from: "a@b.test", headers: { Precedence: "bulk" } }],
    [{ from: "a@b.test", headers: { "List-Unsubscribe": "<mailto:x>" } }],
    [{ from: "leads@us.test", ownAddress: "Leads@us.test" }],
  ])("flags %o", (email) => {
    expect(isAutomatedEmail(email)).toBe(true);
  });

  it("treats Auto-Submitted: no as a person", () => {
    expect(isAutomatedEmail({ from: "a@b.test", headers: { "auto-submitted": "no" } })).toBe(false);
  });
});

describe("leadPrompt", () => {
  it("round-trips through parseLeadPrompt, with and without Lead-Id", () => {
    const email = { type: "new-lead", fromEmail: "a@b.test", subject: "สนใจ", body: "line 1\n\nline 2" } as const;
    expect(parseLeadPrompt(leadPrompt(email))).toEqual(email);
    expect(leadPrompt({ ...email, leadId: 7 })).toContain("\nLead-Id: 7\n");
    expect(parseLeadPrompt(leadPrompt({ ...email, leadId: 7 }))).toEqual(email);
  });
});

describe("signed tokens", () => {
  const secret = "test-secret";

  it("verifies a form link only for its own lead", async () => {
    const token = await createFormToken(secret, 42, 14);
    expect(await verifyFormToken(secret, token)).toEqual({ ok: true, leadId: 42 });
    expect((await verifyFormToken(secret, token.replace(/^42/, "43"))).ok).toBe(false);
    expect((await verifyFormToken("other", token)).ok).toBe(false);
  });

  it("reports an expired form link as expired", async () => {
    const token = await createFormToken(secret, 1, -1);
    expect(await verifyFormToken(secret, token)).toEqual({ ok: false, expired: true });
  });

  it("verifies a session token and rejects tampering", async () => {
    const token = await createSessionToken(secret, 60);
    expect(await verifySessionToken(secret, token)).toBe(true);
    expect(await verifySessionToken(secret, `${token}0`)).toBe(false);
    expect(await verifySessionToken(secret, undefined)).toBe(false);
    expect(await verifySessionToken(secret, await createSessionToken(secret, -10))).toBe(false);
  });
});

describe("lead fields", () => {
  it("ships a valid default list", () => {
    expect(fieldListError(DEFAULT_LEAD_FIELDS)).toBeNull();
  });

  it("rejects a duplicate key", () => {
    const first = DEFAULT_LEAD_FIELDS[0]!;
    expect(fieldListError([first, { ...first }], "en")).not.toBeNull();
  });

  it("keeps only configured keys and allowed choices", () => {
    const select = DEFAULT_LEAD_FIELDS.find((f) => f.type === "select" && !f.allowOther);
    expect(select).toBeDefined();
    const values = cleanFieldValues(
      { [select!.key]: "not-a-choice", company: "Acme", unknownKey: "x" },
      DEFAULT_LEAD_FIELDS,
    );
    expect(values.unknownKey).toBeUndefined();
    expect(values[select!.key] ?? "").not.toBe("not-a-choice");
  });
});
