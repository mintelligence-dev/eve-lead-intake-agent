import { eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";
import { appAuth } from "../lib/auth";

export default eveChannel({
  auth: [
    // Admin HTTP Basic login from the web UI (see agent/lib/auth.ts).
    appAuth,
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
  ],
});
