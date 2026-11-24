/**
 * The lead desk: read and change leads, lead fields, form links and admin sessions without an
 * agent in between. A web page uses this to list leads, edit them, show the customer form and
 * sign people in. It uses the same database and rules as the mounted extension. Server only.
 *
 * Give it the same settings as the extension's mount (one shared config module works well).
 * Anyone who can call these functions can read and change every lead: check your own sign-in
 * first, for example with `isAdminRequest` or `verifySessionToken`.
 */
import * as fields from "./field-config";
import * as forms from "./form-token";
import * as leads from "./leads-db";
import * as session from "./session";
import { configureLeadStore, type LeadStoreConfig } from "./store-config";

export type { LeadStoreConfig } from "./store-config";
export type {
  AnalysisStatus,
  FormLead,
  InboundEmail,
  Lead,
  LeadEdit,
  LeadFilters,
  LeadView,
  NewLead,
  StuckAnalysis,
} from "./leads-db";
export type { FormTokenCheck } from "./form-token";
export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./session";

const desk = {
  // Leads
  listLeads: leads.listLeads,
  listLeadsPage: leads.listLeadsPage,
  countSpamAndTest: leads.countSpamAndTest,
  getLead: leads.getLead,
  updateLead: leads.updateLead,
  softDeleteLead: leads.softDeleteLead,
  getLeadForForm: leads.getLeadForForm,
  submitCustomerDetails: leads.submitCustomerDetails,
  // Lead fields (/settings/fields)
  getLeadFields: fields.getLeadFields,
  usingDefaultFields: fields.usingDefaultFields,
  saveLeadFields: fields.saveLeadFields,
  resetLeadFields: fields.resetLeadFields,
  // Customer form links
  verifyFormToken: forms.verifyFormToken,
  formUrl: forms.formUrl,
  // Admin sessions
  createSessionToken: session.createSessionToken,
  verifySessionToken: session.verifySessionToken,
  sessionSecretAvailable: session.sessionSecretAvailable,
  readSessionCookie: session.readSessionCookie,
  isAdminRequest: session.isAdminRequest,
};

export type LeadDesk = typeof desk;

/** Configures the lead store for this process and returns the desk. */
export function openLeadDesk(config: LeadStoreConfig): LeadDesk {
  configureLeadStore(config);
  return desk;
}
