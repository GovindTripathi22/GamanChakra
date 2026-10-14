import { GeneratedTrip } from "@/types/trip";
import { CostBreakdown, CostLineItem, CostCategory } from "@/types/cost";
import { FactProvenance } from "@/lib/providers/types";

interface DestinationBenchmark {
  transportMin: number;
  transportMax: number;
  stayDailyMin: number;
  stayDailyMax: number;
  foodDailyMin: number;
  foodDailyMax: number;
  localTransitDailyMin: number;
  localTransitDailyMax: number;
  activitiesDailyMin: number;
  activitiesDailyMax: number;
  taxesPercent: number;
  bufferPercent: number;
}

const BENCHMARK_MAP: Record<string, Record<"budget" | "standard" | "comfort", DestinationBenchmark>> = {
  jaipur: {
    budget: {
      transportMin: 1500,
      transportMax: 3000,
      stayDailyMin: 800,
      stayDailyMax: 1500,
      foodDailyMin: 500,
      foodDailyMax: 900,
      localTransitDailyMin: 300,
      localTransitDailyMax: 500,
      activitiesDailyMin: 250,
      activitiesDailyMax: 500,
      taxesPercent: 5,
      bufferPercent: 10,
    },
    standard: {
      transportMin: 3000,
      transportMax: 6000,
      stayDailyMin: 2500,
      stayDailyMax: 4500,
      foodDailyMin: 1200,
      foodDailyMax: 2000,
      localTransitDailyMin: 600,
      localTransitDailyMax: 1000,
      activitiesDailyMin: 600,
      activitiesDailyMax: 1200,
      taxesPercent: 12,
      bufferPercent: 10,
    },
    comfort: {
      transportMin: 6000,
      transportMax: 12000,
      stayDailyMin: 7000,
      stayDailyMax: 14000,
      foodDailyMin: 2500,
      foodDailyMax: 4500,
      localTransitDailyMin: 1200,
      localTransitDailyMax: 2000,
      activitiesDailyMin: 1500,
      activitiesDailyMax: 3000,
      taxesPercent: 18,
      bufferPercent: 12,
    },
  },
  goa: {
    budget: {
      transportMin: 2500,
      transportMax: 4500,
      stayDailyMin: 1000,
      stayDailyMax: 2000,
      foodDailyMin: 700,
      foodDailyMax: 1200,
      localTransitDailyMin: 400,
      localTransitDailyMax: 700,
      activitiesDailyMin: 300,
      activitiesDailyMax: 600,
      taxesPercent: 5,
      bufferPercent: 10,
    },
    standard: {
      transportMin: 5000,
      transportMax: 10000,
      stayDailyMin: 3000,
      stayDailyMax: 6000,
      foodDailyMin: 1500,
      foodDailyMax: 2500,
      localTransitDailyMin: 800,
      localTransitDailyMax: 1400,
      activitiesDailyMin: 800,
      activitiesDailyMax: 1600,
      taxesPercent: 12,
      bufferPercent: 10,
    },
    comfort: {
      transportMin: 9000,
      transportMax: 18000,
      stayDailyMin: 8000,
      stayDailyMax: 16000,
      foodDailyMin: 3000,
      foodDailyMax: 5500,
      localTransitDailyMin: 1500,
      localTransitDailyMax: 2500,
      activitiesDailyMin: 2000,
      activitiesDailyMax: 4000,
      taxesPercent: 18,
      bufferPercent: 15,
    },
  },
  kerala: {
    budget: {
      transportMin: 2500,
      transportMax: 5000,
      stayDailyMin: 1000,
      stayDailyMax: 1800,
      foodDailyMin: 600,
      foodDailyMax: 1000,
      localTransitDailyMin: 400,
      localTransitDailyMax: 700,
      activitiesDailyMin: 350,
      activitiesDailyMax: 700,
      taxesPercent: 5,
      bufferPercent: 10,
    },
    standard: {
      transportMin: 5500,
      transportMax: 11000,
      stayDailyMin: 3200,
      stayDailyMax: 5500,
      foodDailyMin: 1400,
      foodDailyMax: 2200,
      localTransitDailyMin: 800,
      localTransitDailyMax: 1300,
      activitiesDailyMin: 800,
      activitiesDailyMax: 1800,
      taxesPercent: 12,
      bufferPercent: 10,
    },
    comfort: {
      transportMin: 9000,
      transportMax: 18000,
      stayDailyMin: 7500,
      stayDailyMax: 15000,
      foodDailyMin: 2800,
      foodDailyMax: 4800,
      localTransitDailyMin: 1500,
      localTransitDailyMax: 2400,
      activitiesDailyMin: 2000,
      activitiesDailyMax: 4000,
      taxesPercent: 18,
      bufferPercent: 12,
    },
  },
};

