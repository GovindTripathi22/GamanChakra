import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        const user = await currentUser();

        if (!userId || !user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const priceId = "price_H5ggYJDqQ8B"; // We will set this dynamically or use a fixed one. For now, we create a specialized session.
        // Actually, for a dynamic implementation without pre-creating products in Stripe Dashboard manually multiple times,
        // we can create a "on-the-fly" price or use a lookup.
        // BUT for simplicity and speed, we'll create a session with line_items defined directly if possible, OR standard price.
        // Better: Define line_items with price_data (on-the-fly).

        const session = await stripe.checkout.sessions.create({
            success_url: `${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}/../payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}/../pricing`,
            payment_method_types: ["card"],
            mode: "payment",
            billing_address_collection: "auto",
            customer_email: user.emailAddresses[0].emailAddress,
            line_items: [
                {
                    price_data: {
                        currency: "inr",
                        product_data: {
                            name: "Pro Day Pass",
                            description: "Unlimited AI access for 24 hours",
                        },
                        unit_amount: 700, // ₹7.00
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                userId: userId,
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error("[STRIPE_CHECKOUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
