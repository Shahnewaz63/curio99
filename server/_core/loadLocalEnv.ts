import path from "node:path";
import { config } from "dotenv";

// Preserve real shell/hosting values while allowing `.env.local` to override
// values originating from a project `.env` file or absent from the environment.
const inheritedEnvironmentKeys = new Set(Object.keys(process.env));

export function loadLocalEnvironment(envPath = path.resolve(process.cwd(), ".env.local")) {
  if (process.env.NODE_ENV === "production") return;
  const result = config({
    path: envPath,
    // Parse into an isolated object first so `.env.local` can take precedence
    // over a copied `.env`, without ever replacing externally supplied values.
    processEnv: {},
    override: true,
    quiet: true,
  });

  for (const [key, value] of Object.entries(result.parsed ?? {})) {
    if (!inheritedEnvironmentKeys.has(key)) process.env[key] = value;
  }
}

loadLocalEnvironment();
