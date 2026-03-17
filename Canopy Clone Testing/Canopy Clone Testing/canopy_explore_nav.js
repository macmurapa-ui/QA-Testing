/**
 * Canopy Clone - Explore Navigation
 * Find the correct URL for clone submissions
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const CANOPY_URL = 'https://admin-canopy-clone.helpthemove.co.uk';
const SCREENSHOT_DIR = path.dirname(__filename);
const CANOPY_AUTH_PATH = '/home/user/QA-Testing/canopy_auth.json';

const rawProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
let proxyConfig;
if (rawProxy) {
  const u = new URL(rawProxy);
  proxyConfig = { server: `${u.protocol}//${u.host}`, username: u.username, password: u.password, bypass: '<-loopback>' };
}

(async () => {
  const browser = await chromium.launch({ headless: true, proxy: proxyConfig, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 }, storageState: CANOPY_AUTH_PATH });
  const page = await context.newPage();

  console.log('Navigating to dashboard...');
  await page.goto(CANOPY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('URL: ' + page.url());
  console.log('Title: ' + await page.title());
  await page.screenshot({ path: `${SCREENSHOT_DIR}/canopy_nav_dashboard.png`, fullPage: true });

  const navData = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.map(a => ({ text: a.innerText.trim().replace(/\s+/g, ' '), href: a.href }))
                .filter(l => l.text && l.href && l.href.startsWith('https://admin-canopy'));
  });

  console.log('\nAll admin navigation links:');
  navData.forEach(l => console.log(`  "${l.text}" → ${l.href}`));

  // Also get the full page text
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
  console.log('\nPage content preview:\n' + bodyText);

  await browser.close();
})();
