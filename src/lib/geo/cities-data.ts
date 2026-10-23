/**
 * Curated offline city gazetteer (no geocoding API needed).
 * Format: name|aliases(;-separated)|ISO2|lat|lng|IATA(;-separated)|state/region
 * Coordinates are city-centre approximations (±0.05°), good for 50–300 km impact radii.
 */
export const CITY_ROWS = `
Delhi|New Delhi;Dilli;दिल्ली;NCR|IN|28.61|77.21|DEL|Delhi
Mumbai|Bombay;मुंबई|IN|19.08|72.88|BOM|Maharashtra
Bengaluru|Bangalore;बेंगलुरु|IN|12.97|77.59|BLR|Karnataka
Chennai|Madras;चेन्नई|IN|13.08|80.27|MAA|Tamil Nadu
Kolkata|Calcutta;कोलकाता|IN|22.57|88.36|CCU|West Bengal
Hyderabad|हैदराबाद|IN|17.39|78.49|HYD|Telangana
Pune|Poona;पुणे|IN|18.52|73.86|PNQ|Maharashtra
Ahmedabad|अहमदाबाद|IN|23.02|72.57|AMD|Gujarat
Jaipur|Pink City;जयपुर|IN|26.91|75.79|JAI|Rajasthan
Goa|Panaji;Panjim;Dabolim;Mopa;गोवा|IN|15.50|73.83|GOI;GOX|Goa
Kochi|Cochin;कोच्चि|IN|9.93|76.27|COK|Kerala
Thiruvananthapuram|Trivandrum|IN|8.52|76.94|TRV|Kerala
Kerala|Munnar;Alleppey;Alappuzha;Kumarakom|IN|10.09|76.6||Kerala
Varanasi|Banaras;Benares;Kashi;वाराणसी|IN|25.32|82.97|VNS|Uttar Pradesh
Agra|Taj Mahal;आगरा|IN|27.18|78.01|AGR|Uttar Pradesh
Lucknow|लखनऊ|IN|26.85|80.95|LKO|Uttar Pradesh
Prayagraj|Allahabad;Kumbh|IN|25.44|81.85|IXD|Uttar Pradesh
Ayodhya||IN|26.80|82.20|AYJ|Uttar Pradesh
Udaipur|उदयपुर|IN|24.59|73.71|UDR|Rajasthan
Jodhpur|Blue City|IN|26.24|73.02|JDH|Rajasthan
Jaisalmer|Golden City|IN|26.92|70.91|JSA|Rajasthan
Pushkar||IN|26.49|74.55||Rajasthan
Amritsar|Golden Temple;अमृतसर|IN|31.63|74.87|ATQ|Punjab
Chandigarh||IN|30.73|76.78|IXC|Chandigarh
Shimla|Simla;शिमला|IN|31.10|77.17|SLV|Himachal Pradesh
Manali|मनाली;Rohtang;Atal Tunnel|IN|32.24|77.19|KUU|Himachal Pradesh
Dharamshala|McLeod Ganj;Dharamsala|IN|32.22|76.32|DHM|Himachal Pradesh
Rishikesh|ऋषिकेश|IN|30.09|78.27||Uttarakhand
Haridwar||IN|29.95|78.16||Uttarakhand
Dehradun||IN|30.32|78.03|DED|Uttarakhand
Nainital||IN|29.38|79.46||Uttarakhand
Kedarnath|Char Dham;Badrinath;Joshimath|IN|30.73|79.07||Uttarakhand
Srinagar|Kashmir;Dal Lake;Gulmarg;Pahalgam|IN|34.08|74.80|SXR|Jammu & Kashmir
Jammu||IN|32.73|74.86|IXJ|Jammu & Kashmir
Leh|Ladakh;Pangong|IN|34.15|77.58|IXL|Ladakh
Darjeeling||IN|27.04|88.26|IXB|West Bengal
Gangtok|Sikkim|IN|27.33|88.61|PYG|Sikkim
Guwahati|Assam|IN|26.14|91.74|GAU|Assam
Shillong|Meghalaya;Cherrapunji|IN|25.58|91.89|SHL|Meghalaya
Imphal|Manipur|IN|24.82|93.94|IMF|Manipur
Bhubaneswar|Odisha|IN|20.30|85.82|BBI|Odisha
Puri|Konark|IN|19.81|85.83||Odisha
Patna|Bihar|IN|25.59|85.14|PAT|Bihar
Bodh Gaya|Gaya|IN|24.70|84.99|GAY|Bihar
Ranchi||IN|23.34|85.31|IXR|Jharkhand
Bhopal||IN|23.26|77.41|BHO|Madhya Pradesh
Indore||IN|22.72|75.86|IDR|Madhya Pradesh
Khajuraho||IN|24.85|79.93|HJR|Madhya Pradesh
Ujjain|Mahakal|IN|23.18|75.78||Madhya Pradesh
Nagpur||IN|21.15|79.09|NAG|Maharashtra
Amravati|अमरावती;Amt;AMI;Amraoti|IN|20.93|77.75|NAG|Maharashtra
Aurangabad|Ajanta;Ellora;Chhatrapati Sambhajinagar|IN|19.88|75.34|IXU|Maharashtra
Nashik||IN|20.00|73.79|ISK|Maharashtra
Lonavala|Khandala|IN|18.75|73.41||Maharashtra
Surat||IN|21.17|72.83|STV|Gujarat
Vadodara|Baroda|IN|22.31|73.18|BDQ|Gujarat
Kutch|Rann of Kutch;Bhuj|IN|23.24|69.67|BHJ|Gujarat
Mysuru|Mysore|IN|12.30|76.64|MYQ|Karnataka
Hampi||IN|15.34|76.46||Karnataka
Coorg|Kodagu;Madikeri|IN|12.42|75.74||Karnataka
Mangaluru|Mangalore|IN|12.91|74.86|IXE|Karnataka
Gokarna||IN|14.55|74.32||Karnataka
Ooty|Udhagamandalam;Nilgiris|IN|11.41|76.70||Tamil Nadu
Kodaikanal||IN|10.24|77.49||Tamil Nadu
Madurai|Meenakshi|IN|9.93|78.12|IXM|Tamil Nadu
Coimbatore||IN|11.02|76.96|CJB|Tamil Nadu
Puducherry|Pondicherry;Pondy|IN|11.94|79.81|PNY|Puducherry
Mahabalipuram|Mamallapuram|IN|12.62|80.19||Tamil Nadu
Rameswaram||IN|9.29|79.31||Tamil Nadu
Kanyakumari||IN|8.09|77.54||Tamil Nadu
Tirupati|Tirumala|IN|13.63|79.42|TIR|Andhra Pradesh
Visakhapatnam|Vizag|IN|17.69|83.22|VTZ|Andhra Pradesh
Vijayawada||IN|16.51|80.65|VGA|Andhra Pradesh
Andaman|Port Blair;Havelock;Swaraj Dweep|IN|11.62|92.73|IXZ|Andaman & Nicobar
Lakshadweep|Agatti|IN|10.57|72.64|AGX|Lakshadweep
Raipur||IN|21.25|81.63|RPR|Chhattisgarh
Mount Abu||IN|24.59|72.71||Rajasthan
Spiti|Kaza|IN|32.23|78.07||Himachal Pradesh
Srirangam|Trichy;Tiruchirappalli|IN|10.86|78.69|TRZ|Tamil Nadu
Mathura|Braj|IN|27.50|77.68||Uttar Pradesh
Vrindavan|Banke Bihari|IN|27.58|77.70||Uttar Pradesh
Munnar||IN|10.09|77.06||Kerala
Alleppey|Alappuzha|IN|9.50|76.34||Kerala
Varkala||IN|8.74|76.72||Kerala
Wayanad|Kalpetta|IN|11.69|76.13||Kerala
Shirdi|Sai Baba|IN|19.77|74.48|SAG|Maharashtra
Mahabaleshwar||IN|17.92|73.66||Maharashtra
Alibaug||IN|18.66|72.88||Maharashtra
Kolhapur||IN|16.70|74.24|KLH|Maharashtra
Bikaner||IN|28.02|73.31|BKB|Rajasthan
Chittorgarh|Chittor|IN|24.89|74.63||Rajasthan
Ranthambore|Sawai Madhopur|IN|26.02|76.35||Rajasthan
Ajmer|Ajmer Sharif|IN|26.45|74.64||Rajasthan
Kasol|Parvati Valley|IN|32.01|77.32||Himachal Pradesh
Kullu||IN|31.96|77.11|KUU|Himachal Pradesh
Dalhousie||IN|32.54|75.97||Himachal Pradesh
Mussoorie||IN|30.46|78.07||Uttarakhand
Auli||IN|30.53|79.57||Uttarakhand
Jim Corbett|Corbett;Ramnagar|IN|29.53|78.77||Uttarakhand
Badrinath||IN|30.74|79.49||Uttarakhand
Gangotri||IN|30.99|78.94||Uttarakhand
Yamunotri||IN|31.01|78.46||Uttarakhand
Gulmarg||IN|34.05|74.38||Jammu & Kashmir
Pahalgam||IN|34.02|75.33||Jammu & Kashmir
Nubra Valley|Diskit;Hunder|IN|34.54|77.56||Ladakh
Pangong Tso|Pangong Lake|IN|33.76|78.90||Ladakh
Chikmagalur||IN|13.32|75.77||Karnataka
Badami||IN|15.92|75.68||Karnataka
Thanjavur|Tanjore|IN|10.79|79.14||Tamil Nadu
Warangal||IN|17.98|79.60||Telangana
Kalimpong||IN|27.07|88.47||West Bengal
Sundarbans||IN|21.95|88.90||West Bengal
Digha||IN|21.63|87.51||West Bengal
Konark||IN|19.89|86.09||Odisha
Nalanda||IN|25.13|85.44||Bihar
Rajgir||IN|25.03|85.42||Bihar
Deoghar|Baidyanath Dham|IN|24.48|86.70|DGH|Jharkhand
Jamshedpur|Tatanagar|IN|22.80|86.20|IXW|Jharkhand
Gwalior||IN|26.22|78.18|GWL|Madhya Pradesh
Jabalpur||IN|23.18|79.99|JLR|Madhya Pradesh
Orchha||IN|25.35|78.64||Madhya Pradesh
Kanha||IN|22.33|80.61||Madhya Pradesh
Bandhavgarh||IN|23.70|81.03||Madhya Pradesh
Bastar|Jagdalpur|IN|19.07|82.03|JGB|Chhattisgarh
Kaziranga||IN|26.58|93.17||Assam
Majuli||IN|26.95|94.22||Assam
Cherrapunji|Sohra|IN|25.27|91.73||Meghalaya
Dawki||IN|25.19|92.02||Meghalaya
Pelling||IN|27.30|88.24||Sikkim
Tawang||IN|27.59|91.87||Arunachal Pradesh
Ziro||IN|27.63|93.83||Arunachal Pradesh
Kohima||IN|25.67|94.11||Nagaland
Aizawl||IN|23.73|92.72|AJL|Mizoram
Agartala||IN|23.83|91.28|IXA|Tripura
Somnath||IN|20.89|70.40||Gujarat
Dwarka||IN|22.24|68.97||Gujarat
Gir|Sasan Gir|IN|21.12|70.79||Gujarat
Daman & Diu|Daman;Diu|IN|20.42|72.83||Daman & Diu
Kathmandu|Pokhara|NP|27.72|85.32|KTM|Bagmati
Colombo|Kandy|LK|6.93|79.86|CMB|Western
Dhaka||BD|23.81|90.41|DAC|Dhaka
Thimphu|Paro|BT|27.47|89.64|PBH|Thimphu
Male|Malé|MV|4.18|73.51|MLE|Kaafu
Karachi||PK|24.86|67.01|KHI|Sindh
Lahore||PK|31.55|74.34|LHE|Punjab
Islamabad||PK|33.68|73.05|ISB|Islamabad
Kabul||AF|34.53|69.17|KBL|Kabul
Dubai|दुबई|AE|25.20|55.27|DXB;DWC|Dubai
Abu Dhabi||AE|24.45|54.38|AUH|Abu Dhabi
Doha||QA|25.29|51.53|DOH|Doha
Muscat||OM|23.59|58.41|MCT|Muscat
Riyadh||SA|24.71|46.68|RUH|Riyadh
Jeddah|Mecca;Makkah;Medina|SA|21.49|39.19|JED|Makkah
Kuwait City||KW|29.38|47.99|KWI|Al Asimah
Manama||BH|26.23|50.59|BAH|Capital
Tehran||IR|35.69|51.39|IKA|Tehran
Baghdad||IQ|33.31|44.37|BGW|Baghdad
Tel Aviv||IL|32.09|34.78|TLV|Tel Aviv
Jerusalem||IL|31.77|35.21||Jerusalem
Gaza||PS|31.50|34.47||Gaza
Beirut||LB|33.89|35.50|BEY|Beirut
Amman|Petra|JO|31.95|35.93|AMM|Amman
Damascus||SY|33.51|36.29|DAM|Damascus
Istanbul|İstanbul|TR|41.01|28.98|IST;SAW|Istanbul
Ankara||TR|39.93|32.86|ESB|Ankara
Antalya||TR|36.90|30.70|AYT|Antalya
Cappadocia|Goreme|TR|38.64|34.83|NAV|Nevsehir
Cairo|Giza|EG|30.04|31.24|CAI|Cairo
Sharm El Sheikh||EG|27.92|34.33|SSH|South Sinai
Marrakech|Marrakesh|MA|31.63|-7.99|RAK|Marrakesh-Safi
Casablanca||MA|33.57|-7.59|CMN|Casablanca
Tunis||TN|36.81|10.18|TUN|Tunis
Nairobi|Masai Mara|KE|-1.29|36.82|NBO|Nairobi
Mombasa||KE|-4.04|39.67|MBA|Mombasa
Addis Ababa||ET|9.03|38.74|ADD|Addis Ababa
Lagos||NG|6.52|3.38|LOS|Lagos
Abuja||NG|9.08|7.40|ABV|FCT
Accra||GH|5.60|-0.19|ACC|Greater Accra
Johannesburg||ZA|-26.20|28.05|JNB|Gauteng
Cape Town||ZA|-33.92|18.42|CPT|Western Cape
Zanzibar|Stone Town|TZ|-6.16|39.20|ZNZ|Zanzibar
Dar es Salaam||TZ|-6.79|39.21|DAR|Dar es Salaam
Kigali||RW|-1.94|30.06|KGL|Kigali
Khartoum||SD|15.50|32.56|KRT|Khartoum
Port Louis||MU|-20.16|57.50|MRU|Port Louis
Victoria|Mahe|SC|-4.62|55.45|SEZ|Mahe
Antananarivo||MG|-18.88|47.51|TNR|Analamanga
Bangkok|बैंकॉक|TH|13.76|100.50|BKK;DMK|Bangkok
Phuket||TH|7.88|98.39|HKT|Phuket
Chiang Mai||TH|18.79|98.98|CNX|Chiang Mai
Krabi||TH|8.09|98.91|KBV|Krabi
Pattaya||TH|12.93|100.88|UTP|Chonburi
Singapore|सिंगापुर|SG|1.35|103.82|SIN|Singapore
Kuala Lumpur|KL|MY|3.14|101.69|KUL|Kuala Lumpur
Penang|George Town|MY|5.41|100.33|PEN|Penang
Langkawi||MY|6.35|99.80|LGK|Kedah
Bali|Denpasar;Ubud;Kuta|ID|-8.65|115.22|DPS|Bali
Jakarta||ID|-6.21|106.85|CGK|Jakarta
Yogyakarta|Jogja|ID|-7.80|110.36|YIA|Yogyakarta
Lombok||ID|-8.65|116.32|LOP|West Nusa Tenggara
Manila||PH|14.60|120.98|MNL|Metro Manila
Cebu||PH|10.32|123.89|CEB|Cebu
Boracay||PH|11.97|121.92|MPH|Aklan
Hanoi||VN|21.03|105.85|HAN|Hanoi
Ho Chi Minh City|Saigon|VN|10.82|106.63|SGN|Ho Chi Minh
Da Nang|Hoi An|VN|16.05|108.20|DAD|Da Nang
Ha Long|Halong Bay|VN|20.95|107.08||Quang Ninh
Phnom Penh||KH|11.56|104.92|PNH|Phnom Penh
Siem Reap|Angkor Wat|KH|13.36|103.86|SAI|Siem Reap
Vientiane|Luang Prabang|LA|17.97|102.63|VTE|Vientiane
Yangon|Rangoon|MM|16.84|96.17|RGN|Yangon
Tokyo|東京;टोक्यो|JP|35.68|139.69|HND;NRT|Tokyo
Osaka||JP|34.69|135.50|KIX;ITM|Osaka
Kyoto||JP|35.01|135.77||Kyoto
Hiroshima||JP|34.39|132.46|HIJ|Hiroshima
Sapporo|Hokkaido|JP|43.06|141.35|CTS|Hokkaido
Okinawa|Naha|JP|26.21|127.68|OKA|Okinawa
Fukuoka||JP|33.59|130.40|FUK|Fukuoka
Seoul||KR|37.57|126.98|ICN;GMP|Seoul
Busan||KR|35.18|129.08|PUS|Busan
Jeju||KR|33.50|126.53|CJU|Jeju
Beijing|Peking|CN|39.90|116.41|PEK;PKX|Beijing
Shanghai||CN|31.23|121.47|PVG;SHA|Shanghai
Guangzhou||CN|23.13|113.26|CAN|Guangdong
Shenzhen||CN|22.54|114.06|SZX|Guangdong
Chengdu||CN|30.57|104.07|TFU|Sichuan
Xi'an|Xian|CN|34.34|108.94|XIY|Shaanxi
Hong Kong||HK|22.32|114.17|HKG|Hong Kong
Macau|Macao|MO|22.20|113.54|MFM|Macau
Taipei||TW|25.03|121.57|TPE|Taipei
Ulaanbaatar||MN|47.89|106.91|UBN|Ulaanbaatar
Almaty||KZ|43.24|76.89|ALA|Almaty
Tashkent|Samarkand|UZ|41.30|69.24|TAS|Tashkent
Baku||AZ|40.41|49.87|GYD|Baku
Tbilisi||GE|41.72|44.79|TBS|Tbilisi
Yerevan||AM|40.18|44.51|EVN|Yerevan
Moscow|Москва|RU|55.76|37.62|SVO;DME|Moscow
Saint Petersburg|St Petersburg|RU|59.93|30.36|LED|Saint Petersburg
Kyiv|Kiev|UA|50.45|30.52|KBP|Kyiv
Warsaw||PL|52.23|21.01|WAW|Masovia
Krakow|Kraków|PL|50.06|19.94|KRK|Lesser Poland
Prague|Praha|CZ|50.08|14.44|PRG|Prague
Vienna|Wien|AT|48.21|16.37|VIE|Vienna
Salzburg||AT|47.81|13.04|SZG|Salzburg
Budapest||HU|47.50|19.04|BUD|Budapest
Berlin||DE|52.52|13.40|BER|Berlin
Munich|München|DE|48.14|11.58|MUC|Bavaria
Frankfurt||DE|50.11|8.68|FRA|Hesse
Hamburg||DE|53.55|9.99|HAM|Hamburg
Zurich|Zürich|CH|47.38|8.54|ZRH|Zurich
Geneva|Genève|CH|46.20|6.14|GVA|Geneva
Interlaken|Jungfrau;Lucerne|CH|46.69|7.86||Bern
Paris|पेरिस|FR|48.86|2.35|CDG;ORY|Île-de-France
Nice|French Riviera;Cannes|FR|43.70|7.27|NCE|Provence
Lyon||FR|45.76|4.84|LYS|Auvergne-Rhône-Alpes
Marseille||FR|43.30|5.37|MRS|Provence
London|लंदन|GB|51.51|-0.13|LHR;LGW;STN;LCY|England
Manchester||GB|53.48|-2.24|MAN|England
Edinburgh||GB|55.95|-3.19|EDI|Scotland
Dublin||IE|53.35|-6.26|DUB|Leinster
Amsterdam||NL|52.37|4.90|AMS|North Holland
Brussels||BE|50.85|4.35|BRU|Brussels
Copenhagen||DK|55.68|12.57|CPH|Capital Region
Stockholm||SE|59.33|18.07|ARN|Stockholm
Oslo||NO|59.91|10.75|OSL|Oslo
Helsinki||FI|60.17|24.94|HEL|Uusimaa
Reykjavik||IS|64.15|-21.94|KEF|Capital Region
Madrid||ES|40.42|-3.70|MAD|Madrid
Barcelona||ES|41.39|2.17|BCN|Catalonia
Seville|Sevilla|ES|37.39|-5.98|SVQ|Andalusia
Ibiza||ES|38.91|1.43|IBZ|Balearic Islands
Mallorca|Palma|ES|39.57|2.65|PMI|Balearic Islands
Tenerife|Canary Islands|ES|28.29|-16.63|TFS|Canary Islands
Lisbon|Lisboa|PT|38.72|-9.14|LIS|Lisbon
Porto||PT|41.15|-8.61|OPO|Porto
Rome|Roma|IT|41.90|12.50|FCO|Lazio
Milan|Milano|IT|45.46|9.19|MXP;LIN|Lombardy
Venice|Venezia|IT|45.44|12.32|VCE|Veneto
Florence|Firenze;Tuscany|IT|43.77|11.26|FLR|Tuscany
Naples|Napoli;Amalfi;Pompeii|IT|40.85|14.27|NAP|Campania
Sicily|Palermo;Catania;Etna|IT|37.60|14.02|CTA;PMO|Sicily
Athens|Αθήνα|GR|37.98|23.73|ATH|Attica
Santorini||GR|36.39|25.46|JTR|South Aegean
Mykonos||GR|37.45|25.33|JMK|South Aegean
Crete|Heraklion|GR|35.34|25.13|HER|Crete
Dubrovnik||HR|42.65|18.09|DBV|Dubrovnik-Neretva
Split||HR|43.51|16.44|SPU|Split-Dalmatia
Belgrade||RS|44.79|20.45|BEG|Belgrade
Bucharest||RO|44.43|26.10|OTP|Bucharest
Sofia||BG|42.70|23.32|SOF|Sofia
Valletta||MT|35.90|14.51|MLA|Malta
New York|NYC;Manhattan;न्यूयॉर्क|US|40.71|-74.01|JFK;LGA;EWR|New York
Washington|Washington DC;D.C.|US|38.91|-77.04|IAD;DCA|District of Columbia
Boston||US|42.36|-71.06|BOS|Massachusetts
Chicago||US|41.88|-87.63|ORD;MDW|Illinois
Miami||US|25.76|-80.19|MIA|Florida
Orlando||US|28.54|-81.38|MCO|Florida
Atlanta||US|33.75|-84.39|ATL|Georgia
Dallas||US|32.78|-96.80|DFW|Texas
Houston||US|29.76|-95.37|IAH|Texas
Denver||US|39.74|-104.99|DEN|Colorado
Las Vegas|Vegas|US|36.17|-115.14|LAS|Nevada
Los Angeles|LA;Hollywood|US|34.05|-118.24|LAX|California
San Francisco|SF;Bay Area|US|37.77|-122.42|SFO|California
Seattle||US|47.61|-122.33|SEA|Washington
Honolulu|Hawaii;Maui|US|21.31|-157.86|HNL|Hawaii
Anchorage|Alaska|US|61.22|-149.90|ANC|Alaska
New Orleans||US|29.95|-90.07|MSY|Louisiana
Toronto||CA|43.65|-79.38|YYZ|Ontario
Vancouver||CA|49.28|-123.12|YVR|British Columbia
Montreal|Montréal|CA|45.50|-73.57|YUL|Quebec
Calgary|Banff|CA|51.05|-114.07|YYC|Alberta
Mexico City|CDMX|MX|19.43|-99.13|MEX|CDMX
Cancun|Cancún;Tulum|MX|21.16|-86.85|CUN|Quintana Roo
Havana||CU|23.11|-82.37|HAV|Havana
San Juan||PR|18.47|-66.11|SJU|Puerto Rico
Bogota|Bogotá|CO|4.71|-74.07|BOG|Bogotá
Cartagena||CO|10.39|-75.48|CTG|Bolívar
Lima|Machu Picchu;Cusco|PE|-12.05|-77.04|LIM|Lima
Quito|Galapagos|EC|-0.18|-78.47|UIO|Pichincha
Santiago||CL|-33.45|-70.67|SCL|Santiago
Buenos Aires||AR|-34.60|-58.38|EZE;AEP|Buenos Aires
Rio de Janeiro|Rio|BR|-22.91|-43.17|GIG|Rio de Janeiro
Sao Paulo|São Paulo|BR|-23.55|-46.63|GRU|São Paulo
Sydney|सिडनी|AU|-33.87|151.21|SYD|New South Wales
Melbourne||AU|-37.81|144.96|MEL|Victoria
Brisbane|Gold Coast|AU|-27.47|153.03|BNE|Queensland
Perth||AU|-31.95|115.86|PER|Western Australia
Cairns|Great Barrier Reef|AU|-16.92|145.77|CNS|Queensland
Auckland||NZ|-36.85|174.76|AKL|Auckland
Queenstown||NZ|-45.03|168.66|ZQN|Otago
Wellington||NZ|-41.29|174.78|WLG|Wellington
Nadi|Suva|FJ|-17.76|177.44|NAN|Western
`;
