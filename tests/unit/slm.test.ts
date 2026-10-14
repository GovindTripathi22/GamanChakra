import { describe, it, expect } from "vitest";
import { classifyIntent, classifyNews, NANO_INFO } from "@/lib/slm/nano";
import { Network } from "@/lib/slm/network";
import { featurize } from "@/lib/slm/features";
import { evaluateBlind, buildTrainingSet } from "@/lib/slm/train";
import { severityEvidence, combineSeverity } from "@/lib/slm/severity";
import { extractSlots } from "@/lib/slm/slots";
import weights from "@/lib/slm/weights/chakra-nano.json";

describe("Chakra-Nano SLM — quality gates on the BLIND set", () => {
  const net = Network.load(weights as never);
  const blind = evaluateBlind(net);
  it("voice intent accuracy ≥ 90%", () => expect(blind.intentAccuracy).toBeGreaterThanOrEqual(0.9));
  it("12-way news category accuracy ≥ 75%", () => expect(blind.categoryAccuracy).toBeGreaterThanOrEqual(0.75));
  it("travel-relevance accuracy ≥ 90%", () => expect(blind.travelRelevanceAccuracy).toBeGreaterThanOrEqual(0.9));
  it("severity within one level ≥ 90%", () => expect(blind.severityWithinOne).toBeGreaterThanOrEqual(0.9));
  it("ships a model card report", () => expect(NANO_INFO.report).toBeTruthy());
});

describe("Chakra-Nano inference", () => {
  it.each([
    ["Magnitude 7.3 earthquake strikes off Hokkaido, tsunami warning issued", "natural_disaster", "critical"],
    ["IndiGo cancels 180 flights at Delhi as fog lowers visibility to zero", "transport_disruption", "high"],
    ["Bharat Bandh on Monday: transport likely to be hit in Kolkata", "civil_unrest", null],
    ["Sensex closes 300 points higher on IT rally", "not_travel", "low"],
  ])("%s → %s", (title, cat, sev) => {
    const r = classifyNews(title);
    expect(r.category).toBe(cat);
    if (sev) expect(r.severity).toBe(sev);
  });
  it("geotags the primary place", () => {
    expect(classifyNews("Flash floods hit Kochi, airport shut").primaryPlace?.name).toBe("Kochi");
  });
  it("is fast: < 5 ms per sentence on average", () => {
    classifyNews("warm up");
    const t = performance.now();
    for (let i = 0; i < 200; i++) classifyNews(`Strike in Mumbai disrupts local trains ${i}`);
    expect((performance.now() - t) / 200).toBeLessThan(5);
  });
  it.each([
    ["plan a 4 day trip to Goa", "plan_trip"],
    ["is it safe to go to bangkok", "safety_check"],
    ["meri flight cancel ho gayi", "disruption_help"],
    ["convert 300 euros to rupees", "currency_convert"],
    ["send a safety check-in to everyone in Dubai", "traveler_checkin"],
    ["set autonomy to L3", "set_autonomy"],
    ["tell me a joke", "out_of_scope"],
  ])("intent: %s → %s", (text, intent) => expect(classifyIntent(text).intent).toBe(intent));
  it("featurizer is deterministic and entity-masked", () => {
    expect(Array.from(featurize("Floods in Goa", 1 << 14))).toEqual(Array.from(featurize("Floods in Goa", 1 << 14)));
    expect(Array.from(featurize("Floods in Goa", 1 << 14)).sort()).toEqual(Array.from(featurize("Floods in Kochi", 1 << 14)).sort());
  });
  it("training corpus is large and multi-task", () => {
    const d = buildTrainingSet(7);
    expect(d.length).toBeGreaterThan(3000);
    expect(d.some((e) => "intent" in e.targets)).toBe(true);
    expect(d.some((e) => "category" in e.targets)).toBe(true);
  });
});

describe("severity rules", () => {
  it("raises on large magnitude and casualties", () => {
    expect(combineSeverity("moderate", severityEvidence("Magnitude 7.4 earthquake hits Taiwan", "natural_disaster"))).toBe("critical");
    expect(combineSeverity("low", severityEvidence("Bus accident: 12 killed near Shimla", "transport_disruption"))).toBe("high");
  });
  it("caps benign phrasing", () => {
    expect(combineSeverity("high", severityEvidence("Mild tremor felt in Shillong, no damage", "natural_disaster"))).toBe("moderate");
  });
});

describe("slot filling", () => {
  it("origin, destination, days, budget, travellers", () => {
    const s = extractSlots("plan a 5 day trip from Mumbai to Goa under 40k for 2 people");
    expect([s.origin?.name, s.destination?.name, s.days, s.budgetInr, s.travelers]).toEqual(["Mumbai", "Goa", 5, 40000, 2]);
  });
  it("Indian number words", () => expect(extractSlots("trip to Manali under 1.5 lakh").budgetInr).toBe(150000));
  it("currency pair", () => {
    const s = extractSlots("how much is 50 dollars in inr");
    expect([s.amount, s.currency, s.targetCurrency]).toEqual([50, "USD", "INR"]);
  });
  it("Devanagari places", () => {
    const s = extractSlots("मुझे दिल्ली से मुंबई जाना है");
    expect(s.places.map((p) => p.name)).toEqual(["Delhi", "Mumbai"]);
  });
  it("autonomy level & page", () => {
    expect(extractSlots("put the agent on full autopilot").autonomyLevel).toBe("L3");
    expect(extractSlots("open duty of care").page).toBe("/duty-of-care");
  });
});
