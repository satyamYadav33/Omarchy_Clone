#!/usr/bin/env node
/* ============================================================================
 * Omarchy Web Clone — tools/ci.mjs
 * ----------------------------------------------------------------------------
 * Continuous integration that needs no browser, no network and no packages:
 *
 *   1. every source file parses            (node --check)
 *   2. the bundle rebuilds byte-identically (catches "edited src, forgot to build")
 *   3. key invariants hold                 (23 themes, no external refs, no BOM)
 *
 * Exits non-zero on any failure, so it works as a GitHub Actions gate.
 *
 *   node tools/ci.mjs
 * ==========================================================================*/
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const src = join(root, 'src');

let failures = 0;
const ok = (msg) => console.log('  ok    ' + msg);
const bad = (msg) => { failures++; console.log('  FAIL  ' + msg); };

/* ---------------------------------------------------------------- 1. parse */
console.log('1. sources parse');
const jsFiles = readdirSync(src).filter((f) => f.endsWith('.js')).sort();
for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', join(src, file)], { stdio: 'ignore' });
    ok(file);
  } catch (e) {
    bad(file + ' has a syntax error');
  }
}

/* ------------------------------------------------------------- 2. rebuild */
console.log('\n2. bundle is up to date');
const bundlePath = join(root, 'omarchy.html');
const indexPath = join(root, 'index.html');
if (!existsSync(bundlePath)) {
  bad('omarchy.html is missing — run node tools/build.mjs');
} else {
  const before = readFileSync(bundlePath, 'utf8');
  try {
    execFileSync(process.execPath, [join(here, 'build.mjs')], { stdio: 'ignore' });
  } catch (e) {
    bad('tools/build.mjs failed: ' + e.message);
  }
  const after = readFileSync(bundlePath, 'utf8');
  if (before === after) ok('omarchy.html matches a fresh build');
  else bad('omarchy.html is stale — rebuild and commit it (node tools/build.mjs)');

  if (existsSync(indexPath)) {
    if (readFileSync(indexPath, 'utf8') === after) ok('index.html matches omarchy.html');
    else bad('index.html differs from omarchy.html');
  } else {
    bad('index.html is missing');
  }

  /* public/ is what Vercel serves. A missing or stale copy is exactly the
     failure that broke the first deployment, so it is checked explicitly. */
  const pub = join(root, 'public', 'index.html');
  if (!existsSync(pub)) {
    bad('public/index.html is missing — Vercel serves outputDirectory "public"');
  } else if (readFileSync(pub, 'utf8') !== after) {
    bad('public/index.html is stale — rebuild and commit it');
  } else {
    ok('public/index.html matches omarchy.html (the Vercel output directory)');
  }
}

/* ----------------------------------------------------------- 3. invariants */
console.log('\n3. invariants');
const bundle = existsSync(bundlePath) ? readFileSync(bundlePath, 'utf8') : '';

const themeCount = (readFileSync(join(src, 'themes.js'), 'utf8')
  .match(/id: '[a-z0-9-]+',\s*\n?\s*name: '/g) || []).length;
if (themeCount === 23) ok('23 theme palettes');
else bad('expected 23 themes, found ' + themeCount);

if (bundle.charCodeAt(0) !== 0xFEFF && !bundle.includes('\uFEFF')) ok('no BOM in the bundle');
else bad('bundle contains a UTF-8 BOM');

const external = bundle.match(/(?:src|href)\s*=\s*"(?!#|data:)[^"]+"/g) || [];
if (external.length === 0) ok('zero external references (offline-safe)');
else bad('bundle references external files: ' + external.join(', '));

if (!/type="module"/.test(bundle)) ok('no ES modules (file:// safe)');
else bad('bundle uses type="module", which breaks over file://');

const size = Buffer.byteLength(bundle);
if (size > 600 * 1024) bad('bundle grew past 600 KB (' + (size / 1024).toFixed(1) + ' KB)');
else ok('bundle size ' + (size / 1024).toFixed(1) + ' KB');

const registry = (bundle.match(/registry\.register\(\{/g) || []).length;
if (registry >= 13) ok(registry + ' registered applications');
else bad('only ' + registry + ' registered applications');

/* --------------------------------------------------------------- verdict */
console.log('');
if (failures) {
  console.log(failures + ' check(s) failed');
  process.exit(1);
}
console.log('all checks passed');
