import path from "node:path";
process.env.DATABASE_URL = `file:${path.resolve(__dirname, "../prisma/test.db")}`;
process.env.NEWS_MODE = "drill";
process.env.GENERATIVE_SLM = "off";
process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-0123456789";
process.env.AGENT_AUTORUN = "false";
(process.env as Record<string, string>).NODE_ENV = "test";
