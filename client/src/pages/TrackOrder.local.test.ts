import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pagePath = fileURLToPath(new URL("./TrackOrder.tsx", import.meta.url));
const source = readFileSync(pagePath, "utf8");

describe("local tracking guidance", () => {
  it("distinguishes an unreachable local server from an absent order", () => {
    expect(source).toContain("The local server could not be reached.");
    expect(source).toContain("Run");
    expect(source).toContain("!tracking.error && !order");
  });
});
