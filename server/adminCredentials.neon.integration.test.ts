import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isCredentialAdminConfigured, verifyCredentialAdminLogin } from "./adminCredentials.js";

const previousVitest = process.env.VITEST;
const previousNodeEnv = process.env.NODE_ENV;

beforeAll(() => {
  delete process.env.VITEST;
  process.env.NODE_ENV = "development";
});

afterAll(() => {
  if (previousVitest === undefined) delete process.env.VITEST;
  else process.env.VITEST = previousVitest;
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
});

describe.sequential("Neon credential-admin authentication", () => {
  it("uses the persisted one-way credential record without exposing it", async () => {
    const id = process.env.ADMIN_LOGIN_ID ?? "";
    const password = process.env.ADMIN_LOGIN_PASSWORD ?? "";

    expect(await isCredentialAdminConfigured()).toBe(true);
    expect(await verifyCredentialAdminLogin(id, password)).toBe(true);
    expect(await verifyCredentialAdminLogin(id, `${password}-incorrect`)).toBe(false);
  });
});
