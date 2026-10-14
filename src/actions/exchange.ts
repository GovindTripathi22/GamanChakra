"use server";

import { db } from "@/lib/db";
import { LiquidityExchangeEngine } from "@/lib/exchange/liquidity-engine";

export async function getListingsAction(destination?: string, category?: string) {
  await LiquidityExchangeEngine.seedSuppliersAndListingsIfEmpty();
  await LiquidityExchangeEngine.releaseExpiredHolds();

  const listings = await db.inventoryListing.findMany({
    where: {
      destination: destination && destination !== "all" ? destination : undefined,
      category: category && category !== "all" ? category : undefined,
    },
    include: {
      supplier: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return listings.map((l) => ({
    ...l,
    validFrom: l.validFrom.toISOString(),
    validTo: l.validTo.toISOString(),
    createdAt: l.createdAt.toISOString(),
  }));
}

export async function createHoldAction(listingId: string, buyerId: string = "buyer_active", units: number = 1) {
  return await LiquidityExchangeEngine.createHold(listingId, buyerId, units);
}

export async function confirmReservationAction(holdId: string, buyerId: string = "buyer_active") {
  return await LiquidityExchangeEngine.confirmReservation(holdId, buyerId);
}

export async function releaseExpiredHoldsAction() {
  return await LiquidityExchangeEngine.releaseExpiredHolds();
}
