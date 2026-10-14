import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Creates a fresh SQLite test database from prisma/schema.prisma before the suite runs.
 * Default: `prisma db push`. Air-gapped CI can override with TEST_DB_BOOTSTRAP="<command>".
 */
export default function setup() {
  const dbFile = path.resolve(__dirname, "../prisma/test.db");
  for (const f of [dbFile, `${dbFile}-journal`]) if (fs.existsSync(f)) fs.unlinkSync(f);
  const url = `file:${dbFile}`;
  const cmd = process.env.TEST_DB_BOOTSTRAP ?? "npx prisma db push --skip-generate --accept-data-loss";
  execSync(cmd, { stdio: "inherit", env: { ...process.env, DATABASE_URL: url, TEST_DB_FILE: dbFile } });
}
