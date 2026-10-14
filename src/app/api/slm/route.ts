import { z } from "zod";
import { handler, json, readJson } from "@/lib/api";
import { classifyIntent, classifyNews, NANO_INFO } from "@/lib/slm/nano";

const Body = z.object({ text: z.string().min(1).max(1000), task: z.enum(["intent", "news"]).default("news") });
/** POST /api/slm — run the in-house Chakra-Nano model directly (playground + partner use). */
export const POST = handler(async (req) => {
  const b = Body.parse(await readJson(req));
  const out = b.task === "intent" ? classifyIntent(b.text) : classifyNews(b.text);
  return json({ model: NANO_INFO.name, version: NANO_INFO.version, task: b.task, output: out });
});
export const GET = handler(async () => json({ model: NANO_INFO.name, version: NANO_INFO.version, report: NANO_INFO.report }));
