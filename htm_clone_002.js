const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const SCREENSHOT_PATH = "/home/user/QA-Testing/HTM Clone Testing/HTM Clone Testing/Test Runs/Test Run 001/Test Run 002/HTM_Clone_Screenshot_002.png";
const TARGET_ACCOUNT = 'mac.murapa@helpthemove.co.uk';
const CLONE_URL = 'https://admin-clone.helpthemove.co.uk';

// Parse proxy from environment
const rawProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
let proxyConfig;
if (rawProxy) {
  const u = new URL(rawProxy);
  proxyConfig = {
    server: `${u.protocol}//${u.host}`,
    username: u.username,
    password: u.password,
    bypass: '<-loopback>'   // only bypass localhost
  };
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    proxy: proxyConfig,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  console.log('Navigating to HTM Clone...');
  await page.goto(CLONE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log(`Loaded: ${page.url()}`);

  console.log('Clicking Sign in with Google...');
  await page.click('text=Sign in with Google', { timeout: 10000 });

  // Handle Google auth - may open popup or redirect
  let googlePage = page;
  try {
    const popup = await context.waitForEvent('page', { timeout: 6000 });
    googlePage = popup;
    console.log('Google auth in popup');
  } catch {
    console.log('Google auth in same tab');
  }

  await googlePage.waitForLoadState('domcontentloaded', { timeout: 20000 });
  console.log(`Google page URL: ${googlePage.url()}`);

  // Account chooser - try clicking the target account directly
  const emailLocator = googlePage.locator(`[data-email="${TARGET_ACCOUNT}"]`);
  const emailVisible = await emailLocator.isVisible({ timeout: 5000 }).catch(() => false);

  if (emailVisible) {
    console.log(`Selecting account: ${TARGET_ACCOUNT}`);
    await emailLocator.click();
  } else {
    const textLocator = googlePage.locator(`text=${TARGET_ACCOUNT}`);
    const textVisible = await textLocator.isVisible({ timeout: 3000 }).catch(() => false);
    if (textVisible) {
      console.log(`Clicking account by text: ${TARGET_ACCOUNT}`);
      await textLocator.click();
    } else {
      const emailInput = googlePage.locator('input[type="email"]');
      if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('Entering email...');
        await emailInput.fill(TARGET_ACCOUNT);
        await googlePage.keyboard.press('Enter');
      } else {
        console.log('WARNING: Could not find account selector or email input');
        await googlePage.screenshot({ path: SCREENSHOT_PATH.replace('002.png', '002_debug.png') });
      }
    }
  }

  // Wait for redirect back to app
  console.log('Waiting for redirect to app...');
  await page.waitForURL(`${CLONE_URL}/**`, { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(1000);

  const finalUrl = page.url();
  console.log(`Final URL: ${finalUrl}`);
  console.log('Capturing homepage screenshot...');
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });

  await browser.close();
  console.log(`Done. Screenshot: ${SCREENSHOT_PATH}`);
  console.log(`FINAL_URL:${finalUrl}`);
})();
