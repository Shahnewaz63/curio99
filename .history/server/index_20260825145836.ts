import express from "express";
import { createServer } from "http";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./routers.js";
import { createContext } from "./_core/context.js";

export const app = express();

app.use(express.json());

// Mount tRPC routes
app.use(
  ["/api/trpc", "/trpc"],
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Required: Export default for Vercel serverless entrypoint (api/index.ts)
export default app;

// Only spin up a standalone HTTP server when running locally outside Vercel
if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
  const server = createServer(app);
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Local server running on http://localhost:${port}/`);
  });
}