const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const CLONE_URL = 'https://admin-clone.helpthemove.co.uk';
const TARGET_ACCOUNT = 'mac.murapa@helpthemove.co.uk';
const DEBUG_DIR = "/home/user/QA-Testing/HTM Clone Testing/HTM Clone Testing/Test Runs/Test Run 001/Test Run 005";

const rawProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
let proxyConfig;
if (rawProxy) {
  const u = new URL(rawProxy);
  proxyConfig = { server: `${u.protocol}//${u.host}`, username: u.username, password: u.password, bypass: '<-loopback>' };
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    proxy: proxyConfig,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 900 }
  });

  const page = await context.newPage();

  console.log('Step 1: Navigate to HTM Clone login...');
  await page.goto(CLONE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.screenshot({ path: `${DEBUG_DIR}/debug_01_clone_login.png` });
  console.log(`  URL: ${page.url()}`);

  console.log('Step 2: Click Sign in with Google...');
  await page.click('text=Sign in with Google', { timeout: 10000 });

  let googlePage = page;
  try {
    const popup = await context.waitForEvent('page', { timeout: 6000 });
    googlePage = popup;
    console.log('  Google auth opened in popup');
  } catch {
    console.log('  Google auth in same tab');
  }

  await googlePage.waitForLoadState('domcontentloaded', { timeout: 20000 });
  await googlePage.screenshot({ path: `${DEBUG_DIR}/debug_02_google_page.png` });
  console.log(`  Google URL: ${googlePage.url()}`);

  // Check what's on the Google page
  const pageTitle = await googlePage.title();
  console.log(`  Page title: ${pageTitle}`);

  // Look for email input
  const emailInput = googlePage.locator('input[type="email"]');
  const hasEmailInput = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
  console.log(`  Has email input: ${hasEmailInput}`);

  // Look for account chooser
  const accountChooser = await googlePage.locator(`[data-email="${TARGET_ACCOUNT}"]`).isVisible({ timeout: 2000 }).catch(() => false);
  console.log(`  Has account chooser for ${TARGET_ACCOUNT}: ${accountChooser}`);

  if (hasEmailInput) {
    console.log('Step 3: Entering email...');
    await emailInput.fill(TARGET_ACCOUNT);
    await googlePage.screenshot({ path: `${DEBUG_DIR}/debug_03_email_filled.png` });

    // Click Next button explicitly
    const nextBtn = googlePage.locator('#identifierNext, button:has-text("Next"), [data-idom-class="nCP5yc"]');
    const hasNext = await nextBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`  Has Next button: ${hasNext}`);

    if (hasNext) {
      console.log('Step 4: Clicking Next...');
      await nextBtn.first().click();
    } else {
      console.log('Step 4: Pressing Enter...');
      await googlePage.keyboard.press('Enter');
    }

    await googlePage.waitForLoadState('domcontentloaded', { timeout: 15000 });
    await googlePage.waitForTimeout(2000);
    await googlePage.screenshot({ path: `${DEBUG_DIR}/debug_04_after_email_next.png` });
    console.log(`  URL after email+Next: ${googlePage.url()}`);

    // Check for password field
    const pwInput = googlePage.locator('input[type="password"]');
    const hasPw = await pwInput.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`  Has password input: ${hasPw}`);

    // Check for SSO redirect or other elements
    const bodyText = await googlePage.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`  Page text preview: ${bodyText}`);
  }

  await browser.close();
  console.log('\nDebug screenshots saved to Test Run 005/');
})();
