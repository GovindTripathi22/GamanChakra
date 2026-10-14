/**
 * Currency conversion. Live rates from the keyless ECB reference feed (Frankfurter mirror);
 * falls back to an indicative offline table so the feature always works.
 */
const OFFLINE_INR_PER_UNIT: Record<string, number> = {
  INR: 1, USD: 84, EUR: 91, GBP: 108, JPY: 0.56, AED: 22.9, THB: 2.45, SGD: 63, MYR: 18.6, AUD: 55, CAD: 61,
  CHF: 96, CNY: 11.7, KRW: 0.061, SAR: 22.4, LKR: 0.28, NPR: 0.625, IDR: 0.0052, VND: 0.0033, QAR: 23, TRY: 2.4,
};

let cache: { at: number; rates: Record<string, number> } | null = null;

async function liveRates(): Promise<Record<string, number> | null> {
  if (cache && Date.now() - cache.at < 6 * 36e5) return cache.rates;
  try {
    const r = await fetch("https://api.frankfurter.app/latest?from=INR", { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { rates: Record<string, number> };
    const inrPer: Record<string, number> = { INR: 1 };
    for (const [k, v] of Object.entries(j.rates)) inrPer[k] = 1 / v;
    cache = { at: Date.now(), rates: inrPer };
    return inrPer;
  } catch {
    return null;
  }
}

export async function convert(amount: number, from: string, to: string): Promise<{ amount: number; rate: number; source: "ECB live" | "indicative offline"; from: string; to: string; result: number }> {
  const live = await liveRates();
  const table = live ?? OFFLINE_INR_PER_UNIT;
  const a = table[from.toUpperCase()] ?? OFFLINE_INR_PER_UNIT[from.toUpperCase()];
  const b = table[to.toUpperCase()] ?? OFFLINE_INR_PER_UNIT[to.toUpperCase()];
  if (!a || !b) throw new Error(`Unsupported currency ${from} or ${to}`);
  const rate = a / b;
  return { amount, from: from.toUpperCase(), to: to.toUpperCase(), rate: +rate.toFixed(6), result: +(amount * rate).toFixed(2), source: live ? "ECB live" : "indicative offline" };
}
