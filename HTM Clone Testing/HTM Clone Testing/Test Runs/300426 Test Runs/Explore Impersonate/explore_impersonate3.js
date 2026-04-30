/**
 * Exploratory: Navigate to impersonation page and capture the UI
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const CLONE_URL = 'https://admin-clone.helpthemove.co.uk';
const AUTH_PATH = '/home/user/QA-Testing/auth.json';
const SS_DIR    = path.dirname(__filename);
const BRANCH_ID = '2494';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context  = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 }, storageState: AUTH_PATH });
  const page     = await context.newPage();

  // Screenshot: branch homepage — locate the impersonate icon
  await page.goto(`${CLONE_URL}/branches/${BRANCH_ID}/inspection`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/explore3_01_homepage.png`, fullPage: false });
  console.log('Homepage: ' + page.url());

  // Navigate to impersonation page
  await page.goto(`${CLONE_URL}/branches/${BRANCH_ID}/impersonation`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/explore3_02_impersonation_page.png`, fullPage: false });
  console.log('Impersonation page: ' + page.url());

  // Capture all interactive elements
  const elements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a, button, input[type="submit"]'))
      .map(el => ({ tag: el.tagName, text: el.innerText.trim(), href: el.getAttribute('href'), type: el.type || null }))
      .filter(el => el.text || el.href);
  });
  console.log('\nInteractive elements: ' + JSON.stringify(elements, null, 2));

  // Full page
  await page.screenshot({ path: `${SS_DIR}/explore3_03_impersonation_full.png`, fullPage: true });

  await browser.close();
  console.log('\nExploration complete.');
})();
