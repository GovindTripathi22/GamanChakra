#!/usr/bin/env node
/**
 * One-command setup (Windows, macOS, Linux):  npm run setup
 *  1. writes .env with freshly generated local secrets (no third-party API keys needed — ever)
 *  2. creates the database schema
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const rand = (n = 32) => randomBytes(n).toString("hex");
let env = existsSync(".env") ? readFileSync(".env", "utf8") : "";
const ensure = (key, value, comment) => {
  if (new RegExp(`^${key}=`, "m").test(env)) return;
  env += `${env && !env.endsWith("\n") ? "\n" : ""}${comment ? `# ${comment}\n` : ""}${key}="${value}"\n`;
  console.log(`  + ${key}`);
};
console.log("Voyage setup — configuring .env");
ensure("DATABASE_URL", "file:./dev.db", "SQLite for local use. For production use PostgreSQL (see README).");
ensure("AUTH_SECRET", rand(32), "Signs session cookies. Generated locally — keep it secret.");
ensure("CRON_SECRET", rand(24), "Protects /api/cron/agent for external schedulers.");
ensure("APP_URL", "http://localhost:3000", "Public URL used in traveller check-in links.");
ensure("AGENT_AUTORUN", "true", "Autonomous agent loop inside the web server.");
ensure("AGENT_INTERVAL_MIN", "10", "Minutes between autonomous cycles.");
ensure("NEWS_MODE", "auto", "auto = live sources, falls back to a labelled drill feed when offline. live | drill also allowed.");
writeFileSync(".env", env);
console.log("Creating database schema…");
execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
console.log("\n✓ Ready. Run `npm run dev` and open http://localhost:3000 — click “Launch the live demo”.");
