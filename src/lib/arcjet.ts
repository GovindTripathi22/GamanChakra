import arcjet, { tokenBucket } from "@arcjet/next";

export const aj = arcjet({
    key: process.env.ARCJET_KEY!,
    characteristics: ["userId"], // Track requests by a custom user ID
    rules: [
        // Create a token bucket rate limit. Other algorithms are supported.
        tokenBucket({
            mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
            refillRate: 3, // refill 3 tokens per interval
            interval: "1d", // refill every day
            capacity: 3, // bucket maximum capacity of 3
        }),
    ],
});
