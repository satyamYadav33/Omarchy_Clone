/* ============================================================================
 * Omarchy Web Clone — tools/repair-encoding.mjs
 * ----------------------------------------------------------------------------
 * Repairs source files that were double-encoded (UTF-8 bytes reinterpreted as
 * Windows-1252, then written back as UTF-8). That happens when a tool reads a
 * UTF-8 file without specifying an encoding on a Windows machine.
 *
 * The repair is exact: re-encode the text to Windows-1252 to recover the
 * original bytes, then decode those bytes as UTF-8. Every file is validated by
 * round-trip before anything is written.
 * ==========================================================================*/
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'src');

/* Windows-1252 is Latin-1 except for 0x80-0x9F, which map to these glyphs.
   Reversing needs the inverse of that table. */
const CP1252_HIGH = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F
};

function encodeCp1252(text) {
  const out = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) { out.push(cp); continue; }
    if (cp >= 0xA0 && cp <= 0xFF) { out.push(cp); continue; }
    if (CP1252_HIGH[cp] != null) { out.push(CP1252_HIGH[cp]); continue; }
    /* Any other codepoint cannot have come from a single-byte misread, so the
       file is not purely mojibake — refuse to touch it. */
    return null;
  }
  return Buffer.from(out);
}

function mojibakeScore(text) {
  return (text.match(/[\u00C2\u00C3\u00E2\u00F0\u0178\u02DC][\u0080-\u00BF\u2013\u2014\u20AC\u2018-\u201E\u2020-\u2022\u02C6\u02DC\u2122]/g) || []).length;
}

const report = [];
for (const file of readdirSync(src).filter((f) => f.endsWith('.js'))) {
  const path = join(src, file);
  const raw = readFileSync(path);
  const hasBom = raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF;
  const body = hasBom ? raw.subarray(3) : raw;
  const asUtf8 = body.toString('utf8');

  if (asUtf8.includes('\uFFFD') || mojibakeScore(asUtf8) === 0) {
    /* Already fine (or undecodable) — only strip a stray BOM if present. */
    if (hasBom) {
      writeFileSync(path, asUtf8, 'utf8');
      report.push(file + ': stripped BOM only');
    }
    continue;
  }

  let candidate = null;
  try {
    candidate = new TextDecoder('utf-8', { fatal: true }).decode(body);
  } catch (e) {
    candidate = null;
  }
  const bytes = candidate == null ? encodeCp1252(asUtf8) : null;
  if (candidate == null && bytes) {
    try {
      candidate = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (e) {
      candidate = null;
    }
  }

  const before = mojibakeScore(asUtf8);
  if (candidate == null || candidate.includes('\uFFFD') || mojibakeScore(candidate) >= before) {
    report.push(file + ': COULD NOT REPAIR (score ' + before + ') — left untouched');
    continue;
  }
  writeFileSync(path, candidate, 'utf8');
  report.push(file + ': repaired (mojibake ' + before + ' -> ' + mojibakeScore(candidate) + ', ' + candidate.length + ' chars)');
}

console.log(report.length ? report.join('\n') : 'nothing to do');
