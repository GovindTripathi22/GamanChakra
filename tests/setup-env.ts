if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith("file:")) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED 
    || process.env.POSTGRES_URL 
    || "postgresql://voyage_user:voyage_password@localhost:5432/voyage_test?schema=public";
}
process.env.NEWS_MODE = "drill";
process.env.GENERATIVE_SLM = "off";
process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-test-secret-test-secret-0123456789";
process.env.AGENT_AUTORUN = "false";
(process.env as Record<string, string>).NODE_ENV = "test";
