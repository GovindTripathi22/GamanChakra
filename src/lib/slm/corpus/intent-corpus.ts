import type { Intent } from "../labels";

export const INTENT_TEMPLATES: Record<Intent, string[]> = {
  greeting: [
    "hi", "hello", "hey", "hey chakra", "hello jarvis", "good morning", "good evening", "namaste", "hi there", "yo",
    "hey jarvis are you there", "namaskar", "hello chakra how are you", "hey buddy", "good afternoon", "kaise ho",
    "नमस्ते", "हेलो", "hey there assistant", "are you listening",
  ],
  help: [
    "what can you do", "help", "help me", "how does this work", "what are your features", "show me what you can do",
    "what commands do you understand", "i need help using this app", "tum kya kar sakte ho", "guide me", "how do i use you",
    "list your capabilities", "what can i ask you", "क्या कर सकते हो", "explain how to use the agent",
  ],
  plan_trip: [
    "plan a trip to {place}", "plan a {days} day trip to {place}", "make an itinerary for {place}",
    "i want to go to {place} for {days} days", "create a trip from {place} to {place} under {budget}",
    "plan my vacation to {place}", "build a {days} day itinerary for {place} with a budget of {budget}",
    "{place} trip plan for {days} days", "suggest an itinerary for {place}", "plan a honeymoon in {place}",
    "plan a weekend getaway to {place}", "mujhe {place} jana hai {days} din ke liye plan banao", "{place} ka trip plan karo",
    "organise a family trip to {place}", "i want a budget trip to {place}", "plan a road trip to {place}",
    "create a travel plan for {place} next month", "book me a plan for {place}", "{place} घूमने का प्लान बनाओ",
    "plan something for {days} days in {place} for two people", "where should i go for {days} days under {budget}",
  ],
  trip_status: [
    "what's the status of my trip", "how is my trip looking", "show my trips", "is my trip on track",
    "any updates on my {place} trip", "what's next on my itinerary", "show my upcoming trips", "trip status",
    "mera trip kaisa chal raha hai", "what is planned for today", "what's on my schedule tomorrow",
    "give me a summary of my trip", "how healthy is my trip plan", "status of my booking to {place}",
    "मेरी यात्रा का स्टेटस", "check my itinerary", "open my trip details",
  ],
  safety_check: [
    "is it safe to travel to {place}", "is {place} safe right now", "should i go to {place} this week",
    "how risky is {place}", "risk level for {place}", "any danger in {place}", "is it safe to visit {place} next week",
    "safety situation in {place}", "kya {place} jana safe hai", "check risk for {place}", "is my destination safe",
    "how safe is {place} for solo female travellers", "{place} सुरक्षित है क्या", "what's the risk score of {place}",
    "can i travel to {place} now", "is there any threat in {place}", "should i cancel my trip to {place}",
  ],
  news_brief: [
    "what's happening in {place}", "latest news from {place}", "any news about {place}", "give me the world news briefing",
    "what are the top travel alerts today", "news briefing", "brief me on global travel news",
    "what's going on in the world", "{place} ki taaza khabar", "top headlines affecting travel",
    "any breaking news i should know", "summarise today's travel news", "what happened in {place} today",
    "show me news for my destination", "ताज़ा खबरें", "latest alerts", "read me the latest headlines",
    "any disruptions in the news today",
  ],
  weather: [
    "what's the weather in {place}", "will it rain in {place} tomorrow", "weather forecast for {place}",
    "how hot is it in {place}", "is it cold in {place} right now", "{place} ka mausam kaisa hai",
    "do i need an umbrella in {place}", "temperature in {place}", "weather at my destination", "{place} में मौसम",
    "is there snow in {place}", "what will the weather be like this weekend in {place}",
  ],
  disruption_help: [
    "my flight got cancelled", "my train is delayed by {hours} hours what should i do", "flight {flight} is cancelled help me",
    "find me an alternative to my cancelled flight", "rebook me on another flight", "my connection is missed",
    "the airport is closed what are my options", "find another way to reach {place}", "train cancelled find alternatives",
    "meri flight cancel ho gayi", "meri train late hai", "reroute my trip to {place}", "i missed my flight",
    "what are my options now that the road to {place} is blocked", "मेरी ट्रेन रद्द हो गई", "suggest a backup plan",
    "my bus to {place} did not come", "the {train} is running late will i miss my connection",
  ],
  emergency_sos: [
    "help emergency", "sos", "i need help immediately", "call an ambulance", "i am in danger", "i've been robbed",
    "where is the nearest hospital", "i lost my passport", "medical emergency", "bachao", "police help",
    "emergency numbers for {place}", "मदद करो", "i am injured", "someone is following me", "accident happened",
    "my friend is unconscious", "i'm stuck in the flood", "contact the embassy",
  ],
  currency_convert: [
    "convert {amount} {currency} to rupees", "how much is {amount} {currency} in INR", "convert {amount} rupees to {currency}",
    "exchange rate for {currency}", "{amount} {currency} kitne rupaye", "what's the dollar rate today",
    "how many {currency} for {amount} rupees", "currency conversion {amount} {currency}",
  ],
  cost_estimate: [
    "how much will a trip to {place} cost", "estimate the budget for {days} days in {place}", "what is the true cost of {place} trip",
    "{place} trip ka kharcha kitna hoga", "is {budget} enough for {place}", "cost breakdown for my trip",
    "how expensive is {place}", "estimate my total trip cost", "budget for two people in {place}",
  ],
  packing_list: [
    "what should i pack for {place}", "make a packing list", "packing list for {days} days in {place}",
    "what clothes to carry to {place}", "kya pack karun", "do i need warm clothes for {place}", "checklist before travel",
  ],
  traveler_checkin: [
    "send a safety check-in to all travelers in {place}", "ask everyone in {place} if they are safe",
    "send are you safe message to affected travelers", "trigger check in for my team", "check on all employees in {place}",
    "send safety ping to travelers", "message all travellers near the earthquake", "run a mass check-in",
    "sabhi travellers ko safety message bhejo", "notify my team in {place} to confirm they are safe",
  ],
  affected_travelers: [
    "which travelers are affected", "who is at risk right now", "show travelers near {place}", "how many employees are in {place}",
    "list people affected by the strike", "who is exposed to the cyclone", "show me travelers in danger",
    "kaun kaun affected hai", "any of my travellers in {place}", "who hasn't checked in yet", "show unsafe travelers",
  ],
  run_agent: [
    "scan the world now", "run the agent", "run a risk scan", "check for new disruptions", "start autopilot scan",
    "refresh news and assess risks", "run guardian now", "scan all my trips", "agent ko chalao", "do a full sweep",
    "look for anything that affects my trips", "start monitoring", "trigger the autonomous agent",
  ],
  set_autonomy: [
    "turn on autopilot", "set autonomy to {level}", "enable full autonomy", "switch to supervised mode",
    "only notify me don't act", "let the agent act on its own", "turn off autopilot", "set agent to {level}",
    "autopilot on karo", "require my approval for every action", "make the agent fully autonomous",
  ],
  open_page: [
    "open {page}", "go to {page}", "show {page}", "take me to {page}", "navigate to {page}", "{page} kholo",
    "open the world map", "show me the command center", "go home", "open settings",
  ],
  compensation_claim: [
    "can i get compensation for my delayed flight", "file a refund claim for my cancelled flight", "draft a compensation claim",
    "how much refund will i get for {flight}", "my flight was delayed {hours} hours am i eligible for compensation",
    "claim money for denied boarding", "EU261 claim for my flight", "DGCA compensation for cancelled flight",
    "refund kaise milega", "help me claim a refund", "airline owes me money for the delay",
  ],
  phrase_translate: [
    "how do i say {phrase} in {lang}", "translate {phrase} to {lang}", "what is {phrase} in {lang}",
    "teach me to say {phrase} in {lang}", "{phrase} ko {lang} mein kya kehte hain", "say {phrase} in {lang}",
  ],
  thanks_bye: [
    "thanks", "thank you", "thank you so much", "bye", "goodbye", "see you later", "that's all", "shukriya", "dhanyavaad",
    "ok thanks bye", "great thanks", "धन्यवाद", "stop listening", "that's it for now",
  ],
  out_of_scope: [
    "tell me a joke", "who won the cricket match", "what's the meaning of life", "write a poem", "what is 2 plus 2",
    "sing a song", "who is the richest man", "what's your favourite colour", "play some music", "order a pizza",
    "solve this equation", "who invented the light bulb", "recommend a movie", "what is bitcoin price",
    "how do i cook pasta", "set an alarm for 6 am", "what's the capital of australia", "tell me about quantum physics",
  ],
};
