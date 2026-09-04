import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname, join } from "path";

/**
 * SQLite storage for the GitHub App (better-sqlite3, synchronous).
 *
 * Every public method catches its own errors, reports them through the
 * injected logger, and returns a harmless value — a database hiccup must never
 * take the webhook server down.
 */

/** Minimal logger contract (pino satisfies it) so this module stays app-agnostic. */
export interface DbLogger {
  error(context: object, message: string): void;
}

const consoleLogger: DbLogger = {
  error: (context, message) => console.error(message, context),
};

export interface InstallationRow {
  id: number;
  installation_id: number;
  org_name: string;
  created_at: string;
}

export interface BreakingChangeEventRow {
  id: number;
  installation_id: number | null;
  repo: string;
  pr_number: number;
  head_sha: string | null;
  spec_path: string;
  breaking_count: number;
  changes_json: string;
  comment_id: number | null;
  created_at: string;
}

export interface NewBreakingChangeEvent {
  installationId: number | null;
  repo: string;
  prNumber: number;
  headSha: string | null;
  specPath: string;
  changes: unknown[];
  commentId: number | null;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS installations (
    id INTEGER PRIMARY KEY,
    installation_id INTEGER UNIQUE,
    org_name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS breaking_change_events (
    id INTEGER PRIMARY KEY,
    installation_id INTEGER,
    repo TEXT NOT NULL,
    pr_number INTEGER NOT NULL,
    head_sha TEXT,
    spec_path TEXT NOT NULL,
    breaking_count INTEGER NOT NULL,
    changes_json TEXT NOT NULL,
    comment_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_breaking_change_events_repo
    ON breaking_change_events (repo, pr_number);
`;

export class AppDatabase {
  private readonly sqlite: Database.Database;

  constructor(
    readonly path: string,
    private readonly log: DbLogger = consoleLogger,
  ) {
    mkdirSync(dirname(path), { recursive: true });
    this.sqlite = new Database(path);
    this.sqlite.pragma("journal_mode = WAL");
    this.sqlite.exec(SCHEMA);
  }

  // -- installations --------------------------------------------------------

  upsertInstallation(installationId: number, orgName: string): boolean {
    return this.guard("upsertInstallation", () => {
      this.sqlite
        .prepare(
          `INSERT INTO installations (installation_id, org_name) VALUES (?, ?)
           ON CONFLICT(installation_id) DO UPDATE SET org_name = excluded.org_name`,
        )
        .run(installationId, orgName);
      return true;
    }, false);
  }

  deleteInstallation(installationId: number): boolean {
    return this.guard("deleteInstallation", () => {
      const result = this.sqlite
        .prepare(`DELETE FROM installations WHERE installation_id = ?`)
        .run(installationId);
      return result.changes > 0;
    }, false);
  }

  getInstallation(installationId: number): InstallationRow | null {
    return this.guard("getInstallation", () => {
      const row = this.sqlite
        .prepare(`SELECT * FROM installations WHERE installation_id = ?`)
        .get(installationId) as InstallationRow | undefined;
      return row ?? null;
    }, null);
  }

  listInstallations(): InstallationRow[] {
    return this.guard("listInstallations", () => {
      return this.sqlite
        .prepare(`SELECT * FROM installations ORDER BY created_at DESC`)
        .all() as InstallationRow[];
    }, []);
  }

  // -- breaking change events -----------------------------------------------

  recordBreakingChangeEvent(event: NewBreakingChangeEvent): number | null {
    return this.guard("recordBreakingChangeEvent", () => {
      const result = this.sqlite
        .prepare(
          `INSERT INTO breaking_change_events
             (installation_id, repo, pr_number, head_sha, spec_path, breaking_count, changes_json, comment_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          event.installationId,
          event.repo,
          event.prNumber,
          event.headSha,
          event.specPath,
          event.changes.length,
          JSON.stringify(event.changes),
          event.commentId,
        );
      return Number(result.lastInsertRowid);
    }, null);
  }

  listBreakingChangeEvents(repo?: string): BreakingChangeEventRow[] {
    return this.guard("listBreakingChangeEvents", () => {
      const sql = repo
        ? `SELECT * FROM breaking_change_events WHERE repo = ? ORDER BY created_at DESC`
        : `SELECT * FROM breaking_change_events ORDER BY created_at DESC`;
      const stmt = this.sqlite.prepare(sql);
      return (repo ? stmt.all(repo) : stmt.all()) as BreakingChangeEventRow[];
    }, []);
  }

  close() {
    this.sqlite.close();
  }

  /** Run `fn`; on failure log the error and return `fallback` instead of throwing. */
  private guard<T>(op: string, fn: () => T, fallback: T): T {
    try {
      return fn();
    } catch (error) {
      this.log.error({ op, err: error }, "database operation failed");
      return fallback;
    }
  }
}

export function resolveDatabasePath(): string {
  return process.env.DATABASE_PATH?.trim() || join(process.cwd(), "data", "repairo.db");
}

let singleton: AppDatabase | undefined;

/** Open (once) the database at `DATABASE_PATH`, creating tables if needed. */
export function getDb(log?: DbLogger): AppDatabase {
  if (!singleton) {
    singleton = new AppDatabase(resolveDatabasePath(), log);
  }
  return singleton;
}
