import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { credentialAdmins } from "../drizzle/schema.js";
import { getDb } from "./db.js";
import type { User } from "../drizzle/schema.js";

const scrypt = promisify(scryptCallback);
const SCRYPT_KEY_LENGTH = 64;

export const CREDENTIAL_ADMIN_OPEN_ID = "curio_credential_admin";
export const CREDENTIAL_ADMIN_SESSION_MS = 12 * 60 * 60 * 1000;

function normalizeLoginId(value: string) {
  return value.trim().toLowerCase();
}

function credentialPepper() {
  const pepper = process.env.JWT_SECRET;
  if (!pepper) throw new Error("JWT_SECRET is required for secure credential-admin access.");
  return pepper;
}

export function hashCredentialLoginId(value: string) {
  return createHmac("sha256", credentialPepper()).update(normalizeLoginId(value)).digest("hex");
}

export async function hashCredentialPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const key = await scrypt(password, salt, SCRYPT_KEY_LENGTH) as Buffer;
  return `scrypt$${salt}$${key.toString("base64url")}`;
}

export async function verifyCredentialPassword(password: string, encodedHash: string) {
  const [algorithm, salt, storedKey] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !storedKey) return false;
  const derived = await scrypt(password, salt, SCRYPT_KEY_LENGTH) as Buffer;
  const expected = Buffer.from(storedKey, "base64url");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

function testEnvironmentFallback(id: string, password: string) {
  if (!process.env.VITEST) return false;
  const expectedId = process.env.ADMIN_LOGIN_ID;
  const expectedPassword = process.env.ADMIN_LOGIN_PASSWORD;
  if (!expectedId || !expectedPassword) return false;
  const idBuffer = Buffer.from(normalizeLoginId(id));
  const expectedIdBuffer = Buffer.from(normalizeLoginId(expectedId));
  const passwordBuffer = Buffer.from(password);
  const expectedPasswordBuffer = Buffer.from(expectedPassword);
  return idBuffer.length === expectedIdBuffer.length
    && passwordBuffer.length === expectedPasswordBuffer.length
    && timingSafeEqual(idBuffer, expectedIdBuffer)
    && timingSafeEqual(passwordBuffer, expectedPasswordBuffer);
}

/** Seeds a single secure record from protected bootstrap env values when Neon has no credential record yet. */
export async function provisionCredentialAdminFromEnvironment() {
  const bootstrapId = process.env.ADMIN_LOGIN_ID;
  const bootstrapPassword = process.env.ADMIN_LOGIN_PASSWORD;
  if (!bootstrapId || !bootstrapPassword) return false;

  const database = await getDb();
  if (!database) return false;
  const existing = await database.select({ id: credentialAdmins.id }).from(credentialAdmins).limit(1);
  if (existing[0]) return true;

  const loginIdHash = hashCredentialLoginId(bootstrapId);
  const passwordHash = await hashCredentialPassword(bootstrapPassword);
  await database.insert(credentialAdmins).values({ loginIdHash, passwordHash }).onConflictDoNothing();
  return Boolean((await database.select({ id: credentialAdmins.id }).from(credentialAdmins).limit(1))[0]);
}

export async function isCredentialAdminConfigured() {
  const database = await getDb();
  if (!database) return Boolean(process.env.VITEST && process.env.ADMIN_LOGIN_ID && process.env.ADMIN_LOGIN_PASSWORD);
  const existing = await database.select({ id: credentialAdmins.id }).from(credentialAdmins).limit(1);
  return Boolean(existing[0]) || provisionCredentialAdminFromEnvironment();
}

/** Verifies the provided password against the one-way Neon record; no credential is ever returned to a client. */
export async function verifyCredentialAdminLogin(id: string, password: string) {
  const database = await getDb();
  if (!database) return testEnvironmentFallback(id, password);
  await provisionCredentialAdminFromEnvironment();
  const loginIdHash = hashCredentialLoginId(id);
  const record = await database.select().from(credentialAdmins).where(eq(credentialAdmins.loginIdHash, loginIdHash)).limit(1);
  if (!record[0]) return false;
  return verifyCredentialPassword(password, record[0].passwordHash);
}

export function credentialAdminUser(): User {
  const now = new Date();
  return { id: -1, openId: CREDENTIAL_ADMIN_OPEN_ID, name: "Curio Admin", email: null, loginMethod: "credentials", role: "admin", createdAt: now, updatedAt: now, lastSignedIn: now };
}
