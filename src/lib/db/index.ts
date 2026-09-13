import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

/**
 * Postgres (Neon) connection for the app.
 *
 * Replaces a local better-sqlite3 file. That worked when the API ran as one
 * long-lived process, but on serverless there is no durable local disk: the
 * old resolveDbPath() fell back to /tmp whenever the working directory was
 * read-only, which is *always* on Vercel. Nothing threw — every instance
 * quietly created its own empty database, so writes appeared to succeed and
 * then vanished when the instance was recycled. Silent data loss is worse
 * than an outage, so this module refuses to start without a real connection
 * string rather than inventing a scratch one.
 *
 * The HTTP driver is used deliberately: it opens no long-lived socket, so it
 * suits short-lived serverless invocations, and it has no connection pool to
 * exhaust when many of them run at once. It cannot do interactive
 * transactions — nothing in this codebase uses them.
 */

const globalForDb = globalThis as unknown as {
  __repairoDb?: ReturnType<typeof createDb>;
};

/**
 * Vercel's Postgres integration injects POSTGRES_URL; a Neon project connected
 * directly gives DATABASE_URL. Accept either so the deployment does not depend
 * on which one was wired up.
 */
function resolveConnectionString(): string {
  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";

  if (!url) {
    throw new Error(
      "No Postgres connection string. Set DATABASE_URL (or POSTGRES_URL) to your " +
        "Neon connection string — in Vercel this goes in Project Settings → " +
        "Environment Variables, for every environment the app runs in.",
    );
  }
  return url;
}

function createDb() {
  return drizzle(neon(resolveConnectionString()), { schema });
}

export function getDb() {
  if (!globalForDb.__repairoDb) {
    globalForDb.__repairoDb = createDb();
  }
  return globalForDb.__repairoDb;
}

/**
 * Report whether the database is actually reachable.
 *
 * This runs a real query rather than just constructing a client: building the
 * Neon client is lazy and succeeds even against a wrong or unreachable host,
 * so a probe that only called getDb() would report healthy right up until the
 * first query failed.
 */
export async function dbProbe() {
  try {
    await getDb().execute(sql`select 1`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "db failed",
    };
  }
}

export type Db = ReturnType<typeof getDb>;

/**
 * Take the first row of a query, or undefined.
 *
 * better-sqlite3 offered a synchronous `.get()` that returned one row; the
 * Postgres drivers are async and always resolve to an array. This keeps the
 * call sites reading as "fetch one thing" instead of `(await …)[0]` repeated
 * forty times. Pair it with `.limit(1)` on selects.
 */
export async function firstRow<T>(query: PromiseLike<T[]>): Promise<T | undefined> {
  return (await query)[0];
}
