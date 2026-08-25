import { timingSafeEqual } from "node:crypto";
import type { User } from "../drizzle/schema.js";

export const CREDENTIAL_ADMIN_OPEN_ID = "curio_credential_admin";
export const CREDENTIAL_ADMIN_SESSION_MS = 12 * 60 * 60 * 1000;

function constantTimeMatches(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer);
}

export function verifyCredentialAdminLogin(id: string, password: string) {
  const expectedId = process.env.ADMIN_LOGIN_ID;
  const expectedPassword = process.env.ADMIN_LOGIN_PASSWORD;
  if (!expectedId || !expectedPassword) return false;
  const idMatches = constantTimeMatches(id, expectedId);
  const passwordMatches = constantTimeMatches(password, expectedPassword);
  return idMatches && passwordMatches;
}

export function credentialAdminUser(): User {
  const now = new Date();
  return {
    id: -1,
    openId: CREDENTIAL_ADMIN_OPEN_ID,
    name: "Curio Admin",
    email: null,
    loginMethod: "credentials",
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}
