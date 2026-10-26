'use strict';
const fs = require('node:fs'),
  path = require('node:path');
const root = path.resolve(__dirname, '..'),
  dataDir = path.resolve(process.argv[2]),
  healthToken = process.argv[3],
  port = Number(process.argv[4] || 43871);
if (!healthToken || !Number.isInteger(port) || port < 1024 || port > 65535)
  throw Error('Invalid desktop launch configuration.');
fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const sandbox = path.join(dataDir, 'sandbox');
fs.mkdirSync(sandbox, { recursive: true });
const testRelease = path.join(root, 'sandbox', 'sparkboard-update.json'),
  target = path.join(sandbox, 'sparkboard-update.json');
if (fs.existsSync(testRelease)) {
  const sourceKey = path.join(root, 'sandbox', 'public-key.pem');
  const targetKey = path.join(sandbox, 'public-key.pem');
  if (!fs.existsSync(target) || !fs.readFileSync(target).equals(fs.readFileSync(testRelease)))
    fs.copyFileSync(testRelease, target);
  if (fs.existsSync(sourceKey)) fs.copyFileSync(sourceKey, targetKey);
}
const { Updater } = require('../updater.cjs'),
  { createServer } = require('../server.cjs');
const updater = new Updater(root, { dataDir }),
  { server } = createServer(root, { updater, healthToken });
server.on('error', (error) => {
  console.error(
    error.code === 'EADDRINUSE'
      ? `Sparkboard could not use port ${port}. Quit another Sparkboard instance and try again.`
      : error.message,
  );
  process.exit(1);
});
server.listen(port, '127.0.0.1', () =>
  console.log(`Sparkboard desktop ready on localhost:${port}`),
);
const parent = Number(process.env.SPARKBOARD_PARENT_PID || 0);
const parentCheck = setInterval(() => {
  if (parent && process.ppid !== parent) shutdown();
}, 1000);
parentCheck.unref();
function shutdown() {
  clearInterval(parentCheck);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
