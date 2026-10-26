'use strict';
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
function atomicJSON(file, value) {
  fs.mkdirSync(path.dirname(file), {
    recursive: true,
  });
  const temp = file + '.' + crypto.randomUUID() + '.tmp';
  const fd = fs.openSync(temp, 'wx', 0o600);
  try {
    fs.writeFileSync(fd, JSON.stringify(value, null, 2));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  try {
    fs.renameSync(temp, file);
  } catch (error) {
    fs.rmSync(temp, {
      force: true,
    });
    throw error;
  }
}
function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}
module.exports = {
  atomicJSON,
  readJSON,
};
