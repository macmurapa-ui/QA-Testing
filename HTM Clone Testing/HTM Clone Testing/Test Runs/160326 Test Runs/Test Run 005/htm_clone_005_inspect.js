const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');

const CLONE_URL = 'https://admin-clone.helpthemove.co.uk';
const TARGET_ACCOUNT = 'mac.murapa@helpthemove.co.uk';
const SCREENSHOT_PATH = "/home/user/QA-Testing/HTM Clone Testing/HTM Clone Testing/Test Runs/Test Run 001/Test Run 005/HTM_Clone_Screenshot_005_branch_form.png";

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

  // ── Step 1: Login ──────────────────────────────────────────────────────────
  console.log('Navigating to HTM Clone...');
  await page.goto(CLONE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log(`Loaded: ${page.url()}`);

  console.log('Clicking Sign in with Google...');
  await page.click('text=Sign in with Google', { timeout: 10000 });

  // Google OAuth may open in popup or same tab
  let googlePage = page;
  try {
    const popup = await context.waitForEvent('page', { timeout: 6000 });
    googlePage = popup;
    console.log('Google auth opened in popup');
  } catch {
    console.log('Google auth in same tab');
  }

  await googlePage.waitForLoadState('domcontentloaded', { timeout: 20000 });
  console.log(`Google page URL: ${googlePage.url()}`);

  // Account chooser
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
        console.log('Entering email manually...');
        await emailInput.fill(TARGET_ACCOUNT);
        await googlePage.keyboard.press('Enter');
      } else {
        console.log('WARNING: Could not find account selector or email input');
        await googlePage.screenshot({ path: SCREENSHOT_PATH.replace('.png', '_debug_google.png') });
      }
    }
  }

  // Wait for redirect back to app
  console.log('Waiting for redirect back to app...');
  await page.waitForURL(`${CLONE_URL}/**`, { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(1000);

  const postLoginUrl = page.url();
  console.log(`Post-login URL: ${postLoginUrl}`);

  if (postLoginUrl.includes('/login') || postLoginUrl.includes('accounts.google.com')) {
    console.log('ERROR: Still on login page after auth attempt');
    await page.screenshot({ path: SCREENSHOT_PATH.replace('.png', '_debug_login_fail.png') });
    await browser.close();
    process.exitCode = 1;
    return;
  }

  // Save fresh session
  await context.storageState({ path: '/home/user/QA-Testing/auth.json' });
  console.log('Fresh session saved to auth.json');

  // ── Step 2: Navigate to New Branch form ────────────────────────────────────
  console.log('Navigating to /branches/new...');
  await page.goto(`${CLONE_URL}/branches/new`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  console.log(`Branch form URL: ${page.url()}`);

  // ── Step 3: Inspect form fields ────────────────────────────────────────────
  const requiredFields = await page.evaluate(() => {
    const results = [];
    const allInputs = document.querySelectorAll('input:not([type=hidden]), select, textarea');
    allInputs.forEach(el => {
      const isRequired = el.required || el.getAttribute('aria-required') === 'true';
      let labelText = '';
      if (el.id) {
        const lbl = document.querySelector(`label[for="${el.id}"]`);
        if (lbl) labelText = lbl.innerText.trim();
      }
      if (!labelText) {
        const closest = el.closest('label');
        if (closest) labelText = closest.innerText.trim();
      }
      // Also check parent container for label-like text
      if (!labelText) {
        const parent = el.closest('.field, .form-group, .input-group, [class*="field"], [class*="form"]');
        if (parent) {
          const lbl = parent.querySelector('label');
          if (lbl) labelText = lbl.innerText.trim();
        }
      }
      results.push({
        tag: el.tagName,
        type: el.type || '',
        name: el.name || '',
        id: el.id || '',
        required: isRequired,
        label: labelText
      });
    });
    return results;
  });

  console.log('\n=== ALL FORM FIELDS ===');
  requiredFields.forEach(f => {
    const req = f.required ? '[REQUIRED]' : '[optional]';
    console.log(`${req} ${f.tag} name="${f.name}" id="${f.id}" label="${f.label}"`);
  });

  const mandatoryOnly = requiredFields.filter(f => f.required);
  console.log(`\n=== MANDATORY FIELDS (${mandatoryOnly.length}) ===`);
  mandatoryOnly.forEach(f => {
    console.log(`  - name="${f.name}" id="${f.id}" label="${f.label}" type="${f.type}"`);
  });

  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  console.log(`\nScreenshot saved: ${SCREENSHOT_PATH}`);

  await browser.close();
  console.log('Done.');
})();
