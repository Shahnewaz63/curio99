import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./_core/cookies";

describe("local admin cookies", () => {
  it("uses a browser-compatible localhost cookie configuration", () => {
    const options = getSessionCookieOptions({ hostname: "localhost", protocol: "http", headers: {} } as never);
    expect(options).toMatchObject({ sameSite: "lax", secure: false, httpOnly: true });
  });
});
