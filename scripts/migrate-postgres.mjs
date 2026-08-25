import pg from "pg";

const { Client } = pg;
const connectionString = process.env.POSTGRES_DATABASE_URL;

if (!connectionString) {
  throw new Error("POSTGRES_DATABASE_URL is required to migrate the PostgreSQL order history.");
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

const schemaSql = `
CREATE TABLE IF NOT EXISTS users (
  "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "openId" varchar(64) NOT NULL UNIQUE,
  "name" text,
  "email" varchar(320),
  "loginMethod" varchar(64),
  "role" varchar(16) NOT NULL DEFAULT 'user',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "lastSignedIn" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "orderId" varchar(32) NOT NULL UNIQUE,
  "fullName" varchar(160) NOT NULL,
  "phone" varchar(32) NOT NULL,
  "email" varchar(320) NOT NULL,
  "address" text NOT NULL,
  "deliveryLocation" varchar(16) NOT NULL CHECK ("deliveryLocation" IN ('dhaka', 'outside')),
  "quantity" integer NOT NULL CHECK ("quantity" > 0),
  "note" text,
  "paymentMethod" varchar(16) NOT NULL CHECK ("paymentMethod" IN ('cod', 'bkash')),
  "bkashNumber" varchar(32),
  "transactionId" varchar(128),
  "bookPrice" integer NOT NULL,
  "deliveryCharge" integer NOT NULL,
  "total" integer NOT NULL,
  "paymentStatus" varchar(64) NOT NULL,
  "status" varchar(32) NOT NULL DEFAULT 'confirmation_pending' CHECK ("status" IN ('confirmation_pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  "sheetSyncState" varchar(16) NOT NULL DEFAULT 'pending' CHECK ("sheetSyncState" IN ('pending', 'synced', 'failed')),
  "sheetSyncError" text,
  "sheetSyncedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS orders_tracking_idx ON orders ("orderId", "phone");
`;

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query(schemaSql);
  await client.query("COMMIT");
  console.log("PostgreSQL order-history schema is ready.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
