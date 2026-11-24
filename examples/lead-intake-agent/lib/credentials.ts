import { safeEqual } from "@eve-lead-intake/core";
import { desk } from "../lead.desk";

// The admin login: ADMIN_USERNAME / ADMIN_PASSWORD from env. Missing login
// settings or an unavailable session secret fail closed.
export async function checkCredentials(username: string, password: string): Promise<boolean> {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass || !(await desk.sessionSecretAvailable())) return false;
  const [userOk, passOk] = await Promise.all([
    safeEqual(username.normalize("NFC"), expectedUser.normalize("NFC")),
    safeEqual(password.normalize("NFC"), expectedPass.normalize("NFC")),
  ]);
  return userOk && passOk;
}