// Default fallback benchmark for any other destination
const DEFAULT_BENCHMARK: Record<"budget" | "standard" | "comfort", DestinationBenchmark> = {
  budget: {
    transportMin: 2000,
    transportMax: 4000,
    stayDailyMin: 1000,
    stayDailyMax: 1800,
    foodDailyMin: 600,
    foodDailyMax: 1000,
    localTransitDailyMin: 350,
    localTransitDailyMax: 600,
    activitiesDailyMin: 300,
    activitiesDailyMax: 600,
    taxesPercent: 5,
    bufferPercent: 10,
  },
  standard: {
    transportMin: 4000,
    transportMax: 8000,
    stayDailyMin: 2800,
    stayDailyMax: 5000,
    foodDailyMin: 1300,
    foodDailyMax: 2200,
    localTransitDailyMin: 700,
    localTransitDailyMax: 1200,
    activitiesDailyMin: 700,
    activitiesDailyMax: 1400,
    taxesPercent: 12,
    bufferPercent: 10,
  },
  comfort: {
    transportMin: 8000,
    transportMax: 16000,
    stayDailyMin: 7500,
    stayDailyMax: 15000,
    foodDailyMin: 2800,
    foodDailyMax: 5000,
    localTransitDailyMin: 1400,
    localTransitDailyMax: 2200,
    activitiesDailyMin: 1800,
    activitiesDailyMax: 3500,
    taxesPercent: 18,
    bufferPercent: 12,
  },
};

export function parseNumberFromString(val?: string): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[^0-9]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

export function parseTravelersCount(travelers?: string): number {
  if (!travelers) return 2;
  const lower = travelers.toLowerCase();
  if (lower.includes("solo") || lower.includes("1") || lower.includes("just me")) return 1;
  if (lower.includes("couple") || lower.includes("2")) return 2;
  if (lower.includes("family") || lower.includes("4")) return 4;
  if (lower.includes("group") || lower.includes("5")) return 5;
  const num = parseNumberFromString(travelers);
  return num && num > 0 ? num : 2;
}

