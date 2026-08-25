import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const appPath = fileURLToPath(new URL("./App.tsx", import.meta.url));
const source = readFileSync(appPath, "utf8");

describe("route loading", () => {
  it("code-splits each primary route behind a visible Curio loading fallback", () => {
    expect(source).toContain('lazy(() => import("./pages/Home"))');
    expect(source).toContain('lazy(() => import("./pages/OrderSuccess"))');
    expect(source).toContain('lazy(() => import("./pages/TrackOrder"))');
    expect(source).toContain('lazy(() => import("./pages/AdminOrders"))');
    expect(source).toContain("Loading Curio…");
  });
});
