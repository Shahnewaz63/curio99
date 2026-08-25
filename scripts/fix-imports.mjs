import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const serverDir = path.join(rootDir, "server");
const sharedDir = path.join(rootDir, "shared");

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
  const fileDir = path.dirname(filePath);

  // Calculate exact relative path from current file to shared directory
  let relPath = path.relative(fileDir, sharedDir).replace(/\\/g, "/");
  if (!relPath.startsWith(".")) {
    relPath = "./" + relPath;
  }

  // Matches imports like: from "@shared/const" or from '@shared/const.js'
  const regex = /from\s+["']@shared\/([^"']+)["']/g;

  if (regex.test(content)) {
    const updatedContent = content.replace(regex, (_, subPath) => {
      // Ensure ES module .js extension is attached
      const finalSubPath = subPath.endsWith(".js") ? subPath : `${subPath}.js`;
      return `from "${relPath}/${finalSubPath}"`;
    });

    fs.writeFileSync(filePath, updatedContent, "utf8");
    console.log(`Updated: ${path.relative(rootDir, filePath)}`);
    updatedCount++;
  }
});

console.log(`\nSuccessfully updated ${updatedCount} file(s).`);