export interface TrendingHotel {
  name: string;
  tier: "budget" | "comfort" | "luxury";
  price: string;
  rating: number;
}

export interface TrendingDayPlan {
  day: number;
  title: string;
  theme: string;
  morning: string;
  afternoon: string;
  evening: string;
  highlight: string;
}

export interface TrendingTrip {
  id: string;
  destination: string;
  title: string;
  tagline: string;
  theme: "mountains" | "coastal" | "heritage" | "nature" | "international";
  themeLabel: string;
  themeIcon: string;
  badgeColor: string;
  days: number;
  estimatedBudgetINR: number;
  budgetTier: "Budget" | "Moderate" | "Luxury";
  vibe: string;
  bestSeason: string;
  imageUrl: string;
  overview: string;
  highlights: string[];
  recommendedHotels: TrendingHotel[];
  itinerary: TrendingDayPlan[];
}

export const TRENDING_THEMES = [
  { id: "all", label: "🌟 All Trending", count: 8 },
  { id: "mountains", label: "🏔️ Mountains & Thrill", count: 2 },
  { id: "coastal", label: "🏖️ Coastal & Beaches", count: 1 },
  { id: "heritage", label: "🏰 Royal Heritage", count: 2 },
  { id: "nature", label: "🌿 Nature & Backwaters", count: 1 },
  { id: "international", label: "✈️ International Wonders", count: 2 },
] as const;

