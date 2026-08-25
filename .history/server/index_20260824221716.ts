import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./routers"; // Ensure path matches your appRouter location
import { createContext } from "./context"; // Ensure path matches your createContext location (if used)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Parse JSON bodies
app.use(express.json());

// 1. Mount tRPC API handler BEFORE static routes
app.use(
  ["/api/trpc", "/trpc"],
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// 2. Serve static files from dist/public in production
const staticPath =
  process.env.NODE_ENV === "production"
    ? path.resolve(__dirname, "public")
    : path.resolve(__dirname, "..", "dist", "public");

app.use(express.static(staticPath));

// 3. Client-side routing fallback (MUST REMAIN AT THE VERY BOTTOM)
app.get("*", (_req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});

async function startServer() {
  const server = createServer(app);
  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

// Only start local HTTP listener outside Vercel
if (!process.env.VERCEL) {
  startServer().catch(console.error);
}