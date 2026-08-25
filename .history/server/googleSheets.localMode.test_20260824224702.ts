import { afterEach, describe, expect, it } from "vitest";
import { getGoogleSheetsSyncStatus, hasGoogleSheetsConfigurationAttempt, isGoogleSheetsSyncEnabled } from "./googleSheets.js";

const sheetKeys = ["CURIO_DISABLE_SHEETS_SYNC", "GOOGLE_SERVICE_ACCOUNT_JSON", "GOOGLE_SHEETS_SPREADSHEET_ID"] as const;
const initialValues = Object.fromEntries(sheetKeys.map(key => [key, process.env[key]]));

afterEach(() => {
  for (const key of sheetKeys) {
    const value = initialValues[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("local Google Sheets mode", () => {
  it("honors the explicit local opt-out flag without exposing credentials", () => {
    process.env.CURIO_DISABLE_SHEETS_SYNC = "1";

    expect(isGoogleSheetsSyncEnabled()).toBe(false);
    expect(getGoogleSheetsSyncStatus().message).toContain("CURIO_DISABLE_SHEETS_SYNC");
  });

  it("reports invalid local JSON as disabled instead of attempting a failed sync", () => {
    delete process.env.CURIO_DISABLE_SHEETS_SYNC;
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = "local-sheet";
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = "not-json";

    expect(getGoogleSheetsSyncStatus()).toEqual({
      enabled: false,
      message: expect.stringContaining("invalid"),
    });
    expect(hasGoogleSheetsConfigurationAttempt()).toBe(true);
  });
});
