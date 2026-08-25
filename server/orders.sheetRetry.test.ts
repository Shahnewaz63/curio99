import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context.js";

const sheetSync = vi.fn(async () => undefined);

vi.mock("./googleSheets.js", () => ({
  getGoogleSheetsSyncStatus: () => ({ enabled: true, message: null, credentialSource: "json" }),
  hasGoogleSheetsConfigurationAttempt: () => true,
  isGoogleSheetsSyncEnabled: () => true,
  syncOrderToGoogleSheet: sheetSync,
  deleteOrderFromGoogleSheet: vi.fn(async () => false),
  verifyGoogleSheetsConnection: vi.fn(async () => undefined),
}));

const { appRouter } = await import("./routers.js");
const { updateSheetSyncState } = await import("./db.js");
const localDataDirectory = path.join(process.cwd(), ".curio-local-data");

function adminContext(): TrpcContext {
  const now = new Date();
  return {
    user: { id: 1, openId: "retry-admin", name: "Retry admin", email: "retry@example.com", loginMethod: "credential", role: "admin", createdAt: now, updatedAt: now, lastSignedIn: now },
    req: { protocol: "http", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe.sequential("order Sheets retry", () => {
  afterEach(() => {
    fs.rmSync(localDataDirectory, { recursive: true, force: true });
    sheetSync.mockClear();
  });

  it("retries a failed retained order through the protected procedure", async () => {
    const caller = appRouter.createCaller(adminContext());
    const created = await caller.orders.create({
      fullName: "Retry verification",
      phone: "01700000000",
      email: "retry-verification@example.com",
      address: "Recovery test address",
      location: "dhaka",
      quantity: 1,
      payment: "cod",
    });

    await updateSheetSyncState(created.orderId, "failed", "Temporary Sheets configuration error");
    const retried = await caller.orders.adminRetrySheetSync({ orderId: created.orderId });

    expect(sheetSync).toHaveBeenCalledWith(expect.objectContaining({ orderId: created.orderId }));
    expect(retried).toMatchObject({ orderId: created.orderId, sheetSyncState: "synced", sheetSyncError: null });
  });
});
