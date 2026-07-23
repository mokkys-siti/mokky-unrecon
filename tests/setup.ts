import { config } from "dotenv";

// RLS tests run outside Next.js, so load .env.local ourselves.
config({ path: ".env.local" });
