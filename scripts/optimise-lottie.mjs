// Shrinks a bodymovin export: rounds long floats and strips whitespace.
// Usage: node scripts/optimise-lottie.mjs <in.json> <out.json> [decimals]
import { readFileSync, statSync, writeFileSync } from 'node:fs';

const [input, output, places = '3'] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: node scripts/optimise-lottie.mjs <in.json> <out.json> [decimals]');
  process.exit(1);
}

const factor = 10 ** Number(places);
const round = (value) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.round(value * factor) / factor : value;

const walk = (node) => {
  if (Array.isArray(node)) return node.map(walk);
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, walk(value)]));
  }
  return round(node);
};

writeFileSync(output, JSON.stringify(walk(JSON.parse(readFileSync(input, 'utf8')))));

const before = statSync(input).size;
const after = statSync(output).size;
const saved = Math.round((1 - after / before) * 100);
console.log(
  `${(before / 1024).toFixed(1)} kB -> ${(after / 1024).toFixed(1)} kB (${saved}% smaller)`
);
