import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, 'oracle-trading-src/public/og-image.svg');
const outPath  = resolve(__dirname, 'oracle-trading-src/public/og-image.png');

const svg = readFileSync(svgPath, 'utf8');
const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1200, height: 630 });
await page.goto(dataUrl);
await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
console.log('og-image.png generated →', outPath);
