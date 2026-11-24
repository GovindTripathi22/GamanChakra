/**
 * Offline destination knowledge base for the keyless trip planner.
 * POI row: name|category|lat|lng|minutes|costInr(per person)|slot|crowd|outdoor(1/0)|tip|booking
 *   category: sightseeing|culture|food|leisure ; slot: morning|afternoon|evening|any
 * Costs are typical entry/experience prices (2025–26) and are shown to users as estimates.
 */
export interface Poi {
  name: string; category: "sightseeing" | "culture" | "food" | "leisure"; lat: number; lng: number; minutes: number; cost: number;
  slot: "morning" | "afternoon" | "evening" | "any"; crowd: "low" | "moderate" | "peak"; outdoor: boolean; tip: string; booking: "walk-in" | "3-7 days advance" | "30+ days required";
  ticketPrice?: string;
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
Amber Fort|sightseeing|26.9855|75.8513|180|100|morning|peak|1|Go at opening (8 am) to beat 2-hour queues (₹100 Indian / ₹500 Foreigner)|walk-in|₹100 (Indian) / ₹500 (Foreigner)
Hawa Mahal|sightseeing|26.9239|75.8267|60|50|morning|peak|1|Best facade view from the café opposite (₹50 Indian / ₹200 Foreigner)|walk-in|₹50 (Indian) / ₹200 (Foreigner)
City Palace|culture|26.9258|75.8237|120|300|afternoon|moderate|0|Courtyard entry ₹300 / Museum composite ₹700|walk-in|₹300 (Courtyard) / ₹700 (Museum)
Jantar Mantar observatory|culture|26.9248|75.8246|60|50|afternoon|moderate|1|Hire a guide; instruments make sense with context (₹50 Indian / ₹200 Foreigner)|walk-in|₹50 (Indian) / ₹200 (Foreigner)
Nahargarh Fort sunset|sightseeing|26.9373|75.8155|120|50|evening|moderate|1|Leave 45 min before sunset; road is steep (₹50 Indian / ₹200 Foreigner)|walk-in|₹50 (Indian) / ₹200 (Foreigner)
Johari & Bapu Bazaar|food|26.9196|75.8267|120|0|evening|peak|1|Fixed-price shops near Bapu Bazaar gate|walk-in|Free
Albert Hall Museum|culture|26.9116|75.8195|90|100|afternoon|low|0|Lit up beautifully after 7 pm (₹100 Indian / ₹300 Foreigner)|walk-in|₹100 (Indian) / ₹300 (Foreigner)
Rajasthani thali dinner|food|26.9124|75.7873|90|900|evening|moderate|0|Ask for unlimited refills of dal-baati-churma|walk-in|Free Entry (~₹600–₹1,000 for dinner)
Panna Meena ka Kund stepwell|sightseeing|26.9877|75.8558|40|0|morning|low|1|Combine with Amber Fort|walk-in|Free`,
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
Sunrise boat ride on the Ganga|leisure|25.3000|83.0107|90|600|morning|moderate|1|Start 5:30 am from Assi Ghat|walk-in|₹600
Kashi Vishwanath corridor|culture|25.3109|83.0107|120|0|morning|peak|0|No phones inside; use lockers|walk-in|Free
Dashashwamedh Ghat Ganga Aarti|culture|25.3068|83.0105|90|0|evening|peak|1|Get a boat spot for the best view|walk-in|Free
Sarnath stupa & museum|culture|25.3811|83.0245|150|25|afternoon|low|1|Museum closed Fridays (₹25 Indian / ₹300 Foreigner)|walk-in|₹25 (Indian) / ₹300 (Foreigner)
Old city lanes food walk|food|25.3100|83.0090|120|300|evening|peak|1|Kachori-sabzi at breakfast, malaiyyo in winter|walk-in|Free Entry (~₹200–₹350 for street food tastings)
Ramnagar Fort|sightseeing|25.2840|83.0279|90|75|afternoon|low|0|Across the river; take an e-rickshaw|walk-in|₹75
Banaras silk weaving workshop|culture|25.3250|83.0050|90|0|afternoon|low|0|Buy from cooperatives, not commission shops|walk-in|Free`,
  },
  delhi: {
    stays: [["Budget hotel", "Paharganj", 1500, 3000], ["Boutique B&B", "Hauz Khas / GK", 4000, 8000], ["Luxury hotel", "Lutyens' Delhi / Aerocity", 10000, 25000]],
    food: [700, 1800], transit: [500, 1200], season: "Oct–Mar; Dec–Jan fog disrupts flights and trains",
    pois: `
Humayun's Tomb|sightseeing|28.5933|77.2507|90|50|morning|moderate|1|Morning light is best (₹50 Indian / ₹550 Foreigner)|walk-in|₹50 (Indian) / ₹550 (Foreigner)
Qutub Minar|sightseeing|28.5245|77.1855|90|50|morning|moderate|1|Pay online for faster entry (₹50 Indian / ₹550 Foreigner)|walk-in|₹50 (Indian) / ₹550 (Foreigner)
Old Delhi rickshaw & food walk|food|28.6562|77.2300|150|350|morning|peak|1|Paranthe Wali Gali opens ~9 am|walk-in|Free Entry (~₹250–₹400 for street food tastings)
Red Fort|culture|28.6562|77.2410|90|50|afternoon|peak|1|Closed Mondays (₹50 Indian / ₹550 Foreigner)|walk-in|₹50 (Indian) / ₹550 (Foreigner)
India Gate & Kartavya Path|sightseeing|28.6129|77.2295|60|0|evening|peak|1|Lit up after sunset|walk-in|Free
National Museum|culture|28.6118|77.2194|120|20|afternoon|low|0|Closed Mondays (₹20 Indian / ₹650 Foreigner)|walk-in|₹20 (Indian) / ₹650 (Foreigner)
Lodhi Garden walk|leisure|28.5931|77.2197|60|0|evening|low|1|Joggers' favourite; tombs inside|walk-in|Free
Hauz Khas Village dinner|food|28.5535|77.1943|120|1200|evening|moderate|0|Lake-view tables fill by 8 pm|walk-in|Free Entry (~₹800–₹1,500 for dinner)`,
  },
  mumbai: {
    stays: [["Budget hotel", "Colaba", 2500, 4500], ["Boutique hotel", "Bandra", 6000, 12000], ["Sea-facing luxury", "Marine Drive / Worli", 12000, 30000]],
    food: [900, 2000], transit: [600, 1500], season: "Nov–Feb; Jun–Sep monsoon floods local trains",
    pois: `
Gateway of India & Colaba Causeway|sightseeing|18.9220|72.8347|90|0|morning|peak|1|Early morning avoids crowds|walk-in|Free
Elephanta Caves ferry|culture|18.9633|72.9315|240|260|morning|moderate|1|Last ferry back ~5:30 pm; closed Mondays|walk-in|₹260 (Ferry & Cave Entry)
Chhatrapati Shivaji Maharaj Vastu Sangrahalaya|culture|18.9269|72.8326|120|150|afternoon|low|0|Audio guide is excellent (₹150 Indian / ₹700 Foreigner)|walk-in|₹150 (Indian) / ₹700 (Foreigner)
Marine Drive sunset|leisure|18.9440|72.8230|60|0|evening|moderate|1|Queen's Necklace view after dark|walk-in|Free
Dharavi community tour|culture|19.0380|72.8538|150|800|morning|low|1|Choose a community-run tour|3-7 days advance|₹800 (Guided Tour)
Bandra Bandstand & Carter Road|leisure|19.0544|72.8205|90|0|evening|moderate|1|Street food at Carter Road|walk-in|Free
Crawford Market & Mohammed Ali Road food|food|18.9474|72.8344|120|350|evening|peak|1|Ramzan nights are legendary|walk-in|Free Entry (~₹250–₹500 for street food tastings)`,
  },
  agra: {
    stays: [["Budget hotel", "Taj Ganj", 1500, 3000], ["Taj-view hotel", "Fatehabad Road", 6000, 18000]],
    food: [600, 1400], transit: [500, 1200], season: "Oct–Mar; Taj closed Fridays",
    pois: `
Taj Mahal at sunrise|sightseeing|27.1751|78.0421|150|50|morning|peak|1|East gate queue is shortest; closed Fridays (₹50 Indian / ₹1,100 Foreigner)|walk-in|₹50 (Indian) / ₹1,100 (Foreigner)
Agra Fort|culture|27.1795|78.0211|120|50|morning|moderate|1|Taj view from Musamman Burj (₹50 Indian / ₹550 Foreigner)|walk-in|₹50 (Indian) / ₹550 (Foreigner)
Mehtab Bagh sunset|leisure|27.1800|78.0430|60|25|evening|low|1|Taj across the Yamuna at dusk (₹25 Indian / ₹300 Foreigner)|walk-in|₹25 (Indian) / ₹300 (Foreigner)
Itimad-ud-Daulah (Baby Taj)|culture|27.1928|78.0311|60|30|afternoon|low|1|Exquisite inlay, few crowds (₹30 Indian / ₹310 Foreigner)|walk-in|₹30 (Indian) / ₹310 (Foreigner)
Fatehpur Sikri|sightseeing|27.0945|77.6679|180|50|afternoon|moderate|1|40 km away; go with a driver (₹50 Indian / ₹550 Foreigner)|walk-in|₹50 (Indian) / ₹550 (Foreigner)
Mughlai dinner|food|27.1630|78.0400|90|900|evening|moderate|0|Try petha and bedai for breakfast|walk-in|Free Entry (~₹600–₹1,000 for dinner)`,
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
    stays: [["Backpacker hostel dorm", "Upper Changspa / Old Leh", 450, 850], ["Ladakhi homestay", "Old Leh / Changspa", 1800, 4000], ["Boutique resort", "Shey / Choglamsar", 5000, 11000], ["Luxury desert camp", "Nubra Valley / Pangong", 6000, 16000]],
    food: [600, 1500], transit: [1500, 3500], season: "May–Sep; winters below -20°C with frozen Zanskar river",
    pois: `
Pangong Tso high-altitude salt lake|sightseeing|33.7595|78.6674|360|0|morning|moderate|1|Color-changing turquoise waters at 14,270 ft; inner line permit required|3-7 days advance|Free (Inner Line Permit ~₹400–₹600)
Thiksey Monastery morning prayer chant|culture|34.0583|77.6667|120|50|morning|moderate|0|Arrive at 6:30 am to hear deep horn trumpets and chants|walk-in|₹50
Nubra Valley & Hunder sand dunes double-humped camel|sightseeing|34.5800|77.4600|300|300|evening|moderate|1|Cold desert surrounded by snow peaks; camel ride ₹300 for 15 mins|3-7 days advance|Free Entry (~₹300 for Bactrian camel ride)
Shanti Stupa sunset panorama over Leh valley|sightseeing|34.1700|77.5750|75|0|evening|moderate|1|White-domed Buddhist stupa inaugurated by Dalai Lama|walk-in|Free
Khardung La world's highest motorable pass|sightseeing|34.2787|77.6047|60|0|morning|peak|1|17,982 ft pass; limit halt to 20 mins to prevent AMS|walk-in|Free
Leh Palace & Old Town heritage walk|culture|34.1660|77.5860|90|50|afternoon|low|0|Tibetan Potala-style 17th century hill palace (₹50 Indian / ₹300 Foreigner)|walk-in|₹50 (Indian) / ₹300 (Foreigner)
Hemis Monastery & museum treasures|culture|33.9126|77.7067|120|100|afternoon|low|0|Largest and wealthiest monastery in Ladakh with gilded statues|walk-in|₹100 (Monastery & Museum)
Tibetan Kitchen traditional Ladakhi skyu & tingmo dinner|food|34.1640|77.5840|90|400|evening|moderate|0|Hearty winter stew, steamed tingmo bread, and yak butter tea|walk-in|Free Entry (~₹300–₹550 for dinner)`,
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
    stays: [["Backpacker hostel dorm", "Sanapur / Hampi Bazaar", 450, 850], ["Heritage guesthouse", "Hampi Bazaar", 1200, 2800], ["Boutique resort", "Kamalapur / Sanapur", 3500, 8000]],
    food: [500, 1100], transit: [500, 1100], season: "Oct–Feb cool; Hampi Utsav in Nov",
    pois: `
Virupaksha Temple 7th-century active shrine|culture|15.3350|76.4600|90|50|morning|moderate|0|Active worship since 7th century; ₹50 for inner sanctum entry|walk-in|Free (General) / ₹50 (Inner Sanctum)
Vijaya Vittala Temple & iconic Stone Chariot|sightseeing|15.3400|76.4750|150|50|morning|peak|1|Famous 56 musical pillars; composite ASI ticket covers Lotus Mahal|walk-in|₹50 (Indian) / ₹550 (Foreigner)
Matanga Hill sunrise panoramic view over boulders|sightseeing|15.3320|76.4680|90|0|morning|moderate|1|Steep 30-min climb; best 360-degree sunrise view of Hampi ruins|walk-in|Free
Tungabhadra coracle round-boat ride on the river|leisure|15.3370|76.4620|60|300|afternoon|low|1|Circular woven boat drifting past ancient boulder ghats|walk-in|₹300 (per person boat ride)
Lotus Mahal & Elephant Stables royal enclosure|culture|15.3200|76.4710|90|50|afternoon|moderate|1|Indo-Islamic secular architecture; same ASI ticket as Vittala|walk-in|₹50 (Indian) / ₹550 (Foreigner)
Hippie Island Sanapur lake cliff jump & sunset|leisure|15.3550|76.4650|120|0|evening|low|1|Relaxed boulder landscape across the river; cliff jumping into lake|walk-in|Free
Hampi Bazaar street food & mango tree cafe walk|food|15.3355|76.4610|90|250|evening|moderate|0|Banana flower curry, south Indian filter coffee and thali|walk-in|Free Entry (~₹200–₹350 for food tastings)
Anjaneya Hill (Monkey Temple) sunset climb|sightseeing|15.3560|76.4720|120|0|evening|peak|1|Birthplace of Hanuman; 575 whitewashed stone steps with panoramic sunset|walk-in|Free`,
  },
  ooty: {
    stays: [["Heritage backpacker hostel dorm", "Fern Hill / Sheddon Road", 450, 850], ["Colonial heritage bungalow", "Club Road", 3000, 7000], ["Tea estate cottage", "Kotagiri / Coonoor", 4500, 10000]],
    food: [600, 1400], transit: [600, 1400], season: "Mar–Jun summer; Sep–Nov lush post-monsoon",
    pois: `
Nilgiri Mountain Railway UNESCO toy train ride|sightseeing|11.4060|76.7030|180|250|morning|peak|1|Steam locomotive crawling over viaducts and tea slopes|30+ days required|₹250 (Second Class) / ₹600 (First Class)
Government Botanical Gardens & Italian Garden|leisure|11.4170|76.7110|90|50|afternoon|peak|1|55-acre garden founded in 1848; 20-million-year-old fossil tree|walk-in|₹50
Doddabetta Peak summit view (8,650 ft)|sightseeing|11.4010|76.7370|90|30|morning|moderate|1|Highest mountain in the Nilgiris; telescope house|walk-in|₹30
Dolphin's Nose viewpoint & Catherine Falls (Coonoor)|sightseeing|11.3400|76.8200|120|50|morning|low|1|Stunning view of deep gorges and tea carpeted hills|walk-in|₹50
Fresh homemade chocolate & Nilgiri tea tasting|food|11.4100|76.7050|45|200|evening|moderate|0|Try fudge, dark chocolate truffles, and white tea|walk-in|Free Entry (~₹150–₹300 for tastings)
Pykara Lake speedboating & cascading waterfall|leisure|11.4800|76.6000|120|300|afternoon|low|1|21 km from town; sacred river to the Toda tribe|walk-in|₹50 (Entry) / ₹300 (Speedboat)`,
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
  manali: {
    stays: [["Mountain hostel / homestay", "Old Manali", 1400, 3200], ["Apple orchard resort", "Log Huts / Prini", 4500, 9500], ["Luxury Alpine spa resort", "Solang / Rangri", 12000, 26000]],
    food: [600, 1500], transit: [700, 1800], season: "Mar–Jun pleasant summer; Dec–Feb snow season; Jul–Aug landslide risk in monsoon",
    pois: `
Hidimba Devi Cedar Forest Temple|culture|32.2483|77.1808|90|0|morning|peak|1|1553 pagoda-style wooden temple set among giant deodar cedars; arrive by 8:30 am|walk-in
Solang Valley Ropeway & Paragliding Meadow|leisure|32.3166|77.1575|180|1200|morning|peak|1|Depart before 8 am to beat Rohtang/Atal Tunnel highway traffic|walk-in
Atal Tunnel & Sissu Waterfall Lahaul excursion|sightseeing|32.4020|77.2100|240|800|morning|moderate|1|9.02 km high-altitude highway tunnel into Lahaul Valley; carry warm layers|walk-in
Jogini Waterfall pine forest trek from Vashisht|sightseeing|32.2660|77.1880|150|0|afternoon|low|1|Scenic 3 km village trail past hot springs and apple orchards|walk-in
Old Manali Manalsu River cafes & Himachali trout dinner|food|32.2560|77.1750|120|750|evening|moderate|0|Order pan-seared Himalayan rainbow trout and hot siddu with ghee|walk-in
Naggar Castle & Roerich Art Gallery heritage visit|culture|32.1140|77.1650|150|100|afternoon|low|1|500-year-old kath-kuni stone-and-timber castle overlooking Kullu valley|walk-in`,
  },
  shimla: {
    stays: [["Heritage guesthouse", "Lakkar Bazaar / Mall Road", 1800, 3800], ["Colonial boutique hotel", "Chotta Shimla", 5000, 11000], ["Luxury Himalayan retreat", "Mashobra / Wildflower Hall", 18000, 42000]],
    food: [600, 1500], transit: [500, 1400], season: "Mar–Jun & Sep–Nov; Dec–Jan winter snowfall",
    pois: `
Kalka–Shimla UNESCO Heritage Toy Train scenic ride|sightseeing|31.1030|77.1660|180|450|morning|peak|0|102 tunnels and multi-arch stone viaducts; book Shivalik Deluxe or Vistadome|30+ days required
Viceregal Lodge (Indian Institute of Advanced Study)|culture|31.1034|77.1419|120|100|morning|moderate|0|1888 Scottish baronial palace where the 1945 Simla Conference was held|walk-in
Jakhu Hanuman Temple & Deodar Ridge Ropeway|sightseeing|31.1008|77.1842|90|550|morning|moderate|1|Shimla's highest peak at 8,050 ft; keep spectacles secure from macaques|walk-in
The Ridge, Christ Church & Scandal Point promenade|leisure|31.1048|77.1734|90|0|evening|peak|1|Vehicle-free colonial promenade glowing at dusk|walk-in
Kufri Himalayan Nature Park & Mahasu Peak|sightseeing|31.0978|77.2678|180|300|afternoon|moderate|1|16 km from Shimla; panoramic views of Kedarnath and Badrinath snow peaks|walk-in
Mall Road heritage bakery & Himachali Dham dinner|food|31.1040|77.1720|90|650|evening|moderate|0|Try Chana Madra, Babru and warm fruit cake at historic bakeries|walk-in`,
  },
  darjeeling: {
    stays: [["Alpine backpacker hostel dorm", "Chowrasta / Hermitage", 450, 850], ["Tea planters homestay", "Observatory Hill / Lebong", 1600, 3500], ["Colonial heritage hotel", "The Mall / Chowrasta", 5500, 12000], ["Luxury tea estate bungalow", "Glenburn / Makaibari", 16000, 38000]],
    food: [500, 1300], transit: [600, 1500], season: "Mar–May & Oct–Dec for crystal-clear Kanchenjunga views",
    pois: `
Tiger Hill sunrise over Mount Kanchenjunga|sightseeing|26.9962|88.2850|150|100|morning|peak|1|Depart hotel at 3:45 am; watch golden alpenglow hit the 8,586m summit|walk-in|₹100
Darjeeling Himalayan Railway (Joyride to Ghoom & Batasia Loop)|sightseeing|27.0410|88.2630|120|1000|morning|peak|0|1881 steam locomotive spiralling through Batasia war memorial garden|3-7 days advance|₹1,000 (Diesel) / ₹1,500 (Steam)
Happy Valley Tea Estate organic plucking & tasting tour|culture|27.0510|88.2580|90|250|afternoon|low|0|Established 1854; sample aromatic First Flush and Second Flush muscatel teas|walk-in|₹250
Padmaja Naidu Himalayan Zoological Park & HMI|sightseeing|27.0580|88.2540|120|110|morning|moderate|1|See endangered Red Pandas, Snow Leopards and Tenzing Norgay's Everest gear|walk-in|₹110 (Indian) / ₹250 (Foreigner)
Peace Pagoda & Japanese Temple morning bells|culture|27.0285|88.2595|75|0|evening|low|1|Serene white stupa with sweeping views of Darjeeling town|walk-in|Free
Keventer's / Glenary's colonial breakfast & Tibetan momo trail|food|27.0440|88.2670|90|450|evening|moderate|0|Steaming thukpa, Darjeeling tea and heritage bakery pastries on Nehru Road|walk-in|Free Entry (~₹300–₹550 for breakfast & momos)`,
  },
  ayodhya: {
    stays: [["Dharamshala / pilgrim guesthouse", "Ram Path / Naya Ghat", 1400, 3000], ["Mid-range pilgrim hotel", "Civil Lines / Faizabad Rd", 3800, 8000], ["Luxury tent city / heritage stay", "Saryu Riverfront", 9000, 18000]],
    food: [450, 1000], transit: [400, 900], season: "Oct–Mar pleasant; Ram Navami (Mar/Apr) & Deepotsav (Oct/Nov) attract millions",
    pois: `
Shri Ram Janmabhoomi Mandir darshan|culture|26.7956|82.1944|180|0|morning|peak|0|Deposit phones & bags at free Janmabhoomi Path lockers; book Sugam Darshan slot online|3-7 days advance
Hanuman Garhi 10th-century fortress shrine|culture|26.7949|82.2005|90|0|morning|peak|0|Climb 76 steps to the main sanctum; offer besan laddu prasad|walk-in
Saryu River Ram Ki Paidi evening Aarti & laser show|culture|26.8090|82.2050|90|0|evening|peak|1|Arrive 45 mins before sunset for front-row ghat steps|walk-in
Kanak Bhawan golden-crowned shrine|culture|26.7980|82.1985|60|0|afternoon|moderate|0|Melodious devotional bhajans in the open courtyard|walk-in
Guptar Ghat & Saryu boat ride|leisure|26.7830|82.1320|90|300|evening|low|1|Peaceful riverfront ghats surrounded by gardens|walk-in
Traditional Awadhi sattvic thali & rabri-jalebi tasting|food|26.7960|82.2010|60|300|afternoon|moderate|0|Pure vegetarian cuisine with hot kachori-sabzi and peda|walk-in`,
  },
  pondicherry: {
    stays: [["Backpacker hostel dorm", "Heritage Town / Serenity", 450, 850], ["Boutique guesthouse", "White Town / Rue Romain Rolland", 2500, 5500], ["Heritage Franco-Tamil villa", "French Quarter", 6500, 14000], ["Eco beach resort", "Serenity / Paradise Beach", 8000, 18000]],
    food: [800, 1800], transit: [400, 1000], season: "Oct–Mar breezy coastal weather; Apr–Jun hot & humid",
    pois: `
White Town French Quarter architectural walk & cafes|culture|11.9310|79.8340|120|0|morning|low|1|Mustard-yellow colonial villas, bougainvillea lanes and artisanal croissants|walk-in|Free
Sri Aurobindo Ashram & Matrimandir viewing point (Auroville)|culture|12.0069|79.8106|180|0|morning|moderate|1|Silent meditation centre; inner chamber requires booking 7 days ahead|3-7 days advance|Free
Promenade Rock Beach sunrise & Goubert Avenue stroll|leisure|11.9338|79.8367|75|0|morning|moderate|1|Closed to motor vehicles in the morning and evening|walk-in|Free
Chunnambar Backwater boat ride to Paradise Beach|leisure|11.8840|79.8210|150|350|afternoon|moderate|1|Golden sand spit between the backwaters and Bay of Bengal|walk-in|₹350 (Return Boat Ride)
Arulmigu Manakula Vinayagar Temple|culture|11.9358|79.8336|60|0|evening|moderate|0|300-year-old Ganesha temple with vibrant ceiling murals|walk-in|Free
Arikamedu ancient Roman trade port archaeological site|sightseeing|11.9020|79.8180|90|0|morning|low|1|Ruins of 2,000-year-old Indo-Roman bead making and maritime emporium|walk-in|Free
Creole & Franco-Tamil dinner in a courtyard bistro|food|11.9300|79.8335|90|600|evening|moderate|0|Try prawn Assad, ratatouille and wood-fired sourdough pizza|walk-in|Free Entry (~₹500–₹900 for dinner)`,
  },
  andaman: {
    stays: [["Island guesthouse", "Port Blair / Aberdeen", 2500, 5000], ["Beach eco-cottages", "Havelock (Swaraj Dweep)", 6500, 14000], ["Luxury oceanfront villa", "Radhanagar / Neil Island", 16000, 42000]],
    food: [900, 2200], transit: [1000, 2800], season: "Oct–Apr calm turquoise waters for scuba diving; May–Sep monsoon swells",
    pois: `
Cellular Jail National Memorial & Light and Sound Show|culture|11.6742|92.7478|150|350|evening|peak|0|Moving colonial freedom-struggle history; book evening show online|3-7 days advance
Radhanagar Beach (Beach No. 7, Havelock Island)|leisure|11.9845|92.9512|180|0|evening|moderate|1|Blue Flag certified powdery white sand and dramatic forest backdrop|walk-in
Elephant Beach coral reef snorkelling & sea walk|leisure|12.0090|92.9420|180|1800|morning|moderate|1|Take the 8 am speed boat from Havelock jetty for clearest water visibility|3-7 days advance
Ross Island (Netaji Subhash Chandra Bose Island) heritage ruins|sightseeing|11.6769|92.7625|120|250|morning|low|1|Banyan roots enveloping 19th-century British administrative buildings and spotted deer|walk-in
Laxmanpur Natural Rock Bridge at low tide (Neil Island)|sightseeing|11.8380|93.0280|90|0|afternoon|low|1|Living coral tide pools and natural limestone arch|walk-in
Fresh island grilled seafood platter by the beach|food|12.0200|92.9800|90|1200|evening|moderate|0|Try freshly caught red snapper, lobster and coconut prawn curry|walk-in`,
  },
  coorg: {
    stays: [["Coffee estate homestay", "Madikeri / Kushalnagar", 2000, 4500], ["Plantation bungalow", "Virajpet / Pollibetta", 5500, 12000], ["Luxury rainforest resort", "Madikeri Hills", 15000, 35000]],
    food: [600, 1400], transit: [700, 1600], season: "Oct–May coffee blossom & harvest season; Jun–Aug misty monsoon waterfalls",
    pois: `
Dubare Elephant Camp river interaction & rafting|leisure|12.3714|75.9052|150|800|morning|peak|1|Cross the Cauvery at 8:30 am to watch elephant bathing and feeding|walk-in
Abbey Falls & hanging bridge amidst coffee plantations|sightseeing|12.4570|75.7165|90|50|morning|moderate|1|70-foot cascading waterfall surrounded by pepper vines and Arabica coffee|walk-in
Namdroling Monastery (Golden Temple, Bylakuppe)|culture|12.4323|75.9675|120|0|afternoon|moderate|0|Largest Nyingma Tibetan Buddhist teaching centre with 40-ft golden statues|walk-in
Raja's Seat sunset panorama over Western Ghats|sightseeing|12.4148|75.7368|75|30|evening|peak|1|Historic royal pavilion overlooking rolling mist-clad valleys|walk-in
Mercara Gold Coffee & Spice Plantation guided walk|culture|12.4280|75.7850|120|300|afternoon|low|1|Learn bean-to-cup Robusta & Arabica roasting and buy fresh green cardamom|walk-in
Traditional Kodava Pandi Curry & Akki Rotti dinner|food|12.4220|75.7390|90|650|evening|moderate|0|Authentic Coorgi smoky Kachampuli dish, bamboo shoot curry and rice flatbread|walk-in`,
  },
  mysuru: {
    stays: [["Heritage guesthouse", "Gokulam / Nazarbad", 1500, 3200], ["Royal boutique hotel", "Sayyaji Rao Road", 4000, 8500], ["Palace heritage hotel", "Lalitha Mahal Road", 10000, 24000]],
    food: [500, 1200], transit: [400, 1000], season: "Sep–Mar; Mysuru Dasara (Oct) features grand palace illumination and processions",
    pois: `
Mysore Palace (Amba Vilas) Indo-Saracenic royal durbar|culture|12.3052|76.6552|150|100|morning|peak|0|Stained glass Peacock Pavilion; illuminated by 97,000 bulbs on Sundays at 7 pm|walk-in
Chamundi Hills & Sri Chamundeshwari Temple climb|culture|12.2725|76.6708|120|50|morning|moderate|1|1,008 stone steps past the giant monolithic Nandi bull|walk-in
Devaraja Market 130-year-old flower, kumkum & incense bazaar|food|12.3105|76.6525|90|200|evening|peak|1|Conical mounds of vibrant vermilion powder, jasmine garlands and sandalwood|walk-in
Brindavan Gardens musical fountain & KRS Dam|leisure|12.4217|76.5728|120|100|evening|peak|1|Terraced symmetrical gardens; fountain show starts at dusk|walk-in
St. Philomena's Neo-Gothic Cathedral & Jaganmohan Art Gallery|culture|12.3210|76.6580|90|100|afternoon|low|0|Original Raja Ravi Varma paintings and twin 175-foot church spires|walk-in
Original Mylari Dosa & warm Mysore Pak tasting|food|12.3060|76.6540|60|300|morning|peak|0|Fluffy butter dosa served on banana leaf and melt-in-mouth ghee Mysore Pak|walk-in`,
  },
  gokarna: {
    stays: [["Beach backpacker hostel dorm", "Kudle / Middle Beach", 450, 850], ["Beach shack / guesthouse", "Om Beach", 1200, 2500], ["Eco wellness cliff resort", "Om Beach Cliff", 5000, 12000]],
    food: [500, 1200], transit: [400, 900], season: "Oct–Mar breezy beach weather; Nov–Feb peak backpacking",
    pois: `
Mahabaleshwar Temple & Kotitirtha sacred tank|culture|14.5428|74.3182|90|0|morning|peak|0|Dhoti dress code for men at the sacred Atmalinga shrine|walk-in|Free
Five Beaches cliff trek (Kudle to Paradise Beach)|sightseeing|14.5250|74.3200|180|0|morning|moderate|1|Scenic coastal trail connecting Kudle, Om, Half Moon, and Paradise beach|walk-in|Free
Om Beach water sports & sunset dolphin spotting|leisure|14.5180|74.3150|150|400|afternoon|peak|1|Distinctive Om-shaped dual crescent beach with boat trips|walk-in|Free Entry (~₹300–₹500 for boat ride)
Kudle Beach shack cafe dinner & acoustic sunsets|food|14.5310|74.3140|120|450|evening|peak|1|Candlelit beach tables with wood-fired pizza and fresh seafood|walk-in|Free Entry (~₹350–₹600 for dinner)
Yana Caves limestone karst monoliths day excursion|sightseeing|14.5880|74.5580|210|50|morning|low|1|Towering black crystalline limestone formations hidden in dense Western Ghats forest|walk-in|₹50
Mirjan Fort 16th-century laterite ramparts|culture|14.4920|74.4190|90|0|afternoon|low|1|Historic pepper-queen fortress carpeted in emerald moss after rains|walk-in|Free`,
  },
  spiti: {
    stays: [["High-altitude backpacker hostel dorm", "Kaza / Mud Village", 450, 850], ["Traditional Spitian homestay", "Langza / Kibber", 1200, 2500], ["Himalayan eco retreat", "Kaza", 4000, 8500]],
    food: [450, 1100], transit: [1200, 3000], season: "Jun–Sep open high-passes; Dec–Feb frozen winter expedition",
    pois: `
Key Monastery 1,000-year-old cliffside fortress Gompa|culture|32.2980|78.0120|120|0|morning|moderate|0|Sip warm herbal tea with lamas inside ancient assembly hall|walk-in|Free
Kibber Wildlife Sanctuary & Chicham Bridge (highest bridge)|sightseeing|32.3330|77.9980|150|0|morning|low|1|Suspension bridge suspended 1,350 ft above deep gorge; snow leopard habitat|walk-in|Free
Hikkim world's highest post office (14,567 ft)|sightseeing|32.2530|78.0770|90|50|afternoon|moderate|1|Send handwritten postcards to anywhere in the world|walk-in|Free Entry (~₹50 for postcard & stamps)
Langza giant Buddha statue & prehistoric marine fossils|sightseeing|32.2610|78.0840|90|0|afternoon|low|1|1,000-year-old golden Buddha set against Chau Chau Kang Nilda snow peak|walk-in|Free
Dhankar Monastery & high-altitude cliffside Dhankar Lake|culture|32.1180|78.2140|180|25|morning|low|1|Perched precariously over razor-sharp clay pinnacles above Spiti River|walk-in|₹25
Traditional Spitian sea-buckthorn tea & thukpa meal|food|32.2270|78.0720|60|250|evening|low|0|Warm butter tea, momos, tingmo and wild sea-buckthorn juice|walk-in|Free Entry (~₹150–₹300 for food tastings)
Chandratal Lake (Moon Lake) pristine crescent waters|sightseeing|32.4820|77.6160|240|0|morning|moderate|1|Turquoise glacial alpine lake at 14,100 ft; 1 km trek from parking|walk-in|Free`,
  },
  shillong: {
    stays: [["Backpacker hostel dorm", "Upper Lachumiere / Police Bazar", 450, 850], ["Pine view guesthouse", "Laitumkhrah", 1500, 3200], ["Luxury lakeside resort", "Umiam Lake / Ri Kynjai", 8000, 22000]],
    food: [500, 1300], transit: [500, 1400], season: "Sep–May pleasant mountain breeze; Jun–Aug dramatic monsoons and roaring waterfalls",
    pois: `
Elephant Falls three-tiered cascading mountain waterfall|sightseeing|25.5350|91.8230|90|50|morning|moderate|1|Three distinct tiers flowing over fern-fringed black rocks|walk-in|₹50
Umiam Lake (Barapani) watersports & sunset view|leisure|25.6550|91.9080|120|200|afternoon|moderate|1|Vast crystal-blue reservoir surrounded by rolling Khasi pine hills|walk-in|₹20 (Entry) / ₹200 (Speedboat Ride)
Don Bosco Museum of Indigenous Cultures|culture|25.5920|91.8900|150|100|morning|low|0|Seven-storey hexagonal museum exhibiting northeastern tribal heritage|walk-in|₹100 (Indian) / ₹250 (Foreigner)
Shillong Peak & Laitlum Canyons panorama|sightseeing|25.4470|91.9050|150|50|afternoon|low|1|End of the world canyon edge dropping into emerald river gorges|walk-in|₹50
Ward's Lake wooden footbridge stroll & boating|leisure|25.5760|91.8840|60|30|evening|moderate|1|Colonial horseshoe-shaped lake framed by cherry blossoms and lotus ponds|walk-in|₹30
Police Bazar street food trail (Jadoh & pork momos)|food|25.5780|91.8820|90|250|evening|peak|1|Traditional Khasi jadoh rice, tungrymbai, and piping hot dimsums|walk-in|Free Entry (~₹150–₹300 for food tastings)`,
  },
  kasol: {
    stays: [["Riverside backpacker hostel dorm", "Old Kasol / Katagla", 450, 850], ["Riverside alpine cottage", "Chalal / Manikaran", 1200, 2600], ["Luxury Himalayan village resort", "Kullu Valley", 6000, 16000]],
    food: [450, 1100], transit: [300, 800], season: "Mar–Jun lush summer trekking; Sep–Nov crisp mountain autumn",
    pois: `
Parvati River pine forest nature trail to Chalal|sightseeing|32.0120|77.3180|120|0|morning|moderate|1|Suspension bridge crossing into serene deodar trails along roaring turquoise waters|walk-in|Free
Manikaran Sahib Gurudwara hot sulfur springs & langar|culture|32.0270|77.3460|120|0|morning|peak|0|Sacred thermal pools where rice is cooked naturally; 24/7 free community kitchen|walk-in|Free
Tosh Village Himalayan amphitheatre day trek|sightseeing|32.0180|77.4520|210|0|morning|moderate|1|Picturesque wooden village perched at 7,874 ft with panoramic glacier views|walk-in|Free
Kheerganga hot spring trail basecamp (Barshaini)|sightseeing|31.9880|77.4420|300|0|morning|moderate|1|Famous 12 km trek through waterfalls to natural mountaintop hot sulphur baths|walk-in|Free
Kasol Israeli cafe hopping (Shakshuka & Falafel)|food|32.0100|77.3150|90|350|afternoon|moderate|0|Try fresh pita with hummus, shakshuka, and cinnamon babka in garden cafes|walk-in|Free Entry (~₹250–₹450 for cafe meal)
Malana village overlook & ancient democracy walk|culture|32.0620|77.2620|240|0|morning|low|1|Isolated tribal hamlet claiming Greek descent from Alexander's army|walk-in|Free`,
  },
  jaisalmer: {
    stays: [["Sandstone backpacker hostel dorm", "Dhibba Para / Fort Area", 450, 850], ["Heritage haveli guesthouse", "Old City", 1500, 3500], ["Luxury desert resort & tented camp", "Sam Sand Dunes", 7000, 22000]],
    food: [500, 1300], transit: [400, 1000], season: "Oct–Mar pleasant desert winter; Desert Festival in Feb",
    pois: `
Jaisalmer Fort (Sonar Qila) living golden citadel|culture|26.9124|70.9127|150|50|morning|peak|0|World's only living fort housing 4,000 residents; carved yellow sandstone havelis|walk-in|₹50 (Indian) / ₹250 (Foreigner)
Patwon Ki Haveli 5-palace cluster & stone jharokhas|culture|26.9170|70.9150|90|50|morning|moderate|0|Finest lacework sandstone filigree balconies in Rajasthan (₹50 Indian / ₹100 Foreigner)|walk-in|₹50 (Indian) / ₹100 (Foreigner)
Sam Sand Dunes sunset camel & desert jeep safari|sightseeing|26.8320|70.5050|240|600|evening|peak|1|Golden shifting desert dunes with live Kalbeliya gypsy dance and bonfire dinner|3-7 days advance|₹600 (Camel & Jeep Safari)
Gadisar Lake 14th-century royal rainwater reservoir|leisure|26.9060|70.9220|90|100|evening|moderate|1|Carved arched gateways, historic chhatris, and paddle boating at sunset|walk-in|₹100 (Paddle Boating)
Kuldhara abandoned haunted village heritage ruins|sightseeing|26.8660|70.7850|90|50|afternoon|low|1|13th-century Paliwal Brahmin settlement deserted overnight (₹50 Indian / ₹150 Foreigner)|walk-in|₹50 (Indian) / ₹150 (Foreigner)
Ker Sangri & Dal Baati desert street food tasting|food|26.9150|70.9140|60|300|evening|moderate|0|Local wild bean curry, churma, pyaaz kachori, and ghotua laddu|walk-in|Free Entry (~₹200–₹400 for food tastings)`,
  },
  munnar: {
    stays: [["Plantation backpacker hostel dorm", "Chithirapuram / Lockhart", 450, 850], ["Tea planters homestay", "Devikulam / Pallivasal", 1800, 3800], ["Luxury tea valley resort", "Munnar Hills", 6500, 18000]],
    food: [500, 1200], transit: [600, 1500], season: "Sep–Mar crisp mountain mist; Jun–Aug monsoon waterfalls",
    pois: `
Eravikulam National Park & Anamudi summit slopes|sightseeing|10.1919|77.0880|180|200|morning|peak|1|Home to endangered Nilgiri Tahr; highest peak in South India (₹200 Indian / ₹500 Foreigner)|3-7 days advance|₹200 (Indian) / ₹500 (Foreigner)
Munnar Tea Museum & CTC factory live processing|culture|10.0889|77.0595|90|125|morning|moderate|0|19th-century roller machinery, orthodox tea tasting and history of estate planters|walk-in|₹125 (Museum & Tea Tasting)
Mattupetty Dam & speed boating reservoir lake|leisure|10.1060|77.1240|120|300|afternoon|moderate|1|Surrounded by rolling tea ridges; wild elephant herds occasionally drink at water edge|walk-in|₹50 (Entry) / ₹300 (Speedboat)
Top Station panoramic Western Ghats cloud views|sightseeing|10.1240|77.2460|150|50|morning|moderate|1|Highest point on Munnar-Kodaikanal road at 6,170 ft with historic ropeway terminal|walk-in|₹50
Attukad Waterfalls rolling tea jungle ravine trek|sightseeing|10.0540|77.0530|90|0|afternoon|low|1|Thunderous cascade through rocky hills and cardamom groves|walk-in|Free
Kerala spice garden walk & appam with stew dinner|food|10.0820|77.0610|90|350|evening|moderate|0|Walk among green cardamom, black pepper, cinnamon trees followed by hot appam dinner|walk-in|Free Entry (~₹250–₹450 for dinner & spice walk)`,
  },
  varkala: {
    stays: [["Cliff-top backpacker hostel dorm", "North Cliff / South Cliff", 450, 850], ["Beach cottage & guesthouse", "Kurakkanni", 1400, 3000], ["Luxury oceanfront boutique resort", "Helipad / Odayam Beach", 5000, 14000]],
    food: [500, 1300], transit: [350, 800], season: "Oct–Mar tropical coastal breeze; prime season for surfing and yoga",
    pois: `
Varkala North Cliff sunset promenade & surf break|leisure|8.7360|76.7020|120|0|evening|peak|1|Spectacular red laterite cliffs bordering Arabian Sea with surf schools and cafes|walk-in|Free
Janardhana Swami 2,000-year-old coastal temple|culture|8.7290|76.7110|60|0|morning|moderate|0|Ancient Vaishnavite temple with Dutch bell and sacred Papanasam mineral springs|walk-in|Free
Papanasam Beach sacred mineral water sea bath|leisure|8.7310|76.7060|90|0|morning|moderate|1|Holy waters believed to cleanse sins; natural mountain springs trickling into sea|walk-in|Free
Kappil Beach & backwater estuary bridge crossover|sightseeing|8.7840|76.6780|120|200|afternoon|low|1|Scenic coastal strip where Arabian Sea and Edava-Nadayara backwaters meet|walk-in|Free Entry (~₹200 for boating)
Anjengo Fort & 130-foot lighthouse ruins (Anchuthengu)|culture|8.6810|76.7580|90|30|afternoon|low|1|Historic 1695 British East India Company fort with panoramic coastal tower views|walk-in|₹30
Fresh catch grilled fish & Kerala parotta cliff dinner|food|8.7350|76.7030|90|450|evening|peak|0|Candlelit cliff tables serving grilled kingfish, karimeen pollichathu and coconut water|walk-in|Free Entry (~₹350–₹650 for dinner)`,
  },
  pushkar: {
    stays: [["Desert backpacker hostel dorm", "Motisar Road / Jamjar", 450, 850], ["Heritage courtyard haveli", "Brahma Temple Road", 1400, 3200], ["Luxury desert tented resort & spa", "Pushkar Valley", 6000, 18000]],
    food: [400, 1000], transit: [300, 700], season: "Oct–Mar pleasant desert winter; Pushkar Camel Fair in Oct/Nov",
    pois: `
Jagatpita Brahma Mandir 14th-century rare shrine|culture|26.4880|74.5510|60|0|morning|peak|0|One of the few temples in the world dedicated to Lord Brahma; silver coin flooring|walk-in|Free
Pushkar Holy Lake 52 ghats morning dip & aarti|culture|26.4900|74.5540|90|0|morning|peak|1|Sacred lake surrounded by 52 bathing ghats; beware of pushy fake priests (puja scams)|walk-in|Free
Savitri Temple hilltop sunrise ropeway climb|sightseeing|26.4840|74.5360|120|150|morning|moderate|1|Perched atop Ratnagiri hill with 360-degree desert panoramas; ropeway or 1,000 steps|walk-in|₹150 (Roundtrip Ropeway)
Pushkar Camel Fair grounds & desert sunset safari|leisure|26.4960|74.5420|150|500|evening|moderate|1|Sand dunes camel cart ride, Kalbeliya folk performances, and desert sunset|walk-in|₹500 (Camel Cart Safari)
Varaha Temple 12th-century boar incarnation shrine|culture|26.4890|74.5560|45|0|afternoon|low|0|Oldest temple in Pushkar with intricately carved white marble pillars|walk-in|Free
Pushkar Malpua & Falafel street food walk|food|26.4895|74.5530|60|200|evening|peak|1|Rabri-soaked hot malpuas at Halwai Gali, lassi in clay kulhads, and falafel rolls|walk-in|Free Entry (~₹150–₹300 for food tastings)`,
  },
};

