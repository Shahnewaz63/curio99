import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes"; // Adjust this import path to where your API/tRPC routes are registered

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 1. MUST register API & tRPC routes FIRST
// Ensure your registerRoutes(app) or trpcExpress middleware is called here!
registerRoutes(app);

// 2. Serve static files
const staticPath =
  process.env.NODE_ENV === "production"
    ? path.resolve(__dirname, "public")
    : path.resolve(__dirname, "..", "dist", "public");

app.use(express.static(staticPath));

// 3. Client-side routing fallback (exclude /api routes)
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next(); // Don't return index.html for API endpoints
  }
  res.sendFile(path.join(staticPath, "index.html"));
});

// Export app for Vercel Serverless Function (api/index.ts)
export default app;

// 4. Only start HTTP listener when running locally, not on Vercel
if (!process.env.VERCEL) {
  const server = createServer(app);
  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}