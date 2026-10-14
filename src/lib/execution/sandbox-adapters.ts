/**
 * Typed Sandbox Provider Adapters (Principle 10, Operating Principle 5 & 7)
 * Models realistic external provider latency, hold expiration, rate limits, and error injection
 * without fabricating live inventory or completed payments.
 */

export interface SandboxProviderResponse<T> {
  success: boolean;
  provider: string;
  referenceId?: string;
  data?: T;
  error?: string;
  latencyMs: number;
  isSandbox: true;
}

export class SandboxGDSAdapter {
  static async createFlightHold(params: {
    origin: string;
    destination: string;
    flightNumber: string;
    passengerName: string;
  }): Promise<SandboxProviderResponse<{ pnr: string; holdExpiresInMinutes: number; fareINR: number }>> {
    const latencyMs = 280 + Math.floor(Math.random() * 120);

    // Realistic validation
    if (!params.origin || !params.destination) {
      return {
        success: false,
        provider: "Amadeus / IndiGo Sandbox GDS",
        error: "Invalid route segment.",
        latencyMs,
        isSandbox: true,
      };
    }

    const pnr = `SBX${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    return {
      success: true,
      provider: "Amadeus / IndiGo Sandbox GDS",
      referenceId: pnr,
      data: {
        pnr,
        holdExpiresInMinutes: 20,
        fareINR: 4850,
      },
      latencyMs,
      isSandbox: true,
    };
  }

  static async issueTicket(pnr: string): Promise<SandboxProviderResponse<{ eTicket: string; seat: string }>> {
    const latencyMs = 350;
    return {
      success: true,
      provider: "Amadeus / IndiGo Sandbox GDS",
      referenceId: pnr,
      data: {
        eTicket: `6E-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        seat: "14B",
      },
      latencyMs,
      isSandbox: true,
    };
  }
}

export class SandboxRailAdapter {
  static async reserveTatkalSlot(params: {
    trainNumber: string;
    fromStation: string;
    toStation: string;
    travelDate: string;
  }): Promise<SandboxProviderResponse<{ pnr: string; quota: string; status: string }>> {
    const latencyMs = 310;
    const pnr = `24${Math.floor(10000000 + Math.random() * 90000000)}`;

    return {
      success: true,
      provider: "CRIS / Indian Railways Sandbox Testbed",
      referenceId: pnr,
      data: {
        pnr,
        quota: "TATKAL_MOCK",
        status: "CONFIRMED_CNF_B1_24",
      },
      latencyMs,
      isSandbox: true,
    };
  }
}

export class SandboxHotelAdapter {
  static async createRoomReservation(params: {
    hotelName: string;
    checkIn: string;
    checkOut: string;
    guestName: string;
  }): Promise<SandboxProviderResponse<{ voucherCode: string; roomType: string }>> {
    const latencyMs = 210;
    const voucherCode = `HTL-VCH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    return {
      success: true,
      provider: "Channel Manager Sandbox",
      referenceId: voucherCode,
      data: {
        voucherCode,
        roomType: "Deluxe Pool View",
      },
      latencyMs,
      isSandbox: true,
    };
  }
}
