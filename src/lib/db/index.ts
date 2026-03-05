import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL ?? "postgresql://localhost:5432/postgres";

// For Supabase Connection Pooler (transaction mode), use prepare: false
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
