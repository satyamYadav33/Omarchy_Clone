#!/usr/bin/env node
/* ============================================================================
 * Omarchy Web Clone — tools/preflight.mjs
 * ----------------------------------------------------------------------------
 * Catches deployment-config mistakes locally, so a broken Vercel run never
 * costs a round trip. Written after a real failure:
 *
 *   Error: No Output Directory named "public" found after the Build completed.
 *
 * Cause: vercel.json declared no output directory, but package.json defined a
 * `build` script — so Vercel ran the build and then demanded the conventional
 * `public/` folder, which the build did not produce.
 *
 *   node tools/preflight.mjs
 * ==========================================================================*/
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const p = (...a) => join(root, ...a);

let failures = 0;
const ok = (m) => console.log('  ok    ' + m);
const bad = (m) => { failures++; console.log('  FAIL  ' + m); };
const warn = (m) => console.log('  warn  ' + m);

/* ------------------------------------------------------------ vercel.json */
console.log('1. vercel.json');
let cfg = null;
if (!existsSync(p('vercel.json'))) {
  bad('vercel.json is missing');
} else {
  try {
    cfg = JSON.parse(readFileSync(p('vercel.json'), 'utf8'));
    ok('parses as valid JSON');
  } catch (e) {
    bad('vercel.json is not valid JSON: ' + e.message);
  }
}

if (cfg) {
  const outDir = cfg.outputDirectory;
  if (!outDir) {
    /* The exact trap. A buildCommand plus no outputDirectory means Vercel
       falls back to "public" and fails if it is absent. */
    if (cfg.buildCommand) {
      bad('buildCommand is set but outputDirectory is missing — Vercel will demand "public"');
    } else {
      ok('no build step and no output directory (pure static)');
    }
  } else {
    ok('outputDirectory = "' + outDir + '"');
    if (!existsSync(p(outDir))) bad('outputDirectory "' + outDir + '" does not exist in the repo');
    else if (!existsSync(join(p(outDir), 'index.html'))) bad(outDir + '/index.html is missing');
    else ok(outDir + '/index.html exists');
  }

  if (cfg.framework === null) ok('framework pinned to null (no framework guessing)');
  else warn('framework is ' + JSON.stringify(cfg.framework) + ' — null avoids Vercel guessing');

  if (cfg.installCommand) ok('installCommand set: ' + cfg.installCommand);
  else warn('installCommand unset — Vercel will run a package install for a zero-dependency project');
}

/* ----------------------------------------------------------- package.json */
console.log('\n2. package.json');
let pkg = null;
if (!existsSync(p('package.json'))) {
  warn('no package.json');
} else {
  pkg = JSON.parse(readFileSync(p('package.json'), 'utf8'));
  const deps = Object.keys(pkg.dependencies || {}).length;
  const dev = Object.keys(pkg.devDependencies || {}).length;
  if (deps + dev === 0) ok('zero dependencies (accurate, not aspirational)');
  else bad('dependencies declared: ' + deps + ' + ' + dev + ' dev');

  if (pkg.scripts && pkg.scripts.build) ok('build script present: ' + pkg.scripts.build);
  else warn('no build script — Vercel will treat the repo as pure static');

  /* If both a build script and an output directory exist, they must agree. */
  if (cfg && pkg.scripts && pkg.scripts.build && !cfg.outputDirectory) {
    bad('package.json defines build but vercel.json has no outputDirectory');
  }
}

/* --------------------------------------------------------------- payload */
console.log('\n3. deployable payload');
const must = ['index.html', 'omarchy.html', 'public/index.html', 'public/omarchy.html'];
for (const f of must) {
  if (existsSync(p(f))) ok(f + '  (' + (statSync(p(f)).size / 1024).toFixed(1) + ' KB)');
  else bad(f + ' is missing — run node tools/build.mjs');
}

/* The three copies must be byte-identical, or a host could serve a stale one. */
const copies = must.filter((f) => existsSync(p(f))).map((f) => readFileSync(p(f), 'utf8'));
if (copies.length === must.length) {
  if (copies.every((c) => c === copies[0])) ok('all four copies are byte-identical');
  else bad('the committed copies differ — rebuild and recommit');
}

console.log('\n4. no external runtime dependencies');
const bundle = existsSync(p('index.html')) ? readFileSync(p('index.html'), 'utf8') : '';
const ext = bundle.match(/(?:src|href)\s*=\s*"(?!#|data:)[^"]+"/g) || [];
if (ext.length === 0) ok('bundle references nothing external (works offline, no CDN)');
else bad('external references: ' + ext.join(', '));

console.log('');
if (failures) {
  console.log(failures + ' preflight check(s) failed — fix before deploying');
  process.exit(1);
}
console.log('preflight passed — safe to deploy');
