"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@clerk/nextjs/server";
import { aj } from "@/lib/arcjet";
import { headers } from "next/headers";
import { getCoordinates } from "@/lib/geocoding";

export interface TripData {
  origin: string;
  destination: string;
  days: string;
  budget: string;
  travelers: string;
  vibe: string;
  startDate?: string;
  travelMode?: string;
}

export interface Hotel {
  name: string;
  address: string;
  price: string;
  image_query: string;
  image_url?: string;
  geo_coordinates?: {
    lat: number;
    lng: number;
  };
  rating: number;
  description?: string;
}

export interface Activity {
  place_name: string;
  details: string;
  image_query: string;
  image_url?: string;
  ticket_price: string;
  time: string;
  logistics: string;
  geo_coordinates: {
    lat: number;
    lng: number;
  };
}

export interface DayItinerary {
  day: number;
  theme: string;
  activities: Activity[];
}

export interface TransportationStep {
  mode: "Flight" | "Train" | "Bus" | "Taxi" | "Local";
  details: string;
  estimated_cost: string;
  duration: string;
  distance?: string;
}

export interface GeneratedTrip {
  trip_details: {
    destination: string;
    duration: string;
    budget: string;
    vibe: string;
    total_estimated_cost: string;
  };
  transportation_plan: TransportationStep[];
  hotels: Hotel[];
  itinerary: DayItinerary[];
}

interface PlaceData {
  image_url: string | null;
  coordinates: { lat: number; lng: number } | null;
  rating?: number;
}

async function fetchPlaceData(query: string, destination?: string): Promise<PlaceData> {
  // Use Pollinations.ai for AI-generated images (free, no key)
  // This generates an image based on the text description
  const prompt = encodeURIComponent(`${query} cinematic travel photography 4k`);
  const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=800&height=600&nologo=true`;

  // Use Nominatim for coordinates (free, no key)
  let coordinates = await getCoordinates(query);
  if (!coordinates && destination) {
    coordinates = await getCoordinates(`${query} ${destination}`);
  }

  return {
    image_url: imageUrl,
    coordinates: coordinates,
    rating: 4.5
  };
}

export async function generateTrip(tripData: TripData): Promise<GeneratedTrip> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized: Please sign in to generate a trip.");
  }

  // Rate Limiting & Access Control
  const adminIds = (process.env.ADMIN_USER_ID || "").split(",").map(id => id.trim());
  const isAdmin = adminIds.includes(userId);

  if (!isAdmin) {
    const req = {
      headers: await headers(),
    };
    // @ts-ignore
    const decision = await aj.protect(req, { userId });
    if (decision.isDenied()) {
      throw new Error("Rate limit exceeded. Free users are limited to 3 trips per day. Please contact admin for access.");
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const destinations = tripData.destination.split("|").map(d => d.trim()).filter(Boolean);
  const isMultiCity = destinations.length > 1;
  const destinationString = isMultiCity ? destinations.join(" -> ") : tripData.destination;

  const prompt = `You are a professional travel planner AI. Plan a detailed trip from ${tripData.origin} to ${destinationString}.

Trip Parameters:
- Origin: ${tripData.origin} (START HERE)
- Destinations: ${destinationString} ${isMultiCity ? "(Multi-City Trip)" : ""}
- Duration: ${tripData.days} days (Total)
- Start Date: ${tripData.startDate || "Not specified"} (Use this for seasonal context and day-of-week logic)
- Budget: ${tripData.budget} (Note: If this is a numeric value, treat it as the budget PER PERSON. Multiply by the number of travelers to estimate the total trip budget constraint).
- Travelers: ${tripData.travelers || "2 People (Couple)"}
- Vibe: ${tripData.vibe}
- Preferred Travel Mode: ${tripData.travelMode || "Any"} (Prioritize this mode if feasible)

CRITICAL INSTRUCTIONS:
1. **Route:** Start from ${tripData.origin}. ${isMultiCity ? `Plan the route sequentially: ${tripData.origin} -> ${destinations.join(" -> ")} -> Return.` : ""}
2. **Currency:** ALL prices must be in Indian Rupees (₹).
3. **Budget:** The total cost must be close to or under the total budget (Per Person * Travelers).
4. **Logistics:** Provide a step-by-step guide on how to reach the first destination, AND how to travel between each destination if multi-city.
   - **Prioritize ${tripData.travelMode || "convenience"}** for all travel legs.
   - If "Train" is preferred or selected, YOU MUST PROVIDE ACCURATE TRAIN NAMES AND NUMBERS (e.g., "12951 Rajdhani Express").
   - If "Flight" is preferred, suggest specific airports and typical flight durations.
   - If "Bus" is preferred, mention bus types (Volvo/Sleeper) and major operators.
5. **Hotels:** Provide at least one hotel option FOR EACH destination city.
6. **Itinerary:** Distribute the ${tripData.days} days across the destinations intelligently.
7. **Dates:** If Start Date is provided (${tripData.startDate}), ensure the itinerary days match the actual dates (e.g., "Day 1 (Mon, 12 Oct)").

Generate a JSON response with this EXACT structure:
{
  "trip_details": {
    "destination": "${destinationString}",
    "duration": "${tripData.days} Days",
    "budget": "${tripData.budget}",
    "vibe": "${tripData.vibe}",
    "total_estimated_cost": "₹XXXXX (Total for all travelers)"
  },
  "transportation_plan": [
    {
      "mode": "Train/Bus/Flight/Taxi",
      "details": "Detailed instruction (e.g., Train Name & Number). For multi-city, include travel between cities.",
      "estimated_cost": "₹XXX",
      "duration": "X hours",
      "distance": "X km"
    }
  ],
  "hotels": [
    {
      "name": "Hotel Name",
      "address": "Full Address (City Name)",
      "price": "₹XXX/night",
      "image_query": "Hotel Name City Name",
      "rating": 4.5,
      "description": "Brief description"
    }
  ],
  "itinerary": [
    {
      "day": 1,
      "theme": "Day theme (City Name)",
      "activities": [
        {
          "place_name": "Place Name",
          "details": "What to do there",
          "image_query": "Place Name City Name",
          "ticket_price": "₹XX or Free",
          "time": "HH:MM AM/PM",
          "logistics": "How to reach here",
          "geo_coordinates": { "lat": 0.0, "lng": 0.0 }
        }
      ]
    }
  ]
}

Return ONLY the JSON object.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    const generatedTrip = JSON.parse(jsonText) as GeneratedTrip;

    if (!generatedTrip.trip_details || !generatedTrip.hotels || !generatedTrip.itinerary) {
      throw new Error("Invalid response structure from AI");
    }

    // Enrich with Real Images and Coordinates
    if (generatedTrip.hotels) {
      await Promise.all(generatedTrip.hotels.map(async (hotel) => {
        const data = await fetchPlaceData(hotel.image_query);
        if (data.image_url) hotel.image_url = data.image_url;
        if (data.coordinates) hotel.geo_coordinates = data.coordinates;
        if (data.rating) hotel.rating = data.rating;
      }));
    }

    if (generatedTrip.itinerary) {
      for (const day of generatedTrip.itinerary) {
        await Promise.all(day.activities.map(async (activity) => {
          const data = await fetchPlaceData(activity.image_query);
          if (data.image_url) activity.image_url = data.image_url;
          if (data.coordinates) activity.geo_coordinates = data.coordinates;
        }));
      }
    }

    return generatedTrip;
  } catch (error) {
    console.error("Error generating trip:", error);
    throw new Error(`Failed to generate trip: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
