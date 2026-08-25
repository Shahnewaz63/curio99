import { describe, expect, it } from "vitest";
import { buildDeleteSheetRowRequest } from "./googleSheets";

describe("Google Sheets order-row deletion", () => {
  it("builds a zero-based single-row deletion request", () => {
    expect(buildDeleteSheetRowRequest(12345, 4)).toEqual({
      requests: [{ deleteDimension: { range: { sheetId: 12345, dimension: "ROWS", startIndex: 4, endIndex: 5 } } }],
    });
  });
});
