/**
 * Checks the WCAG 2 contrast of every text and control pair in theme/theme.ts,
 * in light and dark. Run: node scripts/check-contrast.js
 * Text needs 4.5:1; control outlines and large/bold-only text need 3:1.
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'theme', 'theme.ts'), 'utf8');
function palette(name) {
  const start = source.indexOf(`export const ${name}: ColorTokens = {`);
  const block = source.slice(start, source.indexOf('};', start));
  return Object.fromEntries([...block.matchAll(/(\w+): '(#[0-9A-Fa-f]{6})'/g)].map((m) => [m[1], m[2]]));
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground, background, minimum]
const pairs = [
  ...['label', 'labelSecondary', 'accent', 'danger', 'success', 'warning'].flatMap((fg) => [
    [fg, 'surface', 4.5],
    [fg, 'background', 4.5],
    [fg, 'surfaceRaised', 4.5],
  ]),
  ['onAccent', 'accent', 4.5],
  ['onAccent', 'accentPressed', 4.5],
  ['onAccentTint', 'accentTint', 4.5],
  ['label', 'accentTint', 4.5],
  ['labelSecondary', 'accentTint', 4.5],
  ['fieldBorder', 'surface', 3],
  ['fieldBorder', 'background', 3],
  ['surface', 'danger', 4.5], // white text on a destructive fill
  ['onHero', 'hero', 4.5],
  ['onHeroSecondary', 'hero', 4.5],
  ['heroAccent', 'hero', 3], // Route and icons on the hero card
  ['onHero', 'heroPanel', 4.5],
  ['onHeroSecondary', 'heroPanel', 4.5],
  ['heroAccent', 'heroPanel', 3],
];

let failures = 0;
for (const scheme of ['lightColors', 'darkColors']) {
  const c = palette(scheme);
  console.log(`\n${scheme}`);
  for (const [fg, bg, min] of pairs) {
    const r = ratio(c[fg], c[bg]);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? 'pass' : 'FAIL'}  ${fg} on ${bg}: ${r.toFixed(2)}:1 (needs ${min}:1)`);
  }
}
if (failures) {
  console.error(`\n${failures} pair(s) below the minimum.`);
  process.exit(1);
}
console.log('\nAll pairs pass.');