export const TRENDING_TRIPS: TrendingTrip[] = [
  {
    id: "ladakh-high-passes",
    destination: "Ladakh",
    title: "Ladakh: High-Altitude Passes & Monasteries",
    tagline: "Traverse Khardung La, camp beside turquoise Pangong Tso, and listen to chanting monks in ancient gompas.",
    theme: "mountains",
    themeLabel: "High-Altitude Mountain & Adventure",
    themeIcon: "🏔️",
    badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    days: 7,
    estimatedBudgetINR: 34000,
    budgetTier: "Moderate",
    vibe: "Adventure & Spiritual",
    bestSeason: "May – September",
    imageUrl: "/hero-ladakh-hd.jpg",
    overview: "A soul-stirring 7-day high-altitude Himalayan circuit taking you across world-famous mountain passes, glacial lakes, sand dunes in Nubra Valley, and 1,000-year-old Buddhist monasteries.",
    highlights: [
      "Drive across Khardung La (17,982 ft) — world's highest motorable pass",
      "Stargazing by the crystal-clear turquoise waters of Pangong Tso (14,270 ft)",
      "Double-humped Bactrian camel safari in the white sand dunes of Hunder",
      "Sunset prayer chants at the cliffside Thiksey Monastery",
    ],
    recommendedHotels: [
      { name: "The Grand Dragon Ladakh", tier: "luxury", price: "₹18,500/night", rating: 4.8 },
      { name: "Nubra Organic Retreat, Hunder", tier: "comfort", price: "₹6,800/night", rating: 4.6 },
      { name: "Pangong Sarai Camp", tier: "comfort", price: "₹5,200/night", rating: 4.4 },
    ],
    itinerary: [
      {
        day: 1,
        title: "Acclimatization in Leh & Sunset at Shanti Stupa",
        theme: "Arrival & High-Altitude Acclimatization",
        morning: "Land at Kushok Bakula Rimpochee Airport (Leh). Strict 4-hour rest for oxygen stabilization.",
        afternoon: "Leisurely walk through Leh Main Bazaar, sip butter tea and taste warm Ladakhi tingmo.",
        evening: "Ascend to white-domed Shanti Stupa for a 360-degree panoramic golden-hour sunset over the Zanskar range.",
        highlight: "Sunset over the snow-dusted Karakoram peaks from Shanti Stupa."
      },
      {
        day: 2,
        title: "Sham Valley, Magnetic Hill & Sacred Sangam",
        theme: "River Confluences & Monastic Wonders",
        morning: "Witness gravity-defying physics at Magnetic Hill and pay homage at Gurudwara Pathar Sahib.",
        afternoon: "Drive down to the dramatic Sangam — confluence of turquoise Indus and muddy Zanskar rivers.",
        evening: "Explore Alchi Gompa, Leh's oldest monastery featuring Kashmiri-style woodcarvings and 11th-century frescoes.",
        highlight: "Standing at the Sangam viewpoint watching two vibrant river colors merge."
      },
      {
        day: 3,
        title: "Over Khardung La Pass to Nubra Valley",
        theme: "Extreme Elevation & Cold Desert Dunes",
        morning: "Climb through steep switchbacks to summit Khardung La (17,982 ft) with prayer flags fluttering in the wind.",
        afternoon: "Descend into the emerald valley of Nubra; visit the 106-foot Maitreya Buddha statue at Diskit Monastery.",
        evening: "Ride double-humped Bactrian camels across the silver sand dunes of Hunder against barren granite mountains.",
        highlight: "Camel safari in the high desert sand dunes under purple twilight."
      },
      {
        day: 4,
        title: "Turtuk Village — The Border Oasis",
        theme: "Balti Heritage & Apricot Groves",
        morning: "Drive along the Shyok river to Turtuk, India's northernmost village near the LOC, opened to travelers in 2010.",
        afternoon: "Walk through heritage wooden houses, walnut orchards, and taste sweet fresh apricots with local Balti elders.",
        evening: "Return to Hunder for a warm campfire dinner and Ladakhi folk songs under a starlit mountain sky.",
        highlight: "Interacting with the warmth and distinct Balti culture of Turtuk."
      },
      {
        day: 5,
        title: "Shyok River Route to Majestic Pangong Tso",
        theme: "The World's Highest Saltwater Jewel",
        morning: "Take the rugged, cinematic Shyok river route eastward towards the Indo-Tibetan border.",
        afternoon: "First sight of Pangong Tso Lake (14,270 ft) — marvel at how the water shifts from turquoise to cobalt blue.",
        evening: "Check in to luxury lakeside geodesic dome tents. Savor steaming hot thukpa while the Milky Way reveals itself.",
        highlight: "Breathtaking astrophotography and stargazing with zero light pollution."
      },
      {
        day: 6,
        title: "Chang La Summit, Thiksey Monastery & Return to Leh",
        theme: "Sacred Chants & Return Journey",
        morning: "Catch the sunrise reflections on Pangong Tso; ascend Chang La Pass (17,590 ft) guarded by snow-peaks.",
        afternoon: "Tour Thiksey Monastery, famously modeled after Lhasa's Potala Palace; visit Shey Palace complex.",
        evening: "Farewell dinner in Leh with local apricot wine and walnut-crusted lamb kebab.",
        highlight: "Hearing the deep brass horn echoes during evening monastic prayers."
      },
      {
        day: 7,
        title: "Final Mountain Memories & Departure",
        theme: "Farewell to the Land of High Passes",
        morning: "Final sunrise over Leh valley, pick up pure Pashmina shawls, dried apricots, and Tibetan prayer wheels.",
        afternoon: "Airport transfer to Leh for departure flight over the soaring Himalayan ridges.",
        evening: "Arrival back home with unforgettable memories.",
        highlight: "Aerial vistas of snowfields from your departure flight."
      }
    ]
  },
  {
    id: "south-goa-serenity",
    destination: "Goa",
    title: "South Goa: Sunkissed Shores & Portuguese Manors",
    tagline: "Escape the crowds. Discover pristine turquoise bays, cliffside forts, Latin quarters, and fragrant spice farms.",
    theme: "coastal",
    themeLabel: "Coastal Serenity & Beach Chill",
    themeIcon: "🏖️",
    badgeColor: "bg-teal-500/10 text-teal-500 border-teal-500/30",
    days: 5,
    estimatedBudgetINR: 22000,
    budgetTier: "Moderate",
    vibe: "Relaxation & Heritage",
    bestSeason: "October – April",
    imageUrl: "/destinations/goa.jpg",
    overview: "A blissful 5-day escape to the tranquil side of Goa. Unwind on uncrowded soft-sand beaches, paddle through mangrove backwaters, explore 400-year-old Portuguese mansions, and indulge in fresh seafood tavernas.",
    highlights: [
      "Panoramic cliffside sunsets at the 17th-century Cabo de Rama Fort",
      "Hidden Butterfly Beach kayak expedition and dolphin watching",
      "Heritage walking tour through the colorful pastel alleys of Fontainhas",
      "Traditional Goan prawn curry lunch inside a lush organic spice plantation",
    ],
    recommendedHotels: [
      { name: "Taj Exotica Resort & Spa, Benaulim", tier: "luxury", price: "₹24,000/night", rating: 4.8 },
      { name: "Heritage Village Resort, Arossim", tier: "comfort", price: "₹8,500/night", rating: 4.5 },
      { name: "Santana Beach Resort, Candolim", tier: "budget", price: "₹4,200/night", rating: 4.3 },
    ],
    itinerary: [
      {
        day: 1,
        title: "Arrival, Benaulim Breeze & Seafood Shack Welcome",
        theme: "Coastal Unwinding & Beach Sunset",
        morning: "Arrive at Dabolim or MOPA Airport / Madgaon Station. Check in to your beachside resort in South Goa.",
        afternoon: "Dip in the pool or take a relaxed barefoot stroll along the wide, quiet white sands of Benaulim Beach.",
        evening: "Sip chilled feni cocktails at a candlelit beach shack with grilled red snapper and live acoustic guitar.",
        highlight: "Watching the crimson sun plunge into the Arabian Sea while dining on the sand."
      },
      {
        day: 2,
        title: "Cabo de Rama Fort & Secret Butterfly Beach",
        theme: "Cliffs, Coves & Ocean Kayaking",
        morning: "Drive south through lush coconut groves to Cabo de Rama Fort overlooking turquoise oceanic coves.",
        afternoon: "Hike or boat down to the secluded Butterfly Beach. Spot frolicking dolphins in the bay.",
        evening: "Unwind at Agonda Beach, known for peaceful sunsets, turtle conservation, and bohemian beach lounges.",
        highlight: "The majestic cliffside ocean view from Cabo de Rama ramparts."
      },
      {
        day: 3,
        title: "Palolem Crescent, Yoga & Sunset Kayaking",
        theme: "Tropical Wellness & Bohemian Living",
        morning: "Morning beachfront yoga session at Patnem, followed by a tropical acai smoothie bowl.",
        afternoon: "Rent a sea kayak in the calm horseshoe crescent of Palolem Beach and paddle around Monkey Island.",
        evening: "Browse the boutique beach shacks of Palolem, enjoying wood-fired pizzas and fresh tropical fruit sangria.",
        highlight: "Paddling a kayak into the golden glow of the setting sun."
      },
      {
        day: 4,
        title: "Spice Plantations & 400-Year-Old Palaces",
        theme: "Scented Plantations & Colonial Heritage",
        morning: "Guided tour through Sahakari Spice Farm; learn about vanilla, cardamom, and black pepper vines.",
        afternoon: "Traditional banana-leaf Goan buffet lunch with peri-peri chicken and sol kadhi.",
        evening: "Tour the grand Menezes Bragança mansion in Chandor, filled with 17th-century Belgian chandeliers and rare library.",
        highlight: "The sensory explosion of wild spices and royal Portuguese history."
      },
      {
        day: 5,
        title: "Fontainhas Latin Quarter & Farewell Feast",
        theme: "Portuguese Architecture & Return",
        morning: "Stroll through the pastel yellow, green, and blue villas of Fontainhas Latin Quarter in Panaji.",
        afternoon: "Savor warm Portuguese egg tarts (Pastéis de Nata) at 31st January Bakery; souvenir shopping for cashews and feni.",
        evening: "Airport / train station transfer with golden coastal memories.",
        highlight: "Photographing the vivid azulejo tiles and ornate colonial balconies of Fontainhas."
      }
    ]
  },
  {
    id: "udaipur-royal-palaces",
    destination: "Udaipur",
    title: "Udaipur: City of Lakes & Rajput Royalty",
    tagline: "Live like royal nobility with candlelit lake boat rides, palace courtyards, and sunset views from Monsoon Palace.",
    theme: "heritage",
    themeLabel: "Royal Rajputana Heritage & Romance",
    themeIcon: "🏰",
    badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    days: 5,
    estimatedBudgetINR: 26000,
    budgetTier: "Moderate",
    vibe: "Royalty & Romance",
    bestSeason: "September – March",
    imageUrl: "/destinations/jaipur.jpg",
    overview: "Immerse yourself in Rajasthan's most romantic city. Glide past white marble palaces floating on serene lakes, explore the grandest fortresses in the world, and feast on authentic royal laal maas beneath illuminated battlements.",
    highlights: [
      "Sunset boat cruise on Lake Pichola past illuminated Jag Mandir",
      "Full guided exploration of the colossal Udaipur City Palace complex",
      "Day excursion to Kumbhalgarh Fort and its UNESCO 36-km wall",
      "Live Rajasthani folk dance and puppet show at historic Bagore Ki Haveli",
    ],
    recommendedHotels: [
      { name: "Taj Lake Palace, Udaipur", tier: "luxury", price: "₹45,000/night", rating: 4.9 },
      { name: "Fateh Garh - Heritage Renaissance", tier: "comfort", price: "₹9,500/night", rating: 4.7 },
      { name: "Umaid Bhawan Heritage Style", tier: "comfort", price: "₹5,400/night", rating: 4.5 },
    ],
    itinerary: [
      {
        day: 1,
        title: "Lake Pichola Sunset Cruise & Lakeside Welcome",
        theme: "Arrival in the Venice of the East",
        morning: "Land at Maharana Pratap Airport (UDR) and check in to your heritage haveli overlooking Lake Pichola.",
        afternoon: "Sip saffron masala chai on your jharokha balcony while watching water ripples reflect on palace walls.",
        evening: "Board a royal boat cruise on Lake Pichola; glide past Jag Mandir Island as City Palace lights up in gold.",
        highlight: "The majestic golden reflection of the City Palace against dark lake waters."
      },
      {
        day: 2,
        title: "Colossal City Palace & Bagore Ki Haveli",
        theme: "Royal Courtrooms & Cultural Dances",
        morning: "Extensive guided walk through Udaipur City Palace — Crystal Gallery, peacock courtyards, and royal weapons room.",
        afternoon: "Visit the 1651 Jagdish Temple, admire intricate stone carvings, and browse miniature painting workshops.",
        evening: "Attend the vibrant Dharohar folk dance performance at Bagore Ki Haveli by Gangaur Ghat.",
        highlight: "The famous fire dancer balancing 9 brass pots atop her head at Bagore Ki Haveli."
      },
      {
        day: 3,
        title: "Kumbhalgarh Fort & Marble Temples of Ranakpur",
        theme: "The Great Wall of India",
        morning: "Scenic drive into the Aravalli hills to UNESCO Kumbhalgarh Fort, birth place of Maharana Pratap.",
        afternoon: "Walk the perimeter wall (36 km long, second only to the Great Wall of China) and Badal Mahal cloud palace.",
        evening: "Stop at Ranakpur's 15th-century white marble Jain Temple with 1,444 uniquely carved marble pillars.",
        highlight: "Standing on Kumbhalgarh's highest rampart gazing across the desert frontier."
      },
      {
        day: 4,
        title: "Saheliyon Ki Bari & Sunset at Monsoon Palace",
        theme: "Royal Gardens & High-Altitude Panoramas",
        morning: "Stroll through the marble fountains and lotus ponds of Saheliyon Ki Bari (Garden of the Royal Maids).",
        afternoon: "Visit the Vintage Car Museum housing Rolls Royces and Cadillacs of the Maharanas.",
        evening: "Drive to hilltop Sajjangarh (Monsoon Palace) to watch the sun set over the lakes and Aravalli mountain ridges.",
        highlight: "Panoramic sunset view stretching 50 kilometers across Mewar kingdom."
      },
      {
        day: 5,
        title: "Hathi Pol Artisanal Crafts & Farewell Feast",
        theme: "Mewari Souvenirs & Journey Home",
        morning: "Shop for handcrafted leather mojris, silver jewelry, and Bandhani silk sarees in Hathi Pol market.",
        afternoon: "Rooftop farewell Mewari thali featuring Dal Baati Churma and tender Laal Maas.",
        evening: "Airport / railway station transfer with royal memories.",
        highlight: "Tasting royal Mewari delicacies while gazing across the shimmering lake."
      }
    ]
  },
  {
    id: "kerala-hills-backwaters",
    destination: "Kerala",
    title: "Kerala: Mist-Clad Tea Valleys to Silent Backwaters",
    tagline: "Sip fresh-plucked orthodox tea in cloud-draped Munnar, then board a private houseboat along Alleppey's waterways.",
    theme: "nature",
    themeLabel: "Tropical Nature & Backwater Serenity",
    themeIcon: "🌿",
    badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    days: 6,
    estimatedBudgetINR: 25500,
    budgetTier: "Moderate",
    vibe: "Nature & Wellness",
    bestSeason: "September – May",
    imageUrl: "/hero-kerala-hd.jpg",
    overview: "A quintessential God's Own Country journey seamlessly combining the cool, emerald slopes of Munnar's tea country with the languid, palm-canopied waterways of Alleppey aboard a traditional private houseboat.",
    highlights: [
      "Overnight stay on a private luxury Kettuvallam houseboat in Alleppey",
      "Sunrise jeep safari to Kolukkumalai — world's highest organic tea estate",
      "Spotting the rare Nilgiri Tahr in Eravikulam National Park",
      "Authentic Ayurvedic herbal rejuvenation massage and Karimeen Pollichathu feast",
    ],
    recommendedHotels: [
      { name: "Blanket Luxury Villa, Munnar", tier: "luxury", price: "₹14,000/night", rating: 4.8 },
      { name: "Punnamada Backwater Resort, Alleppey", tier: "comfort", price: "₹8,200/night", rating: 4.6 },
      { name: "Coconut Lagoon - CGH Earth", tier: "luxury", price: "₹16,500/night", rating: 4.8 },
    ],
    itinerary: [
      {
        day: 1,
        title: "Cochin Arrival & Ascent to Emerald Munnar",
        theme: "From Coast to Cloud Valleys",
        morning: "Arrive at Cochin International Airport (COK). Begin the lush, winding drive into the Western Ghats.",
        afternoon: "Stop at cascading Cheeyappara and Valara Waterfalls; breathe in cool mountain air and eucalyptus mist.",
        evening: "Check in to your plantation resort. Sip freshly brewed cardamom tea while mist rolls over the valleys.",
        highlight: "The sudden drop in temperature and endless green hills as you enter Munnar."
      },
      {
        day: 2,
        title: "Tea Plantations, Eravikulam & Mattupetty Dam",
        theme: "Tea Legacy & High-Altitude Wildlife",
        morning: "Early wildlife safari inside Eravikulam National Park to spot endangered Nilgiri Tahr on rocky cliffs.",
        afternoon: "Tour the Tata Tea Museum; learn orthodox tea leaf rolling and enjoy private tea tasting.",
        evening: "Boating on Mattupetty Dam reservoir with views of Anamudi (South India's highest peak).",
        highlight: "Seeing a Nilgiri Tahr family grazing peacefully against rolling green tea hills."
      },
      {
        day: 3,
        title: "Kolukkumalai Sunrise & Spice Plantation Treks",
        theme: "World's Highest Organic Tea Estate",
        morning: "4:30 AM 4x4 rugged jeep safari to Kolukkumalai (7,900 ft). Watch the golden sun pierce through sea of clouds.",
        afternoon: "Walk through fragrant pepper, clove, and cinnamon gardens; meet local master spice planters.",
        evening: "Soothing 60-minute authentic Ayurvedic Abhyanga herbal oil massage at your wellness resort.",
        highlight: "The unbelievable cloud-inversion sunrise at Kolukkumalai."
      },
      {
        day: 4,
        title: "Descend to Alleppey & Board Luxury Houseboat",
        theme: "Life on the Backwaters",
        morning: "Scenic downhill drive through rubber and pineapple plantations towards the Vembanad backwaters.",
        afternoon: "Step aboard your private wooden Kettuvallam houseboat; greeted with fresh coconut water and warm smiles.",
        evening: "Slowly cruise palm-shaded lagoons as egrets fly past; dock by a village for sunset; fresh fish curry dinner.",
        highlight: "Gliding noiselessly along tranquil canals while chef prepares fresh fish on board."
      },
      {
        day: 5,
        title: "Village Canoe Safari & Marari Beach Sunset",
        theme: "Canal Villages & Untouched Sands",
        morning: "Hop into a narrow traditional canoe to navigate tiny village canals inaccessible to houseboats.",
        afternoon: "Disembark and drive to pristine Marari Beach. Relax on quiet hammocks under swaying coconut palms.",
        evening: "Watch local fishermen bring in the day's catch; candlelit beach dinner with grilled tiger prawns.",
        highlight: "Village canoe ride seeing morning village life and lotus-dotted backwaters."
      },
      {
        day: 6,
        title: "Fort Kochi Heritage & Departure",
        theme: "Chinese Fishing Nets & Return",
        morning: "Drive to historic Fort Kochi; see the iconic cantilevered Chinese Fishing Nets in operation.",
        afternoon: "Explore 1568 Jewish Synagogue in Jew Town, browse spice markets and Dutch colonial architecture.",
        evening: "Airport transfer to Cochin with rejuvenation and serenity in your heart.",
        highlight: "Watching fishermen haul the massive wooden Chinese fishing nets against the sunset."
      }
    ]
  },
  {
    id: "varanasi-spiritual-odyssey",
    destination: "Varanasi",
    title: "Varanasi: Sacred Ghats, Silk Alleys & Sunrise Ganga",
    tagline: "Witness 3,000 years of unbroken spiritual civilization with dawn boat rides, silk weavers, and evening Maha Aarti.",
    theme: "heritage",
    themeLabel: "Spiritual Culture & Sacred Mysticism",
    themeIcon: "🕉️",
    badgeColor: "bg-orange-500/10 text-orange-500 border-orange-500/30",
    days: 4,
    estimatedBudgetINR: 16500,
    budgetTier: "Budget",
    vibe: "Spiritual & Cultural",
    bestSeason: "October – March",
    imageUrl: "/destinations/varanasi.jpg",
    overview: "Walk the oldest continuously inhabited city on Earth. Float on the sacred Ganges at dawn, witness the mesmerizing fire rituals of Dashashwamedh Ghat, explore Sarnath where Buddha first preached, and discover ancient silk weaving lanes.",
    highlights: [
      "Subah-e-Banaras dawn rowboat ride past 84 historic stone ghats",
      "Front-row VIP boat seating for the grand Ganga Maha Aarti",
      "Visit Sarnath and the 5th-century Dhamek Stupa where Buddha gave his first sermon",
      "Food trail of Banarasi kachori-jalebi, blue lassi, and winter malaiyo cream",
    ],
    recommendedHotels: [
      { name: "BrijRama Palace - Heritage Grand on Darbhanga Ghat", tier: "luxury", price: "₹26,000/night", rating: 4.9 },
      { name: "Taj Ganges, Varanasi", tier: "luxury", price: "₹14,500/night", rating: 4.7 },
      { name: "Ganges View Heritage Stay, Assi Ghat", tier: "comfort", price: "₹4,800/night", rating: 4.4 },
    ],
    itinerary: [
      {
        day: 1,
        title: "Arrival, Assi Ghat & Grand Dashashwamedh Aarti",
        theme: "Welcome to Kashi",
        morning: "Land at Lal Bahadur Shastri Airport (VNS). Transfer to your heritage stay near the ghats.",
        afternoon: "Orientation stroll through Assi Ghat; taste creamy saffron lassi in hand-thrown clay kulhad cups.",
        evening: "Board a private wooden bajra boat for Dashashwamedh Ghat; witness the grand choreographed fire Aarti.",
        highlight: "The synchronized sound of conch shells, bells, and towering brass oil lamps."
      },
      {
        day: 2,
        title: "Subah-e-Banaras Dawn Boat & Kashi Vishwanath",
        theme: "The Sacred Golden Hour",
        morning: "5:15 AM dawn boat ride from Assi to Manikarnika Ghat; watch pilgrims perform surya namaskar as sun rises.",
        afternoon: "Walk through the newly built Kashi Vishwanath Golden Temple corridor; offer sacred Bilva leaves.",
        evening: "Hidden food trail through Thatheri Bazaar: savor piping-hot kachori sabzi, tamatar chaat, and creamy malaiyo.",
        highlight: "Sun rising like a golden sphere over the mist-covered Ganges while hymns fill the air."
      },
      {
        day: 3,
        title: "Sarnath Excursion & Heritage Silk Weavers",
        theme: "Buddhist Roots & Banarasi Weaving",
        morning: "Drive 10 km to Sarnath. Walk around the monumental Dhamek Stupa and Deer Park where Gautama Buddha taught the 8-fold path.",
        afternoon: "Explore Sarnath Archaeological Museum housing the original 250 BCE Ashokan Lion Capital (India's national emblem).",
        evening: "Visit master handloom weavers in the Muslim silk quarters of Madanpura; witness pure gold zari saree weaving.",
        highlight: "Gazing directly at the pristine Ashokan Lion Capital polished to glass-like luster 2,200 years ago."
      },
      {
        day: 4,
        title: "BHU, Bharat Kala Bhavan & Farewell",
        theme: "Artistic Heritage & Departure",
        morning: "Visit sprawling green Banaras Hindu University (BHU) and the majestic red stone New Vishwanath Temple.",
        afternoon: "Peruse rare Mughal miniature paintings and ancient terracotta at Bharat Kala Bhavan museum.",
        evening: "Final blessings at the ghats, pick up authentic Banarasi paan, transfer to airport for departure.",
        highlight: "Tasting an authentic royal silver-leaf Banarasi paan at a heritage corner stall."
      }
    ]
  },
  {
    id: "manali-spiti-himalayas",
    destination: "Manali",
    title: "Manali & Parvati Valley: Pine Forests & Rohtang Snows",
    tagline: "Breathe crisp mountain air across Atal Tunnel, explore ancient wooden pagodas, and dip in natural sulfur hot springs.",
    theme: "mountains",
    themeLabel: "Alpine Forests & Snow Passes",
    themeIcon: "🏔️",
    badgeColor: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
    days: 6,
    estimatedBudgetINR: 27000,
    budgetTier: "Moderate",
    vibe: "Adventure & Alpine",
    bestSeason: "April – October",
    imageUrl: "/hero-travel-hd.jpg",
    overview: "A refreshing 6-day alpine retreat through Himachal Pradesh. Soar over Solang Valley, cross the engineering marvel of Atal Tunnel into Lahaul, trek through cedar forests in Old Manali, and relax in natural mineral springs.",
    highlights: [
      "Drive through the landmark Atal Tunnel (9.02 km) to the dramatic waterfalls of Sissu",
      "Snow adventures and paragliding in Solang Valley",
      "Relax in natural therapeutic hot sulfur springs at Vashisht & Manikaran",
      "Explore the 1553 wooden pagoda Hadimba Devi Temple amid towering deodars",
    ],
    recommendedHotels: [
      { name: "The Himalayan Resort & Spa, Manali", tier: "luxury", price: "₹16,000/night", rating: 4.8 },
      { name: "Span Resort & Spa, Baragarh", tier: "luxury", price: "₹18,500/night", rating: 4.7 },
      { name: "Zostel Old Manali", tier: "budget", price: "₹2,400/night", rating: 4.5 },
    ],
    itinerary: [
      {
        day: 1,
        title: "Arrival in Manali, Hadimba & Old Manali Cafes",
        theme: "Cedar Woods & Bohemian Vibe",
        morning: "Arrive via Bhuntar Airport / luxury sleeper Volvo coach into Manali valley surrounded by snow peaks.",
        afternoon: "Walk beneath 500-year-old towering deodars to visit the historic wooden-tiered Hadimba Devi Temple.",
        evening: "Cross the bridge into Old Manali; relax at a riverside cafe with apple cider, wood-fired pizza, and mountain tunes.",
        highlight: "The scent of ancient pine resin around Hadimba Temple."
      },
      {
        day: 2,
        title: "Solang Valley Thrills & Atal Tunnel into Lahaul",
        theme: "Adrenaline & Trans-Himalayan Crossing",
        morning: "Tandem paragliding and quad biking in Solang Valley with panoramic Pir Panjal views.",
        afternoon: "Drive through Atal Tunnel (9.02 km) into Lahaul Valley. Emerge into the stark trans-Himalayan landscape of Sissu.",
        evening: "Marvel at the frozen/gushing Sissu Waterfall; return to Manali for a warm hot-pot dinner.",
        highlight: "The instant dramatic transformation of landscape upon exiting Atal Tunnel into Lahaul."
      },
      {
        day: 3,
        title: "Rohtang Pass (13,058 ft) & Vashisht Hot Springs",
        theme: "Glacial Highs & Mineral Springs",
        morning: "Early ascent to Rohtang Pass, the gateway to Spiti and Ladakh, surrounded by glaciers and snowfields.",
        afternoon: "Snow scootering and hot steaming Maggi noodles at 13,000 feet.",
        evening: "Descend to Vashisht village for a deeply rejuvenating soak in ancient natural hot sulfur baths.",
        highlight: "360-degree views of glacial peaks from Rohtang Pass crest."
      },
      {
        day: 4,
        title: "Day Excursion to Parvati Valley & Kasol",
        theme: "Emerald Rivers & Conifer Treks",
        morning: "Scenic drive along the roaring Parvati River to Kasol, the bohemian capital of Himachal.",
        afternoon: "Short hike to the wooden hamlet of Chalal; lunch on authentic shakshuka and hummus at an Israeli cafe.",
        evening: "Stargazing and bonfire by the crystal-clear turquoise waters of the Parvati river.",
        highlight: "Listening to the roaring river while walking across a suspension footbridge."
      },
      {
        day: 5,
        title: "Manikaran Sahib Gurudwara & Naggar Castle",
        theme: "Spiritual Springs & Russian Art",
        morning: "Visit sacred Manikaran Sahib where langar food is cooked naturally in boiling geothermal springs.",
        afternoon: "Drive to Naggar Castle — 15th-century wood and stone palace with panoramic Beas river vistas.",
        evening: "Tour the Nicholas Roerich Art Gallery featuring ethereal Himalayan oil paintings; farewell riverside dinner.",
        highlight: "Standing on the wooden balcony of Naggar Castle overlooking apple orchards."
      },
      {
        day: 6,
        title: "Mall Road Souvenirs & Farewell Journey",
        theme: "Handicrafts & Mountain Farewell",
        morning: "Shop for Kullu wool shawls, hand-knitted socks, rhododendron jam, and local raw mountain honey.",
        afternoon: "Scenic drive back to Chandigarh / Delhi or flight from Bhuntar with refreshing mountain memories.",
        evening: "Arrival home refreshed and invigorated.",
        highlight: "Packing pure Himalayan honey and memories of snowy peaks."
      }
    ]
  },
  {
    id: "bali-temples-waterfalls",
    destination: "Bali",
    title: "Bali: Emerald Rice Terraces, Sacred Temples & Clifftop Sunsets",
    tagline: "Awaken to mist over Ubud's jungle valleys, catch golden sunsets over Uluwatu cliffs, and surf gentle waves in Seminyak.",
    theme: "international",
    themeLabel: "Tropical Island & Spiritual Wellness",
    themeIcon: "🌴",
    badgeColor: "bg-purple-500/10 text-purple-500 border-purple-500/30",
    days: 6,
    estimatedBudgetINR: 68000,
    budgetTier: "Moderate",
    vibe: "Tropical Zen & Adventure",
    bestSeason: "April – October",
    imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
    overview: "An enchanting 6-day journey across the Island of the Gods. Immerse yourself in the cultural heart of Ubud, witness dramatic Kecak fire dances atop 200-foot sea cliffs, and lounge in beachfront infinity pools.",
    highlights: [
      "Swing over the tiered green rice terraces of Tegallalang in Ubud",
      "Clifftop sunset and ancient Kecak fire dance performance at Uluwatu Temple",
      "Sunrise trek or 4x4 safari atop volcanic Mount Batur",
      "Sunset cocktails and infinity pool lounging at famous Seminyak beach clubs",
    ],
    recommendedHotels: [
      { name: "Maya Ubud Resort & Spa", tier: "luxury", price: "₹22,000/night", rating: 4.8 },
      { name: "Alila Seminyak", tier: "luxury", price: "₹28,000/night", rating: 4.9 },
      { name: "The Kayon Valley Resort", tier: "luxury", price: "₹19,000/night", rating: 4.8 },
    ],
    itinerary: [
      {
        day: 1,
        title: "Denpasar Arrival & Jungle Retreat Check-In",
        theme: "Welcome to the Island of the Gods",
        morning: "Land at Ngurah Rai International Airport (DPS) in Denpasar; private transfer through lush ravines to Ubud.",
        afternoon: "Check in to a private pool villa overlooking the Ayung River gorge; traditional frangipani welcome drink.",
        evening: "Stroll to Ubud Palace and dine on authentic Bebek Betutu (Balinese spiced slow-roasted duck).",
        highlight: "The calming orchestra of jungle cicadas and river waters from your private villa."
      },
      {
        day: 2,
        title: "Tegallalang Terraces, Sacred Monkeys & Waterfalls",
        theme: "Emerald Landscapes & Primate Sanctuaries",
        morning: "Early walk through the UNESCO-listed Tegallalang Rice Terraces; experience the famous jungle swing.",
        afternoon: "Encounter playful long-tailed macaques in the Sacred Monkey Forest Sanctuary.",
        evening: "Hike down to the cascading Tegenungan Waterfall; swim in the natural jungle pool.",
        highlight: "Flying high on the giant jungle swing over tiered emerald rice fields."
      },
      {
        day: 3,
        title: "Mount Batur Sunrise & Natural Volcanic Hot Springs",
        theme: "Volcanic Dawn & Geothermal Relaxation",
        morning: "4:00 AM 4x4 open-top jeep safari to Mount Batur viewpoint; watch the sunrise over Mount Agung.",
        afternoon: "Soak in volcanic thermal hot spring pools on the edge of Lake Batur with panoramic caldera views.",
        evening: "Visit a traditional coffee plantation to taste rich Balinese coffee and aromatic herbal infusions.",
        highlight: "Sipping hot coffee while clouds drift beneath your feet at Mount Batur caldera."
      },
      {
        day: 4,
        title: "Transfer to Seminyak & Sunset Beach Clubs",
        theme: "From Rainforest to Golden Sands",
        morning: "Scenic drive from the hills of Ubud down to the chic coastal strip of Seminyak.",
        afternoon: "Browse chic designer boutiques on Jalan Raya; relax on soft sands of Double Six Beach.",
        evening: "Sunset cocktails on daybeds at Potato Head Beach Club, accompanied by world-class ambient DJs.",
        highlight: "The iconic purple and orange sunset glowing across Seminyak's reflective tide lines."
      },
      {
        day: 5,
        title: "Clifftop Uluwatu & The Trance Kecak Fire Dance",
        theme: "Ocean Cliffs & Ancient Epics",
        morning: "Relaxing morning at your coastal resort; optional beginner surf lesson on gentle Kuta/Seminyak waves.",
        afternoon: "Drive to Bukit Peninsula to visit Uluwatu Temple perched 250 feet above crashing Indian Ocean waves.",
        evening: "Witness the legendary Kecak Fire Dance in the clifftop open amphitheater as the sun melts into the ocean.",
        highlight: "The rhythmic chanting of 70 performers during the dramatic Ramayana fire dance."
      },
      {
        day: 6,
        title: "Tanah Lot Temple & Farewell Journey",
        theme: "Sea Temples & Return Flight",
        morning: "Visit the offshore sea temple of Tanah Lot perched on an ocean rock formation.",
        afternoon: "Final souvenir shopping for Balinese batik, wooden carvings, and aromatic massage oils.",
        evening: "Airport transfer to DPS for your return flight home.",
        highlight: "Standing before Tanah Lot temple while waves crash against ancient black volcanic rocks."
      }
    ]
  },
  {
    id: "dubai-wonders-safari",
    destination: "Dubai",
    title: "Dubai: Futuristic Marvels, Desert Safari & Marina Lights",
    tagline: "Touch the sky from Burj Khalifa, glide down golden desert dunes, and cruise past illuminated skyscrapers.",
    theme: "international",
    themeLabel: "Futuristic Wonder & Desert Luxury",
    themeIcon: "✨",
    badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    days: 5,
    estimatedBudgetINR: 78000,
    budgetTier: "Luxury",
    vibe: "Futuristic & Luxury",
    bestSeason: "November – March",
    imageUrl: "/destinations/dubai.jpg",
    overview: "A showstopping 5-day escape into the city of the future. Experience ultra-modern architecture, heart-thumping red dune desert safaris, traditional spice souks, and private dinner cruises along Dubai Marina.",
    highlights: [
      "Ascend to the 124th floor observation deck of Burj Khalifa — world's tallest building",
      "Red-dune 4x4 desert safari with sandboarding, falconry, and BBQ banquet under stars",
      "Immersive journey through the 2071 exhibits at Museum of the Future",
      "Luxury dinner yacht cruise past the illuminated architectural skyline of Dubai Marina",
    ],
    recommendedHotels: [
      { name: "Address Downtown Dubai", tier: "luxury", price: "₹38,000/night", rating: 4.9 },
      { name: "Atlantis The Royal, Palm Jumeirah", tier: "luxury", price: "₹65,000/night", rating: 4.9 },
      { name: "Rove Downtown", tier: "comfort", price: "₹11,000/night", rating: 4.6 },
    ],
    itinerary: [
      {
        day: 1,
        title: "Burj Khalifa Sky Deck & Dubai Fountain Spectacle",
        theme: "Arrival in the City of Gold",
        morning: "Land at Dubai International Airport (DXB). Private chauffeur transfer to your downtown hotel.",
        afternoon: "Ascend high-speed elevator to the 124th floor of Burj Khalifa for breathtaking 360-degree city views.",
        evening: "Watch the world's largest choreographed Dubai Fountain show from a waterfront terrace; Mediterranean dinner.",
        highlight: "Gazing down upon the clouds and entire city from the Burj Khalifa observation deck."
      },
      {
        day: 2,
        title: "Museum of the Future & Old Dubai Heritage Souks",
        theme: "Future Horizons & Ancient Spice Routes",
        morning: "Explore the architectural marvel of Museum of the Future — journeying into space colonization and DNA vaults.",
        afternoon: "Cross to Old Dubai; ride a traditional 1-Dirham wooden Abra boat across the historic Dubai Creek.",
        evening: "Wander through the intoxicating aromas of the Spice Souk and dazzling window displays of the Gold Souk.",
        highlight: "The intricate Arabic calligraphy facade and futuristic interactive exhibits of Museum of the Future."
      },
      {
        day: 3,
        title: "Red Dune Desert Safari & Bedouin Starry Banquet",
        theme: "Thundering Dunes & Arabian Nights",
        morning: "Leisurely morning by the pool or indoor skiing at Mall of the Emirates Ski Dubai.",
        afternoon: "4x4 Land Cruiser pickup for high red-dune bashing in the Lahbab desert; sandboarding down towering dunes.",
        evening: "Traditional Bedouin camp: falconry show, henna tattoos, Tanoura spinning dance, and grand Arabian BBQ buffet.",
        highlight: "Watching the sun disappear over rolling crimson desert sand dunes."
      },
      {
        day: 4,
        title: "Palm Jumeirah & Dubai Marina Luxury Yacht Cruise",
        theme: "Man-Made Wonders & Marina Skylines",
        morning: "Ride the Palm Monorail to Atlantis The Palm; visit the Lost Chambers Aquarium and Aquaventure.",
        afternoon: "Walk along The Beach at JBR and see the towering Ain Dubai observation wheel.",
        evening: "Board a luxury yacht dinner cruise; glide through Dubai Marina canals flanked by illuminated towers.",
        highlight: "Cruising under starlit skies past the world's most dazzling illuminated modern skyline."
      },
      {
        day: 5,
        title: "Souk Madinat Jumeirah & Farewell Shopping",
        theme: "Canal Souks & Departure",
        morning: "Visit Souk Madinat Jumeirah; take an abra boat through indoor canals with postcard views of Burj Al Arab.",
        afternoon: "Final duty-free shopping at Dubai Mall or City Walk; Arabic dates and saffron souvenirs.",
        evening: "Airport transfer to DXB for your flight home with futuristic memories.",
        highlight: "A postcard photo with the sail-shaped Burj Al Arab from the Madinat canals."
      }
    ]
  }
];
