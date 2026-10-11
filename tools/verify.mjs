#!/usr/bin/env node
/* ============================================================================
 * Omarchy Web Clone — tools/verify.mjs
 * ----------------------------------------------------------------------------
 * Headless verification: loads the bundle (or the diagnostics bundle), lets the
 * page run, then reads back the #oma-report / #oma-fatal nodes it wrote into the
 * DOM. No server and no devtools needed.
 *
 *   node tools/verify.mjs                        # desktop, fast mode
 *   node tools/verify.mjs --query "&open=btop"   # extra query parameters
 *   node tools/verify.mjs --shot .verify/x.png   # also write a screenshot
 *   node tools/verify.mjs --boot                 # power screen + installer
 * ==========================================================================*/
import { readFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const out = join(root, '.verify');
mkdirSync(out, { recursive: true });

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const extra = arg('--query', '');
const shot = arg('--shot', null);
const budget = Number(arg('--budget', '9000'));
const tag = arg('--tag', 'v' + Date.now());
/* One shared throwaway profile, removed at the end: Chrome writes ~10 MB per
   profile and a verification sweep would otherwise leave gigabytes behind. */
const profile = join(out, 'chrome-profile');

const target = existsSync(join(out, 'diag.html')) ? join(out, 'diag.html') : join(root, 'omarchy.html');
/* Callers pass either "&a=b" or "?a=b"; normalise to exactly one "?" and keep
   the rest as "&"-joined parameters. */
const params = extra.replace(/^[?&]+/, '').replace(/&+/g, '&');
const url = pathToFileURL(target).href + (params ? '?' + params : '');

const chrome = process.env.OMARCHY_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const args = [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--window-size=1600,900',
  '--user-data-dir=' + profile,
  '--virtual-time-budget=' + budget,
  '--dump-dom',
  url
];
if (shot) args.splice(args.length - 2, 0, '--screenshot=' + shot);

let dom = '';
try {
  dom = execFileSync(chrome, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 120000 });
} catch (e) {
  dom = (e.stdout || '') + '';
  if (!dom) { console.error('chrome failed: ' + (e.message || e)); process.exit(2); }
}

function nodeText(id) {
  /* Match on the id attribute alone: the element also carries a style
     attribute, so tag-attribute order is not fixed. */
  const i = dom.lastIndexOf('id="' + id + '"');
  if (i < 0) return null;
  const gt = dom.indexOf('>', i);
  const end = dom.indexOf('</pre>', gt);
  return dom.slice(gt + 1, end < 0 ? Math.min(dom.length, gt + 4000) : end)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
const fatal = nodeText('oma-fatal');
const report = nodeText('oma-report');
if (fatal) console.log('!!! FATAL !!!\n' + fatal.trim() + '\n');
if (report) console.log(report.trim());
if (!report && !fatal) {
  console.log('no report node (document ' + dom.length + ' bytes)');
  console.log('occurrences of oma-report: ' + (dom.match(/oma-report/g) || []).length);
  console.log('occurrences of oma-fatal : ' + (dom.match(/oma-fatal/g) || []).length);
  console.log('has #omarchy-desktop     : ' + dom.includes('omarchy-desktop'));
  console.log('tail: ' + JSON.stringify(dom.slice(-260)));
}
try { rmSync(profile, { recursive: true, force: true }); } catch (e) { /* best effort */ }
process.exit(fatal ? 1 : 0);
