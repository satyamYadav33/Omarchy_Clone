#!/usr/bin/env node
/* ============================================================================
 * Omarchy Web Clone — tools/serve.mjs
 * ----------------------------------------------------------------------------
 * A local static server for previewing exactly what Vercel will serve. Node
 * stdlib only — no packages.
 *
 *   node tools/serve.mjs            # http://localhost:4173
 *   node tools/serve.mjs 8080
 *
 * This is a convenience for previewing; opening omarchy.html directly from disk
 * works too and needs no server at all.
 * ==========================================================================*/
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = Number(process.argv[2] || process.env.PORT || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path === '/' || path === '') path = '/index.html';

    /* Contain the path inside root — never serve outside the project. */
    const target = join(root, normalize(path).replace(/^([/\\])+/, ''));
    if (!target.startsWith(root)) {
      res.writeHead(403).end('403 forbidden');
      return;
    }

    const info = await stat(target);
    const file = info.isDirectory() ? join(target, 'index.html') : target;
    const body = await readFile(file);

    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(body);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 not found\n');
  }
});

server.listen(port, () => {
  console.log('omarchy-web-clone preview');
  console.log('  serving ' + root);
  console.log('  http://localhost:' + port);
  console.log('  (Vercel serves the same files; Ctrl+C to stop)');
});
