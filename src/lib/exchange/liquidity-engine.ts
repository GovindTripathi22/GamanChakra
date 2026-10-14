import { db } from "@/lib/db";

export interface CreateListingParams {
  supplierId: string;
  category: "stay" | "transit_bus" | "transit_cab" | "flight_seat" | "activity";
  title: string;
  description: string;
  destination: string;
  unitsAvailable: number;
  unitPriceINR: number;
  validDays?: number;
}

export class LiquidityExchangeEngine {
  /**
   * Seed verified sandbox suppliers and listings if table is empty
   */
  static async seedSuppliersAndListingsIfEmpty(): Promise<void> {
    const count = await db.supplier.count();
    if (count > 0) return;

    // 1. Create verified suppliers
    const s1 = await db.supplier.create({
      data: {
        name: "Goa Boutique Heritage Stays",
        type: "hotel",
        verificationStatus: "verified_sandbox",
        rating: 4.8,
        contactEmail: "ops@goaheritagestays.sandbox",
      },
    });

    const s2 = await db.supplier.create({
      data: {
        name: "Zingbus Electric Intercity Express",
        type: "bus_operator",
        verificationStatus: "verified_sandbox",
        rating: 4.6,
        contactEmail: "fleet@zingbus.sandbox",
      },
    });

    const s3 = await db.supplier.create({
      data: {
        name: "Royal Rajasthan Chauffeur Fleet",
        type: "cab_fleet",
        verificationStatus: "verified_sandbox",
        rating: 4.9,
        contactEmail: "dispatch@rajasthancabs.sandbox",
      },
    });

    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 2. Create initial listings
    await db.inventoryListing.createMany({
      data: [
        {
          supplierId: s1.id,
          category: "stay",
          title: "Portuguese Villa Garden Suite (Anjuna)",
          description: "Private heritage suite with breakfast, pool access, and 100 Mbps Wi-Fi.",
          destination: "Goa",
          unitsAvailable: 4,
          unitPriceINR: 5200,
          validFrom: now,
          validTo: nextMonth,
          cancellationPolicy: "free_cancellation_48h",
          isSandbox: true,
        },
        {
          supplierId: s2.id,
          category: "transit_bus",
          title: "Electric AC Sleeper (Delhi -> Jaipur)",
          description: "Premium EV coach via NE-4 Expressway with live tracking and reclining sleeper berths.",
          destination: "Jaipur",
          unitsAvailable: 12,
          unitPriceINR: 950,
          validFrom: now,
          validTo: nextMonth,
          cancellationPolicy: "free_cancellation_24h",
          isSandbox: true,
        },
        {
          supplierId: s3.id,
          category: "transit_cab",
          title: "Jaipur Heritage Day Chauffeur (Sedan)",
          description: "8-hour dedicated local sightseeing car covering Amer Fort, City Palace, and Hawa Mahal.",
          destination: "Jaipur",
          unitsAvailable: 6,
          unitPriceINR: 2400,
          validFrom: now,
          validTo: nextMonth,
          cancellationPolicy: "moderate_12h",
          isSandbox: true,
        },
      ],
    });
  }

  /**
   * Release expired inventory holds back into listing available count
   */
  static async releaseExpiredHolds(): Promise<number> {
    const now = new Date();
    const expiredHolds = await db.inventoryHold.findMany({
      where: {
        status: "active",
        holdExpiresAt: { lt: now },
      },
    });

    for (const hold of expiredHolds) {
      await db.$transaction(async (tx) => {
        await tx.inventoryHold.update({
          where: { id: hold.id },
          data: { status: "expired" },
        });

        await tx.inventoryListing.update({
          where: { id: hold.listingId },
          data: { unitsAvailable: { increment: hold.units } },
        });
      });
    }

    return expiredHolds.length;
  }

  /**
   * Place a 15-minute expiring hold on inventory, atomically decrementing units
   */
  static async createHold(listingId: string, buyerId: string, units: number = 1) {
    await this.releaseExpiredHolds();

    return await db.$transaction(async (tx) => {
      const listing = await tx.inventoryListing.findUnique({
        where: { id: listingId },
      });

      if (!listing) throw new Error("Listing not found.");
      if (listing.unitsAvailable < units) {
        throw new Error(`Insufficient units available. Requested ${units}, available ${listing.unitsAvailable}.`);
      }

      // Decrement units atomically
      await tx.inventoryListing.update({
        where: { id: listingId },
        data: { unitsAvailable: { decrement: units } },
      });

      const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute hold

      const hold = await tx.inventoryHold.create({
        data: {
          listingId,
          buyerId,
          units,
          status: "active",
          holdExpiresAt,
        },
      });

      return {
        hold,
        listing,
        expiresInSeconds: 15 * 60,
      };
    });
  }

  /**
   * Confirm reservation from an active hold
   */
  static async confirmReservation(holdId: string, buyerId: string) {
    return await db.$transaction(async (tx) => {
      const hold = await tx.inventoryHold.findUnique({
        where: { id: holdId },
        include: { listing: true },
      });

      if (!hold) throw new Error("Hold record not found.");
      if (hold.status !== "active") throw new Error(`Cannot confirm hold in '${hold.status}' status.`);
      if (new Date() > hold.holdExpiresAt) {
        await tx.inventoryHold.update({ where: { id: holdId }, data: { status: "expired" } });
        await tx.inventoryListing.update({
          where: { id: hold.listingId },
          data: { unitsAvailable: { increment: hold.units } },
        });
        throw new Error("Inventory hold expired before checkout completion.");
      }

      const bookingRef = `BK-RES-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const totalAmountINR = hold.units * hold.listing.unitPriceINR;

      // Update hold to converted
      await tx.inventoryHold.update({
        where: { id: holdId },
        data: { status: "converted" },
      });

      // Create confirmed reservation
      const reservation = await tx.reservation.create({
        data: {
          listingId: hold.listingId,
          holdId: hold.id,
          buyerId,
          bookingRef,
          units: hold.units,
          totalAmountINR,
          status: "confirmed",
        },
      });

      return {
        reservation,
        bookingRef,
        totalAmountINR,
        listing: hold.listing,
      };
    });
  }
}
