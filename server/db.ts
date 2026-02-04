import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import ws from "ws";
import * as schema from "../shared/schema";

// Configure Neon WebSocket (only needed for Neon)
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detect if we're using Neon or standard PostgreSQL (Railway)
const isNeon = process.env.DATABASE_URL.includes('neon');

// Create appropriate pool and drizzle instance
let pool: NeonPool | PgPool;
let db: ReturnType<typeof drizzle> | ReturnType<typeof drizzlePg>;

if (isNeon) {
  // Neon serverless configuration
  console.log('[DB] Using Neon Serverless PostgreSQL');
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool as NeonPool, schema });
} else {
  // Standard PostgreSQL (Railway, local, etc.)
  console.log('[DB] Using Standard PostgreSQL (Railway/Local)');
  pool = new PgPool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : undefined
  });
  db = drizzlePg({ client: pool as PgPool, schema });
}

export { pool, db };
