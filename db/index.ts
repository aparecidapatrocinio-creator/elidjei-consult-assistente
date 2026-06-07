import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let poolInstance: pg.Pool | null = null;

export function getDb() {
  if (!dbInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not defined in environment variables. Please set it in Settings secrets."
      );
    }

    try {
      poolInstance = new pg.Pool({
        connectionString,
        // Supabase requires SSL connect or connection drops, so we allow self-signed certs
        ssl: {
          rejectUnauthorized: false,
        },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      dbInstance = drizzle(poolInstance, { schema });
    } catch (err: any) {
      console.error("Failed to initialize Node-Postgres pool:", err);
      throw err;
    }
  }
  return dbInstance;
}
