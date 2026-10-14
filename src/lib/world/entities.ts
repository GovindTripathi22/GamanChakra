import { db } from "@/lib/db";

export interface NormalizedWorldEntity {
  id: string;
  category: "destination" | "airport" | "station" | "hub" | "venue";
  name: string;
  code?: string;
  lat: number;
  lng: number;
  state: string;
  country: string;
  metadata?: Record<string, any>;
}

export interface NormalizedWorldRoute {
  originCode: string;
  destinationCode: string;
  mode: "air" | "rail" | "road";
  distanceKm: number;
  transitMinutes: number;
  frequencyDaily: number;
  capacityScore: number;
  source: string;
}

export const INITIAL_WORLD_ENTITIES: NormalizedWorldEntity[] = [
  // Destinations
  { id: "ent-dest-delhi", category: "destination", name: "Delhi", code: "DELHI", lat: 28.6139, lng: 77.2090, state: "Delhi", country: "India" },
  { id: "ent-dest-jaipur", category: "destination", name: "Jaipur", code: "JAIPUR", lat: 26.9124, lng: 75.7873, state: "Rajasthan", country: "India" },
  { id: "ent-dest-goa", category: "destination", name: "Goa", code: "GOA", lat: 15.2993, lng: 74.1240, state: "Goa", country: "India" },
  { id: "ent-dest-mumbai", category: "destination", name: "Mumbai", code: "MUMBAI", lat: 19.0760, lng: 72.8777, state: "Maharashtra", country: "India" },
  { id: "ent-dest-varanasi", category: "destination", name: "Varanasi", code: "VARANASI", lat: 25.3176, lng: 82.9739, state: "Uttar Pradesh", country: "India" },
  { id: "ent-dest-kochi", category: "destination", name: "Kochi", code: "KOCHI", lat: 9.9312, lng: 76.2673, state: "Kerala", country: "India" },

  // Major Airports
  { id: "ent-air-del", category: "airport", name: "Indira Gandhi International Airport", code: "DEL", lat: 28.5562, lng: 77.1000, state: "Delhi", country: "India" },
  { id: "ent-air-jai", category: "airport", name: "Jaipur International Airport", code: "JAI", lat: 26.8242, lng: 75.8122, state: "Rajasthan", country: "India" },
  { id: "ent-air-bom", category: "airport", name: "Chhatrapati Shivaji Maharaj International Airport", code: "BOM", lat: 19.0896, lng: 72.8656, state: "Maharashtra", country: "India" },
  { id: "ent-air-goi", category: "airport", name: "Dabolim Airport", code: "GOI", lat: 15.3808, lng: 73.8314, state: "Goa", country: "India" },
  { id: "ent-air-gox", category: "airport", name: "Manohar International Airport (Mopa)", code: "GOX", lat: 15.7667, lng: 73.8667, state: "Goa", country: "India" },
  { id: "ent-air-cok", category: "airport", name: "Cochin International Airport", code: "COK", lat: 10.1518, lng: 76.3930, state: "Kerala", country: "India" },
  { id: "ent-air-vns", category: "airport", name: "Lal Bahadur Shastri International Airport", code: "VNS", lat: 25.4524, lng: 82.8593, state: "Uttar Pradesh", country: "India" },

  // Major Railway Hubs
  { id: "ent-rail-ndls", category: "station", name: "New Delhi Railway Station", code: "NDLS", lat: 28.6430, lng: 77.2194, state: "Delhi", country: "India" },
  { id: "ent-rail-jp", category: "station", name: "Jaipur Junction", code: "JP", lat: 26.9220, lng: 75.7885, state: "Rajasthan", country: "India" },
  { id: "ent-rail-csmt", category: "station", name: "Chhatrapati Shivaji Maharaj Terminus", code: "CSMT", lat: 18.9402, lng: 72.8356, state: "Maharashtra", country: "India" },
  { id: "ent-rail-mao", category: "station", name: "Madgaon Junction", code: "MAO", lat: 15.2747, lng: 73.9790, state: "Goa", country: "India" },
  { id: "ent-rail-bsb", category: "station", name: "Varanasi Junction", code: "BSB", lat: 25.3284, lng: 82.9868, state: "Uttar Pradesh", country: "India" },
  { id: "ent-rail-ers", category: "station", name: "Ernakulam Junction", code: "ERS", lat: 9.9678, lng: 76.2917, state: "Kerala", country: "India" },
];

