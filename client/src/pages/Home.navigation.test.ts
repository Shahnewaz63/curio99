import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(import.meta.dirname, "Home.tsx"), "utf8");

describe("homepage preview navigation", () => {
  it("keeps the numbered preview heading and direct order and tracking destinations", () => {
    expect(source).toContain(">02</span>");
    expect(source).toContain('const goToOrder = () => scrollToSection("order");');
    expect(source).toContain('const goToTracking = () => window.location.assign("/track-order");');
    expect(source).toContain("03</span> Track order");
    expect(source).toContain("onClick={goToOrder}");
    expect(source).toContain("onClick={goToTracking}");
    expect(source).toContain('style={{ fontSize: "37px" }}>02</span>');
    expect(source).toContain('style={{ fontSize: "27px" }}>Read a few pages.</h2>');
  });

  it("keeps the approved Curio mission, team, and contact copy", () => {
    expect(source).toContain('label="OUR MISSION"');
    expect(source).toContain('title="Technology that works for you."');
    expect(source).toContain('name: "Md Atikuzzaman"');
    expect(source).toContain('role: "Co-founder"');
    expect(source).toContain('0{index + 1} / CURIO');
    expect(source).toContain('contactNumber: "+880 1603453483"');
    expect(source).toContain("Grow smarter, Live better.");
    expect(source).toContain("bookPrice: 249");
    expect(source).toContain("line-through");
    expect(source).toContain("৳299");
    expect(source).toContain("৳249");
    expect(source).toContain("Transaction ID required.");
    expect(source).toContain("Add the bKash transaction ID.");
    expect(source).toContain("whatsAppNumber: \"8801603453483\"");
    expect(source).toContain("whatsapp-footer-icon-round_167860f8.png");
    expect(source).toContain("Loading preview page…");
    expect(source).toContain("Preview page could not load.");
    expect(source).toContain("fetchPriority={page === 0 ? \"high\" : \"auto\"}");
    expect(source).toContain("const preload = new Image();");
    expect(source).toContain("Make sure the local server is running with pnpm dev");
    expect(source).toContain("1XNaPlbdi3m7FkZ-mAKKoaIJmiLm0di_L");
    expect(source).toContain("Open PDF");
  });
});
