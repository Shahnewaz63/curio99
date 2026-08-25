import "./loadLocalEnv";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth.js";
import { registerStorageProxy } from "./storageProxy.js";
import { appRouter } from "../routers.js";
import { getOrderHistoryRuntimeStatus, isLocalOrderStoreEnabled } from "../db.js";
import { getGoogleSheetsSyncStatus } from "../googleSheets.js";
import { createContext } from "./context.js";
import { serveStatic, setupVite } from "./vite.js";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  if (process.env.OAUTH_SERVER_URL && process.env.VITE_APP_ID) {
    registerOAuthRoutes(app);
  } else {
    console.info("[OAuth] Hosted OAuth is disabled for this local run. Use the credential-admin form for local administration.");
  }
  app.get("/api/local-status", (_req, res) => {
    const sheets = getGoogleSheetsSyncStatus();
    const persistence = getOrderHistoryRuntimeStatus();
    res.json({
      localOrderStore: isLocalOrderStoreEnabled(),
      orderHistoryProvider: persistence.provider,
      neonConfigured: persistence.configured,
      neonMessage: persistence.message,
      databaseTimeZone: "Asia/Dhaka",
      googleSheetsSyncConfigured: sheets.enabled,
      googleSheetsSyncMessage: sheets.message,
      googleSheetsCredentialSource: sheets.credentialSource,
      credentialAdminConfigured: Boolean(process.env.ADMIN_LOGIN_ID && process.env.ADMIN_LOGIN_PASSWORD),
    });
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
