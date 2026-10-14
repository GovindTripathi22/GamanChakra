import { mulberry32 } from "../network";

export const FILLERS: Record<string, string[]> = {
  place: [
    "Delhi", "Mumbai", "Goa", "Jaipur", "Kerala", "Varanasi", "Bengaluru", "Chennai", "Kolkata", "Manali", "Leh", "Shimla",
    "Srinagar", "Udaipur", "Rishikesh", "Andaman", "Darjeeling", "Hyderabad", "Kochi", "Agra", "Amritsar", "Gangtok",
    "Dubai", "Bangkok", "Singapore", "Bali", "Paris", "London", "Tokyo", "New York", "Istanbul", "Kathmandu", "Colombo",
    "Male", "Phuket", "Hong Kong", "Seoul", "Sydney", "Rome", "Barcelona", "Amsterdam", "Frankfurt", "Doha", "Cairo",
    "Nepal", "Sri Lanka", "Thailand", "Japan", "France", "Italy", "Turkey", "Indonesia", "Vietnam", "Maldives", "Israel",
    "Lebanon", "Philippines", "Mexico", "Florida", "California", "Greece", "Spain", "Germany", "Uttarakhand", "Himachal",
  ],
  airline: [
    "IndiGo", "Air India", "SpiceJet", "Akasa Air", "Air India Express", "Emirates", "Qatar Airways", "Etihad", "Lufthansa",
    "British Airways", "Air France", "KLM", "Ryanair", "easyJet", "Delta", "United", "American Airlines", "Singapore Airlines",
    "Thai Airways", "Cathay Pacific", "Turkish Airlines", "Japan Airlines", "ANA", "Vietnam Airlines", "flydubai",
  ],
  group: [
    "taxi unions", "truckers", "farmers", "air traffic controllers", "pilots", "cabin crew", "rail workers", "bus drivers",
    "port workers", "airport staff", "ground handling staff", "doctors", "teachers", "transport unions", "metro workers",
    "opposition parties", "students", "auto-rickshaw drivers", "hotel workers", "customs officers",
  ],
  storm: ["Cyclone Dana", "Cyclone Remal", "Typhoon Gaemi", "Hurricane Milton", "Storm Boris", "Cyclone Fengal", "Typhoon Yagi", "Cyclone Michaung", "Hurricane Helene", "Storm Ciaran"],
  disease: ["dengue", "cholera", "measles", "mpox", "Nipah virus", "bird flu", "Zika", "Covid-19", "Ebola", "Marburg", "chikungunya", "malaria", "hepatitis A", "norovirus", "Japanese encephalitis"],
  festival: ["Diwali", "Kumbh Mela", "Holi", "Durga Puja", "Christmas", "New Year's Eve", "Oktoberfest", "Songkran", "Pushkar Fair", "Hornbill Festival", "Ganesh Chaturthi", "Eid", "Lunar New Year", "Carnival", "Formula 1 Grand Prix", "Coldplay concert", "World Cup final", "Olympics"],
  n: ["12", "25", "40", "60", "85", "120", "150", "200", "300", "450", "600", "1,200"],
  hours: ["2", "3", "4", "5", "6", "8", "10", "12", "24", "48"],
  mag: ["4.6", "5.1", "5.4", "5.8", "6.1", "6.4", "6.9", "7.2", "7.6", "8.0"],
  pct: ["5", "8", "10", "12", "15", "18", "20", "25", "30", "40"],
  days: ["2", "3", "4", "5", "6", "7", "10", "12", "14"],
  budget: ["20000", "30k", "50,000", "1 lakh", "75000", "15k", "2 lakh", "40000"],
  amount: ["100", "250", "500", "1000", "2500", "50", "75", "5000"],
  currency: ["dollars", "USD", "euros", "EUR", "pounds", "yen", "dirhams", "baht", "rupees", "INR", "SGD", "ringgit"],
  lang: ["Japanese", "French", "Thai", "Spanish", "German", "Italian", "Hindi", "Tamil", "Arabic", "Korean", "Bengali", "Kannada"],
  phrase: ["thank you", "where is the toilet", "how much does this cost", "I need a doctor", "good morning", "I am vegetarian", "help", "call the police", "where is the train station", "no spicy food please"],
  page: ["dashboard", "mission control", "the map", "my trips", "duty of care", "automations", "the news feed", "settings", "pricing", "agent logs", "risk radar"],
  level: ["L0", "L1", "L2", "L3", "L4", "observe only", "notify only", "propose", "full autopilot", "autonomous"],
  train: ["Rajdhani Express", "Shatabdi Express", "Vande Bharat", "Duronto", "12951", "12002", "Tejas Express", "Garib Rath"],
  flight: ["6E 2134", "AI 101", "EK 512", "QR 557", "UK 955", "SG 8169", "BA 138", "LH 761"],
};

export function expand(template: string, rnd: () => number): string {
  return template.replace(/\{(\w+?)(\d?)\}/g, (_, key: string) => {
    const list = FILLERS[key];
    if (!list) return key;
    return list[Math.floor(rnd() * list.length)];
  });
}

export function expandMany(template: string, k: number, seed: number): string[] {
  const rnd = mulberry32(seed);
  const out = new Set<string>();
  const hasSlots = /\{\w+\}/.test(template);
  const target = hasSlots ? k : 1;
  for (let i = 0; i < target * 3 && out.size < target; i++) out.add(expand(template, rnd));
  return [...out];
}
