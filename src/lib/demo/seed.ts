import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/auth/accounts";
import { findPlace } from "@/lib/geo/gazetteer";
import { RULE_TEMPLATES } from "@/lib/agent/automations";

/** Demo travellers for the B2B duty-of-care console (fictional people, real cities). */
const DEMO_TRAVELERS: [name: string, dept: string, home: string, dest: string, startOffsetDays: number, lengthDays: number, mode: string][] = [
  ["Aarav Mehta", "Sales", "Mumbai", "Delhi", -1, 4, "flight"],
  ["Diya Iyer", "Engineering", "Chennai", "Bengaluru", 0, 3, "flight"],
  ["Kabir Singh", "Leadership", "Delhi", "Dubai", -2, 5, "flight"],
  ["Ananya Rao", "Marketing", "Hyderabad", "Goa", 1, 4, "flight"],
  ["Rohan Gupta", "Engineering", "Pune", "Kathmandu", -1, 6, "flight"],
  ["Meera Nair", "Finance", "Kochi", "Paris", 0, 5, "flight"],
  ["Ishaan Kapoor", "Sales", "Delhi", "Bangkok", 2, 4, "flight"],
  ["Sara Khan", "Operations", "Lucknow", "Mumbai", -1, 3, "train"],
  ["Vikram Joshi", "Engineering", "Bengaluru", "Visakhapatnam", 0, 3, "train"],
  ["Nisha Verma", "HR", "Jaipur", "Srinagar", 1, 4, "flight"],
  ["Arjun Reddy", "Sales", "Hyderabad", "Singapore", 3, 4, "flight"],
  ["Priya Menon", "Product", "Bengaluru", "London", -3, 7, "flight"],
  ["Dev Malhotra", "Leadership", "Delhi", "Hong Kong", 1, 3, "flight"],
  ["Tara Bose", "Design", "Kolkata", "Bhubaneswar", 0, 2, "train"],
  ["Rahul Desai", "Engineering", "Ahmedabad", "Tokyo", 5, 6, "flight"],
  ["Zoya Ali", "Marketing", "Delhi", "Istanbul", 8, 5, "flight"],
  ["Karan Shah", "Sales", "Surat", "New York", 12, 6, "flight"],
  ["Pooja Pillai", "Support", "Thiruvananthapuram", "Kochi", 0, 2, "bus"],
  ["Aditya Kulkarni", "Engineering", "Pune", "Bali", 4, 6, "flight"],
  ["Riya Chatterjee", "Finance", "Kolkata", "Delhi", 2, 2, "train"],
  ["Manav Arora", "Operations", "Chandigarh", "Manali", 1, 4, "car"],
  ["Sneha Patil", "Product", "Mumbai", "Udaipur", 6, 3, "train"],
  ["Farhan Qureshi", "Sales", "Bhopal", "Doha", 0, 3, "flight"],
  ["Leela Krishnan", "Research", "Chennai", "Colombo", 9, 4, "flight"],
];

export async function ensureDemoWorkspace(opts: { force?: boolean } = {}) {
  let user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (user && !opts.force) return { user, org: await db.organization.findUniqueOrThrow({ where: { id: user.orgId } }), created: false };

  let org = await db.organization.findUnique({ where: { slug: "demo-travel-co" } });
  if (!org) org = await db.organization.create({ data: { name: "Demo Travel Co.", slug: "demo-travel-co", kind: "tmc", plan: "business", autonomyLevel: "L3", homeRegion: "IN" } });
  if (!user) user = await db.user.create({ data: { email: DEMO_EMAIL, name: "Demo Ops Manager", passwordHash: await hashPassword(DEMO_PASSWORD), orgId: org.id, role: "owner", plan: "business" } });

  const now = Date.now();
  if ((await db.traveler.count({ where: { orgId: org.id } })) === 0) {
    for (const [name, dept, home, dest, off, len, mode] of DEMO_TRAVELERS) {
      const p = findPlace(dest);
      if (!p) continue;
      const first = name.split(" ")[0].toLowerCase();
      await db.traveler.create({
        data: {
          orgId: org.id, name, department: dept, homeCity: home, destinationCity: p.name, destLat: p.lat, destLng: p.lng,
          tripStart: new Date(now + off * 864e5), tripEnd: new Date(now + (off + len) * 864e5), transportMode: mode,
          email: `${first}@demo-travel.co`, phone: `+9198${String(10000000 + Math.floor(Math.random() * 89999999)).slice(0, 8)}`,
        },
      });
    }
  }
  if ((await db.automationRule.count({ where: { orgId: org.id } })) === 0) {
    for (const r of RULE_TEMPLATES) {
      await db.automationRule.create({ data: { orgId: org.id, name: r.name, trigger: r.trigger, conditions: JSON.stringify(r.conditions), actions: JSON.stringify(r.actions), enabled: r.enabled } });
    }
  }
  if ((await db.trip.count({ where: { ownerId: user.id } })) === 0) {
    const goa = findPlace("Goa")!;
    const start = new Date(now + 864e5).toISOString().slice(0, 10);
    const end = new Date(now + 4 * 864e5).toISOString().slice(0, 10);
    await db.trip.create({
      data: {
        ownerId: user.id, orgId: org.id, title: "Goa long weekend", origin: "Mumbai", destination: "Goa", startDate: start, endDate: end, travelers: "2", budgetMax: 42000,
        destLat: goa.lat, destLng: goa.lng, status: "planned",
        items: {
          create: [
            { type: "flight", title: "Flight BOM → GOI", startAt: "07:10", endAt: "08:25", costMin: 4200, costMax: 6800 },
            { type: "activity", title: "Fort Aguada & Candolim beach", startAt: "16:30", endAt: "19:00", costMin: 0, costMax: 300, meta: JSON.stringify({ weatherSensitivity: "outdoor_high" }) },
            { type: "activity", title: "Old Goa churches walk", startAt: "09:00", endAt: "11:30", costMin: 0, costMax: 200, meta: JSON.stringify({ weatherSensitivity: "outdoor_sheltered" }) },
            { type: "activity", title: "Mandovi river sunset cruise", startAt: "17:30", endAt: "19:00", costMin: 600, costMax: 1200, meta: JSON.stringify({ weatherSensitivity: "outdoor_high" }) },
          ],
        },
      },
    });
  }
  return { user, org, created: true };
}
