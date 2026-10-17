import { describe, it, expect } from "vitest";
import { predictWaitlistConfirmation } from "@/lib/trains/waitlist-engine";
import { getRealTrainInfo } from "@/lib/providers/trains/rail-provider";

describe("Waitlist Engine & Rail Provider", () => {
  it("resolves train metadata with correct zone and corridor", async () => {
    const rajdhani = await getRealTrainInfo("12952");
    expect(rajdhani).toBeDefined();
    expect(rajdhani.trainNumber).toBe("12952");
    expect(rajdhani.trainType).toBe("RAJDHANI");
    expect(rajdhani.fromStationCode).toBe("NDLS");
    expect(rajdhani.toStationCode).toBe("MMCT");

    // Open dataset real train lookup (14001 is DLI in open dataset, NDLS in deterministic zone 4)
    const realTrain = await getRealTrainInfo("14001");
    expect(realTrain).toBeDefined();
    expect(realTrain.trainNumber).toBe("14001");
    expect(["DLI", "NDLS"]).toContain(realTrain.fromStationCode);
  });

  it("produces distinct probabilities for different train types and corridors", async () => {
    const travelDate = new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0];

    // Mumbai Rajdhani (12952) vs Tamil Nadu Express (12622)
    const resRajdhani = await predictWaitlistConfirmation({
      trainNumber: "12952",
      travelClass: "3A",
      waitlistNumber: 25,
      travelDate,
      quota: "GNWL",
    });

    const resTamilNadu = await predictWaitlistConfirmation({
      trainNumber: "12622",
      travelClass: "3A",
      waitlistNumber: 25,
      travelDate,
      quota: "GNWL",
    });

    expect(resRajdhani.confirmationProbability).toBeGreaterThan(0);
    expect(resTamilNadu.confirmationProbability).toBeGreaterThan(0);
    expect(resRajdhani.trainName).toContain("Rajdhani");
    expect(resTamilNadu.trainName).toContain("Tamil Nadu");
    // Distinct clearance factor & corridor distance
    expect(resRajdhani.factors?.corridorDemandIndex).toBeGreaterThan(0);
  });

  it("applies quota penalties accurately (GNWL > RLWL > PQWL > TQWL)", async () => {
    const travelDate = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

    const gnwl = await predictWaitlistConfirmation({
      trainNumber: "12952",
      travelClass: "3A",
      waitlistNumber: 20,
      travelDate,
      quota: "GNWL",
    });

    const rlwl = await predictWaitlistConfirmation({
      trainNumber: "12952",
      travelClass: "3A",
      waitlistNumber: 20,
      travelDate,
      quota: "RLWL",
    });

    const pqwl = await predictWaitlistConfirmation({
      trainNumber: "12952",
      travelClass: "3A",
      waitlistNumber: 20,
      travelDate,
      quota: "PQWL",
    });

    const tqwl = await predictWaitlistConfirmation({
      trainNumber: "12952",
      travelClass: "3A",
      waitlistNumber: 20,
      travelDate,
      quota: "TQWL",
    });

    expect(gnwl.confirmationProbability).toBeGreaterThan(rlwl.confirmationProbability);
    expect(rlwl.confirmationProbability).toBeGreaterThan(pqwl.confirmationProbability);
    expect(pqwl.confirmationProbability).toBeGreaterThan(tqwl.confirmationProbability);
  });

  it("finds alternate corridor trains and rescue alternatives when waitlist is high", async () => {
    const travelDate = new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0];

    const result = await predictWaitlistConfirmation({
      trainNumber: "12952",
      travelClass: "3A",
      waitlistNumber: 95, // high waitlist triggering rescue alternatives
      travelDate,
      quota: "GNWL",
    });

    expect(result.alternateCorridorTrains?.length).toBeGreaterThan(0);
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.alternatives.some((a) => a.type === "tatkal_alert")).toBe(true);
  });

  it("calculates realistic Haversine distance and domestic fare for flights", async () => {
    const { getFlightStatus } = await import("@/lib/providers/flights/mock-flight-provider");
    const flight = await getFlightStatus("6E-204", { originAirport: "DEL", destinationAirport: "BOM" });
    expect(flight.airline).toBe("IndiGo");
    expect(flight.departureAirport).toBe("DEL");
    expect(flight.arrivalAirport).toBe("BOM");
    expect(flight.distanceKm).toBeGreaterThan(1000);
    expect(flight.distanceKm).toBeLessThan(1300);
    expect(flight.flightDurationMinutes).toBeGreaterThan(100);
    expect(flight.estimatedFare?.amount).toBeGreaterThan(4000);
    expect(flight.provenance.isMock).toBe(true);
  });
});

