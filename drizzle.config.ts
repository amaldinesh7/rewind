import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  schema: ["./src/db/schema.ts", "./src/db/platform-metadata.ts"],
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
