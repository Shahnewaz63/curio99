import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const serverDir = path.join(rootDir, "server");

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath, callback);
    } else if (/\.(ts|js|tsx|jsx)$/.test(filePath)) {
      callback(filePath);
    }
  });
}

let updatedCount = 0;

walkDir(serverDir, (filePath) => {
  let content = fs.readFileSync(filePath, "utf8");

  // Fixes relative imports without .js extensions:
  // e.g. import "./loadLocalEnv" -> import "./loadLocalEnv.js"
  // e.g. from "../db" -> from "../db.js"
  const relImportRegex = /(from|import)\s+["'](\.\.?\/[^"'\?]+?)["']/g;

  const updatedContent = content.replace(relImportRegex, (match, statement, importPath) => {
    if (importPath.endsWith(".js") || importPath.endsWith(".json")) {
      return match;
    }
    return `${statement} "${importPath}.js"`;
  });

  if (updatedContent !== content) {
    fs.writeFileSync(filePath, updatedContent, "utf8");
    console.log(`Fixed extensions in: ${path.relative(rootDir, filePath)}`);
    updatedCount++;
  }
});

console.log(`\nSuccessfully updated ${updatedCount} file(s).`);