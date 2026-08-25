import { afterEach, describe, expect, it } from "vitest";
import { getGoogleSheetsSyncStatus, hasGoogleSheetsConfigurationAttempt, isGoogleSheetsSyncEnabled } from "./googleSheets.js";

const sheetKeys = ["CURIO_DISABLE_SHEETS_SYNC", "GOOGLE_SERVICE_ACCOUNT_JSON", "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64", "GOOGLE_SHEETS_SPREADSHEET_ID"] as const;
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
      credentialSource: "json",
    });
    expect(hasGoogleSheetsConfigurationAttempt()).toBe(true);
  });

  it("accepts portable base64 service-account configuration", () => {
    delete process.env.CURIO_DISABLE_SHEETS_SYNC;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = "local-sheet";
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 = Buffer.from(JSON.stringify({
      client_email: "local@example.iam.gserviceaccount.com",
      private_key: "test-private-key",
      token_uri: "https://oauth2.googleapis.com/token",
    })).toString("base64");

    expect(getGoogleSheetsSyncStatus()).toEqual({ enabled: true, message: null, credentialSource: "base64" });
  });
});
