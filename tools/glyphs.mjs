/* Replace glyphs that render as tofu without a Nerd Font with characters that
   exist in every common font. Also exposes the full non-ASCII inventory so the
   set stays auditable. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'src');

const FILES = ['apputil.js', 'appeditor.js', 'appmisc.js', 'appterm.js', 'appnet.js', 'menu.js', 'shell.js', 'boot.js', 'capture.js'];

/* Codepoint-explicit so nothing depends on the terminal encoding. */
const REPLACEMENTS = [
  ['\u25B8', '\u251C'],   // ▸ small right triangle  -> ├ light vertical and right
  ['\u2193', 'v'],        // ↓ down arrow            -> v
  ['\u2191', '^'],        // ↑ up arrow              -> ^
  ['\u2190', '<'],        // ← left arrow            -> <
  ['\u2192', '>'],        // → right arrow           -> >
  ['\u22EF', '...'],      // ⋯ midline ellipsis      -> ...
  ['\u25CF', '\u2022'],   // ● black circle          -> • bullet
  ['\u25A0', '#'],        // ■ black square          -> #
  ['\u2713', '\u2714'],   // ✓ check                 -> ✔ heavy check
  ['\u2318', 'Cmd'],      // ⌘ place of interest
  ['\u23CE', 'Enter']     // ⏎ return symbol
];

let changed = 0;
for (const file of FILES) {
  const p = join(src, file);
  let code = readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  const before = code;
  for (const [from, to] of REPLACEMENTS) {
    code = code.split(from).join(to);
  }
  if (code !== before) {
    writeFileSync(p, code, 'utf8');
    changed++;
    console.log('updated ' + file);
  }
}
console.log(changed + ' file(s) changed');

/* Audit: list every remaining non-ASCII codepoint per file so the intent of
   each one is visible rather than accidental. */
console.log('\nnon-ASCII inventory:');
for (const file of FILES) {
  const code = readFileSync(join(src, file), 'utf8');
  const set = new Map();
  for (const ch of code) {
    const cp = ch.codePointAt(0);
    if (cp > 126) set.set(cp, (set.get(cp) || 0) + 1);
  }
  if (!set.size) continue;
  const list = [...set.entries()].sort((a, b) => b[1] - a[1])
    .map(([cp, n]) => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0') + '(' + String.fromCodePoint(cp) + ')×' + n);
  console.log('  ' + file + ': ' + list.join(' '));
}
