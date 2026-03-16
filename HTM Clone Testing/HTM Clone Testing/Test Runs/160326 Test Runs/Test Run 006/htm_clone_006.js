/**
 * HTM Clone - Test Run 006
 * Branch Creation: Mac 160326
 *
 * Headless, uses saved auth.json session.
 * Creates a new branch named "Mac 160326" in the HTM Clone admin.
 *
 * Default values for Branch Creation (use unless stated otherwise):
 *   Business Type : Letting Agent
 *   Phone Number  : random 11 digits
 *   Address Line 1: 123 Test Street
 *   Town or City  : Manchester
 *   Post Code     : M13 9GS
 *   County        : Lancashire
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const CLONE_URL = 'https://admin-clone.helpthemove.co.uk';
const BRANCH_NAME = 'Mac 160326';
const AUTH_PATH = '/home/user/QA-Testing/auth.json';
const SCREENSHOT_DIR = path.dirname(__filename);

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

(async () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' HTM Clone - Test Run 006: Branch Creation');
  console.log('═══════════════════════════════════════════════════════');
  console.log(' Branch to create: ' + BRANCH_NAME);
  console.log('───────────────────────────────────────────────────────');

  const browser = await chromium.launch({
    headless: true,
    proxy: proxyConfig,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 900 },
    storageState: AUTH_PATH
  });

  const page = await context.newPage();

  // ── Step 1: Verify session ─────────────────────────────────────────────────
  console.log('\n[1/4] Verifying session via auth.json...');
  await page.goto(CLONE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const landedUrl = page.url();
  console.log('      Landed on: ' + landedUrl);

  if (landedUrl.includes('/login') || landedUrl.includes('accounts.google.com')) {
    console.log('ERROR: Session expired. Please update auth.json and retry.');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/HTM_Clone_Screenshot_006_session_expired.png` });
    await browser.close();
    process.exitCode = 1;
    return;
  }
  console.log('      Session valid.');

  // ── Step 2: Navigate to new branch form ───────────────────────────────────
  console.log('\n[2/4] Navigating to branch creation form...');
  await page.goto(`${CLONE_URL}/branches/new`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);
  console.log('      URL: ' + page.url());

  await page.screenshot({ path: `${SCREENSHOT_DIR}/HTM_Clone_Screenshot_006_form_before.png`, fullPage: true });
  console.log('      Screenshot: 006_form_before.png');

  // ── Step 3: Fill all required fields ──────────────────────────────────────
  console.log('\n[3/4] Filling required fields...');

  // Branch Name
  await page.locator('input[name="branch[name]"]').fill(BRANCH_NAME);
  console.log('      Branch Name: ' + BRANCH_NAME);

  // Business Type — select "Letting Agent"
  await page.locator('select[name="branch[business_type]"]').selectOption({ label: 'Letting Agent' });
  console.log('      Business Type: Letting Agent');

  // Phone Number
  await page.locator('input[name="branch[phone_number]"]').fill('07438725727');
  console.log('      Phone Number: 07438725727');

  // Address Line 1
  await page.locator('input[name="branch[address_attributes][address_1]"]').fill('123 Test Street');
  console.log('      Address Line 1: 123 Test Street');

  // Town or City
  await page.locator('input[name="branch[address_attributes][town]"]').fill('Manchester');
  console.log('      Town or City: Manchester');

  // Post Code
  await page.locator('input[name="branch[address_attributes][post_code]"]').fill('M13 9GS');
  console.log('      Post Code: M13 9GS');

  // County
  await page.locator('input[name="branch[address_attributes][county]"]').fill('Lancashire');
  console.log('      County: Lancashire');

  await page.screenshot({ path: `${SCREENSHOT_DIR}/HTM_Clone_Screenshot_006_form_filled.png`, fullPage: true });
  console.log('      Screenshot: 006_form_filled.png');

  // ── Step 4: Submit ─────────────────────────────────────────────────────────
  console.log('\n[4/4] Submitting form...');
  await page.locator('input[type="submit"]').click();

  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const finalUrl = page.url();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/HTM_Clone_Screenshot_006_result.png`, fullPage: true });
  console.log('      Screenshot: 006_result.png');
  console.log('      Final URL: ' + finalUrl);

  // Rails redirects away from /branches/new on successful create
  const isSuccess = !finalUrl.includes('/new');

  console.log('\n═══════════════════════════════════════════════════════');
  if (isSuccess) {
    console.log(' SUCCESS: Branch "' + BRANCH_NAME + '" created!');
    console.log(' URL: ' + finalUrl);
  } else {
    console.log(' FAILED: Check 006_result.png for validation errors.');
    console.log(' URL: ' + finalUrl);
    process.exitCode = 1;
  }
  console.log('═══════════════════════════════════════════════════════');

  await browser.close();
  console.log('\nFINAL_URL:' + finalUrl);
})();
