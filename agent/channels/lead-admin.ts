import { defineChannel, POST } from "eve/channels";
import { leadPrompt } from "../lib/analysis-retry";
import { appAuth } from "../lib/auth";
import { claimAnalysisNow } from "../lib/leads-db";
import resendChannel from "./resend";

// Admin-only "analyze now" for an email lead whose AI analysis is stuck (model
// outage). Hands the saved email back to the agent in its original email
// thread, so the analysis is saved and the reply goes to the customer as usual.
// Lives under /eve/v1 because that is the only path Vercel routes to eve.
export default defineChannel({
  routes: [
    POST("/eve/v1/lead-admin/reanalyze/:leadId", async (request, ctx) => {
      const auth = await appAuth(request);
      if (!auth) return Response.json({ error: "unauthorized" }, { status: 401 });

      const leadId = Number(ctx.params.leadId);
      if (!Number.isInteger(leadId) || leadId <= 0) return Response.json({ error: "not_found" }, { status: 404 });

      const row = await claimAnalysisNow(leadId);
      if (!row) return Response.json({ error: "not_claimable" }, { status: 409 });

      await ctx
        .to(resendChannel, { threadId: row.threadId, adapterName: "resend" })
        .send(
          leadPrompt({ type: "new-lead", fromEmail: row.fromEmail, subject: row.subject, body: row.body, leadId: row.id }),
          { auth },
        );
      console.info("[lead-intake] manual re-analysis dispatched", { leadId });
      return Response.json({ ok: true }, { status: 202 });
    }),
  ],
});
