import { randomUUID } from "crypto";
import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
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
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("users_github_id_idx").on(t.githubId)],
);

export const workspaces = sqliteTable("workspaces", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id),
  plan: text("plan", { enum: ["free", "pro"] }).notNull().default("free"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const workspaceMembers = sqliteTable(
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
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("workspace_members_unique").on(t.workspaceId, t.userId),
  ],
);

export const integrations = sqliteTable("integrations", {
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
  consumerPaths: text("consumer_paths", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  consumerRef: text("consumer_ref").notNull(),
  baseBranch: text("base_branch").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
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
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const repairRuns = sqliteTable("repair_runs", {
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
  summaryJson: text("summary_json", { mode: "json" }).$type<Record<
    string,
    unknown
  > | null>(),
  prUrl: text("pr_url"),
  prNumber: integer("pr_number"),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
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
export const repairFixes = sqliteTable("repair_fixes", {
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
  safe: integer("safe", { mode: "boolean" }).notNull(),
  origin: text("origin", { enum: ["deterministic", "agent-proposed"] })
    .notNull()
    .default("deterministic"),
  /** Model self-reported, NOT a calibrated probability — see the agentConfidence
   * doc-comment in src/lib/engine/types.ts. Null for deterministic fixes. */
  agentConfidence: real("agent_confidence"),
  agentReasoning: text("agent_reasoning"),
  safetyNotesJson: text("safety_notes_json", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default("inactive"),
  priceId: text("price_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const pendingInvites = sqliteTable(
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
    createdAt: integer("created_at", { mode: "timestamp_ms" })
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

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  workspaceId: text("workspace_id"),
  userId: text("user_id"),
  action: text("action").notNull(),
  metaJson: text("meta_json", { mode: "json" }).$type<Record<
    string,
    unknown
  > | null>(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type RepairRun = typeof repairRuns.$inferSelect;
export type RepairFix = typeof repairFixes.$inferSelect;
