import { describe, expect, it } from "vitest";
import { getOrderHistoryRuntimeStatus, isLocalOrderStoreEnabled } from "./db.js";

describe("local database fallback selection", () => {
  it("requires Neon PostgreSQL in a VSCode runtime instead of silently falling back to local JSON", () => {
    expect(isLocalOrderStoreEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(getOrderHistoryRuntimeStatus({ NODE_ENV: "development" })).toMatchObject({ provider: "neon", configured: false });
  });

  it("recognizes both the Neon name and legacy PostgreSQL name", () => {
    expect(getOrderHistoryRuntimeStatus({ NODE_ENV: "development", NEON_DATABASE_URL: "postgresql://neon" }).configured).toBe(true);
    expect(getOrderHistoryRuntimeStatus({ NODE_ENV: "development", POSTGRES_DATABASE_URL: "postgresql://legacy" }).configured).toBe(true);
  });
});
