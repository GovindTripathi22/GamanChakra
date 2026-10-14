import type { NewsCategory, Severity } from "./labels";

/** Template natural-language generation (always-available fallback when no generative SLM is running). */
type Lang = "en" | "hi";

const ACTIONS: Record<NewsCategory, { en: string; hi: string }> = {
  natural_disaster: { en: "Stay away from the affected zone, follow local authorities and confirm you are safe.", hi: "प्रभावित इलाके से दूर रहें, स्थानीय प्रशासन के निर्देश मानें और अपनी सुरक्षा की पुष्टि करें।" },
  severe_weather: { en: "Expect delays — add buffer to transfers and move outdoor plans indoors.", hi: "देरी की संभावना है — ट्रांसफ़र के लिए अतिरिक्त समय रखें और बाहरी योजनाएँ अंदर करें।" },
  conflict_security: { en: "Avoid crowds and government buildings, register with your embassy and be ready to leave if advised.", hi: "भीड़ और सरकारी इमारतों से बचें, दूतावास में पंजीकरण करें और ज़रूरत पड़ने पर निकलने को तैयार रहें।" },
  civil_unrest: { en: "Avoid protest sites, pre-book transport and keep the day flexible.", hi: "प्रदर्शन स्थलों से बचें, यातायात पहले से बुक करें और योजना लचीली रखें।" },
  transport_disruption: { en: "Check your booking now; I've lined up alternate routes and will flag compensation if you're eligible.", hi: "अपनी बुकिंग अभी जाँचें; मैंने वैकल्पिक रास्ते तैयार किए हैं और मुआवज़े की पात्रता भी देखूँगा।" },
  health_outbreak: { en: "Follow health advisories, carry repellent and sanitiser, and check entry screening rules.", hi: "स्वास्थ्य सलाह मानें, रिपेलेंट और सैनिटाइज़र रखें और प्रवेश जाँच नियम देखें।" },
  policy_advisory: { en: "Re-check visa, permits and your government's advisory before you fly.", hi: "उड़ान से पहले वीज़ा, परमिट और सरकारी सलाह दोबारा जाँचें।" },
  infrastructure_outage: { en: "Carry some cash and download offline maps and tickets.", hi: "कुछ नकद रखें और ऑफ़लाइन मैप व टिकट डाउनलोड कर लें।" },
  crowd_event: { en: "Expect crowds and closures — start early and pre-book entry.", hi: "भीड़ और रास्ते बंद होने की संभावना है — जल्दी निकलें और पहले से बुक करें।" },
  price_economy: { en: "Prices are moving — lock in fares and stays early.", hi: "कीमतें बढ़ रही हैं — टिकट और होटल जल्दी बुक कर लें।" },
  travel_opportunity: { en: "This could be a good moment to book.", hi: "बुकिंग के लिए यह अच्छा समय हो सकता है।" },
  not_travel: { en: "No travel impact expected.", hi: "यात्रा पर कोई असर अपेक्षित नहीं है।" },
};

const SEV_WORD: Record<Severity, { en: string; hi: string }> = {
  low: { en: "Low-impact", hi: "कम असर वाली" }, moderate: { en: "Moderate", hi: "मध्यम" }, high: { en: "High-impact", hi: "गंभीर" }, critical: { en: "Critical", hi: "अत्यंत गंभीर" },
};

export function advisory(input: { title: string; category: NewsCategory; severity: Severity; place?: string | null; travelerName?: string; lang?: Lang }): { headline: string; body: string; sms: string } {
  const lang = input.lang ?? "en";
  const who = input.travelerName ? (lang === "hi" ? `${input.travelerName}, ` : `${input.travelerName}, `) : "";
  const where = input.place ? (lang === "hi" ? `${input.place} में` : `in ${input.place}`) : "";
  const sev = SEV_WORD[input.severity][lang];
  const action = ACTIONS[input.category][lang];
  const cleanTitle = input.title.replace(/^drill:\s*/i, "");
  const headline = lang === "hi" ? `${sev} अलर्ट ${where}` : `${sev} alert ${where}`.trim();
  const body = lang === "hi" ? `${who}${cleanTitle}। ${action}` : `${who}${cleanTitle}. ${action}`;
  const sms = (lang === "hi" ? `Voyage: ${headline} — ${action}` : `Voyage: ${headline} — ${action}`).slice(0, 300);
  return { headline, body, sms };
}

export function speakNumber(n: number): string {
  return n.toLocaleString("en-IN");
}

export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
