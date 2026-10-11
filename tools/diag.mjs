#!/usr/bin/env node
/* ============================================================================
 * Omarchy Web Clone — tools/diag.mjs
 * ----------------------------------------------------------------------------
 * Builds .verify/diag.html: the full bundle with the diagnostics flag pinned,
 * so the page reports every error and its state into the DOM without needing
 * devtools or a server.
 *
 *   node tools/diag.mjs            # fast: straight to the desktop
 *   node tools/diag.mjs --boot     # keep the power screen and installer
 *
 * The flag is injected by rewriting the ONE line in main.js that declares the
 * diagnostics defaults, and the rewrite is verified — a stale or failed patch
 * used to fail silently, which cost more time than it saved.
 * ==========================================================================*/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const keepBoot = process.argv.includes('--boot');

let html = readFileSync(join(root, 'omarchy.html'), 'utf8');

const MARKER = 'var DIAG = { on: false, fast: false, log: [] };';
if (html.indexOf(MARKER) < 0) {
  console.error('diag: could not find "' + MARKER + '" in omarchy.html.');
  console.error('diag: run `node tools/build.mjs` first, and keep that marker intact in src/main.js.');
  process.exit(1);
}
const replacement = 'var DIAG = { on: true, fast: ' + (keepBoot ? 'false' : 'true') + ', log: [] };';
html = html.split(MARKER).join(replacement);

/* Belt and braces: also pin the pre-engine flags object, so capture is on even
   if startup later overwrites DIAG from the query string. */
const FLAG_MARKER = 'window.__OMA_FLAGS__ = { capture:';
const flagAt = html.indexOf(FLAG_MARKER);
if (flagAt >= 0) {
  const end = html.indexOf('};', flagAt);
  if (end > 0) {
    html = html.slice(0, flagAt) +
      'window.__OMA_FLAGS__ = { capture: true, fast: ' + (keepBoot ? 'false' : 'true') + ' ' +
      html.slice(end);
  }
}

mkdirSync(join(root, '.verify'), { recursive: true });
const out = join(root, '.verify', keepBoot ? 'diag-boot.html' : 'diag.html');
writeFileSync(out, html, 'utf8');

/* Verify the patch actually landed. */
const written = readFileSync(out, 'utf8');
if (written.indexOf(replacement) < 0) {
  console.error('diag: patch verification failed');
  process.exit(1);
}
console.log('wrote ' + out + '  (' + replacement + ')');
