import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get("Stripe-Signature") as string;

    let event;

    if (!stripe) {
        return new NextResponse("Stripe not configured", { status: 503 });
    }

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (error: any) {
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    const session = event.data.object as any;

    if (event.type === "checkout.session.completed") {
        // Retrieve the user ID from the metadata
        const userId = session.metadata?.userId;
        if (!userId) {
            return new NextResponse("User ID missing in metadata", { status: 400 });
        }

        // Initialize Clerk Client
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

        // Grant "Pro" access
        // Expires in 24 hours (Day Pass)
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

        await clerk.users.updateUserMetadata(userId, {
            publicMetadata: {
                isPro: true,
                proExpires: expiresAt,
            },
        });
    }

    return new NextResponse(null, { status: 200 });
}
