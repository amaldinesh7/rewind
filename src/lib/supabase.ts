import { createClient } from "@supabase/supabase-js";

// Supabase client — used ONLY for Storage operations (file uploads)
// All database queries go through Drizzle ORM (src/db/index.ts)

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
