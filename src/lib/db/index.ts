import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __repairoDb?: ReturnType<typeof createDb>;
};

function dbPath() {
  return process.env.DATABASE_PATH || join(process.cwd(), "data", "repairo.db");
}

function createDb() {
  const path = dbPath();
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  // Bootstrap schema (no separate migrate step required for v1)
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
  `);

  return drizzle(sqlite, { schema });
}

export function getDb() {
  if (!globalForDb.__repairoDb) {
    globalForDb.__repairoDb = createDb();
  }
  return globalForDb.__repairoDb;
}

export type Db = ReturnType<typeof getDb>;
