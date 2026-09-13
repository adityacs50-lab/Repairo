import type { Config } from "drizzle-kit";

/**
 * Schema management for the Neon Postgres database.
 *
 * `npm run db:generate` writes versioned SQL into drizzle/; `npm run db:migrate`
 * applies it. DDL deliberately does not run at request time: on serverless,
 * several cold starts can begin at once, and concurrent CREATE TABLE statements
 * race each other. The old SQLite bootstrap did exactly that on every boot.
 */
export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "",
  },
} satisfies Config;
