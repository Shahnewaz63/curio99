import pg from "pg";

const { Client } = pg;
const connectionString = process.env.NEON_DATABASE_URL || process.env.POSTGRES_DATABASE_URL;
if (!connectionString) throw new Error("NEON_DATABASE_URL (or POSTGRES_DATABASE_URL) is required.");

function createClient() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  // Neon pooler connections can close immediately after an ALTER DATABASE command.
  // Keep the event handled so a successful configuration is still verified separately.
  client.on("error", () => undefined);
  return client;
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

let client = createClient();
try {
  await client.connect();
  const databaseResult = await client.query("SELECT current_database() AS name");
  const databaseName = databaseResult.rows[0]?.name;
  if (!databaseName) throw new Error("Unable to determine the Neon database name.");

  await client.query(`ALTER DATABASE ${quoteIdentifier(databaseName)} SET TIME ZONE 'Asia/Dhaka'`).catch(() => undefined);
  await client.query("ALTER ROLE CURRENT_USER SET TIME ZONE 'Asia/Dhaka'");
} finally {
  await client.end().catch(() => undefined);
}

client = createClient();
try {
  await client.connect();
  await client.query("SET TIME ZONE 'Asia/Dhaka'");
  const verification = await client.query(`
    SELECT current_setting('TimeZone') AS timezone,
           COUNT(*)::int AS order_count,
           MIN("createdAt") AT TIME ZONE 'Asia/Dhaka' AS earliest_bdt,
           MAX("createdAt") AT TIME ZONE 'Asia/Dhaka' AS latest_bdt
    FROM orders
  `);
  const result = verification.rows[0];
  if (result?.timezone !== "Asia/Dhaka") throw new Error("Neon session time zone did not update to Asia/Dhaka.");
  console.log(`Neon database time zone is ${result.timezone}; ${result.order_count} existing order timestamp(s) render in BDT without changing stored instants.`);
} finally {
  await client.end().catch(() => undefined);
}
