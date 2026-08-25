import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadLocalEnvironment } from "./_core/loadLocalEnv";

const testKey = "CURIO_LOCAL_ENV_LOADER_TEST";
const temporaryDirectories: string[] = [];

afterEach(() => {
  delete process.env[testKey];
  temporaryDirectories.splice(0).forEach(directory => fs.rmSync(directory, { recursive: true, force: true }));
});

describe("local environment loading", () => {
  it("loads a local credential-style file before login configuration is checked", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "curio-env-"));
    temporaryDirectories.push(directory);
    const envPath = path.join(directory, "local-credentials.env");
    fs.writeFileSync(envPath, `${testKey}=loaded\n`, "utf8");

    loadLocalEnvironment(envPath);

    expect(process.env[testKey]).toBe("loaded");
  });
});
