#!/usr/bin/env node
// Usage: node screenshot.js <input.html> <output.jpg> [width]
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  const [,, inputHtml, outputImg, width = '960'] = process.argv;
  if (!inputHtml || !outputImg) {
    console.error('Usage: node screenshot.js <input.html> <output.jpg> [width]');
    process.exit(1);
  }

  const html = fs.readFileSync(path.resolve(inputHtml), 'utf-8');

  // Find system Chrome
  const chromePaths = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ].filter(Boolean);

  const executablePath = chromePaths.find(p => fs.existsSync(p));
  if (!executablePath) {
    console.error('Chrome not found. Set CHROME_PATH env var.');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: parseInt(width), height: 800, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });

  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: parseInt(width), height: bodyHeight, deviceScaleFactor: 2 });

  const ext = path.extname(outputImg).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') {
    await page.screenshot({ path: outputImg, fullPage: true, type: 'jpeg', quality: 92 });
  } else {
    await page.screenshot({ path: outputImg, fullPage: true, type: 'png' });
  }

  await browser.close();
  console.log(`Screenshot saved: ${outputImg} (${bodyHeight}px height)`);
})();
