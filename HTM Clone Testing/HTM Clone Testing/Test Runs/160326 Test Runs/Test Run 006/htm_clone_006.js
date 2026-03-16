/**
 * HTM Clone - Test Run 006
 * Branch Creation: Mac 160326
 *
 * Option B: Headed browser - pauses for manual Google CAPTCHA/auth completion,
 * then automatically creates the branch and saves a fresh auth.json session.
 *
 * Usage:
 *   node htm_clone_006.js
 *
 * The browser window will open visibly. Complete the Google login when prompted.
 * The script will detect authentication and continue automatically.
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const CLONE_URL = 'https://admin-clone.helpthemove.co.uk';
const TARGET_ACCOUNT = 'mac.murapa@helpthemove.co.uk';
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
    headless: false,   // Headed so you can complete Google CAPTCHA manually
    proxy: proxyConfig,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    slowMo: 100
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 900 }
  });

  const page = await context.newPage();

  // ── Step 1: Navigate to login ──────────────────────────────────────────────
  console.log('\n[1/5] Navigating to HTM Clone login page...');
  await page.goto(CLONE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('      Browser window is now open.');
  console.log('      Please click "Sign in with Google" and complete the');
  console.log('      CAPTCHA / Google authentication in the browser window.');
  console.log('      The script will continue automatically once you are logged in.');
  console.log('      Waiting up to 3 minutes...');

  // ── Step 2: Wait for successful login (up to 3 minutes) ───────────────────
  try {
    await page.waitForURL(
      url => url.startsWith(CLONE_URL) && !url.includes('/login') && !url.includes('accounts.google.com'),
      { timeout: 180000 }
    );
  } catch {
    console.log('\nERROR: Timed out waiting for login. Please re-run and complete auth within 3 minutes.');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/HTM_Clone_Screenshot_006_login_timeout.png` });
    await browser.close();
    process.exitCode = 1;
    return;
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('\n[2/5] Login detected! Saving fresh session...');

  // Save fresh session so future headless scripts work
  await context.storageState({ path: AUTH_PATH });
  console.log('      auth.json updated.');

  // ── Step 3: Navigate to new branch form ───────────────────────────────────
  console.log('\n[3/5] Navigating to branch creation form...');
  await page.goto(`${CLONE_URL}/branches/new`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  console.log(`      URL: ${page.url()}`);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/HTM_Clone_Screenshot_006_form_before.png`, fullPage: true });
  console.log('      Screenshot: 006_form_before.png');

  // ── Step 4: Fill in branch name ────────────────────────────────────────────
  console.log('\n[4/5] Filling in branch name: "' + BRANCH_NAME + '"...');

  // Try common selectors for the branch name field
  const nameSelectors = [
    'input[name="branch[name]"]',
    'input[id="branch_name"]',
    'input[placeholder*="name" i]',
    'input[name="name"]'
  ];

  let filled = false;
  for (const selector of nameSelectors) {
    const el = page.locator(selector);
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.fill(BRANCH_NAME);
      console.log(`      Filled using selector: ${selector}`);
      filled = true;
      break;
    }
  }

  if (!filled) {
    console.log('      WARNING: Could not find branch name input with known selectors.');
    console.log('      Taking screenshot for inspection...');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/HTM_Clone_Screenshot_006_form_debug.png`, fullPage: true });
    console.log('      Please inspect 006_form_debug.png and update selectors.');
    await browser.close();
    process.exitCode = 1;
    return;
  }

  await page.screenshot({ path: `${SCREENSHOT_DIR}/HTM_Clone_Screenshot_006_form_filled.png`, fullPage: true });
  console.log('      Screenshot: 006_form_filled.png');

  // ── Step 5: Submit form ────────────────────────────────────────────────────
  console.log('\n[5/5] Submitting form...');

  const submitSelectors = [
    'input[type="submit"]',
    'button[type="submit"]',
    'button:has-text("Create")',
    'button:has-text("Save")',
    'button:has-text("Add")'
  ];

  let submitted = false;
  for (const selector of submitSelectors) {
    const el = page.locator(selector);
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.click();
      console.log(`      Clicked submit using selector: ${selector}`);
      submitted = true;
      break;
    }
  }

  if (!submitted) {
    console.log('      WARNING: Could not find submit button. Taking screenshot...');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/HTM_Clone_Screenshot_006_no_submit.png`, fullPage: true });
    await browser.close();
    process.exitCode = 1;
    return;
  }

  // Wait for navigation/response after submit
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const finalUrl = page.url();
  console.log(`      Final URL: ${finalUrl}`);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/HTM_Clone_Screenshot_006_result.png`, fullPage: true });
  console.log('      Screenshot: 006_result.png');

  // Check for success indicators
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 300));
  const isSuccess = finalUrl.includes('/branches/') && !finalUrl.includes('/new');
  const hasError = pageText.toLowerCase().includes('error') || pageText.toLowerCase().includes('invalid');

  console.log('\n═══════════════════════════════════════════════════════');
  if (isSuccess) {
    console.log(' ✓ BRANCH CREATED SUCCESSFULLY');
    console.log(' Branch: ' + BRANCH_NAME);
    console.log(' URL: ' + finalUrl);
  } else if (hasError) {
    console.log(' ✗ FORM SUBMISSION ERROR - check 006_result.png');
  } else {
    console.log(' ? RESULT UNCLEAR - check 006_result.png');
    console.log(' URL: ' + finalUrl);
  }
  console.log('═══════════════════════════════════════════════════════');

  await browser.close();
  console.log('\nFINAL_URL:' + finalUrl);
})();
