import lead from "@eve-lead-intake/eve";

import { leadIntakeConfig } from "../../lead-intake.config";

// Mounts the lead extension: the Resend email channel, the enrich_sender and
// save_lead tools (as lead__enrich_sender and lead__save_lead), the lead
// instructions, the "analyze now" admin route and the daily maintenance job.
export default lead(leadIntakeConfig);
