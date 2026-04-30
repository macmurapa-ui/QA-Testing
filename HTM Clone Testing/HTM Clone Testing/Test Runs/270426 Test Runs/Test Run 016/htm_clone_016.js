/**
 * HTM Clone - Test Run 016
 * Branch Creation Only
 *
 * Steps:
 *   [1/3] Verify session via auth.json
 *   [2/3] Determine next branch name (Mac N[DDMMYY]) and create it
 *   [3/3] Locate created branch in /branches and confirm
 *
 * Branch naming convention: Mac N[DDMMYY]
 *   N = sequential count of branches created today (auto-incremented)
 *   e.g. 1st branch on 16 Apr 2026 → Mac 1160426
 *
 * Default branch values:
 *   Business Type : Letting Agent
 *   Phone Number  : 07561834920
 *   Address Line 1: 123 Test Street
 *   Town or City  : Manchester
 *   Post Code     : M13 9GS
 *   County        : Lancashire
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

function dateSuffix() {
  const now = new Date();
  const dd  = String(now.getDate()).padStart(2, '0');
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const yy  = String(now.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

async function nextBranchName(page, cloneUrl) {
  const suffix  = dateSuffix();
  const pattern = new RegExp('^Mac \\d+' + suffix + '$');
  await page.goto(`${cloneUrl}/branches?q=${encodeURIComponent(suffix)}`, {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  await page.waitForTimeout(600);
  const count = await page.evaluate((pat) => {
    const links = Array.from(document.querySelectorAll('a[href*="/branches/"]'));
    return links.filter(a => new RegExp(pat).test(a.innerText.trim())).length;
  }, pattern.source);
  return `Mac ${count + 1}${suffix}`;
}

const CLONE_URL = 'https://admin-clone.helpthemove.co.uk';
const AUTH_PATH = '/home/user/QA-Testing/auth.json';
const SS_DIR    = path.dirname(__filename);

const rawProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
let proxyConfig;
if (rawProxy) {
  const u = new URL(rawProxy);
  proxyConfig = { server: `${u.protocol}//${u.host}`, username: u.username, password: u.password, bypass: '<-loopback>' };
}

async function isSessionValid(page) {
  await page.goto(CLONE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  return !page.url().includes('/login') && !page.url().includes('accounts.google.com');
}

(async () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' HTM Clone - Test Run 016: Branch Creation');
  console.log('═══════════════════════════════════════════════════════');

  // ── Step 1: Verify session ─────────────────────────────────────────────────
  console.log('\n[1/3] Verifying session...');
  const browser = await chromium.launch({ headless: true, proxy: proxyConfig, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context  = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 }, storageState: AUTH_PATH });
  const page     = await context.newPage();

  if (!await isSessionValid(page)) {
    console.log('ERROR: Session invalid. Please refresh auth.json and retry.');
    await browser.close(); process.exitCode = 1; return;
  }
  console.log('      Session VALID.');

  // ── Step 2: Determine next branch name and create it ──────────────────────
  console.log('\n[2/3] Determining next branch name for today...');
  const BRANCH_NAME = await nextBranchName(page, CLONE_URL);
  console.log('      Branch name: ' + BRANCH_NAME);

  await page.goto(`${CLONE_URL}/branches/new`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SS_DIR}/016_branch_form.png`, fullPage: true });

  await page.locator('input[name="branch[name]"]').fill(BRANCH_NAME);
  await page.locator('select[name="branch[business_type]"]').selectOption({ label: 'Letting Agent' });
  await page.locator('input[name="branch[phone_number]"]').fill('07561834920');
  await page.locator('input[name="branch[address_attributes][address_1]"]').fill('123 Test Street');
  await page.locator('input[name="branch[address_attributes][town]"]').fill('Manchester');
  await page.locator('input[name="branch[address_attributes][post_code]"]').fill('M13 9GS');
  await page.locator('input[name="branch[address_attributes][county]"]').fill('Lancashire');

  await page.screenshot({ path: `${SS_DIR}/016_branch_form_filled.png`, fullPage: true });

  await page.locator('input[type="submit"]').click();
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const postCreateUrl = page.url();
  console.log('      Post-creation redirect: ' + postCreateUrl);

  if (postCreateUrl.includes('/branches/new')) {
    await page.screenshot({ path: `${SS_DIR}/016_branch_error.png`, fullPage: true });
    console.log('ERROR: Branch creation failed. Check 016_branch_error.png');
    await browser.close(); process.exitCode = 1; return;
  }
  console.log('      Branch "' + BRANCH_NAME + '" submitted successfully.');

  // ── Step 3: Locate the created branch ─────────────────────────────────────
  console.log('\n[3/3] Locating branch "' + BRANCH_NAME + '"...');

  await page.goto(`${CLONE_URL}/branches?q=${encodeURIComponent(BRANCH_NAME)}`, {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/016_branch_search.png`, fullPage: true });

  let actualBranchUrl = await page.evaluate((name) => {
    const rows = Array.from(document.querySelectorAll('table tbody tr, tr'));
    for (const row of rows) {
      if (row.innerText.includes(name)) {
        const a = row.querySelector('a[href*="/branches/"]');
        if (a) return a.href;
      }
    }
    const links = Array.from(document.querySelectorAll('a[href*="/branches/"]'));
    const match  = links.find(a => a.innerText.trim() === name);
    return match ? match.href : null;
  }, BRANCH_NAME);

  if (!actualBranchUrl) {
    console.log('ERROR: Could not locate branch "' + BRANCH_NAME + '" in /branches.');
    await browser.close(); process.exitCode = 1; return;
  }

  const branchId = (actualBranchUrl.match(/\/branches\/(\d+)/) || [])[1];

  await page.goto(actualBranchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/016_branch_page.png`, fullPage: true });

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' SUCCESS: Branch "' + BRANCH_NAME + '" created!');
  console.log(' Branch ID : ' + branchId);
  console.log(' Branch URL: ' + actualBranchUrl);
  console.log('═══════════════════════════════════════════════════════');

  await browser.close();
  console.log('\nBRANCH_NAME:' + BRANCH_NAME);
  console.log('BRANCH_ID:' + branchId);
  console.log('FINAL_URL:' + actualBranchUrl);
})();
