/**
 * Offline destination knowledge base for the keyless trip planner.
 * POI row: name|category|lat|lng|minutes|costInr(per person)|slot|crowd|outdoor(1/0)|tip|booking
 *   category: sightseeing|culture|food|leisure ; slot: morning|afternoon|evening|any
 * Costs are typical entry/experience prices (2025–26) and are shown to users as estimates.
 */
export interface Poi {
  name: string; category: "sightseeing" | "culture" | "food" | "leisure"; lat: number; lng: number; minutes: number; cost: number;
  slot: "morning" | "afternoon" | "evening" | "any"; crowd: "low" | "moderate" | "peak"; outdoor: boolean; tip: string; booking: "walk-in" | "3-7 days advance" | "30+ days required";
}
export interface DestinationKB { name: string; stays: [tier: string, area: string, minNight: number, maxNight: number][]; pois: Poi[]; dailyFood: [number, number]; localTransitPerDay: [number, number]; season: string }

const raw: Record<string, { stays: DestinationKB["stays"]; food: [number, number]; transit: [number, number]; season: string; pois: string }> = {
  goa: {
    stays: [["Budget guesthouse", "Anjuna / Vagator", 1500, 3000], ["Boutique Portuguese villa", "Fontainhas, Panaji", 4500, 8000], ["Beach resort", "Candolim / Sinquerim", 9000, 18000]],
    food: [800, 1800], transit: [600, 1500], season: "Nov–Feb dry season; Jun–Sep monsoon (rough seas, lush hinterland)",
    pois: `
Basilica of Bom Jesus & Old Goa churches|culture|15.5009|73.9116|120|0|morning|moderate|0|Arrive at 9 am before tour buses|walk-in
Fontainhas Latin Quarter walk|culture|15.4960|73.8340|90|0|morning|low|1|Best light for photos before 10 am|walk-in
Fort Aguada & lighthouse|sightseeing|15.4920|73.7737|75|50|evening|moderate|1|Golden hour views over Sinquerim|walk-in
Calangute–Baga beach stretch|leisure|15.5439|73.7553|150|0|afternoon|peak|1|Head north to Ashwem for quieter sand|walk-in
Anjuna flea market (Wednesdays)|food|15.5735|73.7400|120|500|afternoon|peak|1|Only on Wednesdays, bargain 30–40%|walk-in
Dudhsagar Falls jeep safari|sightseeing|15.3144|74.3143|360|1500|morning|moderate|1|Book jeep slot early; closed in peak monsoon|3-7 days advance
Sahakari spice farm lunch|food|15.4085|74.0110|150|900|afternoon|low|1|Includes Goan thali lunch|walk-in
Mandovi river sunset cruise|leisure|15.5004|73.8287|90|600|evening|moderate|1|Upper deck fills fast — board 20 min early|walk-in
Chapora Fort|sightseeing|15.6060|73.7362|60|0|evening|moderate|1|Steep 10-minute climb; carry water|walk-in
Goan fish-curry dinner at a Panaji tavern|food|15.4989|73.8278|90|900|evening|moderate|0|Try xacuti and bebinca|walk-in`,
  },
  jaipur: {
    stays: [["Heritage haveli guesthouse", "Old City", 2000, 4000], ["Boutique haveli", "Bani Park", 5000, 9000], ["Palace hotel", "Rambagh / Amer Road", 15000, 40000]],
    food: [700, 1600], transit: [500, 1200], season: "Oct–Mar pleasant; Apr–Jun very hot",
    pois: `
Amber Fort|sightseeing|26.9855|75.8513|180|500|morning|peak|1|Go at opening (8 am) to beat 2-hour queues|walk-in
Hawa Mahal|sightseeing|26.9239|75.8267|60|200|morning|peak|1|Best facade view from the café opposite|walk-in
City Palace|culture|26.9258|75.8237|120|700|afternoon|moderate|0|Composite ticket also covers Jantar Mantar|walk-in
Jantar Mantar observatory|culture|26.9248|75.8246|60|200|afternoon|moderate|1|Hire a guide; instruments make sense with context|walk-in
Nahargarh Fort sunset|sightseeing|26.9373|75.8155|120|200|evening|moderate|1|Leave 45 min before sunset; road is steep|walk-in
Johari & Bapu Bazaar|food|26.9196|75.8267|120|0|evening|peak|1|Fixed-price shops near Bapu Bazaar gate|walk-in
Albert Hall Museum|culture|26.9116|75.8195|90|300|afternoon|low|0|Lit up beautifully after 7 pm|walk-in
Rajasthani thali dinner|food|26.9124|75.7873|90|900|evening|moderate|0|Ask for unlimited refills of dal-baati-churma|walk-in
Panna Meena ka Kund stepwell|sightseeing|26.9877|75.8558|40|0|morning|low|1|Combine with Amber Fort|walk-in`,
  },
  kerala: {
    stays: [["Homestay", "Fort Kochi", 1800, 3500], ["Houseboat (1 night)", "Alleppey backwaters", 7000, 14000], ["Tea-estate resort", "Munnar", 6000, 15000]],
    food: [700, 1500], transit: [800, 2000], season: "Sep–Mar best; Jun–Aug heavy monsoon",
    pois: `
Fort Kochi Chinese fishing nets|sightseeing|9.9672|76.2420|60|0|evening|moderate|1|Sunset is the classic time|walk-in
Mattancherry Palace & Jew Town|culture|9.9580|76.2593|120|50|morning|moderate|0|Closed Fridays|walk-in
Kathakali performance|culture|9.9658|76.2421|90|500|evening|low|0|Arrive early to watch the make-up ritual|walk-in
Alleppey backwater shikara ride|leisure|9.4981|76.3388|180|1500|morning|moderate|1|Small shikaras reach narrow canals houseboats can't|walk-in
Munnar tea museum & estates|sightseeing|10.0889|77.0595|150|200|morning|moderate|1|Mist clears by 10 am|walk-in
Eravikulam National Park|sightseeing|10.1919|77.0880|180|200|morning|peak|1|Closed in calving season (Feb–Mar); book online|3-7 days advance
Kerala sadhya lunch on banana leaf|food|9.9312|76.2673|60|400|afternoon|moderate|0|Lunch-time only at most places|walk-in
Marari beach|leisure|9.6017|76.2980|150|0|afternoon|low|1|Quieter alternative to Kovalam|walk-in`,
  },
  varanasi: {
    stays: [["Ghat-side guesthouse", "Assi Ghat", 1500, 3500], ["Heritage riverside hotel", "Dashashwamedh", 6000, 15000]],
    food: [500, 1200], transit: [400, 1000], season: "Oct–Mar; Dev Deepawali (Nov) is spectacular but crowded",
    pois: `
Sunrise boat ride on the Ganga|leisure|25.3000|83.0107|90|600|morning|moderate|1|Start 5:30 am from Assi Ghat|walk-in
Kashi Vishwanath corridor|culture|25.3109|83.0107|120|0|morning|peak|0|No phones inside; use lockers|walk-in
Dashashwamedh Ghat Ganga Aarti|culture|25.3068|83.0105|90|0|evening|peak|1|Get a boat spot for the best view|walk-in
Sarnath stupa & museum|culture|25.3811|83.0245|150|300|afternoon|low|1|Museum closed Fridays|walk-in
Old city lanes food walk|food|25.3100|83.0090|120|500|evening|peak|1|Kachori-sabzi at breakfast, malaiyyo in winter|walk-in
Ramnagar Fort|sightseeing|25.2840|83.0279|90|200|afternoon|low|0|Across the river; take an e-rickshaw|walk-in
Banaras silk weaving workshop|culture|25.3250|83.0050|90|0|afternoon|low|0|Buy from cooperatives, not commission shops|walk-in`,
  },
  delhi: {
    stays: [["Budget hotel", "Paharganj", 1500, 3000], ["Boutique B&B", "Hauz Khas / GK", 4000, 8000], ["Luxury hotel", "Lutyens' Delhi / Aerocity", 10000, 25000]],
    food: [700, 1800], transit: [500, 1200], season: "Oct–Mar; Dec–Jan fog disrupts flights and trains",
    pois: `
Humayun's Tomb|sightseeing|28.5933|77.2507|90|600|morning|moderate|1|Morning light is best|walk-in
Qutub Minar|sightseeing|28.5245|77.1855|90|600|morning|moderate|1|Pay online for faster entry|walk-in
Old Delhi rickshaw & food walk|food|28.6562|77.2300|150|600|morning|peak|1|Paranthe Wali Gali opens ~9 am|walk-in
Red Fort|culture|28.6562|77.2410|90|600|afternoon|peak|1|Closed Mondays|walk-in
India Gate & Kartavya Path|sightseeing|28.6129|77.2295|60|0|evening|peak|1|Lit up after sunset|walk-in
National Museum|culture|28.6118|77.2194|120|650|afternoon|low|0|Closed Mondays|walk-in
Lodhi Garden walk|leisure|28.5931|77.2197|60|0|evening|low|1|Joggers' favourite; tombs inside|walk-in
Hauz Khas Village dinner|food|28.5535|77.1943|120|1200|evening|moderate|0|Lake-view tables fill by 8 pm|walk-in`,
  },
  mumbai: {
    stays: [["Budget hotel", "Colaba", 2500, 4500], ["Boutique hotel", "Bandra", 6000, 12000], ["Sea-facing luxury", "Marine Drive / Worli", 12000, 30000]],
    food: [900, 2000], transit: [600, 1500], season: "Nov–Feb; Jun–Sep monsoon floods local trains",
    pois: `
Gateway of India & Colaba Causeway|sightseeing|18.9220|72.8347|90|0|morning|peak|1|Early morning avoids crowds|walk-in
Elephanta Caves ferry|culture|18.9633|72.9315|240|700|morning|moderate|1|Last ferry back ~5:30 pm; closed Mondays|walk-in
Chhatrapati Shivaji Maharaj Vastu Sangrahalaya|culture|18.9269|72.8326|120|700|afternoon|low|0|Audio guide is excellent|walk-in
Marine Drive sunset|leisure|18.9440|72.8230|60|0|evening|moderate|1|Queen's Necklace view after dark|walk-in
Dharavi community tour|culture|19.0380|72.8538|150|1200|morning|low|1|Choose a community-run tour|3-7 days advance
Bandra Bandstand & Carter Road|leisure|19.0544|72.8205|90|0|evening|moderate|1|Street food at Carter Road|walk-in
Crawford Market & Mohammed Ali Road food|food|18.9474|72.8344|120|600|evening|peak|1|Ramzan nights are legendary|walk-in`,
  },
  agra: {
    stays: [["Budget hotel", "Taj Ganj", 1500, 3000], ["Taj-view hotel", "Fatehabad Road", 6000, 18000]],
    food: [600, 1400], transit: [500, 1200], season: "Oct–Mar; Taj closed Fridays",
    pois: `
Taj Mahal at sunrise|sightseeing|27.1751|78.0421|150|1300|morning|peak|1|East gate queue is shortest; closed Fridays|walk-in
Agra Fort|culture|27.1795|78.0211|120|650|morning|moderate|1|Taj view from Musamman Burj|walk-in
Mehtab Bagh sunset|leisure|27.1800|78.0430|60|300|evening|low|1|Taj across the Yamuna at dusk|walk-in
Itimad-ud-Daulah (Baby Taj)|culture|27.1928|78.0311|60|350|afternoon|low|1|Exquisite inlay, few crowds|walk-in
Fatehpur Sikri|sightseeing|27.0945|77.6679|180|650|afternoon|moderate|1|40 km away; go with a driver|walk-in
Mughlai dinner|food|27.1630|78.0400|90|900|evening|moderate|0|Try petha and bedai for breakfast|walk-in`,
  },
  srirangam: {
    stays: [["Pilgrim guesthouse", "South Chitra Street", 1200, 2500], ["Heritage hotel", "Rockfort area", 2800, 6000]],
    food: [400, 900], transit: [300, 800], season: "Nov–Mar; Vaikunta Ekadashi (Dec/Jan) has massive pilgrim footfalls",
    pois: `
Sri Ranganathaswamy Temple & Rajagopuram darshan|culture|10.8624|78.6901|180|0|morning|peak|0|Wear traditional dress; visit the 1000-pillar hall|walk-in
Amma Mandapam Cauvery river holy bathing ghats|culture|10.8530|78.6920|60|0|morning|moderate|1|Sacred rituals at sunrise|walk-in
Rockfort Ucchi Pillayar Temple climb|sightseeing|10.8282|78.6974|120|50|evening|moderate|1|437 steps carved in rock; sunset panoramic view|walk-in
Jambukeswarar Temple (Thiruvanaikaval water element)|culture|10.8532|78.7054|90|0|afternoon|low|0|Submerged Shivalinga in the inner sanctum|walk-in
Traditional Tamil filter coffee & prasadam tasting|food|10.8600|78.6900|45|150|morning|moderate|0|Try warm puliyodarai and ghee laddu|walk-in
Butterfly Park & Tropical Eco Garden|leisure|10.8800|78.6650|90|50|afternoon|low|1|Asia's largest butterfly conservatory|walk-in`,
  },
  madurai: {
    stays: [["Budget hotel near temple", "West Perumal Maistry St", 1500, 3000], ["Heritage boutique hotel", "Town Hall Road", 4000, 8500]],
    food: [500, 1200], transit: [400, 900], season: "Oct–Mar; Chithirai Festival (Apr/May) is grand but very hot",
    pois: `
Meenakshi Amman Temple complex & Ashta Shakti Mandapam|culture|9.9195|78.1193|180|0|morning|peak|0|No electronic devices allowed; cloakroom available|walk-in
Thirumalai Nayakkar Palace light & sound show|culture|9.9142|78.1242|90|100|evening|moderate|0|Indo-Saracenic giant stucco pillars|walk-in
Famous Madurai Murugan Idli & Jigarthanda drink|food|9.9160|78.1180|60|250|afternoon|peak|0|Famous cooling drink with almond gum and ice cream|walk-in
Gandhi Memorial Museum & Freedom Archive|culture|9.9328|78.1408|90|0|afternoon|low|0|Contains Gandhiji's blood-stained dhoti from 1948|walk-in
Puthu Mandapam 16th-century brass & textile bazaar|food|9.9190|78.1210|90|0|evening|moderate|0|Tailors stitching blouses inside stone pillar hall|walk-in
Alagar Kovil Vishnu hill shrine|sightseeing|10.0762|78.2144|120|0|morning|low|1|21 km north; natural mountain springs|walk-in`,
  },
  kanyakumari: {
    stays: [["Sea-view hotel", "Main Beach Road", 1800, 4000], ["Mid-range resort", "Kovalam Road", 4500, 9000]],
    food: [600, 1400], transit: [400, 900], season: "Oct–Mar; Chitra Pournami (Apr) moonrise and sunset simultaneously",
    pois: `
Vivekananda Rock Memorial & Thiruvalluvar Statue ferry|culture|8.0780|77.5550|150|70|morning|peak|1|Queue early for ferry; windy rock in the ocean|walk-in
Triveni Sangam sunrise & confluence darshan|sightseeing|8.0785|77.5530|60|0|morning|moderate|1|Meeting of Arabian Sea, Bay of Bengal & Indian Ocean|walk-in
Bhagavathy Amman 3000-year-old temple|culture|8.0776|77.5528|60|0|morning|moderate|0|Legendary diamond nose ring shining out to sea|walk-in
Sunset View Point & coastal promenade walk|leisure|8.0820|77.5450|90|0|evening|peak|1|Spectacular orange dusk over the ocean|walk-in
Padmanabhapuram Wooden Palace (half-day excursion)|sightseeing|8.2508|77.3275|180|150|afternoon|low|0|37 km north; exquisite Kerala rosewood architecture|walk-in
Gandhi Memorial Mandapam where urn was kept|culture|8.0792|77.5535|45|20|afternoon|low|0|Sun rays fall on exact urn spot on Oct 2nd|walk-in`,
  },
  rameswaram: {
    stays: [["Pilgrim hotel", "Near West Tower", 1500, 3200], ["Resort near beach", "Mukundarayar Chatram", 4000, 9000]],
    food: [500, 1100], transit: [500, 1200], season: "Oct–Apr pleasant coastal weather; Maha Shivratri peak",
    pois: `
Ramanathaswamy Temple & 22 sacred theertham bath|culture|9.2881|79.3174|180|25|morning|peak|0|World's longest carved pillared corridor; change of clothes needed|walk-in
Dhanushkodi ghost town & Arichal Munai land's end|sightseeing|9.1770|79.4180|240|0|morning|moderate|1|Ruins of 1964 cyclone; tip pointing toward Sri Lanka|walk-in
Agnitheertham sea shore ritual bath at dawn|culture|9.2890|79.3200|60|0|morning|moderate|1|Calm bay waters facing east|walk-in
Dr. APJ Abdul Kalam National Memorial & Museum|culture|9.2825|79.2940|60|0|afternoon|low|0|Tribute to India's People's President|walk-in
Historic Pamban Rail Bridge view from road bridge|sightseeing|9.2810|79.2000|60|0|evening|moderate|1|Cantilever railway bridge opening over ocean|walk-in
Ramar Patham footprint shrine on highest sand hill|sightseeing|9.3030|79.3130|45|0|evening|low|1|Panoramas of the entire Rameswaram island|walk-in`,
  },
  thiruvananthapuram: {
    stays: [["City hotel", "MG Road / Overbridge", 1800, 3800], ["Beach resort", "Kovalam", 4500, 12000]],
    food: [600, 1500], transit: [500, 1200], season: "Sep–Mar; Attukal Pongala in Feb/Mar",
    pois: `
Padmanabhaswamy Temple darshan & pond view|culture|8.4830|76.9436|120|0|morning|peak|0|Strict traditional dhoti/saree dress code|walk-in
Kovalam Lighthouse Beach & coastal walk|leisure|8.3988|76.9820|180|50|evening|moderate|1|Climb the 142-step lighthouse for panoramic coast view|walk-in
Napier Museum & Indo-Saracenic Art Gallery|culture|8.5085|76.9554|90|50|afternoon|low|0|Unique natural air-conditioning architecture; closed Mondays|walk-in
Chalai Market traditional bazaar walk & banana chips|food|8.4870|76.9510|90|300|evening|peak|1|Fresh hot coconut oil banana chips frying|walk-in
Shanghumukham Beach & giant Matsya Kanya sculpture|leisure|8.4795|76.9078|75|0|evening|moderate|1|Sunset beside Trivandrum international runway|walk-in`,
  },
  udaipur: {
    stays: [["Lakeside haveli", "Old City / Chandpole", 2500, 5000], ["Boutique palace stay", "Hanuman Ghat", 6000, 14000], ["Heritage lake luxury", "Lake Pichola", 25000, 75000]],
    food: [700, 1800], transit: [500, 1200], season: "Oct–Mar; monsoon (Jul–Aug) makes lakes overflow",
    pois: `
City Palace Udaipur & crystal gallery|culture|24.5764|73.6835|180|400|morning|peak|0|Rajasthan's largest palace complex; panoramic Lake Pichola view|walk-in
Lake Pichola sunset boat cruise to Jag Mandir|leisure|24.5720|73.6780|90|800|evening|peak|1|Best sunset views of Lake Palace and ghats|walk-in
Bagore Ki Haveli Rajasthani Dharohar folk dance show|culture|24.5790|73.6800|75|150|evening|peak|0|Dharohar dance at 7 pm; buy tickets at 5:30 pm|walk-in
Saheliyon-ki-Bari marble fountains & lotus pools|sightseeing|24.6030|73.6860|60|100|afternoon|low|1|Lush gardens built for the royal maidens|walk-in
Jagdish Temple 1651 carved stone shrine|culture|24.5794|73.6837|45|0|morning|moderate|0|Steep steps decorated with elephant carvings|walk-in
Sajjangarh Monsoon Palace hilltop sunset|sightseeing|24.5900|73.6370|90|200|evening|moderate|1|Perched on high hill; take shared jeep up|walk-in`,
  },
  ladakh: {
    stays: [["Ladakhi homestay", "Old Leh / Changspa", 1800, 4000], ["Boutique resort", "Shey / Choglamsar", 5000, 11000], ["Luxury desert camp", "Nubra Valley / Pangong", 6000, 16000]],
    food: [600, 1500], transit: [1500, 3500], season: "May–Sep; winters below -20°C with frozen Zanskar river",
    pois: `
Pangong Tso high-altitude salt lake|sightseeing|33.7595|78.6674|360|0|morning|moderate|1|Color-changing turquoise waters at 14,270 ft; inner line permit required|3-7 days advance
Thiksey Monastery morning prayer chant|culture|34.0583|77.6667|120|50|morning|moderate|0|Arrive at 6:30 am to hear deep horn trumpets and chants|walk-in
Nubra Valley & Hunder sand dunes double-humped camel|sightseeing|34.5800|77.4600|300|500|evening|moderate|1|Cold desert surrounded by snow peaks|3-7 days advance
Shanti Stupa sunset panorama over Leh valley|sightseeing|34.1700|77.5750|75|0|evening|moderate|1|White-domed Buddhist stupa inaugurated by Dalai Lama|walk-in
Khardung La world's highest motorable pass|sightseeing|34.2787|77.6047|60|0|morning|peak|1|17,982 ft pass; limit halt to 20 mins to prevent AMS|walk-in
Leh Palace & Old Town heritage walk|culture|34.1660|77.5860|90|100|afternoon|low|0|Tibetan Potala-style 17th century hill palace|walk-in`,
  },
  rishikesh: {
    stays: [["Ashram stay / guesthouse", "Tapovan", 1200, 2800], ["Riverfront boutique resort", "Shivpuri", 4500, 10000]],
    food: [500, 1200], transit: [400, 1000], season: "Sep–Nov & Feb–Apr; rafting closed in monsoon",
    pois: `
Parmarth Niketan & Triveni Ghat evening Ganga Aarti|culture|30.1200|78.3140|90|0|evening|peak|1|Chanting and floating diya lamps at sunset|walk-in
White-water rafting on the Ganga (16 km Shivpuri)|leisure|30.1360|78.3890|210|1000|morning|peak|1|Lifejacket and licensed guide mandatory|3-7 days advance
The Beatles Ashram (Chaurasi Kutia) graffiti walk|culture|30.1130|78.3120|120|150|morning|low|1|Transcendental meditation huts inside Rajaji Tiger Reserve|walk-in
Laxman Jhula & Ram Jhula suspension bridge walk|sightseeing|30.1280|78.3270|60|0|evening|moderate|1|Iconic suspension bridges over the turquoise river|walk-in
Neer Garh waterfall jungle hike|sightseeing|30.1450|78.3370|120|50|afternoon|low|1|Short hike through limestone stepped pools|walk-in
Ayurvedic yoga session & Sattvic cafe brunch|food|30.1300|78.3200|90|400|morning|low|0|Organic cafes overlooking the river|walk-in`,
  },
  amritsar: {
    stays: [["Heritage hotel near temple", "Heritage Street", 1800, 3800], ["Luxury hotel", "Mall Road", 5000, 12000]],
    food: [600, 1400], transit: [400, 900], season: "Oct–Mar; Baisakhi (Apr) is festive",
    pois: `
Golden Temple (Harmandir Sahib) & Palki Sahib ceremony|culture|31.6200|74.8765|180|0|morning|peak|0|Open 24 hours; night darshan with gold reflection in Amrit Sarovar|walk-in
Guru Ka Langar community kitchen service & dining|food|31.6190|74.8770|60|0|afternoon|peak|0|World's largest free kitchen serving 100,000 pilgrims daily|walk-in
Wagah Border beating retreat flag ceremony|culture|31.6045|74.5744|210|0|evening|peak|1|High-stepping military drill; arrive by 3:30 pm for good seats|walk-in
Jallianwala Bagh memorial garden & bullet marks|culture|31.6208|74.8794|60|0|morning|moderate|1|Historic martyrs' well and eternal flame|walk-in
Legendary Amritsari Kulcha breakfast with chole & lassi|food|31.6250|74.8700|60|200|morning|peak|0|Crisp tandoori layered kulcha smothered in makkhan|walk-in
Gobindgarh Fort & Punjab heritage cultural show|sightseeing|31.6270|74.8580|120|150|evening|low|0|18th century fort restored with light show and martial arts|walk-in`,
  },
  hampi: {
    stays: [["Heritage guesthouse", "Hampi Bazaar", 1200, 2800], ["Boutique resort", "Kamalapur / Sanapur", 3500, 8000]],
    food: [500, 1100], transit: [500, 1100], season: "Oct–Feb cool; Hampi Utsav in Nov",
    pois: `
Virupaksha Temple 7th-century active shrine|culture|15.3350|76.4600|90|50|morning|moderate|0|Meet Lakshmi the temple elephant; active worship since 7th century|walk-in
Vijaya Vittala Temple & iconic Stone Chariot|sightseeing|15.3400|76.4750|150|600|morning|peak|1|Famous 56 musical pillars; electric buggy available|walk-in
Matanga Hill sunrise panoramic view over boulders|sightseeing|15.3320|76.4680|90|0|morning|moderate|1|Steep 30-min climb; best 360-degree sunrise view of Hampi ruins|walk-in
Tungabhadra coracle round-boat ride on the river|leisure|15.3370|76.4620|60|300|afternoon|low|1|Circular woven boat drifting past ancient boulder ghats|walk-in
Lotus Mahal & Elephant Stables royal enclosure|culture|15.3200|76.4710|90|600|afternoon|moderate|1|Indo-Islamic secular architecture for Vijayanagara queens|walk-in
Hippie Island Sanapur lake cliff jump & sunset|leisure|15.3550|76.4650|120|0|evening|low|1|Relaxed boulder landscape across the river|walk-in`,
  },
  ooty: {
    stays: [["Colonial heritage bungalow", "Club Road", 3000, 7000], ["Tea estate cottage", "Kotagiri / Coonoor", 4500, 10000]],
    food: [600, 1400], transit: [600, 1400], season: "Mar–Jun summer; Sep–Nov lush post-monsoon",
    pois: `
Nilgiri Mountain Railway UNESCO toy train ride|sightseeing|11.4060|76.7030|180|250|morning|peak|1|Steam locomotive crawling over viaducts and tea slopes|30+ days required
Government Botanical Gardens & Italian Garden|leisure|11.4170|76.7110|90|50|afternoon|peak|1|55-acre garden founded in 1848; 20-million-year-old fossil tree|walk-in
Doddabetta Peak summit view (8,650 ft)|sightseeing|11.4010|76.7370|90|30|morning|moderate|1|Highest mountain in the Nilgiris; telescope house|walk-in
Dolphin's Nose viewpoint & Catherine Falls (Coonoor)|sightseeing|11.3400|76.8200|120|50|morning|low|1|Stunning view of deep gorges and tea carpeted hills|walk-in
Fresh homemade chocolate & Nilgiri tea tasting|food|11.4100|76.7050|45|200|evening|moderate|0|Try fudge, dark chocolate truffles, and white tea|walk-in
Pykara Lake speedboating & cascading waterfall|leisure|11.4800|76.6000|120|300|afternoon|low|1|21 km from town; sacred river to the Toda tribe|walk-in`,
  },
  dubai: {
    stays: [["Budget hotel", "Deira / Bur Dubai", 5000, 9000], ["Mid-range", "Downtown / Business Bay", 10000, 20000], ["Beach resort", "JBR / Palm", 22000, 60000]],
    food: [2500, 5000], transit: [1200, 3000], season: "Nov–Mar; Jun–Sep 40°C+ heat",
    pois: `
Burj Khalifa At the Top|sightseeing|25.1972|55.2744|90|4200|evening|peak|0|Book sunset slot weeks ahead|30+ days required
Dubai Mall & fountain show|leisure|25.1985|55.2796|150|0|evening|peak|0|Fountain every 30 min after 6 pm|walk-in
Al Fahidi & abra crossing to the souks|culture|25.2637|55.2972|150|50|morning|moderate|1|Abra ride costs 1 AED|walk-in
Desert safari with dinner|leisure|24.9500|55.6000|360|4500|afternoon|moderate|1|Pickup ~3 pm; skip dune bashing if motion-sick|3-7 days advance
Museum of the Future|culture|25.2192|55.2820|120|3400|afternoon|moderate|0|Timed tickets sell out|3-7 days advance
JBR beach & The Walk|leisure|25.0780|55.1340|120|0|morning|moderate|1|Go before 11 am in summer|walk-in
Global Village (Oct–Apr)|food|25.0697|55.3060|180|600|evening|peak|1|Seasonal; weekends very busy|walk-in`,
  },
  bangkok: {
    stays: [["Budget hostel", "Khao San", 1500, 3500], ["Mid-range", "Sukhumvit", 4500, 9000], ["Riverside luxury", "Chao Phraya", 12000, 30000]],
    food: [1000, 2500], transit: [600, 1500], season: "Nov–Feb cool & dry; May–Oct monsoon showers",
    pois: `
Grand Palace & Wat Phra Kaew|culture|13.7500|100.4913|150|1250|morning|peak|1|Dress code: covered shoulders & knees|walk-in
Wat Pho reclining Buddha|culture|13.7465|100.4930|90|500|morning|moderate|0|Thai massage school on site|walk-in
Wat Arun at sunset|sightseeing|13.7437|100.4888|60|250|evening|moderate|1|View it from across the river at dusk|walk-in
Chao Phraya express boat|leisure|13.7400|100.5100|60|50|afternoon|moderate|1|Orange-flag boat is cheapest|walk-in
Chatuchak weekend market|food|13.7999|100.5500|180|800|morning|peak|1|Weekends only; go before noon heat|walk-in
Yaowarat (Chinatown) street food|food|13.7400|100.5100|120|800|evening|peak|1|Stalls open after 6 pm|walk-in
Jim Thompson House|culture|13.7491|100.5283|75|1000|afternoon|low|0|Guided tours every 30 min|walk-in`,
  },
  singapore: {
    stays: [["Budget hotel", "Little India / Bugis", 6000, 10000], ["Mid-range", "Clarke Quay", 10000, 18000], ["Marina luxury", "Marina Bay", 25000, 60000]],
    food: [2000, 4500], transit: [800, 1800], season: "Year-round; Nov–Jan wettest",
    pois: `
Gardens by the Bay & Supertree show|sightseeing|1.2816|103.8636|150|1800|evening|peak|1|Garden Rhapsody at 7:45 & 8:45 pm|walk-in
Marina Bay Sands SkyPark|sightseeing|1.2834|103.8607|60|2000|evening|peak|0|Book sunset slot online|3-7 days advance
Hawker dinner at Lau Pa Sat|food|1.2806|103.8504|90|700|evening|moderate|1|Satay street opens 7 pm|walk-in
Sentosa & Universal Studios|leisure|1.2540|103.8238|420|5500|morning|peak|1|Weekdays are far quieter|3-7 days advance
Chinatown heritage walk|culture|1.2830|103.8440|120|0|morning|moderate|1|Buddha Tooth Relic Temple is free|walk-in
Singapore Botanic Gardens|leisure|1.3138|103.8159|120|0|morning|low|1|Orchid garden is ticketed|walk-in
Little India & Tekka Centre|food|1.3066|103.8518|120|600|afternoon|moderate|1|Biryani and teh tarik|walk-in`,
  },
  paris: {
    stays: [["Budget hotel", "Montmartre", 9000, 14000], ["Boutique hotel", "Le Marais", 15000, 28000], ["Luxury", "Saint-Germain", 30000, 80000]],
    food: [3000, 6500], transit: [800, 1600], season: "Apr–Jun & Sep–Oct; Aug many shops closed",
    pois: `
Eiffel Tower summit|sightseeing|48.8584|2.2945|150|2700|morning|peak|1|Book summit tickets 30+ days ahead|30+ days required
Louvre Museum|culture|48.8606|2.3376|210|2000|morning|peak|0|Timed entry; use Carrousel entrance|3-7 days advance
Seine river cruise|leisure|48.8600|2.3100|60|1500|evening|moderate|1|Night cruise for illuminated monuments|walk-in
Montmartre & Sacré-Cœur|culture|48.8867|2.3431|150|0|morning|moderate|1|Climb before 10 am for empty steps|walk-in
Musée d'Orsay|culture|48.8600|2.3266|150|1500|afternoon|moderate|0|Thursday late opening|3-7 days advance
Le Marais food & falafel walk|food|48.8575|2.3580|120|1500|afternoon|moderate|1|Rue des Rosiers falafel queue moves fast|walk-in
Sainte-Chapelle|culture|48.8554|2.3450|60|1200|afternoon|moderate|0|Sunny afternoons light the glass|3-7 days advance`,
  },
  london: {
    stays: [["Budget hotel", "King's Cross", 9000, 15000], ["Mid-range", "South Kensington", 15000, 28000], ["Luxury", "Mayfair", 35000, 90000]],
    food: [3000, 6000], transit: [1200, 2000], season: "May–Sep; winter short days",
    pois: `
Tower of London & Crown Jewels|culture|51.5081|-0.0759|180|3400|morning|peak|0|Head to the jewels first at opening|3-7 days advance
British Museum|culture|51.5194|-0.1270|180|0|morning|moderate|0|Free; book a slot in peak season|walk-in
Westminster, Big Ben & the Abbey|sightseeing|51.4994|-0.1273|120|3000|morning|peak|1|Abbey closed to tourists on Sundays|3-7 days advance
South Bank walk & Borough Market|food|51.5055|-0.0910|150|1500|afternoon|peak|1|Borough Market closed Mondays (partial)|walk-in
West End show|leisure|51.5115|-0.1281|180|6000|evening|moderate|0|Day-of lottery tickets via official apps|3-7 days advance
Hyde Park & Kensington Gardens|leisure|51.5073|-0.1657|90|0|afternoon|low|1|Rent a Santander bike|walk-in`,
  },
  tokyo: {
    stays: [["Business hotel", "Ueno / Asakusa", 6000, 11000], ["Mid-range", "Shinjuku", 11000, 20000], ["Luxury", "Marunouchi / Ginza", 30000, 80000]],
    food: [2500, 5000], transit: [900, 1800], season: "Mar–May (sakura) & Oct–Nov; Jun rainy, Aug hot",
    pois: `
Senso-ji temple, Asakusa|culture|35.7148|139.7967|90|0|morning|peak|1|Before 8 am it's nearly empty|walk-in
Tsukiji outer market breakfast|food|35.6655|139.7707|90|1500|morning|peak|1|Most stalls close by 2 pm|walk-in
Meiji Jingu shrine|culture|35.6764|139.6993|75|0|morning|moderate|1|Weekend weddings if you're lucky|walk-in
Shibuya crossing & Shibuya Sky|sightseeing|35.6595|139.7005|120|1300|evening|peak|1|Book Shibuya Sky sunset slot early|3-7 days advance
teamLab Planets|leisure|35.6457|139.7863|120|2200|afternoon|peak|0|Timed tickets; wear shorts (you wade in water)|3-7 days advance
Shinjuku Omoide Yokocho dinner|food|35.6938|139.6995|90|2000|evening|peak|0|Tiny yakitori bars, cash only|walk-in
Ueno Park & Tokyo National Museum|culture|35.7188|139.7765|150|600|afternoon|moderate|0|Closed Mondays|walk-in`,
  },
  "new york": {
    stays: [["Budget hotel", "Midtown West", 14000, 22000], ["Boutique", "Lower East Side", 20000, 35000], ["Luxury", "Central Park South", 45000, 120000]],
    food: [4500, 9000], transit: [1000, 2000], season: "Apr–Jun & Sep–Nov",
    pois: `
Statue of Liberty & Ellis Island|sightseeing|40.6892|-74.0445|240|2100|morning|peak|1|Pedestal/crown tickets sell out weeks ahead|30+ days required
Central Park walk|leisure|40.7829|-73.9654|120|0|morning|moderate|1|Enter at 72nd St for Bethesda Terrace|walk-in
The Met|culture|40.7794|-73.9632|180|2500|afternoon|moderate|0|Rooftop garden in summer|walk-in
Top of the Rock at sunset|sightseeing|40.7587|-73.9787|60|3500|evening|peak|1|Sunset slots carry a premium|3-7 days advance
Brooklyn Bridge walk & DUMBO|sightseeing|40.7061|-73.9969|90|0|morning|moderate|1|Walk from Brooklyn towards Manhattan for skyline views|walk-in
Broadway show|leisure|40.7590|-73.9845|180|9000|evening|moderate|0|TKTS booth for same-day discounts|3-7 days advance
Chelsea Market & High Line|food|40.7424|-74.0060|150|2000|afternoon|peak|1|Walk the High Line north to Hudson Yards|walk-in`,
  },
  bali: {
    stays: [["Guesthouse", "Ubud", 2500, 5000], ["Pool villa", "Seminyak", 7000, 15000], ["Cliff-top resort", "Uluwatu", 15000, 40000]],
    food: [1200, 3000], transit: [1000, 2500], season: "Apr–Oct dry; Nov–Mar wet",
    pois: `
Tegallalang rice terraces|sightseeing|-8.4312|115.2793|120|300|morning|peak|1|Before 8 am for photos without crowds|walk-in
Sacred Monkey Forest, Ubud|leisure|-8.5188|115.2585|90|500|morning|moderate|1|Keep sunglasses and snacks out of sight|walk-in
Uluwatu temple & Kecak dance|culture|-8.8291|115.0849|150|1200|evening|peak|1|Kecak at sunset — arrive by 5 pm|walk-in
Tanah Lot temple|culture|-8.6212|115.0868|90|400|evening|peak|1|Low tide lets you walk to the base|walk-in
Mount Batur sunrise trek|sightseeing|-8.2420|115.3750|360|3500|morning|moderate|1|2 am pickup; guide mandatory|3-7 days advance
Seminyak beach clubs|leisure|-8.6913|115.1569|180|2000|afternoon|moderate|1|Sunset is peak|walk-in
Ubud art market & Balinese dinner|food|-8.5069|115.2625|120|900|evening|moderate|0|Try babi guling or nasi campur|walk-in`,
  },
};

