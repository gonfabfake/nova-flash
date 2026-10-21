import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const executablePath = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!existsSync(executablePath)) throw new Error('Defina CHROME_PATH para um Chromium instalado.');
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
const failed = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(`${message.text()} ${message.location().url}`); });
page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
const checks = [];
mkdirSync('test-results', { recursive: true });
try {
  await page.goto(`${base}/laboratorio.html`);
  await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('Salão PixiJS:'), { timeout: 45000 });
  assert.match(await page.locator('#status').innerText(), /0 falhas/);
  await page.screenshot({ path: 'test-results/hall-desktop.png', fullPage: true });
  await page.locator('#hallCanvas canvas').scrollIntoViewIfNeeded();
  const shopPoint = await page.evaluate(async () => {
    const canvas = document.querySelector('#hallCanvas canvas');
    const item = window.HALL_CONFIG.find(item => item.name === 'shop_mc');
    const image = new Image(); image.src = '/' + item.img; await image.decode();
    const box = canvas.getBoundingClientRect();
    const scale = Math.min(box.width / 1000, box.height / 600);
    return {
      x: box.x + (box.width - 1000 * scale) / 2 + (item.tx + image.naturalWidth * item.scaleX / 2) * scale,
      y: box.y + (box.height - 600 * scale) / 2 + (item.ty + image.naturalHeight * item.scaleY / 2) * scale,
    };
  });
  await page.mouse.click(shopPoint.x, shopPoint.y);
  assert.match(await page.locator('#status').innerText(), /shop_mc selecionado/);
  await page.locator('.hall-location-controls button[data-location="shop_mc"]').click();
  assert.match(await page.locator('#status').innerText(), /shop_mc selecionado/);
  checks.push('Salão PixiJS, imagens e seleção acessível');
  await page.locator('#viewerTab').click();
  await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('Recurso visual carregado'), { timeout: 45000 });
  assert.equal(await page.locator('#preview canvas').count(), 1);
  const max = Number(await page.locator('#frame').getAttribute('max'));
  assert.ok(max > 0);
  const catalog = JSON.parse(readFileSync('public/migration/catalog.json', 'utf8'));
  const mi = catalog.modules.findIndex(mod => mod.sprites.some(sprite => sprite.frames.length > 1 && sprite.frames.length < 80));
  assert.ok(mi >= 0, 'Catálogo deve conter uma animação real');
  const si = catalog.modules[mi].sprites.findIndex(sprite => sprite.frames.length > 1 && sprite.frames.length < 80);
  await page.locator('#module').selectOption(String(mi));
  await page.locator('#resource').selectOption(String(si));
  await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('Recurso visual carregado'));
  assert.ok(Number(await page.locator('#frame').getAttribute('max')) > 1);
  await page.waitForFunction(() => Number(document.querySelector('#frameValue')?.textContent) > 1);
  await page.locator('#play').click();
  await page.locator('#frame').fill('2');
  await page.locator('#frame').dispatchEvent('input');
  assert.equal(await page.locator('#frameValue').innerText(), '2');
  checks.push('Catálogo real, preview, quadros e controle de reprodução');
  await page.locator('#resource').selectOption('0');
  await page.locator('#hallTab').click();
  await page.waitForLoadState('networkidle');
  assert.match(await page.locator('#status').innerText(), /Salão PixiJS:/);
  checks.push('Troca rápida de área não sobrescreve status com carga atrasada');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#hallTab').click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'test-results/hall-mobile.png', fullPage: true });
  checks.push('Viewport móvel sem overflow horizontal');
  await page.goto(`${base}/index.html`);
  await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('Salão carregado'));
  assert.equal(await page.locator('.hotspot').count(), 13);
  checks.push('Salão legado preservado, 13 hotspots');
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('#hallCanvas canvas') !== null);
  await page.locator('.hall-location-controls button[data-location="shop_mc"]').click();
  assert.match(await page.locator('#status').innerText(), /shop_mc selecionado/);
  checks.push('Navegação voltar preserva o cliente');
  const blocked = await page.request.get(`${base}/exported/hall__c64be0490/timeline.json`);
  assert.equal(blocked.status(), 403);
  const traversal = await page.request.get(`${base}/exported/..%5C..%5Cnovo%20ddtank%20em%20html%5Cnova%20flash%20html5%5Cpackage.json`);
  assert.ok([403,404].includes(traversal.status()));
  checks.push('Exportação bloqueia JSON e traversal');
  // Expected security probe responses are not asset-loading failures.
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  mkdirSync('test-results', { recursive: true });
  writeFileSync('test-results/browser-smoke.json', JSON.stringify({ base, checks, errors, failed }, null, 2));
  console.log(JSON.stringify({ checks, errors, failed }, null, 2));
} finally { await browser.close(); }
