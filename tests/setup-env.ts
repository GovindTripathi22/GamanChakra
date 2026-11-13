if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("dev.db")) {
  process.env.DATABASE_URL = "file:./test.db";
}
process.env.NEWS_MODE = "drill";
process.env.GENERATIVE_SLM = "off";
process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-test-secret-test-secret-0123456789";
process.env.AGENT_AUTORUN = "false";
(process.env as Record<string, string>).NODE_ENV = "test";
