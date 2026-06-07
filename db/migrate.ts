import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "./schema";

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("ERROR: DATABASE_URL is not available in environment variables.");
    process.exit(1);
  }

  console.log("Connecting to Supabase PostgreSQL database...");
  const pool = new pg.Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  const db = drizzle(pool, { schema });

  try {
    console.log("Locating the migration file folder './drizzle'...");
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("🎉 Migrations applied successfully on Supabase database!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration runner failed to apply changes:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
