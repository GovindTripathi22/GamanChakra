"use server";

import { db } from "@/lib/db";
import { seedWorldEntitiesIfEmpty } from "@/lib/world/entities";
import { ingestWorldObservations } from "@/lib/world/ingestion";
import { runScenarioSimulation, SimulationScenarioInput, SimulationScenarioResult } from "@/lib/world/simulator";

export async function getWorldEntitiesAction(category?: string) {
  await seedWorldEntitiesIfEmpty();

  const entities = await db.worldEntity.findMany({
    where: category && category !== "all" ? { category } : undefined,
    include: {
      observations: {
        orderBy: { observedAt: "desc" },
        take: 3,
      },
      outgoingRoutes: {
        include: { destination: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return entities;
}

export async function ingestWorldDataAction() {
  return await ingestWorldObservations();
}

export async function simulateWorldScenarioAction(input: SimulationScenarioInput): Promise<SimulationScenarioResult> {
  return runScenarioSimulation(input);
}