function parsePois(block: string): Poi[] {
  return block.trim().split("\n").map((l) => {
    const [name, category, lat, lng, minutes, cost, slot, crowd, outdoor, tip, booking] = l.split("|");
    return { name, category: category as Poi["category"], lat: +lat, lng: +lng, minutes: +minutes, cost: +cost, slot: slot as Poi["slot"], crowd: crowd as Poi["crowd"], outdoor: outdoor === "1", tip, booking: booking as Poi["booking"] };
  });
}

export const KB: Record<string, DestinationKB> = Object.fromEntries(
  Object.entries(raw).map(([k, v]) => [k, { name: k.replace(/\b\w/g, (c) => c.toUpperCase()), stays: v.stays, pois: parsePois(v.pois), dailyFood: v.food, localTransitPerDay: v.transit, season: v.season }]),
);

export const KB_ALIASES: Record<string, string> = {
  "new delhi": "delhi", kochi: "kerala", cochin: "kerala", munnar: "kerala", alleppey: "kerala", alappuzha: "kerala", trivandrum: "thiruvananthapuram",
  banaras: "varanasi", benares: "varanasi", kashi: "varanasi", bombay: "mumbai", panaji: "goa", denpasar: "bali", ubud: "bali", nyc: "new york",
  srirangam: "srirangam", trichy: "srirangam", tiruchirappalli: "srirangam",
  madurai: "madurai",
  kanyakumari: "kanyakumari", cape_comorin: "kanyakumari",
  rameswaram: "rameswaram", rameshwaram: "rameswaram",
  thiruvananthapuram: "thiruvananthapuram",
  udaipur: "udaipur",
  leh: "ladakh", ladakh: "ladakh", nubra: "ladakh", pangong: "ladakh",
  rishikesh: "rishikesh", haridwar: "rishikesh",
  amritsar: "amritsar",
  hampi: "hampi",
  ooty: "ooty", udhagamandalam: "ooty", coonoor: "ooty",
};
