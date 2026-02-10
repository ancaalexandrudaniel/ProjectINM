/**
 * Seed Users Script — Demo + Admin
 * Creates the demo user and admin user with bcrypt-hashed passwords
 *
 * Usage: npx tsx server/seed-demo-user.ts
 */
import "dotenv/config";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

interface SeedUser {
    username: string;
    email: string;
    password: string;       // plaintext — will be hashed
    fullName: string;
    role: "student" | "admin";
    subscriptionTier: "free" | "pro" | "premium";
}

const SEED_USERS: SeedUser[] = [
    {
        username: "demo",
        email: "demo@inm.ro",
        password: "demo123",
        fullName: "Utilizator Demo",
        role: "student",
        subscriptionTier: "premium",
    },
    {
        username: "admin",
        email: "admin@inm.ro",
        password: "admin2025!",
        fullName: "Administrator INM",
        role: "admin",
        subscriptionTier: "premium",
    },
];

async function seedUsers() {
    console.log("🌱 Seeding users (demo + admin)...\n");

    for (const seedUser of SEED_USERS) {
        try {
            const [existing] = await db
                .select()
                .from(users)
                .where(eq(users.email, seedUser.email))
                .limit(1);

            const hashedPassword = await bcrypt.hash(seedUser.password, SALT_ROUNDS);

            if (existing) {
                // Update existing user — re-hash password + ensure role is correct
                await db
                    .update(users)
                    .set({
                        password: hashedPassword,
                        role: seedUser.role,
                        subscriptionTier: seedUser.subscriptionTier,
                        isVerified: true,
                    })
                    .where(eq(users.email, seedUser.email));

                console.log(`🔄 Updated ${seedUser.role} user:`);
            } else {
                await db.insert(users).values({
                    username: seedUser.username,
                    password: hashedPassword,
                    fullName: seedUser.fullName,
                    email: seedUser.email,
                    role: seedUser.role,
                    subscriptionTier: seedUser.subscriptionTier,
                    isVerified: true,
                });
                console.log(`✅ Created ${seedUser.role} user:`);
            }

            console.log(`   📧 Email: ${seedUser.email}`);
            console.log(`   🔑 Password: ${seedUser.password}`);
            console.log(`   👤 Role: ${seedUser.role}`);
            console.log(`   ⭐ Tier: ${seedUser.subscriptionTier}`);
            console.log(`   🔒 Password hashed with bcrypt (${SALT_ROUNDS} rounds)\n`);
        } catch (error) {
            console.error(`❌ Error seeding ${seedUser.email}:`, error);
            throw error;
        }
    }
}

seedUsers()
    .then(() => {
        console.log("✨ All users seeded successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