function parsePois(block: string): Poi[] {
  return block.trim().split("\n").map((l) => {
    const [name, category, lat, lng, minutes, cost, slot, crowd, outdoor, tip, booking, ticketPrice] = l.split("|");
    let calculatedTicketPrice = ticketPrice;
    if (!calculatedTicketPrice) {
      if (/food walk|street food|tasting/i.test(name)) {
        calculatedTicketPrice = "Free Entry (~₹250–₹400 for street food tastings)";
      } else if (/red fort|qutub minar|humayun|agra fort|fatehpur sikri|vittala|lotus mahal|jaisalmer fort|patwon/i.test(name)) {
        calculatedTicketPrice = "₹50 (Indian) / ₹550 (Foreigner)";
      } else if (+cost > 0) {
        calculatedTicketPrice = `₹${(+cost).toLocaleString("en-IN")}`;
      } else {
        calculatedTicketPrice = "Free";
      }
    }
    return {
      name,
      category: category as Poi["category"],
      lat: +lat,
      lng: +lng,
      minutes: +minutes,
      cost: +cost,
      slot: slot as Poi["slot"],
      crowd: crowd as Poi["crowd"],
      outdoor: outdoor === "1",
      tip,
      booking: booking as Poi["booking"],
      ticketPrice: calculatedTicketPrice,
    };
  });
}