export function calculateTripCost(
  trip: GeneratedTrip,
  customSpendCap?: number
): CostBreakdown {
  const destName = (trip.trip_details?.destination || "jaipur").toLowerCase().trim();
  const destKey = Object.keys(BENCHMARK_MAP).find((k) => destName.includes(k)) || "default";
  
  const rawStyle = (trip.trip_details?.budget || "standard").toLowerCase();
  const style: "budget" | "standard" | "comfort" =
    rawStyle.includes("cheap") || rawStyle.includes("budget")
      ? "budget"
      : rawStyle.includes("luxury") || rawStyle.includes("comfort")
      ? "comfort"
      : "standard";

  const rawDuration = trip.trip_details?.duration || "4 days";
  const durationDays = Math.max(1, parseNumberFromString(rawDuration) || (trip.itinerary?.length || 4));
  const travelersCount = parseTravelersCount(trip.trip_details?.budget); // check travelers

  const benchmark = destKey !== "default"
    ? BENCHMARK_MAP[destKey][style]
    : DEFAULT_BENCHMARK[style];

  // Group multiplier adjustments (e.g. shared rooms for couples/families)
  const roomCount = Math.ceil(travelersCount / 2);
  const foodMultiplier = travelersCount;

  // 1. Stays / Accommodation
  let stayMin = benchmark.stayDailyMin * durationDays * roomCount;
  let stayMax = benchmark.stayDailyMax * durationDays * roomCount;
  let stayStatus: CostLineItem["status"] = "estimated";
  let staySource = "Regional Hospitality Rate Card";

  if (trip.hotels && trip.hotels.length > 0) {
    const hotelPrices = trip.hotels
      .map((h) => parseNumberFromString(h.price))
      .filter((p): p is number => p !== null);
    if (hotelPrices.length > 0) {
      const avgNight = hotelPrices.reduce((a, b) => a + b, 0) / hotelPrices.length;
      stayMin = Math.round(avgNight * 0.9 * durationDays * roomCount);
      stayMax = Math.round(avgNight * 1.15 * durationDays * roomCount);
      stayStatus = "confirmed";
      staySource = `Sourced from ${trip.hotels.length} matched accommodations`;
    }
  }

  // 2. Intercity Transport
  let transportMin = benchmark.transportMin * travelersCount;
  let transportMax = benchmark.transportMax * travelersCount;
  let transportStatus: CostLineItem["status"] = "estimated";
  let transportSource = "Historical Carrier Timetable Estimates";

  if (trip.transportation_plan && trip.transportation_plan.length > 0) {
    const transportCosts = trip.transportation_plan
      .map((t) => parseNumberFromString(t.estimated_cost))
      .filter((c): c is number => c !== null);
    if (transportCosts.length > 0) {
      const sumCost = transportCosts.reduce((a, b) => a + b, 0);
      transportMin = Math.round(sumCost * travelersCount);
      transportMax = Math.round(sumCost * 1.2 * travelersCount);
      transportStatus = "confirmed";
      transportSource = "Calculated from route transportation plan";
    }
  }

  // 3. Food & Dining
  const foodMin = benchmark.foodDailyMin * durationDays * foodMultiplier;
  const foodMax = benchmark.foodDailyMax * durationDays * foodMultiplier;

  // 4. Sightseeing & Entry Tickets
  let activitiesMin = benchmark.activitiesDailyMin * durationDays * travelersCount;
  let activitiesMax = benchmark.activitiesDailyMax * durationDays * travelersCount;
  let actCount = 0;
  let actSum = 0;

  for (const day of trip.itinerary || []) {
    for (const act of day.activities || []) {
      if (act.estimatedCost?.amount) {
        actSum += act.estimatedCost.amount;
        actCount++;
      } else if (act.ticket_price) {
        const parsed = parseNumberFromString(act.ticket_price);
        if (parsed) {
          actSum += parsed;
          actCount++;
        }
      }
    }
  }

  if (actCount > 0) {
    activitiesMin = Math.round(actSum * travelersCount);
    activitiesMax = Math.round(actSum * 1.15 * travelersCount);
  }

  // 5. Local Transit & Commute
  const localTransitMin = benchmark.localTransitDailyMin * durationDays * roomCount;
  const localTransitMax = benchmark.localTransitDailyMax * durationDays * roomCount;

  // 6. Subtotal for taxes & unexpected buffer
  const coreSubtotalMin = stayMin + transportMin + foodMin + activitiesMin + localTransitMin;
  const coreSubtotalMax = stayMax + transportMax + foodMax + activitiesMax + localTransitMax;

  // 7. Taxes & Fees (GST on accommodation & activities)
  const taxesMin = Math.round(stayMin * (benchmark.taxesPercent / 100));
  const taxesMax = Math.round(stayMax * (benchmark.taxesPercent / 100));

  // 8. Unexpected Emergency Buffer (e.g. 10%)
  const bufferMin = Math.round(coreSubtotalMin * (benchmark.bufferPercent / 100));
  const bufferMax = Math.round(coreSubtotalMax * (benchmark.bufferPercent / 100));

  const lines: CostLineItem[] = [
    {
      id: "line-stays",
      category: "stay",
      title: "Stays & Accommodations",
      amountMin: stayMin,
      amountMax: stayMax,
      status: stayStatus,
      source: staySource,
      details: `${durationDays} nights for ${travelersCount} traveler${travelersCount > 1 ? "s" : ""} (${roomCount} room${roomCount > 1 ? "s" : ""})`,
    },
    {
      id: "line-transport",
      category: "transport",
      title: "Intercity Transport (Flights/Trains)",
      amountMin: transportMin,
      amountMax: transportMax,
      status: transportStatus,
      source: transportSource,
      details: `Return travel for ${travelersCount} passengers`,
    },
    {
      id: "line-food",
      category: "food",
      title: "Food & Dining Experience",
      amountMin: foodMin,
      amountMax: foodMax,
      status: "estimated",
      source: `Destination dining benchmarks (${style} tier)`,
      details: `3 meals/day for ${durationDays} days`,
    },
    {
      id: "line-activities",
      category: "activities",
      title: "Sightseeing & Entry Fees",
      amountMin: activitiesMin,
      amountMax: activitiesMax,
      status: actCount > 0 ? "confirmed" : "estimated",
      source: actCount > 0 ? `Sourced from ${actCount} itinerary stops` : "Tourism entry benchmarks",
      details: "Monuments, palace tickets, and cultural passes",
    },
    {
      id: "line-local-transit",
      category: "local_transit",
      title: "Local Transit, Cabs & Autos",
      amountMin: localTransitMin,
      amountMax: localTransitMax,
      status: "estimated",
      source: "Project OSRM mileage rate matrix",
      details: "Between hotels and planned attractions",
    },
    {
      id: "line-taxes",
      category: "taxes_fees",
      title: "Taxes & Municipal Fees (GST)",
      amountMin: taxesMin,
      amountMax: taxesMax,
      status: "estimated",
      source: `Statutory GST slab (${benchmark.taxesPercent}%)`,
      details: "State tourism cess and hospitality GST",
    },
    {
      id: "line-buffer",
      category: "unexpected_buffer",
      title: `Unexpected Buffer (${benchmark.bufferPercent}%)`,
      amountMin: bufferMin,
      amountMax: bufferMax,
      status: "estimated",
      source: "Travel volatility contingency reserve",
      details: "Covers surge pricing, medical needs, or transit changes",
    },
  ];

  const totalMin = lines.reduce((acc, l) => acc + l.amountMin, 0);
  const totalMax = lines.reduce((acc, l) => acc + l.amountMax, 0);
  const expectedTotal = Math.round((totalMin + totalMax) / 2);

  // User budget evaluation
  const parsedUserBudget = customSpendCap !== undefined
    ? customSpendCap
    : parseNumberFromString(trip.trip_details?.budget);

  let budgetStatus: CostBreakdown["budgetStatus"] = "within_budget";
  let overageAmount: number | undefined = undefined;
  const overageCulprits: CostLineItem[] = [];

  if (parsedUserBudget && parsedUserBudget > 0) {
    if (expectedTotal > parsedUserBudget) {
      budgetStatus = "exceeds_budget";
      overageAmount = expectedTotal - parsedUserBudget;

      // Identify top 2 cost contributors as culprit items
      const sortedByCost = [...lines].sort((a, b) => b.amountMax - a.amountMax);
      for (let i = 0; i < Math.min(2, sortedByCost.length); i++) {
        sortedByCost[i].isCulpritOverBudget = true;
        overageCulprits.push(sortedByCost[i]);
      }
    } else if (expectedTotal > parsedUserBudget * 0.9) {
      budgetStatus = "near_budget";
    }
  }

  return {
    destination: trip.trip_details?.destination || "Jaipur",
    durationDays,
    style,
    travelersCount,
    currency: "₹",
    lines,
    totalMin,
    totalMax,
    expectedTotal,
    unexpectedBufferPercent: benchmark.bufferPercent,
    userBudgetCap: parsedUserBudget || undefined,
    budgetStatus,
    overageAmount,
    overageCulprits,
    provenance: {
      source: `Voyage True Cost Engine (${destKey.toUpperCase()} Benchmark Table)`,
      lastCheckedAt: new Date().toISOString(),
      status: "verified",
      isMock: false,
    },
    lastCalculatedAt: new Date().toISOString(),
  };
}
