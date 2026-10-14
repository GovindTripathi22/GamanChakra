/**
 * Passenger-rights compensation estimator (informational — not legal advice).
 * Covers India DGCA CAR Section 3 Series M Part IV, EU Regulation 261/2004, UK261 and the US DOT refund rule.
 */
export type Regime = "DGCA_IN" | "EU261" | "UK261" | "US_DOT" | "NONE";
export type DisruptionKind = "delay" | "cancellation" | "denied_boarding";

export interface ClaimInput {
  kind: DisruptionKind;
  departureCountry: string; // ISO2
  arrivalCountry: string;
  carrierCountry?: string; // ISO2 of operating airline
  distanceKm: number;
  delayHoursAtArrival?: number;
  noticeDays?: number; // for cancellations: how far in advance passengers were told
  blockTimeHours?: number; // scheduled flight duration (DGCA tiers)
  basicFareInr?: number; // one-way basic fare + fuel charge (DGCA denied boarding)
  alternateWithinHours?: number; // re-routing offered, arrival delay vs original (hours)
  extraordinary?: boolean; // weather, ATC strike, security, political instability
}

export interface ClaimResult {
  regime: Regime;
  eligible: boolean;
  amount: number;
  currency: "INR" | "EUR" | "GBP" | "USD";
  entitlements: string[];
  reasoning: string[];
  letter: string;
}

const EU = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "NO", "CH"]);

export function detectRegime(i: ClaimInput): Regime {
  if (EU.has(i.departureCountry) || (i.carrierCountry && EU.has(i.carrierCountry) && EU.has(i.arrivalCountry))) return "EU261";
  if (i.departureCountry === "GB" || (i.carrierCountry === "GB" && i.arrivalCountry === "GB")) return "UK261";
  if (i.departureCountry === "IN" && (i.carrierCountry ?? "IN") === "IN") return "DGCA_IN";
  if (i.departureCountry === "US" || i.arrivalCountry === "US") return "US_DOT";
  if (i.departureCountry === "IN") return "DGCA_IN";
  return "NONE";
}

function euBand(distanceKm: number, intraEu: boolean): number {
  if (distanceKm <= 1500) return 250;
  if (distanceKm <= 3500 || intraEu) return 400;
  return 600;
}

