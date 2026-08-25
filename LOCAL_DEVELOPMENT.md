# Local VSCode Development

Curio uses **Neon PostgreSQL as the required source of truth** for order history in both hosted and VSCode environments. There is no silent local JSON fallback during normal development, so an absent database connection produces a clear API error rather than storing orders on only one computer.

Run the project from its root:

```bash
pnpm install
pnpm dev
```

## Local admin sign-in

Credential-admin access is stored in Neon as a **keyed login digest and salted password hash**. Neither the readable administrator ID nor password is saved in the database or returned by the application.

Create a file named `.env.local` in the project root. It is already ignored by Git. Keep the same stable `JWT_SECRET` for the project:

```env
JWT_SECRET=replace-with-a-long-random-value
```

For the one-time initial Neon credential setup only, also add your private ID and password, run the command below, then remove those two bootstrap values from `.env.local` if desired:

```env
ADMIN_LOGIN_ID=your-private-admin-id
ADMIN_LOGIN_PASSWORD=your-private-admin-password
```

```bash
pnpm db:migrate:credential-admin
```

After the Neon record exists, administrator sign-in always verifies the entered ID and password against the persisted one-way Neon record. The development server loads `.env.local` automatically. Do not add quotation marks around the password, do not add spaces around `=`, and do not commit this file.

## Required Neon PostgreSQL order history

Add your Neon connection string to `.env.local`, then run the non-destructive schema setup once before starting the app:

```env
NEON_DATABASE_URL=postgresql://your-user:your-password@your-neon-host/your-database?sslmode=require
```

```bash
pnpm db:migrate:postgres
pnpm dev
```

`POSTGRES_DATABASE_URL` remains supported as a legacy alias, but use `NEON_DATABASE_URL` for new local setup. Keep the value private, do not commit `.env.local`, and do not place it in client-side variables.

### Bangladesh Standard Time

After configuring Neon, run the following once to set the database session default to **Asia/Dhaka**:

```bash
pnpm db:configure:bangladesh-time
```

Order timestamps are stored as timezone-aware instants. The Curio server also sets every Neon connection to Asia/Dhaka, so the database, storefront, and order dashboard render all existing and future orders in Bangladesh Standard Time without rewriting historical purchase moments.

## Optional localhost Google Sheets sync

Neon order history works without Sheets. To mirror those same Neon orders into your existing Google Sheet, add the spreadsheet ID and **one** credential option below to `.env.local`, then restart `pnpm dev`:

```env
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
# Or, for the most reliable cross-platform `.env.local` setup:
# GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwiLi4u
```

Use the complete service-account JSON as **one line**, without outer quotation marks, or use its base64 form. The base64 option avoids newline and quotation-mark problems in VSCode and Windows shells. The service-account email must have **Editor** access to the spreadsheet. Leave these values out to keep Sheets synchronization disabled; set `CURIO_DISABLE_SHEETS_SYNC=1` to temporarily disable local sheet writes.

### Verify the local Sheets connection

After restarting `pnpm dev`, open the server URL shown in the terminal followed by `/api/local-status` (for example, `http://localhost:3000/api/local-status`). Confirm `"orderHistoryProvider":"neon"`, `"neonConfigured":true`, and `"googleSheetsSyncConfigured":true`. If a value is `false`, the accompanying `neonMessage` or `googleSheetsSyncMessage` explains exactly what is missing, malformed, or explicitly disabled. Correct `.env.local` and restart the server; never paste service-account JSON into source files.

When a Neon-backed order is placed with an incomplete Sheets setup, the order remains safely in Neon and is marked as a failed Sheet sync rather than being lost. After correcting `.env.local`, sign in to `/admin/orders` and select **Retry** on the affected order to send it to Sheet1.
