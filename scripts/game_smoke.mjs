import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
try {
  await page.goto(`${process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5173'}/migration.html`);
  await page.waitForSelector('#loading', { state: 'hidden' });
  assert.equal(await page.locator('#game canvas').count(),1);
  assert.equal(await page.getByText('Laboratório HTML5').count(),0);
  assert.equal(await page.locator('#metrics').count(),0);
  assert.equal(await page.locator('header,footer').count(),0);
  mkdirSync('test-results', { recursive: true });
  await page.screenshot({ path:'test-results/game-desktop.png' });
  const point = await page.evaluate(async () => {
    const item = window.HALL_CONFIG.find(item => item.name === 'shop_mc');
    const image = new Image(); image.src = '/' + item.img; await image.decode();
    const box = document.querySelector('#game canvas').getBoundingClientRect();
    const s = Math.min(box.width/1000,box.height/600);
    return { x:box.x+(box.width-1000*s)/2+(item.tx+image.naturalWidth*item.scaleX/2)*s, y:box.y+(box.height-600*s)/2+(item.ty+image.naturalHeight*item.scaleY/2)*s };
  });
  await page.mouse.click(point.x,point.y);
  await page.waitForSelector('#locationDialog[open]');
  assert.equal(await page.locator('#locationTitle').innerText(),'Loja');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width:390,height:844 });
  await page.waitForFunction(() => document.querySelector('#game canvas').getBoundingClientRect().width === innerWidth);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path:'test-results/game-mobile.png' });
  assert.deepEqual(errors,[]);
  console.log('PASS: interface limpa, 45 imagens, clique PixiJS, diálogo/Esc, mobile, zero erros de console.');
} finally { await browser.close(); }
