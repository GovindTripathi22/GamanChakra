import arcjet, { tokenBucket } from "@arcjet/next";

export const aj = arcjet({
    key: process.env.ARCJET_KEY!,
    characteristics: ["userId"], // Track requests by a custom user ID
    rules: [
        // Create a token bucket rate limit. Other algorithms are supported.
        tokenBucket({
            mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
            refillRate: 5, // refill 5 tokens per interval
            interval: "1d", // refill every day
            capacity: 5, // bucket maximum capacity of 5
        }),
    ],
});
