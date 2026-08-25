import { describe, expect, it } from "vitest";

describe("Curio project title configuration", () => {
  it("uses the Curio-branded application title", () => {
    expect(process.env.VITE_APP_TITLE).toBe("Curio");
  });
});
