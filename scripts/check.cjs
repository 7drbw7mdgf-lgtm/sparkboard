'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', '.git', '.sparkboard', 'build'].includes(entry.name)) return [];
    const filename = path.join(directory, entry.name);
    return entry.isDirectory()
      ? walk(filename)
      : /\.(?:c|m)?js$/.test(entry.name)
        ? [filename]
        : [];
  });
}
for (const filename of walk(root)) {
  const result = spawnSync(process.execPath, ['--check', filename], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('JavaScript syntax checks passed.');
