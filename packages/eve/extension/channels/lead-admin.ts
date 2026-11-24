import { defineChannel, POST } from "eve/channels";
import { leadPrompt } from "@eve-lead-intake/core";
import { claimAnalysisNow } from "../lib/leads-db";
import { isAdminRequest } from "../lib/session";
import { useMountedConfig } from "../lib/shared";
import resendChannel from "./resend";

// Admin-only "analyze now" for an email lead whose AI analysis is stuck (model
// outage). Hands the saved email back to the agent in its original email
// thread, so the analysis is saved and the reply goes to the customer as usual.
// Lives under /eve/v1 because that is the only path Vercel routes to eve.
// The principal the re-run is sent as. The same one the app's eve channel
// gives a signed-in admin, so save_lead treats both alike.
const ADMIN_AUTH = {
  attributes: {},
  authenticator: "admin-session",
  issuer: "lead-intake-admin",
  principalId: "admin",
  principalType: "user",
} as const;

export default defineChannel({
  routes: [
    POST("/eve/v1/lead-admin/reanalyze/:leadId", async (request, ctx) => {
      useMountedConfig();
      if (!(await isAdminRequest(request))) return Response.json({ error: "unauthorized" }, { status: 401 });

      const leadId = Number(ctx.params.leadId);
      if (!Number.isInteger(leadId) || leadId <= 0) return Response.json({ error: "not_found" }, { status: 404 });

      const row = await claimAnalysisNow(leadId);
      if (!row) return Response.json({ error: "not_claimable" }, { status: 409 });

      await ctx
        .to(resendChannel, { threadId: row.threadId, adapterName: "resend" })
        .send(
          leadPrompt({ type: "new-lead", fromEmail: row.fromEmail, subject: row.subject, body: row.body, leadId: row.id }),
          { auth: ADMIN_AUTH },
        );
      console.info("[lead-intake] manual re-analysis dispatched", { leadId });
      return Response.json({ ok: true }, { status: 202 });
    }),
  ],
});
