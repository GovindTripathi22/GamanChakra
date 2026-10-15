#!/usr/bin/env node
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;

if (url && (url.startsWith("postgres://") || url.startsWith("postgresql://")) && !url.includes("localhost")) {
  console.log("Detected external PostgreSQL database. Synchronizing schema...");
  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url }
    });
    console.log("✓ Database schema synchronized successfully.");
  } catch (err) {
    console.warn("Notice: Prisma db push warning during build (proceeding):", err.message);
  }
} else {
  console.log("Skipping database push: No external PostgreSQL URL detected.");
}
