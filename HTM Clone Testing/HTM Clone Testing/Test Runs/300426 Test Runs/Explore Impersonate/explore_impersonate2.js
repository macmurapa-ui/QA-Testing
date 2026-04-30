/**
 * Exploratory: Locate Impersonate UI on Branch 2494 (Mac 1160426)
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

  // Branch homepage
  await page.goto(`${CLONE_URL}/branches/${BRANCH_ID}/inspection`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/explore2_01_homepage.png`, fullPage: false });
  console.log('Branch homepage loaded: ' + page.url());

  // Scan entire page for impersonate
  const impersonateLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a, button'))
      .filter(el => /impersonat/i.test(el.innerText) || /impersonat/i.test(el.getAttribute('href') || ''))
      .map(el => ({ tag: el.tagName, text: el.innerText.trim(), href: el.getAttribute('href') }));
  });
  console.log('Impersonate elements: ' + JSON.stringify(impersonateLinks, null, 2));

  // Click Actions dropdown
  const actionsBtn = await page.$('text=Actions');
  if (actionsBtn) {
    await actionsBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SS_DIR}/explore2_02_actions.png`, fullPage: false });
    const items = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.dropdown-menu a, .dropdown-item'))
        .map(a => ({ text: a.innerText.trim(), href: a.getAttribute('href') }))
    );
    console.log('\nActions dropdown: ' + JSON.stringify(items, null, 2));
  } else {
    console.log('No Actions button found on homepage.');
  }

  // Full page to see all nav options
  await page.screenshot({ path: `${SS_DIR}/explore2_03_full.png`, fullPage: true });

  // Check General tab
  await page.goto(`${CLONE_URL}/branches/${BRANCH_ID}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/explore2_04_general_tab.png`, fullPage: false });

  const impersonateLinks2 = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a, button'))
      .filter(el => /impersonat/i.test(el.innerText) || /impersonat/i.test(el.getAttribute('href') || ''))
      .map(el => ({ tag: el.tagName, text: el.innerText.trim(), href: el.getAttribute('href') }));
  });
  console.log('\nImpersonate elements on General tab: ' + JSON.stringify(impersonateLinks2, null, 2));

  await browser.close();
  console.log('\nExploration complete.');
})();
