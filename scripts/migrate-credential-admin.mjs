import { createHmac, randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const { Client } = pg;
const scrypt = promisify(scryptCallback);
const connectionString = process.env.NEON_DATABASE_URL || process.env.POSTGRES_DATABASE_URL;
const loginId = process.env.ADMIN_LOGIN_ID;
const password = process.env.ADMIN_LOGIN_PASSWORD;
const pepper = process.env.JWT_SECRET;

if (!connectionString || !loginId || !password || !pepper) {
  throw new Error("NEON_DATABASE_URL (or POSTGRES_DATABASE_URL), ADMIN_LOGIN_ID, ADMIN_LOGIN_PASSWORD, and JWT_SECRET are required.");
}

const normalizedId = loginId.trim().toLowerCase();
const loginIdHash = createHmac("sha256", pepper).update(normalizedId).digest("hex");
const salt = randomBytes(16).toString("base64url");
const derivedKey = await scrypt(password, salt, 64);
const passwordHash = `scrypt$${salt}$${Buffer.from(derivedKey).toString("base64url")}`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query(`
    CREATE TABLE IF NOT EXISTS credential_admins (
      "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "loginIdHash" varchar(128) NOT NULL UNIQUE,
      "passwordHash" text NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  const existing = await client.query('SELECT "id" FROM credential_admins LIMIT 1');
  if (existing.rowCount === 0) {
    await client.query('INSERT INTO credential_admins ("loginIdHash", "passwordHash") VALUES ($1, $2)', [loginIdHash, passwordHash]);
  }
  await client.query("COMMIT");
  console.log("Secure credential-admin record is ready in Neon.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
