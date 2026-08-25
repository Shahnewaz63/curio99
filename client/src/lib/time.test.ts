import { describe, expect, it } from "vitest";
import { BANGLADESH_TIME_ZONE, formatBangladeshDateTime } from "./time";

describe("Bangladesh time formatting", () => {
  it("renders a UTC instant using Asia/Dhaka time", () => {
    expect(BANGLADESH_TIME_ZONE).toBe("Asia/Dhaka");
    expect(formatBangladeshDateTime("2026-08-25T00:00:00.000Z")).toContain("6:00");
  });
});
