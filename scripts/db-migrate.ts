/**
 * Apply pending Drizzle migrations to the Neon database.
 *
 * Run this once against each environment after deploying a schema change:
 *
 *     DATABASE_URL='postgres://…' npm run db:migrate
 *
 * Kept as an explicit command rather than something the app does on boot. The
 * SQLite version created its tables inside the request path, which is fine for
 * one long-lived process and wrong for serverless: several cold starts can run
 * at once and race each other's DDL.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

/** tsx does not read .env on its own, so load the same files Next.js would. */
function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      /* missing file, or a key already set — fine either way */
    }
  }
}

async function main() {
  loadEnvFiles();

  // Prefer the direct endpoint for DDL. Neon's pooled hostname routes through
  // pgbouncer in transaction mode, which is built for short application queries
  // rather than a migration's sequence of schema statements.
  const url =
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim();
  if (!url) {
    console.log(
      "Skipping migrations: no DATABASE_URL / POSTGRES_URL in the environment " +
        "(fine for local `next build` without a database).",
    );
    return;
  }

  const host = url.match(/@([^/?]+)/)?.[1] ?? "unknown host";
  console.log(`Applying migrations to ${host} …`);

  const db = drizzle(neon(url));
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
}

main().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
