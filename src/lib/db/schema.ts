import { randomUUID } from "crypto";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Postgres schema (Neon).
 *
 * Ported from SQLite, where three column kinds had no native type and were
 * stored as integers or text:
 *
 *   integer(…, { mode: "timestamp_ms" })  →  timestamp(…, { withTimezone: true })
 *   integer(…, { mode: "boolean" })       →  boolean(…)
 *   text(…,    { mode: "json" })          →  jsonb(…)
 *
 * The TypeScript-facing types are unchanged — Date, boolean and the $type<…>
 * shapes — so call sites read and write exactly what they did before.
 */

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    githubId: text("github_id").notNull(),
    login: text("login").notNull(),
    name: text("name"),
    avatarUrl: text("avatar_url").notNull(),
    encryptedAccessToken: text("encrypted_access_token").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("users_github_id_idx").on(t.githubId)],
);

export const workspaces = pgTable("workspaces", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id),
  plan: text("plan", { enum: ["free", "pro"] }).notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role", { enum: ["owner", "member"] }).notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("workspace_members_unique").on(t.workspaceId, t.userId),
  ],
);

export const integrations = pgTable("integrations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: text("name").notNull(),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  beforePath: text("before_path").notNull(),
  afterPath: text("after_path").notNull(),
  beforeRef: text("before_ref").notNull(),
  afterRef: text("after_ref").notNull(),
  consumerPaths: jsonb("consumer_paths")
    .$type<string[]>()
    .notNull(),
  consumerRef: text("consumer_ref").notNull(),
  baseBranch: text("base_branch").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  webhookId: integer("webhook_id"),
  webhookSecret: text("webhook_secret").notNull(),
  /** repo = paths in GitHub; remote = vendor catalog OpenAPI URL */
  specSource: text("spec_source", { enum: ["repo", "remote"] })
    .notNull()
    .default("repo"),
  vendorId: text("vendor_id"),
  vendorSpecUrl: text("vendor_spec_url"),
  /** Last-seen vendor OpenAPI body (baseline "before" for remote agents) */
  baselineSpec: text("baseline_spec"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const repairRuns = pgTable("repair_runs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  integrationId: text("integration_id")
    .notNull()
    .references(() => integrations.id),
  status: text("status", {
    enum: ["pending", "running", "success", "skipped", "failed"],
  })
    .notNull()
    .default("pending"),
  trigger: text("trigger", { enum: ["manual", "webhook"] })
    .notNull()
    .default("manual"),
  summaryJson: jsonb("summary_json").$type<Record<
    string,
    unknown
  > | null>(),
  prUrl: text("pr_url"),
  prNumber: integer("pr_number"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
  finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
});

/**
 * Permanent, queryable record of every fix a repair run produced — including fixes that
 * were flagged unsafe/ambiguous and never applied. This is the durable audit trail for
 * *why* a specific decision was made: once a run finishes, its in-memory SuggestedFix[]
 * is gone and the GitHub PR description (free-text, editable, deletable) is the only
 * other place this ever existed. `origin` distinguishes deterministic fixes from
 * agent-proposed ones; `agentConfidence`/`agentReasoning` are populated only for the
 * latter (see SuggestedFix in src/lib/engine/types.ts, which this table mirrors).
 */
export const repairFixes = pgTable("repair_fixes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  repairRunId: text("repair_run_id")
    .notNull()
    .references(() => repairRuns.id),
  changeId: text("change_id").notNull(),
  file: text("file").notNull(),
  description: text("description").notNull(),
  before: text("before").notNull(),
  after: text("after").notNull(),
  safe: boolean("safe").notNull(),
  origin: text("origin", { enum: ["deterministic", "agent-proposed"] })
    .notNull()
    .default("deterministic"),
  /** Model self-reported, NOT a calibrated probability — see the agentConfidence
   * doc-comment in src/lib/engine/types.ts. Null for deterministic fixes. */
  agentConfidence: real("agent_confidence"),
  agentReasoning: text("agent_reasoning"),
  safetyNotesJson: jsonb("safety_notes_json")
    .$type<string[]>()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const subscriptions = pgTable("subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default("inactive"),
  priceId: text("price_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const pendingInvites = pgTable(
  "pending_invites",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    githubLogin: text("github_login").notNull(),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => users.id),
    status: text("status", { enum: ["pending", "accepted", "revoked"] })
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("pending_invites_workspace_login").on(
      t.workspaceId,
      t.githubLogin,
    ),
  ],
);

export const auditLogs = pgTable("audit_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  workspaceId: text("workspace_id"),
  userId: text("user_id"),
  action: text("action").notNull(),
  metaJson: jsonb("meta_json").$type<Record<
    string,
    unknown
  > | null>(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type RepairRun = typeof repairRuns.$inferSelect;
export type RepairFix = typeof repairFixes.$inferSelect;
