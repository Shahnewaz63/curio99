import { describe, expect, it } from "vitest";
import { isLocalOrderStoreEnabled } from "./db";

describe("local database fallback selection", () => {
  it("uses the local order store when a VSCode environment has an unusable copied database URL", () => {
    expect(isLocalOrderStoreEnabled({ NODE_ENV: "development", DATABASE_URL: "mysql://unavailable" })).toBe(true);
  });

  it("keeps the hosted database path in a managed runtime or when explicitly requested", () => {
    expect(isLocalOrderStoreEnabled({ NODE_ENV: "development", DATABASE_URL: "mysql://managed", BUILT_IN_FORGE_API_URL: "https://managed" })).toBe(false);
    expect(isLocalOrderStoreEnabled({ NODE_ENV: "development", DATABASE_URL: "mysql://chosen", CURIO_USE_REMOTE_DATABASE: "1" })).toBe(false);
  });
});
