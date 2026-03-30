/**
 * HTM Clone - Test Run 009
 * Landlord Creation on existing Branch 2481 (Mac 1300326)
 *
 * Steps:
 *   [1/3] Verify session via auth.json
 *   [2/3] Navigate to Add Landlord form (/branches/2481/landlords/new)
 *   [3/3] Fill and submit the landlord form — verify success
 *
 * Landlord name: randomly generated on each run
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

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

const CLONE_URL  = 'https://admin-clone.helpthemove.co.uk';
const AUTH_PATH  = '/home/user/QA-Testing/auth.json';
const SS_DIR     = path.dirname(__filename);
const BRANCH_ID  = '2481';
const BRANCH_NAME = 'Mac 1300326';

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

async function isSessionValid(page) {
  await page.goto(CLONE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const url = page.url();
  return !url.includes('/login') && !url.includes('accounts.google.com');
}

// ── Main ───────────────────────────────────────────────────────────────────────

(async () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' HTM Clone - Test Run 009: Landlord Creation');
  console.log(' Branch  : ' + BRANCH_NAME + ' (ID: ' + BRANCH_ID + ')');
  console.log(' Landlord: ' + LANDLORD.title + ' ' + LANDLORD.first_name + ' ' + LANDLORD.last_name);
  console.log('═══════════════════════════════════════════════════════');

  // ── Step 1: Verify session ─────────────────────────────────────────────────
  console.log('\n[1/3] Verifying session...');
  const browser = await chromium.launch({ headless: true, proxy: proxyConfig, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context  = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 }, storageState: AUTH_PATH });
  const page     = await context.newPage();

  const sessionOk = await isSessionValid(page);
  if (!sessionOk) {
    console.log('ERROR: Session invalid. Please refresh auth.json and retry.');
    await browser.close(); process.exitCode = 1; return;
  }
  console.log('      Session VALID.');

  // ── Step 2: Navigate to Add Landlord form ─────────────────────────────────
  console.log('\n[2/3] Navigating to Add Landlord form...');
  const landlordFormUrl = `${CLONE_URL}/branches/${BRANCH_ID}/landlords/new`;
  await page.goto(landlordFormUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);

  const is404 = await page.evaluate(() =>
    document.body.innerText.includes("doesn't exist") ||
    document.body.innerText.includes('No route matches')
  );
  if (is404) {
    await page.screenshot({ path: `${SS_DIR}/009_landlord_form_404.png`, fullPage: true });
    console.log('ERROR: Landlord form not found at ' + landlordFormUrl);
    await browser.close(); process.exitCode = 1; return;
  }

  await page.screenshot({ path: `${SS_DIR}/009_landlord_form.png`, fullPage: true });
  console.log('      URL: ' + page.url());
  console.log('      Screenshot: 009_landlord_form.png');

  // ── Step 3: Fill and submit the landlord form ──────────────────────────────
  console.log('\n[3/3] Filling landlord form...');

  await page.locator('select[name="landlord[title]"]').selectOption({ label: LANDLORD.title });
  console.log('      Title: ' + LANDLORD.title);

  await page.locator('input[name="landlord[first_name]"]').fill(LANDLORD.first_name);
  console.log('      First Name: ' + LANDLORD.first_name);

  await page.locator('input[name="landlord[last_name]"]').fill(LANDLORD.last_name);
  console.log('      Last Name: ' + LANDLORD.last_name);

  await page.locator('input[name="landlord[email]"]').fill(LANDLORD.email);
  console.log('      Email: ' + LANDLORD.email);

  await page.locator('input[name="landlord[phone_number]"]').fill(LANDLORD.phone);
  console.log('      Phone: ' + LANDLORD.phone);

  await page.locator('input[name="landlord[landlord_type]"][type="radio"]').first().check();
  console.log('      Type: Individual');

  await page.locator('input[name="landlord[billing_address_type]"][type="radio"]').first().check();
  console.log('      Billing Address Type: Agent Branch Address');

  await page.locator('input[name="landlord[billing_preference]"][type="radio"]').first().check();
  console.log('      Billing Preference: Email');

  await page.screenshot({ path: `${SS_DIR}/009_landlord_form_filled.png`, fullPage: true });
  console.log('      Screenshot: 009_landlord_form_filled.png');

  console.log('      Submitting...');
  await page.locator('input[type="submit"]').click();
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const finalUrl = page.url();
  await page.screenshot({ path: `${SS_DIR}/009_landlord_result.png`, fullPage: true });
  console.log('      Screenshot: 009_landlord_result.png');
  console.log('      Final URL: ' + finalUrl);

  const isSuccess = !finalUrl.includes('/new');

  console.log('\n═══════════════════════════════════════════════════════');
  if (isSuccess) {
    console.log(' SUCCESS: Landlord "' + LANDLORD.title + ' ' + LANDLORD.first_name + ' ' + LANDLORD.last_name + '" created!');
    console.log(' Branch : ' + BRANCH_NAME + ' (ID: ' + BRANCH_ID + ')');
    console.log(' URL    : ' + finalUrl);
  } else {
    console.log(' FAILED: Still on /new — check 009_landlord_result.png for validation errors.');
    process.exitCode = 1;
  }
  console.log('═══════════════════════════════════════════════════════');

  await browser.close();
  console.log('\nFINAL_URL:' + finalUrl);
})();