export function estimateCompensation(i: ClaimInput): ClaimResult {
  const regime = detectRegime(i);
  const reasoning: string[] = [];
  const entitlements: string[] = [];
  let amount = 0;
  let currency: ClaimResult["currency"] = "INR";
  let eligible = false;

  if (regime === "EU261" || regime === "UK261") {
    currency = regime === "EU261" ? "EUR" : "GBP";
    const intra = EU.has(i.departureCountry) && EU.has(i.arrivalCountry);
    let base = euBand(i.distanceKm, intra);
    if (regime === "UK261") base = base === 250 ? 220 : base === 400 ? 350 : 520;
    reasoning.push(`${regime}: ${i.distanceKm} km ⇒ distance band ${currency} ${base}.`);
    if (i.extraordinary) {
      reasoning.push("Extraordinary circumstances (e.g. weather, ATC strike, security) exempt the airline from cash compensation.");
      entitlements.push("Right to care: meals, refreshments, two communications, hotel + transfers if overnight.");
      if (i.kind === "cancellation") entitlements.push("Choice of full refund or re-routing at the earliest opportunity.");
    } else if (i.kind === "delay") {
      const d = i.delayHoursAtArrival ?? 0;
      if (d >= 3) {
        eligible = true; amount = base;
        if (i.distanceKm > 3500 && d < 4) { amount = base / 2; reasoning.push("Long-haul delay of 3–4 h: compensation halved."); }
        reasoning.push(`Arrival delay ${d} h ≥ 3 h qualifies (Sturgeon ruling).`);
      } else reasoning.push(`Arrival delay ${d} h is below the 3 h threshold.`);
      if (d >= 5) entitlements.push("Delay ≥ 5 h: you may abandon the trip and get a full refund.");
      entitlements.push("Right to care while waiting (meals, refreshments, hotel if overnight).");
    } else if (i.kind === "cancellation") {
      if ((i.noticeDays ?? 0) >= 14) reasoning.push("Notified ≥ 14 days before departure: no cash compensation.");
      else {
        eligible = true; amount = base;
        if (i.alternateWithinHours != null && i.alternateWithinHours <= (i.distanceKm > 3500 ? 4 : i.distanceKm > 1500 ? 3 : 2)) { amount = base / 2; reasoning.push("Re-routed with a small arrival delay: compensation reduced by 50%."); }
      }
      entitlements.push("Choice of full refund or re-routing.");
    } else {
      eligible = true; amount = base; reasoning.push("Involuntary denied boarding qualifies for full band compensation.");
      entitlements.push("Refund or re-routing plus right to care.");
    }
  } else if (regime === "DGCA_IN") {
    currency = "INR";
    const bt = i.blockTimeHours ?? Math.max(0.75, i.distanceKm / 750);
    if (i.kind === "cancellation") {
      if ((i.noticeDays ?? 0) >= 14) reasoning.push("Informed at least 2 weeks before departure: alternate flight or refund only.");
      else if (i.extraordinary) reasoning.push("Cancellation due to extraordinary circumstances: compensation not payable; refund/alternate still due.");
      else {
        eligible = true;
        amount = bt <= 1 ? 5000 : bt <= 2 ? 7500 : 10000;
        if (i.basicFareInr) amount = Math.min(amount, i.basicFareInr);
        reasoning.push(`DGCA CAR M-IV cancellation: block time ${bt.toFixed(1)} h ⇒ up to ₹${amount.toLocaleString("en-IN")} (or basic fare + fuel charge if lower).`);
      }
      entitlements.push("Alternate flight or full refund.", "Meals/refreshments while waiting at the airport.");
    } else if (i.kind === "delay") {
      const d = i.delayHoursAtArrival ?? 0;
      reasoning.push("DGCA rules provide facilities (not cash) for delays.");
      const careThreshold = bt <= 2.5 ? 2 : bt <= 5 ? 3 : 4;
      if (d >= careThreshold) entitlements.push("Free meals and refreshments.");
      if (d >= 6) entitlements.push("Airline must offer an alternate flight or full refund (delay > 6 h, informed 24 h in advance).");
      if (d >= 24) entitlements.push("Free hotel accommodation including transfers (delay > 24 h).");
      eligible = entitlements.length > 0;
    } else {
      const alt = i.alternateWithinHours ?? 99;
      const fare = i.basicFareInr ?? 5000;
      if (alt <= 1) reasoning.push("Alternate flight within 1 h of original departure: no compensation.");
      else if (alt <= 24) { eligible = true; amount = Math.min(2 * fare, 10000); reasoning.push("Alternate within 24 h ⇒ 200% of basic fare + fuel, max ₹10,000."); }
      else { eligible = true; amount = Math.min(4 * fare, 20000); reasoning.push("Alternate beyond 24 h ⇒ 400% of basic fare + fuel, max ₹20,000."); }
    }
  } else if (regime === "US_DOT") {
    currency = "USD";
    reasoning.push("US DOT: no federal cash compensation for delays; automatic refund owed for cancellations or significant changes (3 h domestic / 6 h international) if you decline the alternative.");
    if (i.kind === "cancellation" || (i.delayHoursAtArrival ?? 0) >= 3) { eligible = true; entitlements.push("Full refund of the unused ticket, in original form of payment."); }
    if (i.kind === "denied_boarding") { eligible = true; entitlements.push("Involuntary denied boarding compensation up to 400% of one-way fare (cap per DOT rule)."); }
  } else {
    reasoning.push("No statutory passenger-rights regime detected for this route; check the airline's conditions of carriage.");
  }

  const letter = draftLetter(i, regime, amount, currency, entitlements);
  return { regime, eligible, amount, currency, entitlements, reasoning, letter };
}

function draftLetter(i: ClaimInput, regime: Regime, amount: number, currency: string, ent: string[]): string {
  const law = { DGCA_IN: "DGCA Civil Aviation Requirement Section 3, Series M, Part IV", EU261: "Regulation (EC) No 261/2004", UK261: "UK Regulation 261 (retained EU law)", US_DOT: "US DOT refund rule (14 CFR Part 260)", NONE: "your conditions of carriage" }[regime];
  return [
    "Subject: Compensation claim for disrupted flight",
    "",
    "Dear Customer Relations Team,",
    "",
    `I was booked on your flight from ${i.departureCountry} to ${i.arrivalCountry} (approx. ${i.distanceKm} km), which was subject to a ${i.kind.replace("_", " ")}${i.delayHoursAtArrival ? ` resulting in an arrival delay of ${i.delayHoursAtArrival} hours` : ""}.`,
    `Under ${law}, I request${amount ? ` compensation of ${currency} ${amount.toLocaleString("en-IN")}` : " the remedies due"}${ent.length ? `, together with: ${ent.join(" ")}` : "."}`,
    "",
    "Please process this claim within 30 days to the original form of payment. Booking reference and boarding pass are attached.",
    "",
    "Regards,",
    "[Your name] · [Booking reference] · [Phone]",
  ].join("\n");
}
