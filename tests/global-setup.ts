import { execSync } from "node:child_process";

/**
 * Creates a fresh test database schema before the test suite runs.
 */
export default function setup() {
  const url = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("dev.db")
    ? process.env.DATABASE_URL
    : "file:./test.db";

  const cmd = process.env.TEST_DB_BOOTSTRAP ?? "npx prisma db push --force-reset --skip-generate --accept-data-loss";
  try {
    execSync(cmd, { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
  } catch (err) {
    console.warn("Notice: Test DB setup warning (proceeding):", err instanceof Error ? err.message : err);
  }
}
