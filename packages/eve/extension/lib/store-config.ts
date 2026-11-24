// The settings the lead store needs: where the database is and how links and
// login cookies are signed. Set once per process, either by the mounted
// extension (from its config) or by openLeadDesk() in code that runs outside
// the agent, such as a web page. Nothing here reads environment variables.

export type LeadStoreConfig = {
  /** Postgres URL (any provider). Use the provider's pooled URL on serverless. */
  readonly databaseUrl?: string | undefined;
  /**
   * Signs admin login cookies and, unless `form.secret` is set, customer form
   * links. Leave out to generate one on first use and keep it in the database.
   */
  readonly sessionSecret?: string | undefined;
  readonly form?: {
    /** Public address of the web app; a form link is `<baseUrl>/f/<token>`. Leave out for no form links. */
    readonly baseUrl?: string | undefined;
    /** A separate secret for form links. */
    readonly secret?: string | undefined;
    /** How many days a form link works. */
    readonly validDays?: number | undefined;
  };
};

let current: LeadStoreConfig | null = null;

export function configureLeadStore(config: LeadStoreConfig): void {
  if (current && current.databaseUrl !== config.databaseUrl) {
    throw new Error("The lead store is already configured with a different database. Use one database per process.");
  }
  current = config;
}

export function leadStoreConfig(): LeadStoreConfig {
  if (!current) {
    throw new Error("The lead store is not configured. Mount the lead extension, or call openLeadDesk() first.");
  }
  return current;
}
