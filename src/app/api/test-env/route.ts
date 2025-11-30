import { NextResponse } from "next/server";

export async function GET() {
    const geminiKey = process.env.GEMINI_API_KEY;
    const mapboxKey = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    return NextResponse.json({
        gemini_configured: !!geminiKey,
        gemini_key_length: geminiKey ? geminiKey.length : 0,
        mapbox_configured: !!mapboxKey,
        clerk_configured: !!clerkKey,
        message: "If any of these are false, check your .env.local file and RESTART the server."
    });
}
