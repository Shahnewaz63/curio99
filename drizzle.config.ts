import { defineConfig } from "drizzle-kit";

const connectionString = process.env.POSTGRES_DATABASE_URL;
if (!connectionString) {
  throw new Error("POSTGRES_DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle-pg",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
