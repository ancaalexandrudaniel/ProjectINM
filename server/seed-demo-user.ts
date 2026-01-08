/**
 * Seed Demo User Script
 * Creates the demo user for testing authentication
 */
import "dotenv/config";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedDemoUser() {
    console.log("🌱 Seeding demo user...");

    try {
        const existingDemo = await db
            .select()
            .from(users)
            .where(eq(users.email, "demo@inm.ro"))
            .limit(1);

        if (existingDemo.length === 0) {
            await db.insert(users).values({
                username: "demo",
                password: "demo123", // In production, use bcrypt
                fullName: "Utilizator Demo",
                email: "demo@inm.ro",
                subscriptionTier: "premium",
                isVerified: true,
            });
            console.log("✅ Created demo user:");
            console.log("   📧 Email: demo@inm.ro");
            console.log("   🔑 Password: demo123");
            console.log("   ⭐ Tier: premium");
        } else {
            console.log("ℹ️  Demo user already exists (demo@inm.ro)");
        }
    } catch (error) {
        console.error("❌ Error seeding demo user:", error);
        throw error;
    }
}

seedDemoUser()
    .then(() => {
        console.log("\n✨ Done!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
