/**
 * HTM Clone - Test Run 006
 * Branch Creation: Mac 160326
 *
 * Headless, uses saved auth.json session.
 * Creates a new branch named "Mac 160326" in the HTM Clone admin.
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

  const isLoginPage = landedUrl.includes('/login') || landedUrl.includes('accounts.google.com');
  if (isLoginPage) {
    console.log('ERROR: Session expired — still on login page. Please re-authenticate and update auth.json.');
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

  // ── Step 3: Fill branch name ───────────────────────────────────────────────
  console.log('\n[3/4] Filling branch name: "' + BRANCH_NAME + '"...');

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
      console.log('      Filled using: ' + selector);
      filled = true;
      break;
    }
  }

  if (!filled) {
    // Dump all inputs for debugging
    const inputs = await page.evaluate(() =>
      [...document.querySelectorAll('input')].map(i => ({ name: i.name, id: i.id, type: i.type, placeholder: i.placeholder }))
    );
    console.log('      WARNING: Could not find branch name input. Inputs found:', JSON.stringify(inputs, null, 2));
    await page.screenshot({ path: `${SCREENSHOT_DIR}/HTM_Clone_Screenshot_006_form_debug.png`, fullPage: true });
    await browser.close();
    process.exitCode = 1;
    return;
  }

  await page.screenshot({ path: `${SCREENSHOT_DIR}/HTM_Clone_Screenshot_006_form_filled.png`, fullPage: true });
  console.log('      Screenshot: 006_form_filled.png');

  // ── Step 4: Submit ─────────────────────────────────────────────────────────
  console.log('\n[4/4] Submitting form...');

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
      console.log('      Clicked: ' + selector);
      submitted = true;
      break;
    }
  }

  if (!submitted) {
    const buttons = await page.evaluate(() =>
      [...document.querySelectorAll('button,input[type="submit"]')].map(b => ({ tag: b.tagName, type: b.type, text: b.innerText?.trim() }))
    );
    console.log('      WARNING: Could not find submit button. Buttons found:', JSON.stringify(buttons, null, 2));
    await page.screenshot({ path: `${SCREENSHOT_DIR}/HTM_Clone_Screenshot_006_no_submit.png`, fullPage: true });
    await browser.close();
    process.exitCode = 1;
    return;
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const finalUrl = page.url();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/HTM_Clone_Screenshot_006_result.png`, fullPage: true });
  console.log('      Screenshot: 006_result.png');

  const isSuccess = finalUrl.includes('/branches/') && !finalUrl.includes('/new');

  console.log('\n═══════════════════════════════════════════════════════');
  if (isSuccess) {
    console.log(' SUCCESS: Branch created!');
    console.log(' Branch: ' + BRANCH_NAME);
    console.log(' URL: ' + finalUrl);
  } else {
    console.log(' ? RESULT UNCLEAR - check 006_result.png');
    console.log(' URL: ' + finalUrl);
  }
  console.log('═══════════════════════════════════════════════════════');

  await browser.close();
  console.log('\nFINAL_URL:' + finalUrl);
})();
