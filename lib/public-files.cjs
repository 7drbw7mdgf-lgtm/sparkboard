'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { safeFile } = require('./updates/package.cjs');

const PUBLIC_ROOT_FILES = ['index.html', 'app.js', 'board-model.js', 'style.css'];

/** One manifest shared by release signing, desktop packaging and clean-build checks. */
function collectPublicFiles(root) {
  const files = [...PUBLIC_ROOT_FILES];
  function walk(relative) {
    const directory = path.join(root, relative);
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const name = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) walk(name);
      else if (entry.isFile() && (name.endsWith('.js') || name.startsWith('assets/'))) {
        if (!safeFile(name)) throw new Error(`Unsupported public file: ${name}`);
        files.push(name);
      }
    }
  }
  walk('src');
  walk('assets');
  for (const name of files)
    if (!fs.statSync(path.join(root, name)).isFile())
      throw new Error(`Missing public file: ${name}`);
  return files.sort();
}

module.exports = { collectPublicFiles, PUBLIC_ROOT_FILES };
