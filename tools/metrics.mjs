/* Tech-stack metrics for the built bundle and the source tree. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const src = join(root, 'src');

const bundle = readFileSync(join(root, 'omarchy.html'), 'utf8');
const lines = (s) => s.split('\n').length;
const kb = (n) => (n / 1024).toFixed(1) + ' KB';

console.log('=== BUNDLE ===');
console.log('omarchy.html      ' + kb(statSync(join(root, 'omarchy.html')).size) +
  '   ' + lines(bundle) + ' lines');
const gz = (await import('node:zlib')).gzipSync(Buffer.from(bundle)).length;
console.log('gzipped           ' + kb(gz) + '  (' + (gz / bundle.length * 100).toFixed(1) + '% of raw)');

/* Inline vs script vs style split */
const styleMatch = bundle.match(/<style>([\s\S]*?)<\/style>/);
const css = styleMatch ? styleMatch[1] : '';
console.log('inline CSS        ' + kb(css.length) + '   ' + lines(css) + ' lines');
console.log('inline JS         ' + kb(bundle.length - css.length) + ' (bundle minus CSS)');

console.log('\n=== ZERO-DEPENDENCY EVIDENCE ===');
console.log('type="module"     ' + (bundle.match(/type="module"/g) || []).length);
console.log('<script> tags     ' + (bundle.match(/<script/g) || []).length);
console.log('external src/href ' + (bundle.match(/(src|href)\s*=\s*"(?!#|data:)[^"]+"/g) || []).length);
console.log('<link> tags       ' + (bundle.match(/<link/g) || []).length + ' (favicon only, data: URI)');

console.log('\n=== SOURCE TREE ===');
const files = readdirSync(src).filter((f) => /\.(js|css|html)$/.test(f)).sort();
let totalJs = 0, totalCss = 0;
const rows = [];
for (const f of files) {
  const text = readFileSync(join(src, f), 'utf8');
  const size = Buffer.byteLength(text);
  if (f.endsWith('.css')) totalCss += size; else totalJs += size;
  rows.push([f, size, lines(text)]);
}
for (const [f, size, l] of rows.sort((a, b) => b[1] - a[1])) {
  console.log('  ' + f.padEnd(16) + kb(size).padStart(9) + '   ' + String(l).padStart(5) + ' lines');
}
console.log('  ' + 'TOTAL'.padEnd(16) + kb(totalJs + totalCss).padStart(9) +
  '   ' + String(rows.reduce((a, r) => a + r[2], 0)).padStart(5) + ' lines');
console.log('  JS ' + kb(totalJs) + ' / CSS ' + kb(totalCss));

console.log('\n=== FEATURE INVENTORY ===');
const count = (re) => (bundle.match(re) || []).length;
console.log('themes (name: \')     ' + count(/name: '/g));
console.log('WM registry.register  ' + count(/registry\.register\(/g));
console.log('CSS custom props used ' + new Set(bundle.match(/--[a-z-]+(?=\s*[,;)])/g) || []).size);
console.log('CSS rules (selectors) ' + count(/\{/g));
console.log('keyframes             ' + count(/@keyframes/g));
console.log('IIFE modules          ' + count(/\(function \(OMA\)/g));
console.log('canvas 2D usage       ' + count(/getContext\('2d'\)/g));
console.log('SVG generators        ' + count(/svgWrap|viewBox/g));
console.log('localStorage keys     ' + count(/localStorage/g));
console.log('setInterval timers    ' + count(/setInterval\(/g));
console.log('addEventListener      ' + count(/addEventListener\(/g));
console.log('keyboard chords bound ' + count(/name === '/g));
console.log('menu tree nodes (T() )' + count(/\bT\(/g));

console.log('\n=== BROWSER APIs USED ===');
const apis = [
  ['Canvas 2D (graphs)', /getContext\('2d'\)/],
  ['CSS custom properties', /setProperty\('--/],
  ['localStorage (persist)', /localStorage/],
  ['KeyboardEvent (synthetic)', /new KeyboardEvent/],
  ['navigator.clipboard', /navigator\.clipboard/],
  ['requestAnimationFrame', /requestAnimationFrame/],
  ['getModifierState (CapsLock)', /getModifierState/],
  ['iframe (framed web apps)', /<iframe|<iframe/],
  ['data: URI SVG artwork', /data:image\/svg\+xml/],
  ['window.open', /window\.open/],
  ['getComputedStyle', /getComputedStyle/],
  ['flex/grid layout', /display:\s*(grid|flex)/]
];
for (const [name, re] of apis) console.log('  ' + (re.test(bundle) ? 'yes' : 'NO ') + '  ' + name);
