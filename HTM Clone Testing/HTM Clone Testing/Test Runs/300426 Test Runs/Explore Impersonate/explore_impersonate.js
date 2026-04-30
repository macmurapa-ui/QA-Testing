/**
 * Exploratory: Find today's last created branch and locate Impersonate UI
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const CLONE_URL = 'https://admin-clone.helpthemove.co.uk';
const AUTH_PATH = '/home/user/QA-Testing/auth.json';
const SS_DIR    = path.dirname(__filename);

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

  // Step 1: Find today's branches
  const suffix = dateSuffix();
  console.log('Looking for branches with suffix: ' + suffix);

  await page.goto(`${CLONE_URL}/branches?q=${encodeURIComponent(suffix)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/explore_01_branches_today.png`, fullPage: false });

  // Find all Mac N[suffix] branches and pick the last one
  const branches = await page.evaluate((sfx) => {
    const pattern = new RegExp('^Mac \\d+' + sfx + '$');
    const links = Array.from(document.querySelectorAll('a[href*="/branches/"]'));
    return links
      .filter(a => pattern.test(a.innerText.trim()))
      .map(a => ({ name: a.innerText.trim(), href: a.href }));
  }, suffix);

  console.log('Branches found today: ' + JSON.stringify(branches, null, 2));

  if (!branches.length) {
    console.log('No branches found for today. Exiting.');
    await browser.close(); return;
  }

  // Pick the last one (highest N)
  const lastBranch = branches[branches.length - 1];
  console.log('\nLast branch: ' + lastBranch.name + ' → ' + lastBranch.href);

  // Step 2: Navigate to the branch homepage
  await page.goto(lastBranch.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/explore_02_branch_homepage.png`, fullPage: false });
  console.log('Branch homepage: ' + page.url());

  // Step 3: Look for any impersonate-related links/buttons on the page
  const impersonateInfo = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('a, button'));
    return all
      .filter(el => /impersonat/i.test(el.innerText) || /impersonat/i.test(el.href || ''))
      .map(el => ({ tag: el.tagName, text: el.innerText.trim(), href: el.href || null }));
  });
  console.log('\nImpersonate elements on branch homepage: ' + JSON.stringify(impersonateInfo, null, 2));

  // Step 4: Check the Actions button/dropdown if present
  const actionsBtn = await page.$('text=Actions');
  if (actionsBtn) {
    await actionsBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SS_DIR}/explore_03_actions_dropdown.png`, fullPage: false });
    const actionItems = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.dropdown-menu a, .dropdown-item'))
        .map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log('\nActions dropdown items: ' + JSON.stringify(actionItems, null, 2));
  }

  // Step 5: Full page screenshot to see everything
  await page.screenshot({ path: `${SS_DIR}/explore_04_branch_full.png`, fullPage: true });

  await browser.close();
  console.log('\nExploration complete.');
})();
