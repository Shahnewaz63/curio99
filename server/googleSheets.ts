import { createSign } from "node:crypto";
import type { Order } from "../drizzle/schema.js";
import { statusDescription, statusLabel } from "./orderConstants.js";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri: string;
};

export type GoogleSheetsSyncStatus = {
  enabled: boolean;
  message: string | null;
  credentialSource: "json" | "base64" | null;
};

// Use the workbook's existing visible worksheet instead of creating a separate tab that the owner may not be viewing.
const SHEET_TITLE = "Sheet1";
const HEADERS = [
  "Order ID", "Created at", "Customer name", "Phone", "Email", "Address", "Delivery location", "Quantity",
  "Book price", "Delivery charge", "Total", "Payment method", "Payment status", "bKash number", "Transaction ID",
  "Order status", "Status note", "Note", "Last updated",
];

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function isServiceAccount(value: unknown): value is ServiceAccount {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ServiceAccount>;
  return [candidate.client_email, candidate.private_key, candidate.token_uri].every(
    field => typeof field === "string" && field.trim().length > 0
  );
}

function readServiceAccountCredential() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64?.trim();
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!encoded && !rawJson) return { raw: null, source: null };
  if (encoded) {
    try {
      return { raw: Buffer.from(encoded, "base64").toString("utf8"), source: "base64" as const };
    } catch {
      return { raw: null, source: "base64" as const };
    }
  }
  return { raw: rawJson!, source: "json" as const };
}

function readConfiguredServiceAccount() {
  const credential = readServiceAccountCredential();
  if (!credential.raw) throw new Error("Google Sheets service-account credentials are missing or invalid.");
  const parsed = JSON.parse(credential.raw) as unknown;
  if (!isServiceAccount(parsed)) throw new Error("Google Sheets service-account credentials are incomplete.");
  return parsed;
}

export function getGoogleSheetsSyncStatus(): GoogleSheetsSyncStatus {
  if (process.env.CURIO_DISABLE_SHEETS_SYNC === "1") {
    return { enabled: false, message: "Google Sheets sync is disabled by CURIO_DISABLE_SHEETS_SYNC=1.", credentialSource: null };
  }

  const credential = readServiceAccountCredential();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!credential.raw || !spreadsheetId) {
    return { enabled: false, message: "Add GOOGLE_SHEETS_SPREADSHEET_ID and either GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 to .env.local, then restart pnpm dev.", credentialSource: credential.source };
  }

  try {
    if (!isServiceAccount(JSON.parse(credential.raw))) {
      return { enabled: false, message: "Google Sheets service-account credentials are incomplete. Use complete JSON or its base64 form.", credentialSource: credential.source };
    }
    return { enabled: true, message: null, credentialSource: credential.source };
  } catch {
    return { enabled: false, message: "Google Sheets service-account credentials are invalid. In .env.local, use one-line JSON or GOOGLE_SERVICE_ACCOUNT_JSON_BASE64.", credentialSource: credential.source };
  }
}

function getConfig() {
  const status = getGoogleSheetsSyncStatus();
  if (!status.enabled) throw new Error(status.message ?? "Google Sheets sync is not configured.");
  return {
    serviceAccount: readConfiguredServiceAccount(),
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
  };
}

export function isGoogleSheetsSyncEnabled() {
  return getGoogleSheetsSyncStatus().enabled;
}

/** True when a local user started configuring Sheets but the setup is incomplete or invalid. */
export function hasGoogleSheetsConfigurationAttempt() {
  return process.env.CURIO_DISABLE_SHEETS_SYNC !== "1"
    && Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 || process.env.GOOGLE_SHEETS_SPREADSHEET_ID);
}

async function getAccessToken(serviceAccount: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key).toString("base64url");
  const response = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  if (!response.ok) throw new Error(`Google token request failed: ${await response.text()}`);
  return (await response.json()) as { access_token: string };
}

async function googleRequest(url: string, accessToken: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) throw new Error(`Google Sheets request failed: ${await response.text()}`);
  return response;
}

/** Checks token exchange and spreadsheet read access without changing any Sheet data. */
export async function verifyGoogleSheetsConnection() {
  const { serviceAccount, spreadsheetId } = getConfig();
  const { access_token } = await getAccessToken(serviceAccount);
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  await googleRequest(`${baseUrl}?fields=spreadsheetId`, access_token);
}

