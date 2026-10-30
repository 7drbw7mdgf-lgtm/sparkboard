'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { collectPublicFiles } = require('../lib/public-files.cjs');
const { build } = require('./release.cjs');
const root = path.resolve(__dirname, '..');
const files = collectPublicFiles(root),
  names = new Set(files);
for (const filename of files.filter((name) => name.endsWith('.js'))) {
  const source = fs.readFileSync(path.join(root, filename), 'utf8');
  // Source modules deliberately use static relative imports. Catch broken packaging before signing.
  const imports = source.matchAll(
    /(?:\b(?:import|export)\s+(?:[^;'"]*?\s+from\s*)?|\bimport\s*\(\s*)['"]([^'"]+)['"]/g,
  );
  for (const match of imports) {
    const dependency = path.posix.normalize(
      path.posix.join(path.posix.dirname(filename), match[1]),
    );
    if (!match[1].startsWith('.') || !names.has(dependency))
      throw new Error(`Unpackaged import in ${filename}: ${match[1]}`);
  }
}
const version = require('../package.json').version.split('.').map(Number);
const output = build({
  root,
  sandbox: true,
  version: `${version[0]}.${version[1]}.${version[2] + 1}`,
  notes:
    'A local rehearsal of download, verified install and rollback.\nYour boards stay on this device. No GitHub requests are made.',
});
console.log(`Build verified ${files.length} public files; local sandbox prepared at ${output}`);
