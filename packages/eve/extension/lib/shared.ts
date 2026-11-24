import extension from "../extension";
import { configureLeadStore } from "./store-config";

// Points the lead store at the mounted extension's configuration. Called by
// every tool, channel and schedule before it touches the store.
let configured = false;
export function useMountedConfig(): typeof extension.config {
  const config = extension.config;
  if (!configured) {
    configureLeadStore({ databaseUrl: config.databaseUrl, sessionSecret: config.sessionSecret, form: config.form });
    configured = true;
  }
  return config;
}
