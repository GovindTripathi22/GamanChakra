import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "./password";
import { z } from "zod";

export const SignUpSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(8).max(200),
  orgName: z.string().trim().max(120).optional(),
  orgKind: z.enum(["personal", "tmc", "corporate", "tour_operator", "ota"]).default("personal"),
});

export const SignInSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").slice(0, 40) || "org";
}

export async function createAccount(input: z.input<typeof SignUpSchema>) {
  const data = SignUpSchema.parse(input);
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("An account with this email already exists.");
  const orgName = data.orgName || `${data.name.split(" ")[0]}'s Travel`;
  const slug = `${slugify(orgName)}-${Math.random().toString(36).slice(2, 7)}`;
  const passwordHash = await hashPassword(data.password);
  const org = await db.organization.create({
    data: { name: orgName, slug, kind: data.orgKind, plan: data.orgKind === "personal" ? "free" : "business" },
  });
  const user = await db.user.create({
    data: { email: data.email, name: data.name, passwordHash, orgId: org.id, role: "owner", plan: org.plan },
  });
  return { user, org };
}

export async function authenticate(input: z.input<typeof SignInSchema>) {
  const data = SignInSchema.parse(input);
  const user = await db.user.findUnique({ where: { email: data.email } });
  // Constant-ish time: always run a verification.
  const ok = await verifyPassword(data.password, user?.passwordHash ?? "scrypt$16384$8$1$AAAA$AAAA");
  if (!user || !ok) throw new Error("Invalid email or password.");
  await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  return user;
}

export const DEMO_EMAIL = "demo@voyage.app";
export const DEMO_PASSWORD = "chakra-demo-2026";
