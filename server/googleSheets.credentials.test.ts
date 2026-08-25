import { createSign } from "node:crypto";
import { describe, expect, it } from "vitest";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri: string;
};

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken(serviceAccount: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
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

describe("Google Sheets service-account access", () => {
  it("can read the configured target spreadsheet", async () => {
    const rawCredential = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    expect(rawCredential).toBeTruthy();
    expect(spreadsheetId).toBeTruthy();

    const serviceAccount = JSON.parse(rawCredential!) as ServiceAccount;
    const { access_token } = await getAccessToken(serviceAccount);
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    expect(response.ok).toBe(true);
    await expect(response.json()).resolves.toMatchObject({ spreadsheetId });
  }, 30000);
});
