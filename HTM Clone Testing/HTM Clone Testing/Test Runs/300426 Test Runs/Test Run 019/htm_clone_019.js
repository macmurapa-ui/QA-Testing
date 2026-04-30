/**
 * HTM Clone - Test Run 019
 * Landlord Creation in Dashboard
 *
 * Steps:
 *   [1/5] Verify session via auth.json
 *   [2/5] Find today's last Mac N[DDMMYY] branch and impersonate it
 *   [3/5] Navigate to dashboard Landlords page and open new landlord form
 *   [4/5] Fill and submit the form with randomly generated landlord details
 *   [5/5] Verify successful creation
 *
 * Defaults (do not change unless explicitly requested):
 *   Landlord Type         : Individual
 *   Bill address          : Agent Branch Address
 *   Landlord reference    : blank
 *
 * Email uniqueness: firstname.lastname.[timestamp]@testlandlord.co.uk
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const CLONE_URL     = 'https://admin-clone.helpthemove.co.uk';
const DASHBOARD_URL = 'https://dashboard-clone.helpthemove.co.uk';
const AUTH_PATH     = '/home/user/QA-Testing/auth.json';
const SS_DIR        = path.dirname(__filename);

// ── Random landlord data ───────────────────────────────────────────────────────
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

const title     = pick(TITLES);
const firstName = pick(FIRST_NAMES);
const lastName  = pick(LAST_NAMES);
const timestamp = Date.now();
const email     = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${timestamp}@testlandlord.co.uk`;
const phone     = '07' + String(Math.floor(Math.random() * 900000000) + 100000000);

// ── Date suffix ────────────────────────────────────────────────────────────────
function dateSuffix() {
  const now = new Date();
  const dd  = String(now.getDate()).padStart(2, '0');
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const yy  = String(now.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

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
  console.log(' HTM Clone - Test Run 019: Landlord Creation in Dashboard');
  console.log(' Landlord: ' + title + ' ' + firstName + ' ' + lastName);
  console.log('═══════════════════════════════════════════════════════');

  // ── Step 1: Verify session ─────────────────────────────────────────────────
  console.log('\n[1/5] Verifying session...');
  const browser = await chromium.launch({ headless: true, proxy: proxyConfig, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context  = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 }, storageState: AUTH_PATH });
  const page     = await context.newPage();

  if (!await isSessionValid(page)) {
    console.log('ERROR: Session invalid.'); await browser.close(); process.exitCode = 1; return;
  }
  console.log('      Session VALID.');

  // ── Step 2: Find today's last branch and impersonate ──────────────────────
  console.log('\n[2/5] Finding today\'s last branch and impersonating...');
  const suffix = dateSuffix();
  await page.goto(`${CLONE_URL}/branches?q=${encodeURIComponent(suffix)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(600);

  const branches = await page.evaluate((sfx) => {
    const pattern = new RegExp('^Mac \\d+' + sfx + '$');
    return Array.from(document.querySelectorAll('a[href*="/branches/"]'))
      .filter(a => pattern.test(a.innerText.trim()))
      .map(a => ({ name: a.innerText.trim(), href: a.href }));
  }, suffix);

  if (!branches.length) {
    console.log('ERROR: No branches found for today (' + suffix + '). Run Branch Creation first.');
    await browser.close(); process.exitCode = 1; return;
  }

  const lastBranch = branches[branches.length - 1];
  const branchId   = (lastBranch.href.match(/\/branches\/(\d+)/) || [])[1];
  console.log('      Branch: ' + lastBranch.name + ' (ID: ' + branchId + ')');

  // Impersonate
  await page.goto(`${CLONE_URL}/branches/${branchId}/impersonation`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  if (!page.url().includes('dashboard-clone')) {
    console.log('ERROR: Impersonation failed — not on dashboard-clone.');
    await browser.close(); process.exitCode = 1; return;
  }
  console.log('      Impersonating on: ' + page.url());

  // Dismiss cookie consent if present
  const acceptBtn = await page.$('button[type="submit"]:has-text("Accept"), button:has-text("Accept")');
  if (acceptBtn) { await acceptBtn.click(); await page.waitForTimeout(500); console.log('      Cookie consent dismissed.'); }

  await page.screenshot({ path: `${SS_DIR}/019_dashboard.png`, fullPage: false });

  // ── Step 3: Navigate to new landlord form ─────────────────────────────────
  console.log('\n[3/5] Navigating to Add New Landlord form...');

  await page.goto(`${DASHBOARD_URL}/landlords`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/019_landlords_page.png`, fullPage: false });

  // JS click the + button
  await page.evaluate(() => {
    const a = document.querySelector('a[href="/landlords/new"]');
    if (a) a.click();
  });
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/019_new_landlord_form.png`, fullPage: false });
  console.log('      Form URL: ' + page.url());

  // ── Step 4: Fill the form ──────────────────────────────────────────────────
  console.log('\n[4/5] Filling landlord form...');

  // Landlord type: Individual (default — verify selected)
  await page.locator('#landlord_landlord_type_individual').check();
  console.log('      Type: Individual');

  // Title
  await page.locator('select[name="landlord[title]"]').selectOption({ label: title });
  console.log('      Title: ' + title);

  // First name
  await page.locator('input[name="landlord[first_name]"]').fill(firstName);
  console.log('      First name: ' + firstName);

  // Last name
  await page.locator('input[name="landlord[last_name]"]').fill(lastName);
  console.log('      Last name: ' + lastName);

  // Email
  await page.locator('input[name="landlord[email]"]').fill(email);
  console.log('      Email: ' + email);

  // Phone
  await page.locator('input[name="landlord[phone_number]"]').fill(phone);
  console.log('      Phone: ' + phone);

  // Bill address: Agent Branch Address (default — verify selected)
  await page.locator('#landlord_billing_address_type_agent_branch_address').check();
  console.log('      Bills to: Agent Branch Address');

  // Landlord reference: leave blank
  console.log('      Reference: blank (default)');

  await page.screenshot({ path: `${SS_DIR}/019_form_filled.png`, fullPage: false });

  // ── Step 5: Submit ─────────────────────────────────────────────────────────
  console.log('\n[5/5] Submitting...');
  await page.locator('input[type="submit"][name="commit"]').click();
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const finalUrl = page.url();
  await page.screenshot({ path: `${SS_DIR}/019_result.png`, fullPage: false });
  console.log('      Final URL: ' + finalUrl);

  const isSuccess = !finalUrl.includes('/new');

  console.log('\n═══════════════════════════════════════════════════════');
  if (isSuccess) {
    console.log(' SUCCESS: Landlord created in Dashboard!');
    console.log(' Name   : ' + title + ' ' + firstName + ' ' + lastName);
    console.log(' Email  : ' + email);
    console.log(' Branch : ' + lastBranch.name + ' (ID: ' + branchId + ')');
    console.log(' URL    : ' + finalUrl);
  } else {
    console.log(' FAILED: Still on /new — check 019_result.png for errors.');
    process.exitCode = 1;
  }
  console.log('═══════════════════════════════════════════════════════');

  await browser.close();
  console.log('\nLANDLORD:' + title + ' ' + firstName + ' ' + lastName);
  console.log('EMAIL:' + email);
  console.log('FINAL_URL:' + finalUrl);
})();
