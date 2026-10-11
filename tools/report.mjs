#!/usr/bin/env node
/* Extract the rendered diagnostics report from a Chrome --dump-dom file.
   The rendered node is <pre style="..." id="oma-report">…</pre>, so match on
   the id attribute rather than on a fixed tag/attribute order. */
import { readFileSync } from 'node:fs';

const file = process.argv[2] || '.verify/dom.html';
const html = readFileSync(file, 'utf8');

/* Skip the inlined script source by scanning backwards from the end. */
const marker = 'id="oma-report"';
const idAt = html.lastIndexOf(marker);
if (idAt < 0) {
  console.log('NO REPORT NODE in ' + file + ' (len ' + html.length + ')');
  process.exit(1);
}
/* find the '>' that closes the opening tag, then the matching </pre> */
const gt = html.indexOf('>', idAt);
const end = html.indexOf('</pre>', gt);
let text = html.slice(gt + 1, end < 0 ? html.length : end);
text = text
  .replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
console.log(text.trim());
