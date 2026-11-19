import { defineSchedule } from "eve/schedules";
import resendChannel from "../channels/resend";
import { redispatchStuckAnalyses } from "../lib/analysis-retry";
import { deleteExpiredChatState } from "../lib/chat-state";

// Daily safety net (Vercel Hobby allows cron at most once a day; on Pro this
// can run every 15 minutes, "*/15 * * * *"): emails whose AI analysis never
// finished are sent to the agent again, in their original thread so the
// customer still gets the reply. This also runs whenever a new email arrives.
// It also clears expired chat state rows.
export default defineSchedule({
  cron: "0 2 * * *", // 09:00 Bangkok
  async run({ to, waitUntil, appAuth }) {
    waitUntil(
      (async () => {
        const redispatched = await redispatchStuckAnalyses(
          (row, prompt) => to(resendChannel, { threadId: row.threadId, adapterName: "resend" }).send(prompt, { auth: appAuth }),
          10,
        );
        const expiredState = await deleteExpiredChatState().catch((error: unknown) => {
          console.error("[maintenance] chat state cleanup failed", error);
          return 0;
        });
        if (redispatched > 0 || expiredState > 0) console.info("[maintenance] daily run", { redispatched, expiredState });
      })(),
    );
  },
});
