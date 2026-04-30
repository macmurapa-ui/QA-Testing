/**
 * Exploratory: Capture the Invites page on Branch 2481 to inspect revoke UI
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const CLONE_URL = 'https://admin-clone.helpthemove.co.uk';
const AUTH_PATH = '/home/user/QA-Testing/auth.json';
const SS_DIR    = path.dirname(__filename);
const BRANCH_ID = '2481';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context  = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 }, storageState: AUTH_PATH });
  const page     = await context.newPage();

  await page.goto(`${CLONE_URL}/branches/${BRANCH_ID}/invites`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SS_DIR}/explore_invites_list.png`, fullPage: true });
  console.log('Invites list: ' + page.url());

  // Capture full HTML of the invites table for inspection
  const html = await page.evaluate(() => {
    const table = document.querySelector('table') || document.querySelector('.invites') || document.body;
    return table ? table.innerHTML.substring(0, 3000) : 'no table found';
  });
  console.log('\nPage HTML snippet:\n' + html);

  await browser.close();
})();
