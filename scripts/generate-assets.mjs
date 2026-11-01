import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import * as icons from 'lucide';
mkdirSync('static/icons', { recursive: true });
for (const name of readdirSync('static/source')) {
  if (!name.endsWith('.svg')) continue;
  const png = new Resvg(readFileSync(`static/source/${name}`), { font: { loadSystemFonts: false }, fitTo: { mode: 'width', value: 384 } }).render().asPng();
  writeFileSync(`static/${name.replace('.svg', '.png')}`, png);
}
const names = ['sprout', 'volume-x', 'volume-2', 'rotate-ccw', 'images', 'upload', 'undo-2', 'info', 'sun-medium', 'skull', 'shovel', 'sun', 'shield', 'sparkles', 'mouse-pointer-click', 'pause', 'play', 'refresh-cw', 'crosshair', 'circle', 'flame', 'snowflake', 'zap', 'image-plus', 'x'];
for (const name of names) {
  const exportName = name.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join('');
  const nodes = icons[exportName].map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([key, value]) => `${key}="${value}"`).join(' ')}/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#668344" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${nodes}</svg>`;
  writeFileSync(`static/icons/${name}.png`, new Resvg(svg, { font: { loadSystemFonts: false }, fitTo: { mode: 'width', value: 72 } }).render().asPng());
}
