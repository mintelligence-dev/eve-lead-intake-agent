/**
 * The lead desk for this app: the same leads, fields, form links and admin sessions the agent
 * uses, for the web pages. Server only: it talks to the database.
 */
import { openLeadDesk } from "@eve-lead-intake/eve/desk";

import { leadIntakeConfig } from "./lead-intake.config";

export const desk = openLeadDesk({
  databaseUrl: leadIntakeConfig.databaseUrl,
  sessionSecret: leadIntakeConfig.sessionSecret,
  form: leadIntakeConfig.form,
});