async function ensureOrdersSheet(spreadsheetId: string, accessToken: string) {
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const getMetadata = () => googleRequest(`${baseUrl}?fields=sheets.properties`, accessToken).then(response => response.json()) as Promise<{ sheets?: Array<{ properties: { sheetId: number; title: string } }> }>;
  const metadata = await getMetadata();
  const existingSheet = metadata.sheets?.find(sheet => sheet.properties.title === SHEET_TITLE);
  if (existingSheet) return existingSheet.properties.sheetId;

  await googleRequest(`${baseUrl}:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: SHEET_TITLE } } }] }),
  });

  const createdSheet = (await getMetadata()).sheets?.find(sheet => sheet.properties.title === SHEET_TITLE);
  if (!createdSheet) {
    throw new Error(`Could not locate the ${SHEET_TITLE} worksheet after creating it.`);
  }
  return createdSheet.properties.sheetId;
}

export function buildDeleteSheetRowRequest(sheetId: number, rowIndex: number) {
  return {
    requests: [{
      deleteDimension: {
        range: { sheetId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 },
      },
    }],
  };
}

/** Removes only the Sheet1 row whose Order ID matches the supplied persistent order. */
export async function deleteOrderFromGoogleSheet(orderId: string) {
  const { serviceAccount, spreadsheetId } = getConfig();
  const { access_token } = await getAccessToken(serviceAccount);
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const sheetId = await ensureOrdersSheet(spreadsheetId, access_token);
  const encodedRange = encodeURIComponent(`${SHEET_TITLE}!A:A`);
  const existing = await googleRequest(`${baseUrl}/values/${encodedRange}`, access_token).then(response => response.json()) as { values?: string[][] };
  const rowIndex = existing.values?.findIndex(row => row[0] === orderId) ?? -1;
  if (rowIndex < 1) return false;

  await googleRequest(`${baseUrl}:batchUpdate`, access_token, {
    method: "POST",
    body: JSON.stringify(buildDeleteSheetRowRequest(sheetId, rowIndex)),
  });

  const verified = await googleRequest(`${baseUrl}/values/${encodedRange}`, access_token).then(response => response.json()) as { values?: string[][] };
  if (verified.values?.some(row => row[0] === orderId)) {
    throw new Error(`Google Sheets deletion verification failed for ${orderId}.`);
  }
  return true;
}

function valuesFor(order: Order) {
  return [[
    order.orderId, order.createdAt.toISOString(), order.fullName, order.phone, order.email, order.address,
    order.deliveryLocation === "dhaka" ? "Inside Dhaka" : "Outside Dhaka", order.quantity, order.bookPrice,
    order.deliveryCharge, order.total, order.paymentMethod.toUpperCase(), order.paymentStatus, order.bkashNumber ?? "",
    order.transactionId ?? "", statusLabel(order.status), statusDescription(order.status), order.note ?? "", order.updatedAt.toISOString(),
  ]];
}

/** Mirrors an order to the visible Sheet1 tab, verifying the matching status cell after each write. */
export async function syncOrderToGoogleSheet(order: Order) {
  const { serviceAccount, spreadsheetId } = getConfig();
  const { access_token } = await getAccessToken(serviceAccount);
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  await ensureOrdersSheet(spreadsheetId, access_token);
  await googleRequest(`${baseUrl}/values/${encodeURIComponent(`${SHEET_TITLE}!A1:S1`)}?valueInputOption=RAW`, access_token, {
    method: "PUT",
    body: JSON.stringify({ values: [HEADERS] }),
  });
  const encodedRange = encodeURIComponent(`${SHEET_TITLE}!A:A`);
  const existing = await googleRequest(`${baseUrl}/values/${encodedRange}`, access_token).then(response => response.json()) as { values?: string[][] };

  const rowIndex = existing.values?.findIndex(row => row[0] === order.orderId) ?? -1;
  if (rowIndex >= 1) {
    const range = encodeURIComponent(`${SHEET_TITLE}!A${rowIndex + 1}:S${rowIndex + 1}`);
    await googleRequest(`${baseUrl}/values/${range}?valueInputOption=USER_ENTERED`, access_token, {
      method: "PUT",
      body: JSON.stringify({ values: valuesFor(order) }),
    });
  } else {
    await googleRequest(`${baseUrl}/values/${encodeURIComponent(`${SHEET_TITLE}!A:S`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, access_token, {
      method: "POST",
      body: JSON.stringify({ values: valuesFor(order) }),
    });
  }

  const verifyRow = rowIndex >= 1 ? rowIndex + 1 : (existing.values?.length ?? 0) + 1;
  const verified = await googleRequest(`${baseUrl}/values/${encodeURIComponent(`${SHEET_TITLE}!A${verifyRow}:S${verifyRow}`)}`, access_token).then(response => response.json()) as { values?: string[][] };
  const row = verified.values?.[0];
  if (row?.[0] !== order.orderId || row?.[15] !== statusLabel(order.status)) {
    throw new Error(`Google Sheets verification failed for ${order.orderId}.`);
  }
}
