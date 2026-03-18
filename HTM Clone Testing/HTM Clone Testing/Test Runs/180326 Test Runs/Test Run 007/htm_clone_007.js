/**
 * HTM Clone - Test Run 007
 * Landlord Creation
 *
 * Steps:
 *   [1/5] Verify session via auth.json (refresh headed if expired)
 *   [2/5] Determine next branch name (Mac N[DDMMYY]) and create it
 *   [3/5] Find the created branch in /branches and navigate to it
 *   [4/5] Navigate to Add Landlord form (/branches/:id/landlords/new)
 *   [5/5] Fill and submit the landlord form — verify success
 *
 * Branch naming convention: Mac N[DDMMYY]
 *   N = sequential count of branches created today (1, 2, 3 ...)
 *   e.g. 1st branch on 18 Mar 2026 → Mac 1180326
 *        2nd branch on 18 Mar 2026 → Mac 2180326
 *
 * Landlord name: randomly generated on each run
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

// ── Date suffix helper: DDMMYY ─────────────────────────────────────────────────
function dateSuffix() {
  const now = new Date();
  const dd  = String(now.getDate()).padStart(2, '0');
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const yy  = String(now.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

// ── Next sequential branch name: counts Mac N[DDMMYY] branches for today ───────
// Searches /branches for today's suffix, counts matches, returns Mac [N+1]DDMMYY
async function nextBranchName(page, cloneUrl) {
  const suffix = dateSuffix();
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

// ── Random landlord name ───────────────────────────────────────────────────────
const FIRST_NAMES = [
  'James', 'Oliver', 'Harry', 'George', 'Charlie', 'Jack', 'William', 'Henry',
  'Edward', 'Samuel', 'Leo', 'Arthur', 'Freddie', 'Alfie', 'Noah', 'Benjamin',
  'Sarah', 'Emma', 'Olivia', 'Charlotte', 'Amelia', 'Lily', 'Emily', 'Alice',
  'Grace', 'Ella', 'Chloe', 'Sophie', 'Hannah', 'Ruby', 'Jessica', 'Victoria'
];
const LAST_NAMES = [
  'Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Davies', 'Evans', 'Wilson',
  'Thomas', 'Roberts', 'Johnson', 'Lewis', 'Walker', 'Robinson', 'Wood', 'Thompson',
  'White', 'Watson', 'Jackson', 'Wright', 'Green', 'Harris', 'Cooper', 'King',
  'Martin', 'Clarke', 'Morgan', 'Hughes', 'Edwards', 'Hill', 'Moore', 'Hall'
];
const TITLES = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const landlordTitle = pick(TITLES);
const landlordFirst = pick(FIRST_NAMES);
const landlordLast  = pick(LAST_NAMES);

const CLONE_URL = 'https://admin-clone.helpthemove.co.uk';
const AUTH_PATH = '/home/user/QA-Testing/auth.json';
const SS_DIR    = path.dirname(__filename);

// Landlord test data — randomly generated each run
const LANDLORD = {
  title:      landlordTitle,
  first_name: landlordFirst,
  last_name:  landlordLast,
  email:      `${landlordFirst.toLowerCase()}.${landlordLast.toLowerCase()}@testlandlord.co.uk`,
  phone:      '07' + String(Math.floor(Math.random() * 900000000) + 100000000)
};

const rawProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
let proxyConfig;
if (rawProxy) {
  const u = new URL(rawProxy);
  proxyConfig = {
    server: `${u.protocol}//${u.host}`,
    username: u.username,
    password: u.password,
    bypass: '<-loopback>'
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function isSessionValid(page) {
  await page.goto(CLONE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const url = page.url();
  return !url.includes('/login') && !url.includes('accounts.google.com');
}

async function refreshAuth() {
  const manualLogin = !!process.env.MANUAL_LOGIN;
  const hasDisplay  = !!process.env.DISPLAY;
  const headed      = manualLogin || hasDisplay;
  const mode        = manualLogin ? 'HEADED — waiting for manual login'
                    : hasDisplay  ? 'HEADED on virtual display — automated Google OAuth'
                    :               'HEADLESS — automated Google OAuth (anti-detection)';
  console.log(`\n[AUTH] Session expired. Mode: ${mode}`);

  const browser = await chromium.launch({
    headless: !headed,
    proxy: proxyConfig,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled', '--window-size=1280,900']
  });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  await page.goto(`${CLONE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  if (manualLogin) {
    console.log('[AUTH] Browser open — please sign in manually (3 min timeout)...');
    try {
      await page.waitForURL(url => !url.includes('/login') && !url.includes('accounts.google.com'), { timeout: 180000 });
      console.log('[AUTH] Login detected: ' + page.url());
    } catch (e) {
      console.log('[AUTH] ERROR: Manual login timed out.');
      await browser.close();
      return false;
    }
  } else {
    try {
      await page.click('button:has-text("Sign in with Google")');
      await page.waitForURL('**/accounts.google.com/**', { timeout: 15000 });
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await page.type('input[type="email"]', 'mac.murapa@helpthemove.co.uk', { delay: 80 });
      await page.waitForTimeout(800);
      const nextBtn = await page.$('#identifierNext');
      if (nextBtn) { await nextBtn.click(); } else { await page.keyboard.press('Enter'); }
      await page.waitForURL(`${CLONE_URL}/**`, { timeout: 60000 });
      console.log('[AUTH] Authenticated: ' + page.url());
    } catch (e) {
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 200)).catch(() => '');
      console.log('[AUTH] ERROR: Automated login failed.');
      console.log('[AUTH] Page: ' + bodyText);
      await page.screenshot({ path: `${SS_DIR}/007_auth_failed.png` });
      console.log('[AUTH] Screenshot: 007_auth_failed.png');
      console.log('[AUTH] TIP: Run with MANUAL_LOGIN=1 on a machine with a display, or update auth.json manually.');
      await browser.close();
      return false;
    }
  }

  await context.storageState({ path: AUTH_PATH });
  console.log('[AUTH] Session saved to auth.json');
  await browser.close();
  return true;
}

// ── Main ───────────────────────────────────────────────────────────────────────

(async () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' HTM Clone - Test Run 007: Landlord Creation');
  console.log(' Landlord: ' + LANDLORD.title + ' ' + LANDLORD.first_name + ' ' + LANDLORD.last_name);
  console.log('═══════════════════════════════════════════════════════');

  // ── Step 1: Verify session ─────────────────────────────────────────────────
  console.log('\n[1/5] Verifying session...');
  const checkBrowser = await chromium.launch({ headless: true, proxy: proxyConfig, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const checkCtx     = await checkBrowser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 }, storageState: AUTH_PATH });
  const checkPage    = await checkCtx.newPage();
  const sessionOk    = await isSessionValid(checkPage);
  await checkBrowser.close();

  if (sessionOk) {
    console.log('      Session VALID — proceeding headlessly.');
  } else {
    console.log('      Session EXPIRED.');
    const ok = await refreshAuth();
    if (!ok) { console.log('FATAL: Authentication failed. Exiting.'); process.exitCode = 1; return; }
  }

  // ── Launch headless browser ────────────────────────────────────────────────
  const browser = await chromium.launch({ headless: true, proxy: proxyConfig, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context  = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 }, storageState: AUTH_PATH });
  const page     = await context.newPage();

  const ok = await isSessionValid(page);
  if (!ok) { console.log('ERROR: Session still invalid. Exiting.'); await browser.close(); process.exitCode = 1; return; }
  console.log('      Headless session confirmed.');

  // ── Step 2: Determine next branch name and create it ──────────────────────
  // Convention: Mac N[DDMMYY] — N auto-increments by counting today's branches.
  // Each test run always creates a fresh uniquely-named branch.
  // Note: POST /branches redirects to /admins/:user_id (known app pattern) —
  //       the real branch URL is found by searching /branches by name afterwards.
  console.log('\n[2/5] Determining next branch name for today...');
  const BRANCH_NAME = await nextBranchName(page, CLONE_URL);
  console.log('      Branch name: ' + BRANCH_NAME);

  await page.goto(`${CLONE_URL}/branches/new`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SS_DIR}/007_branch_form.png`, fullPage: true });
  console.log('      Screenshot: 007_branch_form.png');

  await page.locator('input[name="branch[name]"]').fill(BRANCH_NAME);
  await page.locator('select[name="branch[business_type]"]').selectOption({ label: 'Letting Agent' });
  await page.locator('input[name="branch[phone_number]"]').fill('07561834920');
  await page.locator('input[name="branch[address_attributes][address_1]"]').fill('123 Test Street');
  await page.locator('input[name="branch[address_attributes][town]"]').fill('Manchester');
  await page.locator('input[name="branch[address_attributes][post_code]"]').fill('M13 9GS');
  await page.locator('input[name="branch[address_attributes][county]"]').fill('Lancashire');

  await page.screenshot({ path: `${SS_DIR}/007_branch_form_filled.png`, fullPage: true });
  console.log('      Screenshot: 007_branch_form_filled.png');

  await page.locator('input[type="submit"]').click();
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const postCreateUrl = page.url();
  console.log('      Post-creation redirect: ' + postCreateUrl + ' (expected: /admins/:id)');

  if (postCreateUrl.includes('/branches/new')) {
    await page.screenshot({ path: `${SS_DIR}/007_branch_error.png`, fullPage: true });
    console.log('ERROR: Branch creation failed (still on /new). Check 007_branch_error.png');
    await browser.close(); process.exitCode = 1; return;
  }
  console.log('      Branch "' + BRANCH_NAME + '" submitted successfully.');

  // ── Step 3: Locate the branch and navigate to its page ────────────────────
  // Post-creation redirect goes to /admins/:user_id — search by name to get real URL.
  console.log('\n[3/5] Locating branch "' + BRANCH_NAME + '"...');

  await page.goto(`${CLONE_URL}/branches?q=${encodeURIComponent(BRANCH_NAME)}`, {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/007_branch_search.png`, fullPage: true });

  let actualBranchUrl = await page.evaluate((name) => {
    const rows = Array.from(document.querySelectorAll('table tbody tr, tr'));
    for (const row of rows) {
      if (row.innerText.includes(name)) {
        const a = row.querySelector('a[href*="/branches/"]');
        if (a) return a.href;
      }
    }
    const links = Array.from(document.querySelectorAll('a[href*="/branches/"]'));
    const match = links.find(a => a.innerText.trim() === name);
    return match ? match.href : null;
  }, BRANCH_NAME);

  if (!actualBranchUrl) {
    await page.screenshot({ path: `${SS_DIR}/007_branch_not_found.png`, fullPage: true });
    console.log('ERROR: Could not locate branch "' + BRANCH_NAME + '" in /branches.');
    await browser.close(); process.exitCode = 1; return;
  }

  const branchIdMatch = actualBranchUrl.match(/\/branches\/(\d+)/);
  const branchId      = branchIdMatch ? branchIdMatch[1] : null;
  console.log('      Branch found! URL: ' + actualBranchUrl);
  console.log('      Branch ID: ' + branchId);

  // Navigate to the branch page
  await page.goto(actualBranchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/007_branch_page.png`, fullPage: true });
  console.log('      Screenshot: 007_branch_page.png');

  // ── Step 4: Navigate to Add Landlord form ─────────────────────────────────
  console.log('\n[4/5] Navigating to Add Landlord form...');

  const landlordFormUrl = `${CLONE_URL}/branches/${branchId}/landlords/new`;
  await page.goto(landlordFormUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);

  const is404 = await page.evaluate(() =>
    document.body.innerText.includes("doesn't exist") ||
    document.body.innerText.includes('No route matches')
  );
  if (is404) {
    await page.screenshot({ path: `${SS_DIR}/007_landlord_form_404.png`, fullPage: true });
    console.log('ERROR: Landlord form not found at ' + landlordFormUrl);
    await browser.close(); process.exitCode = 1; return;
  }

  await page.screenshot({ path: `${SS_DIR}/007_landlord_form.png`, fullPage: true });
  console.log('      URL: ' + page.url());
  console.log('      Screenshot: 007_landlord_form.png');

  // ── Step 5: Fill and submit the landlord form ──────────────────────────────
  console.log('\n[5/5] Filling landlord form...');

  // Title
  await page.locator('select[name="landlord[title]"]').selectOption({ label: LANDLORD.title });
  console.log('      Title: ' + LANDLORD.title);

  // First & Last name
  await page.locator('input[name="landlord[first_name]"]').fill(LANDLORD.first_name);
  console.log('      First Name: ' + LANDLORD.first_name);

  await page.locator('input[name="landlord[last_name]"]').fill(LANDLORD.last_name);
  console.log('      Last Name: ' + LANDLORD.last_name);

  // Email
  await page.locator('input[name="landlord[email]"]').fill(LANDLORD.email);
  console.log('      Email: ' + LANDLORD.email);

  // Phone
  await page.locator('input[name="landlord[phone_number]"]').fill(LANDLORD.phone);
  console.log('      Phone: ' + LANDLORD.phone);

  // Landlord type: Individual (first radio — skip hidden inputs)
  await page.locator('input[name="landlord[landlord_type]"][type="radio"]').first().check();
  console.log('      Type: Individual');

  // Billing address type: Agent Branch Address (first radio)
  await page.locator('input[name="landlord[billing_address_type]"][type="radio"]').first().check();
  console.log('      Billing Address Type: Agent Branch Address');

  // Billing preference: Email (first radio)
  await page.locator('input[name="landlord[billing_preference]"][type="radio"]').first().check();
  console.log('      Billing Preference: Email');

  await page.screenshot({ path: `${SS_DIR}/007_landlord_form_filled.png`, fullPage: true });
  console.log('      Screenshot: 007_landlord_form_filled.png');

  // Submit
  console.log('      Submitting...');
  await page.locator('input[type="submit"]').click();
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const finalUrl = page.url();
  await page.screenshot({ path: `${SS_DIR}/007_landlord_result.png`, fullPage: true });
  console.log('      Screenshot: 007_landlord_result.png');
  console.log('      Final URL: ' + finalUrl);

  // Rails redirects away from /new on success
  const isSuccess = !finalUrl.includes('/new');

  console.log('\n═══════════════════════════════════════════════════════');
  if (isSuccess) {
    console.log(' SUCCESS: Landlord "' + LANDLORD.title + ' ' + LANDLORD.first_name + ' ' + LANDLORD.last_name + '" created!');
    console.log(' Branch : ' + BRANCH_NAME + ' (ID: ' + branchId + ')');
    console.log(' URL    : ' + finalUrl);
  } else {
    console.log(' FAILED: Still on /new — check 007_landlord_result.png for validation errors.');
    console.log(' URL    : ' + finalUrl);
    process.exitCode = 1;
  }
  console.log('═══════════════════════════════════════════════════════');

  await browser.close();
  console.log('\nFINAL_URL:' + finalUrl);
})();
