import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env.local (Next.js convention); drizzle-kit runs outside Next.js
config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local (see .env.example)"
  );
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
