#!/usr/bin/env node
/* ============================================================================
 * Omarchy Web Clone — tools/build.mjs
 * ----------------------------------------------------------------------------
 * Bundles src/ into single-file, dependency-free HTML.
 *
 *   node tools/build.mjs
 *
 * Outputs:
 *   omarchy.html   — the complete desktop in ONE file. Double-click it. No
 *                    server, no install, no build step, no network, ~437 KB.
 *   index.html     — the same bundle, written as the folder's entry point.
 *   public/        — a copy of both, in the conventional static output
 *                    directory. Vercel expects `public` when a build command
 *                    runs, and every other static host and `npx serve` default
 *                    to it as well, so producing it keeps the build working
 *                    everywhere without special configuration.
 * ==========================================================================*/
import { readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const src = join(root, 'src');

const p = (...a) => join(root, ...a);

/* Load order matters: engine, than data, then the compositor and the shell,
   then the apps, then the entry point. */
const SCRIPTS = [
  'core.js',
  'themes.js',
  'wallpapers.js',
  'wm.js',
  'shell.js',
  'system.js',
  'menu.js',
  'capture.js',
  'appterm.js',
  'appeditor.js',
  'apputil.js',
  'appnet.js',
  'appmisc.js',
  'settings.js',
  'keys.js',
  'boot.js',
  'main.js'
];

function read(file) {
  /* Editors on Windows like to leave a UTF-8 BOM behind; strip it so a BOM
     never lands in the middle of the concatenated bundle. */
  return readFileSync(join(src, file), 'utf8').replace(/^\uFEFF/, '');
}

function build() {
  const css = read('omarchy.css');
  const template = readFileSync(p('src', 'template.html'), 'utf8');

  const scripts = SCRIPTS.map((file) => {
    const code = read(file);
    return `/* ==== ${file} ${'='.repeat(Math.max(1, 66 - file.length))} */\n${code}`;
  }).join('\n');

  /* Literal splicing: String.replace would treat $&, $1 and $$ inside the
     bundle as replacement patterns and corrupt the output. */
  const html = template
    .split('/*__OMARCHY_CSS__*/').join(css)
    .split('/*__OMARCHY_JS__*/').join(scripts);

  if (html.indexOf('__OMARCHY_') >= 0) {
    throw new Error('template placeholder was not replaced — check src/template.html');
  }

  writeFileSync(p('omarchy.html'), html, 'utf8');
  writeFileSync(p('index.html'), html, 'utf8');

  /* Also emit the conventional static output directory. Vercel runs a build
     command as soon as package.json defines one, and then insists on finding
     `public`; producing it here means the same build works on Vercel, on
     Netlify/Cloudflare, and under `npx serve public`, with no per-host config. */
  mkdirSync(p('public'), { recursive: true });
  writeFileSync(p('public', 'index.html'), html, 'utf8');
  writeFileSync(p('public', 'omarchy.html'), html, 'utf8');

  const bytes = statSync(p('omarchy.html')).size;
  const kb = (bytes / 1024).toFixed(1);
  const ansiThemes = (read('themes.js').match(/name: '/g) || []).length;

  console.log('omarchy-web-clone');
  console.log('  scripts   : ' + SCRIPTS.length + ' bundled in order');
  console.log('  themes    : ' + ansiThemes + ' palettes');
  console.log('  css       : ' + (css.length / 1024).toFixed(1) + ' KB');
  console.log('  bundle    : omarchy.html + index.html + public/  (' + kb + ' KB, zero dependencies)');
  console.log('  open      : double-click omarchy.html');
}

build();
