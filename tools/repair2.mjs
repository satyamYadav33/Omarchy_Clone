/* ============================================================================
 * Omarchy Web Clone — tools/repair2.mjs
 * ----------------------------------------------------------------------------
 * Repairs the double-encoded sources: UTF-8 bytes that were misread through a
 * Windows-1252 table (which covers both Latin-1 and the 0x80-0x9F glyph range)
 * and then written back as UTF-8.
 *
 * Every non-ASCII character must be explainable by that misreading, otherwise
 * the file is left alone. Each repair is validated before it is written.
 * ==========================================================================*/
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'src');

const CP1252_TO_BYTE = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F
};

function toBytes(text) {
  const out = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp <= 0xFF) { out.push(cp); continue; }
    if (CP1252_TO_BYTE[cp] != null) { out.push(CP1252_TO_BYTE[cp]); continue; }
    return null;                       // not explainable as a misread byte
  }
  return Buffer.from(out);
}

function score(text) {
  return (text.match(/[\u00C2\u00C3\u00E2\u00F0][\u0080-\u00BF\u2013\u2014\u20AC\u2018-\u201E\u2020-\u2022\u02C6\u02DC\u2122]|[\u00F0\u00E2][\u0080-\u00BF]/g) || []).length;
}

const FILES = ['apputil.js', 'appeditor.js', 'appmisc.js', 'appterm.js', 'capture.js'];
for (const file of FILES) {
  const path = join(src, file);
  const original = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const bytes = toBytes(original);
  if (!bytes) {
    console.log(file + ': contains characters that are NOT misread bytes — left untouched');
    continue;
  }
  const repaired = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const bad = (repaired.match(/\uFFFD/g) || []).length;
  if (bad) { console.log(file + ': repair produced ' + bad + ' invalid sequences — left untouched'); continue; }
  if (score(repaired) >= score(original)) { console.log(file + ': no improvement — left untouched'); continue; }
  if (repaired.length > original.length || repaired.length < original.length * 0.3) {
    console.log(file + ': implausible length change — left untouched'); continue;
  }
  writeFileSync(path, repaired, 'utf8');
  console.log(file + ': repaired  mojibake ' + score(original) + ' -> ' + score(repaired) +
    '   chars ' + original.length + ' -> ' + repaired.length);
}
