/* End-to-end smoke of GROUND TRUTH: load app, boot Pyodide, run starter code,
   submit the level-1 answer, verify the DECLASSIFIED stamp and level-2 unlock. */
import { chromium } from 'playwright';

const SCREENS = process.env.SCREENS || '.';
const url = 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});

const step = (msg) => console.log('•', msg);

await page.goto(url, { waitUntil: 'networkidle' });
step('page loaded');

// 1. rail shows all 23 levels, exactly one unlocked at start (fresh storage)
await page.waitForSelector('.rail-level');
const railCount = await page.locator('.rail-level').count();
if (railCount !== 23) throw new Error(`rail has ${railCount} levels, want 23`);
const locked = await page.locator('.rail-level.locked').count();
step(`rail: 23 levels, ${locked} locked`);
if (locked !== 0) throw new Error(`levels must all be visible and enabled, got ${locked} locked`);

// 2. level 1 chart canvas rendered with actual size
await page.waitForSelector('.chart-wrap canvas');
const box = await page.locator('.chart-wrap canvas').first().boundingBox();
if (!box || box.width < 300 || box.height < 100) throw new Error('chart canvas not sized');
step(`chart canvas ${Math.round(box.width)}x${Math.round(box.height)}`);
await page.screenshot({ path: `${SCREENS}/01-level1.png`, fullPage: false });

// 3. run the starter code — boots Pyodide from CDN (slow on first run)
await page.getByRole('button', { name: /Run/ }).click();
step('Run clicked — booting Pyodide (may take a couple of minutes)…');
await page.waitForFunction(
  () => document.querySelector('.console')?.textContent?.includes('RMSE'),
  null,
  { timeout: 360000 },
);
step('python ran: RMSE printed to console panel');

// overlay legend entry from overlay_fn in starter code
await page.waitForSelector('.legend');
const legendText = await page.locator('.legend').first().textContent();
if (!legendText.includes('c = 4.0')) throw new Error('overlay legend missing: ' + legendText);
step('overlay drawn and in legend');
await page.screenshot({ path: `${SCREENS}/02-after-run.png` });

// 4. python exception surfaces in console, not a crash
await page.evaluate(() => {
  const view = document.querySelector('.cm-content');
  return view;
});
// run bad code via a second Run after replacing editor content
await page.locator('.cm-content').click();
await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
await page.keyboard.type('1/0');
await page.getByRole('button', { name: /Run/ }).click();
await page.waitForFunction(
  () => document.querySelector('.console')?.textContent?.includes('ZeroDivisionError'),
  null,
  { timeout: 60000 },
);
step('python exception surfaced in console panel (no crash)');

// 5. submit the true answer for level 1 (c = 5, tolerance ~±0.23)
await page.locator('#fld-c').fill('5.0');
await page.getByRole('button', { name: 'Submit' }).click();
await page.waitForSelector('.stamp');
step('DECLASSIFIED stamp rendered');
await page.waitForSelector('.truth-reveal');
const clearedCount = await page.locator('.rail-level.solved').count();
if (clearedCount !== 1) throw new Error(`expected 1 cleared level in the rail, got ${clearedCount}`);
step('level 1 marked cleared in the rail');
await page.screenshot({ path: `${SCREENS}/03-declassified.png` });

// 6. persistence across reload
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.rail-level');
const clearedReload = await page.locator('.rail-level.solved').count();
if (clearedReload !== 1) throw new Error('progress not persisted across reload');
step('progress persisted across reload');

// 7. navigate to level 13 pack sanity via rail? level 2 is unlocked; open it
await page.getByRole('button', { name: /Level 2:/ }).click();
await page.waitForSelector('.chart-wrap canvas');
step('level 2 loads');

const fatal = errors.filter(
  (e) => !e.includes('favicon') && !e.includes('Download the React DevTools'),
);
if (fatal.length) throw new Error('console errors:\n' + fatal.join('\n'));
console.log('E2E PASS');
await browser.close();
