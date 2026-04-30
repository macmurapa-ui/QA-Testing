/**
 * Exploratory: Dashboard Landlord Creation form
 * - Find today's last branch, impersonate, navigate to Landlords, click +
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const CLONE_URL     = 'https://admin-clone.helpthemove.co.uk';
const DASHBOARD_URL = 'https://dashboard-clone.helpthemove.co.uk';
const AUTH_PATH     = '/home/user/QA-Testing/auth.json';
const SS_DIR        = path.dirname(__filename);

function dateSuffix() {
  const now = new Date();
  const dd  = String(now.getDate()).padStart(2, '0');
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const yy  = String(now.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context  = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 }, storageState: AUTH_PATH });
  const page     = await context.newPage();

  // Find today's last branch
  const suffix = dateSuffix();
  await page.goto(`${CLONE_URL}/branches?q=${encodeURIComponent(suffix)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(600);

  const branches = await page.evaluate((sfx) => {
    const pattern = new RegExp('^Mac \\d+' + sfx + '$');
    return Array.from(document.querySelectorAll('a[href*="/branches/"]'))
      .filter(a => pattern.test(a.innerText.trim()))
      .map(a => ({ name: a.innerText.trim(), href: a.href }));
  }, suffix);

  const lastBranch = branches[branches.length - 1];
  const branchId   = (lastBranch.href.match(/\/branches\/(\d+)/) || [])[1];
  console.log('Using branch: ' + lastBranch.name + ' (ID: ' + branchId + ')');

  // Impersonate
  await page.goto(`${CLONE_URL}/branches/${branchId}/impersonation`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  console.log('Impersonating: ' + page.url());

  // Dismiss cookie consent
  const acceptBtn = await page.$('button[type="submit"]:has-text("Accept"), button:has-text("Accept")');
  if (acceptBtn) { await acceptBtn.click(); await page.waitForTimeout(500); }

  await page.screenshot({ path: `${SS_DIR}/explore_01_dashboard.png`, fullPage: false });

  // Click Landlords
  await page.click('a[href="/landlords"], a:has-text("Landlords")');
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/explore_02_landlords.png`, fullPage: false });
  console.log('Landlords page: ' + page.url());

  // Click + (new landlord) — JS click as element may be below fold
  await page.evaluate(() => {
    const a = document.querySelector('a[href="/landlords/new"]');
    if (a) a.click();
  });
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/explore_03_new_landlord_form.png`, fullPage: false });
  console.log('New landlord form: ' + page.url());

  // Capture all form fields
  const fields = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, select, textarea'))
      .map(el => ({ tag: el.tagName, type: el.type, name: el.name, id: el.id, placeholder: el.placeholder }));
  });
  console.log('\nForm fields: ' + JSON.stringify(fields, null, 2));

  // Full page screenshot
  await page.screenshot({ path: `${SS_DIR}/explore_04_form_full.png`, fullPage: true });

  await browser.close();
  console.log('\nExploration complete.');
})();