export const INITIAL_WORLD_ROUTES: NormalizedWorldRoute[] = [
  // Air routes
  { originCode: "DEL", destinationCode: "JAI", mode: "air", distanceKm: 240, transitMinutes: 55, frequencyDaily: 8, capacityScore: 0.95, source: "DGCA Airline Timetables" },
  { originCode: "DEL", destinationCode: "GOI", mode: "air", distanceKm: 1510, transitMinutes: 150, frequencyDaily: 14, capacityScore: 0.88, source: "DGCA Airline Timetables" },
  { originCode: "BOM", destinationCode: "GOI", mode: "air", distanceKm: 440, transitMinutes: 70, frequencyDaily: 18, capacityScore: 0.92, source: "DGCA Airline Timetables" },
  { originCode: "DEL", destinationCode: "VNS", mode: "air", distanceKm: 680, transitMinutes: 80, frequencyDaily: 6, capacityScore: 0.90, source: "DGCA Airline Timetables" },
  { originCode: "DEL", destinationCode: "COK", mode: "air", distanceKm: 2050, transitMinutes: 195, frequencyDaily: 9, capacityScore: 0.85, source: "DGCA Airline Timetables" },

  // Rail routes
  { originCode: "NDLS", destinationCode: "JP", mode: "rail", distanceKm: 308, transitMinutes: 270, frequencyDaily: 22, capacityScore: 0.80, source: "Indian Railways National Train Enquiry System" },
  { originCode: "CSMT", destinationCode: "MAO", mode: "rail", distanceKm: 580, transitMinutes: 480, frequencyDaily: 12, capacityScore: 0.72, source: "Konkan Railway Timetable" },
  { originCode: "NDLS", destinationCode: "BSB", mode: "rail", distanceKm: 760, transitMinutes: 480, frequencyDaily: 16, capacityScore: 0.65, source: "Northern Railway Timetable" },

  // Road expressways
  { originCode: "DELHI", destinationCode: "JAIPUR", mode: "road", distanceKm: 270, transitMinutes: 240, frequencyDaily: 80, capacityScore: 0.90, source: "Delhi-Mumbai Expressway (NH-48)" },
  { originCode: "MUMBAI", destinationCode: "GOA", mode: "road", distanceKm: 590, transitMinutes: 630, frequencyDaily: 35, capacityScore: 0.75, source: "NH-66 Konkan Highway" },
];

/**
 * Ensure initial seed entities exist in the database with stable internal IDs
 */
export async function seedWorldEntitiesIfEmpty(): Promise<void> {
  const count = await db.worldEntity.count();
  if (count > 0) return;

  for (const ent of INITIAL_WORLD_ENTITIES) {
    await db.worldEntity.create({
      data: {
        id: ent.id,
        category: ent.category,
        name: ent.name,
        code: ent.code || null,
        lat: ent.lat,
        lng: ent.lng,
        state: ent.state,
        country: ent.country,
        metadata: JSON.stringify(ent.metadata || {}),
      },
    });
  }

  // Create routes connecting entity IDs
  for (const r of INITIAL_WORLD_ROUTES) {
    const orig = await db.worldEntity.findFirst({ where: { code: r.originCode } });
    const dest = await db.worldEntity.findFirst({ where: { code: r.destinationCode } });

    if (orig && dest) {
      await db.worldRoute.create({
        data: {
          originId: orig.id,
          destinationId: dest.id,
          mode: r.mode,
          distanceKm: r.distanceKm,
          transitMinutes: r.transitMinutes,
          frequencyDaily: r.frequencyDaily,
          capacityScore: r.capacityScore,
          source: r.source,
        },
      });
    }
  }
}
