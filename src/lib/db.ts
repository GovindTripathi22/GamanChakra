import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client singleton for the Next.js App Router.
 * Prevents hot-reload connection exhaustion in development.
 *
 * PRISMA_DRIVER_ADAPTER=better-sqlite3 switches to the Rust-free driver-adapter
 * runtime (used by air-gapped CI/sandboxes that cannot download Prisma engines).
 * Normal installs use the standard Prisma engine and need nothing extra.
 */
// If hosted on Vercel Postgres / Neon, fallback to standard Vercel environment variables
if (!process.env.DATABASE_URL) {
  if (process.env.POSTGRES_PRISMA_URL) {
    process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
  } else if (process.env.POSTGRES_URL) {
    process.env.DATABASE_URL = process.env.POSTGRES_URL;
  } else {
    // Safe build-time dummy so next build / prisma client initialization does not error during deployment build
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres";
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createClient(): PrismaClient {
  const log: ("warn" | "error")[] = process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];
  if (process.env.PRISMA_DRIVER_ADAPTER === "better-sqlite3") {
    // eslint-disable-next-line no-eval
    const req = eval("require") as NodeRequire;
    const { PrismaBetterSQLite3 } = req("@prisma/adapter-better-sqlite3");
    const url = (process.env.DATABASE_URL || "file:./dev.db").replace(/^file:/, "");
    const adapter = new PrismaBetterSQLite3({ url });
    return new PrismaClient({ adapter, log } as never);
  }
  return new PrismaClient({ log });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
