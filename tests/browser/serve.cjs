// Serve the real production planner and Sparkboard at their hosted paths.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
http
  .createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const base = pathname.startsWith('/sai/') ? path.join(root, 'build/sai-dist') : root;
    let file = path.resolve(
      base,
      '.' + (pathname.startsWith('/sai/') ? pathname.slice(4) : pathname),
    );
    if (!file.startsWith(base + '/') && file !== base) {
      res.writeHead(403).end();
      return;
    }
    if (file === base || (fs.existsSync(file) && fs.statSync(file).isDirectory()))
      file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    const types = {
      '.js': 'text/javascript',
      '.html': 'text/html',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.json': 'application/json',
    };
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(4173, '127.0.0.1');
