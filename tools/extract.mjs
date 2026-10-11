#!/usr/bin/env node
/* Print the rendered #oma-fatal and #oma-report nodes from a dump-dom file. */
import { readFileSync } from 'node:fs';

const file = process.argv[2] || '.verify/dom.html';
const d = readFileSync(file, 'utf8');

function nodeText(id) {
  const i = d.lastIndexOf('id="' + id + '"');
  if (i < 0) return null;
  const gt = d.indexOf('>', i);
  const end = d.indexOf('</pre>', gt);
  return d.slice(gt + 1, end < 0 ? Math.min(d.length, gt + 3000) : end)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

let found = false;
for (const id of ['oma-fatal', 'oma-report']) {
  const t = nodeText(id);
  if (t) { found = true; console.log('=== ' + id + ' ===\n' + t.trim() + '\n'); }
  else console.log('=== ' + id + ': not rendered ===');
}
if (!found) {
  console.log('document length ' + d.length);
  console.log('has #omarchy-desktop: ' + d.includes('omarchy-desktop'));
  console.log('has #omarchy-bar: ' + d.includes('omarchy-bar'));
  console.log('has .oma-win: ' + d.includes('oma-win'));
}
