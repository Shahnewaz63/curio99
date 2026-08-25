import { Client } from "pg";
import { afterAll, describe, expect, it } from "vitest";

const connectionString = process.env.POSTGRES_DATABASE_URL;
const client = connectionString
  ? new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  : null;

afterAll(async () => {
  await client?.end();
});

describe("PostgreSQL order-history connection", () => {
  it("connects to the protected database using a read-only health query", async () => {
    expect(connectionString).toBeTruthy();
    await client!.connect();
    const result = await client!.query<{ ready: number }>("SELECT 1 AS ready");
    expect(result.rows[0]?.ready).toBe(1);
  });
});
