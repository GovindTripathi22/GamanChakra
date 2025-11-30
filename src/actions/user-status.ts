"use server";

import { auth } from "@clerk/nextjs/server";

export async function getUserStatus() {
    const { userId } = await auth();

    if (!userId) {
        return { isAdmin: false, isAuthenticated: false };
    }

    const adminIds = (process.env.ADMIN_USER_ID || "").split(",").map(id => id.trim());
    const isAdmin = adminIds.includes(userId);

    return { isAdmin, isAuthenticated: true };
}
