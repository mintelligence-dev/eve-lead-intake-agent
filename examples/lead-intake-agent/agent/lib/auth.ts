import type { AuthFn } from "eve/channels/auth";
import { desk } from "../../lead.desk";

// Accepts requests carrying a valid admin session cookie (set by /login).
// Cross-site browser requests are rejected so the cookie can't be ridden.
export const appAuth: AuthFn<Request> = async (request) => {
  if (!(await desk.isAdminRequest(request))) return null;

  return {
    attributes: {},
    authenticator: "admin-session",
    issuer: "lead-intake-admin",
    principalId: "admin",
    principalType: "user",
  };
};
