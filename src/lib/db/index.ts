import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync, accessSync, constants } from "fs";
import { dirname, join } from "path";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __repairoDb?: ReturnType<typeof createDb>;
};

function resolveDbPath() {
  const preferred =
    process.env.DATABASE_PATH?.trim() ||
    join(process.cwd(), "data", "repairo.db");
  try {
    mkdirSync(dirname(preferred), { recursive: true });
    accessSync(dirname(preferred), constants.W_OK);
    return preferred;
  } catch {
    const fallback = join("/tmp", "repairo.db");
    mkdirSync(dirname(fallback), { recursive: true });
    return fallback;
  }
}

function ensureColumn(
  sqlite: InstanceType<typeof Database>,
  table: string,
  column: string,
  ddl: string,
) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  if (cols.some((c) => c.name === column)) return;
  sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

function createDb() {
  const path = resolveDbPath();
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      github_id TEXT NOT NULL UNIQUE,
      login TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT NOT NULL,
      encrypted_access_token TEXT NOT NULL,
      stripe_customer_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      owner_user_id TEXT NOT NULL REFERENCES users(id),
      plan TEXT NOT NULL DEFAULT 'free',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workspace_members (
      id TEXT PRIMARY KEY NOT NULL,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      role TEXT NOT NULL DEFAULT 'member',
      created_at INTEGER NOT NULL,
      UNIQUE(workspace_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY NOT NULL,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      name TEXT NOT NULL,
      owner TEXT NOT NULL,
      repo TEXT NOT NULL,
      before_path TEXT NOT NULL,
      after_path TEXT NOT NULL,
      before_ref TEXT NOT NULL,
      after_ref TEXT NOT NULL,
      consumer_paths TEXT NOT NULL,
      consumer_ref TEXT NOT NULL,
      base_branch TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      webhook_id INTEGER,
      webhook_secret TEXT NOT NULL,
      spec_source TEXT NOT NULL DEFAULT 'repo',
      vendor_id TEXT,
      vendor_spec_url TEXT,
      baseline_spec TEXT,
      last_checked_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS repair_runs (
      id TEXT PRIMARY KEY NOT NULL,
      integration_id TEXT NOT NULL REFERENCES integrations(id),
      status TEXT NOT NULL DEFAULT 'pending',
      trigger TEXT NOT NULL DEFAULT 'manual',
      summary_json TEXT,
      pr_url TEXT,
      pr_number INTEGER,
      error TEXT,
      created_at INTEGER NOT NULL,
      finished_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY NOT NULL,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      stripe_subscription_id TEXT,
      status TEXT NOT NULL DEFAULT 'inactive',
      price_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pending_invites (
      id TEXT PRIMARY KEY NOT NULL,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      github_login TEXT NOT NULL,
      invited_by_user_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      UNIQUE(workspace_id, github_login)
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY NOT NULL,
      workspace_id TEXT,
      user_id TEXT,
      action TEXT NOT NULL,
      meta_json TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  ensureColumn(sqlite, "integrations", "spec_source", "TEXT NOT NULL DEFAULT 'repo'");
  ensureColumn(sqlite, "integrations", "vendor_id", "TEXT");
  ensureColumn(sqlite, "integrations", "vendor_spec_url", "TEXT");
  ensureColumn(sqlite, "integrations", "baseline_spec", "TEXT");

  return drizzle(sqlite, { schema });
}

export function getDb() {
  if (!globalForDb.__repairoDb) {
    globalForDb.__repairoDb = createDb();
  }
  return globalForDb.__repairoDb;
}

export function dbProbe() {
  try {
    const path = resolveDbPath();
    getDb();
    return { ok: true as const, path };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "db failed",
    };
  }
}

export type Db = ReturnType<typeof getDb>;
