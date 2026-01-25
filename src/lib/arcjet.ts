import arcjet, { tokenBucket } from "@arcjet/next";

let aj: { protect: (req: any, opts: any) => Promise<any> };

try {
    if (process.env.ARCJET_KEY) {
        aj = arcjet({
            key: process.env.ARCJET_KEY,
            characteristics: ["userId"],
            rules: [
                tokenBucket({
                    mode: "LIVE",
                    refillRate: 3,
                    interval: "1d",
                    capacity: 3,
                }),
            ],
        });
    } else {
        throw new Error("ARCJET_KEY missing");
    }
} catch (error) {
    console.warn("Arcjet failed to initialize (using fallback):", error);
    aj = {
        protect: async () => ({
            isDenied: () => false,
            isAllowed: () => true,
            reason: { isRateLimit: () => false },
        }),
    };
}

export { aj };
