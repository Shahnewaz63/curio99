import fs from 'fs';
import path from 'path';

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // 1. Replace @shared path aliases with relative paths
      const relativeToShared = path.relative(path.dirname(fullPath), path.join(process.cwd(), 'shared')).replace(/\\/g, '/');
      const sharedPathPrefix = relativeToShared.startsWith('.') ? relativeToShared : `./${relativeToShared}`;
      
      let updated = content.replace(/from\s+['"]@shared\/(.*?)['"]/g, (match, subpath) => {
        const ext = subpath.endsWith('.js') ? '' : '.js';
        return `from "${sharedPathPrefix}/${subpath}${ext}"`;
      });

      // 2. Add missing .js extensions to any relative imports lacking an extension
      updated = updated.replace(/from\s+['"](\..*?)['"]/g, (match, importPath) => {
        if (importPath.endsWith('.js') || importPath.endsWith('.json') || importPath.endsWith('.css')) {
          return match;
        }
        return `from "${importPath}.js"`;
      });

      if (content !== updated) {
        fs.writeFileSync(fullPath, updated, 'utf8');
        console.log(`Updated imports in: ${path.relative(process.cwd(), fullPath)}`);
      }
    }
  }
}

console.log('Scanning server/ and shared/ for missing .js extensions and @shared aliases...');
if (fs.existsSync('./server')) processDirectory('./server');
if (fs.existsSync('./shared')) processDirectory('./shared');
console.log('Done bulk-updating imports!');