import { handler, json, HttpError } from "@/lib/api";
import { db } from "@/lib/db";
import { findPlace } from "@/lib/geo/gazetteer";

/** POST /api/travelers/import — CSV: name,email,phone,department,homeCity,destinationCity,tripStart,tripEnd,transportMode */
export const POST = handler(async (req, { session }) => {
  const text = await req.text();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new HttpError(400, "CSV needs a header row and at least one traveller");
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k.toLowerCase());
  const errors: string[] = [];
  let created = 0;
  for (const [n, line] of lines.slice(1).entries()) {
    const cols = line.split(",").map((c) => c.trim());
    const get = (k: string) => (idx(k) >= 0 ? cols[idx(k)] : "");
    const p = findPlace(get("destinationCity"));
    const start = new Date(get("tripStart")), end = new Date(get("tripEnd"));
    if (!get("name") || !p || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) { errors.push(`Row ${n + 2}: missing name, unknown city or bad dates`); continue; }
    await db.traveler.create({ data: { orgId: session!.oid, name: get("name"), email: get("email") || null, phone: get("phone") || null, department: get("department") || null, homeCity: get("homeCity") || null, destinationCity: p.name, destLat: p.lat, destLng: p.lng, tripStart: start, tripEnd: end, transportMode: (["flight", "train", "bus", "car"].includes(get("transportMode")) ? get("transportMode") : "flight") } });
    created++;
  }
  return json({ created, errors });
}, { auth: "required", roles: ["owner", "admin"] });
