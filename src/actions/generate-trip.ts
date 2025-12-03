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

  const prompt = `You are a professional travel planner AI. Plan a detailed trip from ${tripData.origin} to ${tripData.destination}.

Trip Parameters:
- Origin: ${tripData.origin} (START HERE. Do NOT assume any other starting point.)
- Destination: ${tripData.destination}
- Duration: ${tripData.days} days
- Budget: ${tripData.budget} (Strictly adhere to this budget in Indian Rupees ₹)
- Travelers: ${tripData.travelers}
- Vibe: ${tripData.vibe}

CRITICAL INSTRUCTIONS:
1. **Origin Check:** You MUST start the journey EXACTLY from ${tripData.origin}. If it is a small town, provide the route (Bus/Train/Taxi) to the nearest major transport hub (Airport/Junction) first.
2. **Currency:** ALL prices must be in Indian Rupees (₹).
3. **Budget:** The total cost of hotels, travel, and activities MUST be close to or under ${tripData.budget}.
4. **Logistics:** You must provide a step-by-step guide on how to reach ${tripData.destination} from ${tripData.origin}.
5. **Local Travel:** For every activity, explain how to reach there.
6. **Trains:** If a train route exists, you MUST include it in the transportation plan with the Train Name and Number.

Generate a JSON response with this EXACT structure:
{
  "trip_details": {
    "destination": "${tripData.destination}",
    "duration": "${tripData.days} Days",
    "budget": "${tripData.budget}",
    "vibe": "${tripData.vibe}",
    "total_estimated_cost": "₹XXXXX"
  },
  "transportation_plan": [
    {
      "mode": "Train/Bus/Flight/Taxi",
      "details": "Detailed instruction (e.g., Train Name & Number, Flight No). If starting from a small town, explain the connection.",
      "estimated_cost": "₹XXX",
      "duration": "X hours",
      "distance": "X km"
    }
  ],
  "hotels": [
    {
      "name": "Hotel Name",
      "address": "Full Address",
      "price": "₹XXX/night",
      "image_query": "Hotel Name ${tripData.destination}",
      "rating": 4.5,
      "description": "Brief description"
    }
  ],
  "itinerary": [
    {
      "day": 1,
      "theme": "Day theme",
      "activities": [
        {
          "place_name": "Place Name",
          "details": "What to do there",
          "image_query": "Place Name ${tripData.destination}",
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
        const data = await fetchPlaceData(hotel.image_query, tripData.destination);
        if (data.image_url) hotel.image_url = data.image_url;
        if (data.coordinates) hotel.geo_coordinates = data.coordinates;
        if (data.rating) hotel.rating = data.rating;
      }));
    }

    if (generatedTrip.itinerary) {
      for (const day of generatedTrip.itinerary) {
        await Promise.all(day.activities.map(async (activity) => {
          const data = await fetchPlaceData(activity.image_query, tripData.destination);
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
