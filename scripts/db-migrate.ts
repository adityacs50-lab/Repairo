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

async function main() {
  const url = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();
  if (!url) {
    console.error(
      "DATABASE_URL (or POSTGRES_URL) is not set. Copy the connection string from " +
        "your Neon project, or from Vercel → Storage → your database.",
    );
    process.exit(1);
  }

  const db = drizzle(neon(url));
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
}

main().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