export const KB: Record<string, DestinationKB> = Object.fromEntries(
  Object.entries(raw).map(([k, v]) => [k, { name: k.replace(/\b\w/g, (c) => c.toUpperCase()), stays: v.stays, pois: parsePois(v.pois), dailyFood: v.food, localTransitPerDay: v.transit, season: v.season }]),
);

export const KB_ALIASES: Record<string, string> = {
  "new delhi": "delhi", kochi: "kerala", cochin: "kerala", alleppey: "kerala", alappuzha: "kerala", trivandrum: "thiruvananthapuram",
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
  gokarna: "gokarna",
  spiti: "spiti", kaza: "spiti", "spiti valley": "spiti",
  shillong: "shillong", meghalaya: "shillong",
  kasol: "kasol", "parvati valley": "kasol", tosh: "kasol", chalal: "kasol",
  jaisalmer: "jaisalmer",
  munnar: "munnar",
  varkala: "varkala",
  pushkar: "pushkar",
  ooty: "ooty", udhagamandalam: "ooty", coonoor: "ooty",
  manali: "manali", kullu: "manali", solang: "manali",
  shimla: "shimla", kufri: "shimla",
  darjeeling: "darjeeling",
  ayodhya: "ayodhya",
  pondicherry: "pondicherry", puducherry: "pondicherry", auroville: "pondicherry",
  andaman: "andaman", "port blair": "andaman", havelock: "andaman",
  coorg: "coorg", madikeri: "coorg", kodagu: "coorg",
  mysuru: "mysuru", mysore: "mysuru",
};
