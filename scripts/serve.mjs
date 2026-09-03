import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = normalize(new URL('..', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1'));
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  let file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!file.startsWith(root) || !existsSync(file)) {
    response.writeHead(404).end('Not found');
    return;
  }
  if (statSync(file).isDirectory()) file = join(file, 'index.html');
  response.setHeader('Content-Type', types[extname(file).toLowerCase()] || 'application/octet-stream');
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Elevator configurator running at http://127.0.0.1:${port}`);
});
