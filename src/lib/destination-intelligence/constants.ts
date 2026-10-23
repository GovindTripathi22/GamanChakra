export type RegionType =
  | "All India"
  | "North"
  | "South"
  | "West"
  | "East & Central"
  | "North-East & Islands";

export type CategoryType =
  | "All"
  | "Metros"
  | "Heritage"
  | "Spiritual"
  | "Hills"
  | "Coastal"
  | "Wildlife";

export interface DestinationMeta {
  name: string;
  state: string;
  region: Exclude<RegionType, "All India">;
  category: Exclude<CategoryType, "All">;
}

export const DESTINATION_REGIONS: readonly RegionType[] = [
  "All India",
  "North",
  "South",
  "West",
  "East & Central",
  "North-East & Islands",
] as const;

export const DESTINATION_CATEGORIES: readonly CategoryType[] = [
  "All",
  "Metros",
  "Heritage",
  "Spiritual",
  "Hills",
  "Coastal",
  "Wildlife",
] as const;

export const INDIAN_DESTINATIONS_META: DestinationMeta[] = [
  // --- NORTH INDIA ---
  { name: "Delhi", state: "Delhi", region: "North", category: "Metros" },
  { name: "Jaipur", state: "Rajasthan", region: "North", category: "Heritage" },
  { name: "Udaipur", state: "Rajasthan", region: "North", category: "Heritage" },
  { name: "Jodhpur", state: "Rajasthan", region: "North", category: "Heritage" },
  { name: "Jaisalmer", state: "Rajasthan", region: "North", category: "Heritage" },
  { name: "Pushkar", state: "Rajasthan", region: "North", category: "Spiritual" },
  { name: "Bikaner", state: "Rajasthan", region: "North", category: "Heritage" },
  { name: "Mount Abu", state: "Rajasthan", region: "North", category: "Hills" },
  { name: "Chittorgarh", state: "Rajasthan", region: "North", category: "Heritage" },
  { name: "Ranthambore", state: "Rajasthan", region: "North", category: "Wildlife" },
  { name: "Ajmer", state: "Rajasthan", region: "North", category: "Spiritual" },
  { name: "Agra", state: "Uttar Pradesh", region: "North", category: "Heritage" },
  { name: "Varanasi", state: "Uttar Pradesh", region: "North", category: "Spiritual" },
  { name: "Lucknow", state: "Uttar Pradesh", region: "North", category: "Metros" },
  { name: "Ayodhya", state: "Uttar Pradesh", region: "North", category: "Spiritual" },
  { name: "Prayagraj", state: "Uttar Pradesh", region: "North", category: "Spiritual" },
  { name: "Mathura", state: "Uttar Pradesh", region: "North", category: "Spiritual" },
  { name: "Vrindavan", state: "Uttar Pradesh", region: "North", category: "Spiritual" },
  { name: "Amritsar", state: "Punjab", region: "North", category: "Spiritual" },
  { name: "Chandigarh", state: "Chandigarh", region: "North", category: "Metros" },
  { name: "Shimla", state: "Himachal Pradesh", region: "North", category: "Hills" },
  { name: "Manali", state: "Himachal Pradesh", region: "North", category: "Hills" },
  { name: "Dharamshala", state: "Himachal Pradesh", region: "North", category: "Hills" },
  { name: "Kasol", state: "Himachal Pradesh", region: "North", category: "Hills" },
  { name: "Spiti", state: "Himachal Pradesh", region: "North", category: "Hills" },
  { name: "Dalhousie", state: "Himachal Pradesh", region: "North", category: "Hills" },
  { name: "Kullu", state: "Himachal Pradesh", region: "North", category: "Hills" },
  { name: "Rishikesh", state: "Uttarakhand", region: "North", category: "Spiritual" },
  { name: "Haridwar", state: "Uttarakhand", region: "North", category: "Spiritual" },
  { name: "Dehradun", state: "Uttarakhand", region: "North", category: "Hills" },
  { name: "Mussoorie", state: "Uttarakhand", region: "North", category: "Hills" },
  { name: "Nainital", state: "Uttarakhand", region: "North", category: "Hills" },
  { name: "Jim Corbett", state: "Uttarakhand", region: "North", category: "Wildlife" },
  { name: "Auli", state: "Uttarakhand", region: "North", category: "Hills" },
  { name: "Kedarnath", state: "Uttarakhand", region: "North", category: "Spiritual" },
  { name: "Badrinath", state: "Uttarakhand", region: "North", category: "Spiritual" },
  { name: "Gangotri", state: "Uttarakhand", region: "North", category: "Spiritual" },
  { name: "Yamunotri", state: "Uttarakhand", region: "North", category: "Spiritual" },
  { name: "Srinagar", state: "Jammu & Kashmir", region: "North", category: "Hills" },
  { name: "Gulmarg", state: "Jammu & Kashmir", region: "North", category: "Hills" },
  { name: "Pahalgam", state: "Jammu & Kashmir", region: "North", category: "Hills" },
  { name: "Jammu", state: "Jammu & Kashmir", region: "North", category: "Spiritual" },
  { name: "Leh", state: "Ladakh", region: "North", category: "Hills" },
  { name: "Ladakh", state: "Ladakh", region: "North", category: "Hills" },
  { name: "Nubra Valley", state: "Ladakh", region: "North", category: "Hills" },
  { name: "Pangong Tso", state: "Ladakh", region: "North", category: "Hills" },

  // --- WEST INDIA ---
  { name: "Mumbai", state: "Maharashtra", region: "West", category: "Metros" },
  { name: "Pune", state: "Maharashtra", region: "West", category: "Metros" },
  { name: "Nagpur", state: "Maharashtra", region: "West", category: "Metros" },
  { name: "Amravati", state: "Maharashtra", region: "West", category: "Metros" },
  { name: "Aurangabad", state: "Maharashtra", region: "West", category: "Heritage" },
  { name: "Nashik", state: "Maharashtra", region: "West", category: "Spiritual" },
  { name: "Lonavala", state: "Maharashtra", region: "West", category: "Hills" },
  { name: "Mahabaleshwar", state: "Maharashtra", region: "West", category: "Hills" },
  { name: "Alibaug", state: "Maharashtra", region: "West", category: "Coastal" },
  { name: "Shirdi", state: "Maharashtra", region: "West", category: "Spiritual" },
  { name: "Kolhapur", state: "Maharashtra", region: "West", category: "Spiritual" },
  { name: "Goa", state: "Goa", region: "West", category: "Coastal" },
  { name: "Ahmedabad", state: "Gujarat", region: "West", category: "Metros" },
  { name: "Surat", state: "Gujarat", region: "West", category: "Metros" },
  { name: "Vadodara", state: "Gujarat", region: "West", category: "Heritage" },
  { name: "Kutch", state: "Gujarat", region: "West", category: "Heritage" },
  { name: "Gir", state: "Gujarat", region: "West", category: "Wildlife" },
  { name: "Somnath", state: "Gujarat", region: "West", category: "Spiritual" },
  { name: "Dwarka", state: "Gujarat", region: "West", category: "Spiritual" },
  { name: "Daman & Diu", state: "Daman and Diu", region: "West", category: "Coastal" },

  // --- SOUTH INDIA ---
  { name: "Bengaluru", state: "Karnataka", region: "South", category: "Metros" },
  { name: "Mysuru", state: "Karnataka", region: "South", category: "Heritage" },
  { name: "Hampi", state: "Karnataka", region: "South", category: "Heritage" },
  { name: "Coorg", state: "Karnataka", region: "South", category: "Hills" },
  { name: "Gokarna", state: "Karnataka", region: "South", category: "Coastal" },
  { name: "Mangaluru", state: "Karnataka", region: "South", category: "Coastal" },
  { name: "Chikmagalur", state: "Karnataka", region: "South", category: "Hills" },
  { name: "Badami", state: "Karnataka", region: "South", category: "Heritage" },
  { name: "Chennai", state: "Tamil Nadu", region: "South", category: "Metros" },
  { name: "Srirangam", state: "Tamil Nadu", region: "South", category: "Spiritual" },
  { name: "Madurai", state: "Tamil Nadu", region: "South", category: "Spiritual" },
  { name: "Rameswaram", state: "Tamil Nadu", region: "South", category: "Spiritual" },
  { name: "Kanyakumari", state: "Tamil Nadu", region: "South", category: "Coastal" },
  { name: "Ooty", state: "Tamil Nadu", region: "South", category: "Hills" },
  { name: "Kodaikanal", state: "Tamil Nadu", region: "South", category: "Hills" },
  { name: "Coimbatore", state: "Tamil Nadu", region: "South", category: "Metros" },
  { name: "Mahabalipuram", state: "Tamil Nadu", region: "South", category: "Heritage" },
  { name: "Thanjavur", state: "Tamil Nadu", region: "South", category: "Heritage" },
  { name: "Puducherry", state: "Puducherry", region: "South", category: "Coastal" },
  { name: "Kochi", state: "Kerala", region: "South", category: "Coastal" },
  { name: "Thiruvananthapuram", state: "Kerala", region: "South", category: "Coastal" },
  { name: "Kerala", state: "Kerala", region: "South", category: "Coastal" },
  { name: "Alleppey", state: "Kerala", region: "South", category: "Coastal" },
  { name: "Munnar", state: "Kerala", region: "South", category: "Hills" },
  { name: "Varkala", state: "Kerala", region: "South", category: "Coastal" },
  { name: "Wayanad", state: "Kerala", region: "South", category: "Hills" },
  { name: "Hyderabad", state: "Telangana", region: "South", category: "Metros" },
  { name: "Warangal", state: "Telangana", region: "South", category: "Heritage" },
  { name: "Visakhapatnam", state: "Andhra Pradesh", region: "South", category: "Coastal" },
  { name: "Vijayawada", state: "Andhra Pradesh", region: "South", category: "Spiritual" },
  { name: "Tirupati", state: "Andhra Pradesh", region: "South", category: "Spiritual" },

  // --- EAST & CENTRAL INDIA ---
  { name: "Kolkata", state: "West Bengal", region: "East & Central", category: "Metros" },
  { name: "Darjeeling", state: "West Bengal", region: "East & Central", category: "Hills" },
  { name: "Kalimpong", state: "West Bengal", region: "East & Central", category: "Hills" },
  { name: "Sundarbans", state: "West Bengal", region: "East & Central", category: "Wildlife" },
  { name: "Digha", state: "West Bengal", region: "East & Central", category: "Coastal" },
  { name: "Bhubaneswar", state: "Odisha", region: "East & Central", category: "Heritage" },
  { name: "Puri", state: "Odisha", region: "East & Central", category: "Spiritual" },
  { name: "Konark", state: "Odisha", region: "East & Central", category: "Heritage" },
  { name: "Patna", state: "Bihar", region: "East & Central", category: "Metros" },
  { name: "Bodh Gaya", state: "Bihar", region: "East & Central", category: "Spiritual" },
  { name: "Nalanda", state: "Bihar", region: "East & Central", category: "Heritage" },
  { name: "Rajgir", state: "Bihar", region: "East & Central", category: "Spiritual" },
  { name: "Ranchi", state: "Jharkhand", region: "East & Central", category: "Metros" },
  { name: "Deoghar", state: "Jharkhand", region: "East & Central", category: "Spiritual" },
  { name: "Jamshedpur", state: "Jharkhand", region: "East & Central", category: "Metros" },
  { name: "Bhopal", state: "Madhya Pradesh", region: "East & Central", category: "Metros" },
  { name: "Indore", state: "Madhya Pradesh", region: "East & Central", category: "Metros" },
  { name: "Khajuraho", state: "Madhya Pradesh", region: "East & Central", category: "Heritage" },
  { name: "Ujjain", state: "Madhya Pradesh", region: "East & Central", category: "Spiritual" },
  { name: "Gwalior", state: "Madhya Pradesh", region: "East & Central", category: "Heritage" },
  { name: "Jabalpur", state: "Madhya Pradesh", region: "East & Central", category: "Heritage" },
  { name: "Orchha", state: "Madhya Pradesh", region: "East & Central", category: "Heritage" },
  { name: "Kanha", state: "Madhya Pradesh", region: "East & Central", category: "Wildlife" },
  { name: "Bandhavgarh", state: "Madhya Pradesh", region: "East & Central", category: "Wildlife" },
  { name: "Raipur", state: "Chhattisgarh", region: "East & Central", category: "Metros" },
  { name: "Bastar", state: "Chhattisgarh", region: "East & Central", category: "Wildlife" },

  // --- NORTH-EAST INDIA & ISLANDS ---
  { name: "Guwahati", state: "Assam", region: "North-East & Islands", category: "Metros" },
  { name: "Kaziranga", state: "Assam", region: "North-East & Islands", category: "Wildlife" },
  { name: "Majuli", state: "Assam", region: "North-East & Islands", category: "Heritage" },
  { name: "Shillong", state: "Meghalaya", region: "North-East & Islands", category: "Hills" },
  { name: "Cherrapunji", state: "Meghalaya", region: "North-East & Islands", category: "Hills" },
  { name: "Dawki", state: "Meghalaya", region: "North-East & Islands", category: "Hills" },
  { name: "Gangtok", state: "Sikkim", region: "North-East & Islands", category: "Hills" },
  { name: "Pelling", state: "Sikkim", region: "North-East & Islands", category: "Hills" },
  { name: "Tawang", state: "Arunachal Pradesh", region: "North-East & Islands", category: "Hills" },
  { name: "Ziro", state: "Arunachal Pradesh", region: "North-East & Islands", category: "Hills" },
  { name: "Imphal", state: "Manipur", region: "North-East & Islands", category: "Metros" },
  { name: "Kohima", state: "Nagaland", region: "North-East & Islands", category: "Heritage" },
  { name: "Aizawl", state: "Mizoram", region: "North-East & Islands", category: "Hills" },
  { name: "Agartala", state: "Tripura", region: "North-East & Islands", category: "Heritage" },
  { name: "Andaman", state: "Andaman and Nicobar", region: "North-East & Islands", category: "Coastal" },
  { name: "Lakshadweep", state: "Lakshadweep", region: "North-East & Islands", category: "Coastal" },
];

export const ALL_INDIAN_DESTINATIONS = INDIAN_DESTINATIONS_META.map((d) => d.name);
