#!/usr/bin/env node
/* ============================================================================
 * Omarchy Web Clone — tools/shots.mjs
 * ----------------------------------------------------------------------------
 * Renders the clone in headless Chrome at several states and writes PNGs to
 * .verify/. Launch Chrome yourself (see README) or run this via the helper in
 * tools/shoot.ps1, which supplies a working Chrome binary.
 * ==========================================================================*/
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const out = join(root, '.verify');
mkdirSync(out, { recursive: true });

const CHROME = process.env.OMARCHY_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const file = join(root, 'omarchy.html').replace(/\\/g, '/');
const base = 'file:///' + file;

/* One shared throwaway profile, and delete it afterwards: Chrome writes ~10 MB
   of cache per profile, which adds up to hundreds of MB across a shot run. */
const profile = join(out, 'chrome-profile');

const SHOTS = [
  ['01-power', ''],
  ['02-boot', ''],
  ['03-desktop-tiling', '&fast=1&demo=tiling'],
  ['04-menu', '&fast=1&demo=menu'],
  ['05-themes', '&fast=1&theme=Gruvbox&demo=theme'],
  ['06-terminal', '&fast=1&demo=terminal'],
  ['07-files', '&fast=1&demo=files'],
  ['08-capture', '&fast=1&demo=capture'],
  ['09-notifications', '&fast=1&demo=notify'],
  ['10-btop', '&fast=1&open=btop'],
  ['11-editor', '&fast=1&open=editor'],
  ['12-plasma-light', '&fast=1&theme=Flexoki%20Light&open=files']
];

for (const [name, query] of SHOTS) {
  const png = join(out, name + '.png');
  const budget = name === '02-boot' ? 9000 : 26000;
  try {
    execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      '--window-size=1600,900',
      '--user-data-dir=' + profile,
      '--virtual-time-budget=' + budget,
      '--screenshot=' + png,
      base + (query ? '?' + query.slice(1) : '')
    ], { stdio: 'ignore', timeout: 90000 });
  } catch (e) {
    /* Chrome returns a non-zero exit code in some sandboxes even on success. */
  }
  console.log((existsSync(png) ? 'ok   ' : 'MISS ') + name + '  ' + (query || '(default)'));
}
console.log('\nPNGs in ' + out);

/* Leave no Chrome profile behind. */
try {
  rmSync(profile, { recursive: true, force: true });
} catch (e) {
  console.log('note: could not remove ' + profile + ' (' + e.message + ')');
}
