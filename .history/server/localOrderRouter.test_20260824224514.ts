import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context.js";
import { appRouter } from "./routers.js";

const localDataDirectory = path.join(process.cwd(), ".curio-local-data");
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalSheetsDisabled = process.env.CURIO_DISABLE_SHEETS_SYNC;
const originalSheetsCredential = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const originalSpreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

function localContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "http", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe.sequential("local order API fallback", () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
    process.env.CURIO_DISABLE_SHEETS_SYNC = "1";
    fs.rmSync(localDataDirectory, { recursive: true, force: true });
  });

  afterEach(() => {
    fs.rmSync(localDataDirectory, { recursive: true, force: true });
    if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
    else delete process.env.DATABASE_URL;
    if (originalSheetsDisabled) process.env.CURIO_DISABLE_SHEETS_SYNC = originalSheetsDisabled;
    else delete process.env.CURIO_DISABLE_SHEETS_SYNC;
    if (originalSheetsCredential) process.env.GOOGLE_SERVICE_ACCOUNT_JSON = originalSheetsCredential;
    else delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (originalSpreadsheetId) process.env.GOOGLE_SHEETS_SPREADSHEET_ID = originalSpreadsheetId;
    else delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  });

  it("places and tracks an order locally without the hosted database or Google Sheets", async () => {
    const caller = appRouter.createCaller(localContext());
    const created = await caller.orders.create({
      fullName: "VSCode Customer",
      phone: "1700000000",
      email: "vscode@example.com",
      address: "Local project folder",
      location: "dhaka",
      quantity: 1,
      payment: "cod",
    });

    const tracked = await caller.orders.track({ orderId: created.orderId, phone: "+8801700000000" });

    expect(created.orderId).toMatch(/^CURIO-/);
    expect(created.phone).toBe("01700000000");
    expect(tracked).toMatchObject({ orderId: created.orderId, total: 309, status: "confirmation_pending" });
  });

  it("records an actionable failure when local Sheets credentials are malformed", async () => {
    delete process.env.CURIO_DISABLE_SHEETS_SYNC;
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = "local-sheet";
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = "malformed-json";
    const caller = appRouter.createCaller(localContext());

    const created = await caller.orders.create({
      fullName: "VSCode Sheet Setup",
      phone: "01700000000",
      email: "sheet-setup@example.com",
      address: "Local project folder",
      location: "dhaka",
      quantity: 1,
      payment: "cod",
    });

    expect(created.sheetSyncState).toBe("failed");
    expect(created.sheetSyncError).toContain("GOOGLE_SERVICE_ACCOUNT_JSON is invalid");
  });
});
