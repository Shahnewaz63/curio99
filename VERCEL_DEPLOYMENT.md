# Vercel deployment status

Curio’s supported production path is the managed project hosting. Its running application uses the full Express/tRPC server in `server/_core/index.ts`, persistent Neon PostgreSQL, signed admin sessions, optional Google Sheets synchronization, and platform-managed OAuth values.

The legacy `server/index.ts` file is **not** a complete replacement for that runtime. Deploying the repository to Vercel without further work can leave the storefront visible while API routes, credential-admin sessions, database access, or Sheets synchronization fail.

## Supported choices

| Choice | Status | Notes |
|---|---|---|
| Managed Curio hosting | Supported | Uses the complete verified runtime and the project’s configured protected values. |
| Vercel static storefront only | Possible | The order, tracking, admin, Neon, and Sheets features must be removed or routed to a separate backend. |
| Vercel full-stack application | Requires a dedicated conversion | Build a Vercel serverless API handler around the current tRPC/context stack, route every `/api/*` request to it, and move all protected configuration into Vercel environment variables. |

## Requirements for a full Vercel conversion

The conversion must preserve a Vercel-compatible API handler for order procedures and cookies, separate Vite’s static output from serverless API routes, and configure the following server-only values in Vercel: Neon database URL, JWT secret, Google Sheets configuration, and the one-time credential-admin bootstrap values if the Neon credential record does not already exist. OAuth must also be configured with the exact Vercel callback domain.

> Do not use the local JSON store in Vercel. A serverless file system is not durable, so Neon remains the persistent order-history source.

The current project has not been converted to that Vercel-specific architecture. Use the managed hosting for the verified full-stack deployment, or plan a separate Vercel conversion before deploying there.
