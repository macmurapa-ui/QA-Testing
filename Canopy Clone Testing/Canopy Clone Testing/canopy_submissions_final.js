/**
 * Canopy Clone - Get Clone Submissions for Yesterday (2026-03-16)
 * Authenticates via Google OAuth and explores admin to find submissions.
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const CANOPY_URL = 'https://admin-canopy-clone.helpthemove.co.uk';
const YESTERDAY = '2026-03-16';
const SCREENSHOT_DIR = path.dirname(__filename);
const CANOPY_AUTH_PATH = '/home/user/QA-Testing/canopy_auth.json';

const rawProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
let proxyConfig;
if (rawProxy) {
  const u = new URL(rawProxy);
  proxyConfig = { server: `${u.protocol}//${u.host}`, username: u.username, password: u.password, bypass: '<-loopback>' };
}

async function authenticate(browser, useExistingGoogleCookies = false) {
  let contextOptions = { ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 } };
  // Reuse Google cookies from previous session to get account picker
  if (useExistingGoogleCookies && fs.existsSync(CANOPY_AUTH_PATH)) {
    contextOptions.storageState = CANOPY_AUTH_PATH;
    console.log('[AUTH] Loading existing Google cookies for account picker...');
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  console.log('[AUTH] Navigating to Canopy Clone login...');
  await page.goto(`${CANOPY_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Click "Sign in with Google"
  await page.waitForSelector('button:has-text("Sign in with Google"), a[href*="google"], button:has-text("Google")', { timeout: 10000 });
  await page.click('button:has-text("Sign in with Google"), a[href*="google"], button:has-text("Google")');
  await page.waitForURL('**/accounts.google.com/**', { timeout: 15000 });

  const googleUrl = page.url();
  console.log('[AUTH] On Google OAuth: ' + googleUrl.substring(0, 80) + '...');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/canopy_google_oauth.png` });

  // Check if account picker is shown (from existing cookies)
  const hasAccountPicker = await page.$('[data-email], [data-identifier], div[data-authuser], li[data-authuser]').catch(() => null);

  if (hasAccountPicker) {
    console.log('[AUTH] Account picker found. Selecting mac.murapa account...');
    const accountEl = await page.$('[data-email*="mac.murapa"], [data-identifier*="mac.murapa"]');
    if (accountEl) {
      await accountEl.click();
    } else {
      // Click first account
      const anyAccount = await page.$('[data-authuser="0"], [data-authuser]');
      if (anyAccount) await anyAccount.click();
    }
  } else {
    // Enter email manually
    console.log('[AUTH] No account picker. Entering email...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', 'mac.murapa@helpthemove.co.uk');
    // Click Next button explicitly
    await page.waitForSelector('#identifierNext, button:has-text("Next")', { timeout: 5000 }).catch(() => {});
    const nextBtn = await page.$('#identifierNext, button:has-text("Next")');
    if (nextBtn) {
      await nextBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }
  }

  console.log('[AUTH] Waiting for redirect to Canopy Clone...');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/canopy_auth_progress.png` });

  try {
    await page.waitForURL(`${CANOPY_URL}/**`, { timeout: 30000 });
    console.log('[AUTH] Success! Redirected to: ' + page.url());
  } catch (e) {
    const url = page.url();
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 400));
    console.log('[AUTH] Timed out. Current URL: ' + url.substring(0, 100));
    console.log('[AUTH] Page content: ' + bodyText.substring(0, 200));
    await page.screenshot({ path: `${SCREENSHOT_DIR}/canopy_auth_failed.png` });
    await context.close();
    return null;
  }

  // Save session
  await context.storageState({ path: CANOPY_AUTH_PATH });
  console.log('[AUTH] Session saved.');
  return context;
}

(async () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' Canopy Clone - Clone Submissions for ' + YESTERDAY);
  console.log('═══════════════════════════════════════════════════════');

  const browser = await chromium.launch({ headless: true, proxy: proxyConfig, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  // Try existing session first
  let context;
  if (fs.existsSync(CANOPY_AUTH_PATH)) {
    context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 }, storageState: CANOPY_AUTH_PATH });
    const testPage = await context.newPage();
    await testPage.goto(CANOPY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (testPage.url().includes('/login') || testPage.url().includes('accounts.google.com')) {
      console.log('[INFO] Session expired. Re-authenticating...');
      await context.close();
      context = await authenticate(browser, true);
    } else {
      console.log('[INFO] Existing session valid: ' + testPage.url());
      await testPage.close();
    }
  } else {
    context = await authenticate(browser);
  }

  if (!context) {
    console.log('ERROR: Authentication failed.');
    await browser.close();
    process.exitCode = 1;
    return;
  }

  const page = await context.newPage();

  // ── Explore navigation ────────────────────────────────────────────────────
  await page.goto(CANOPY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('\n[NAV] Dashboard URL: ' + page.url());
  await page.screenshot({ path: `${SCREENSHOT_DIR}/canopy_dashboard.png`, fullPage: true });

  const navLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('nav a, .navbar a, header a, .sidebar a, .menu a'))
      .map(a => ({ text: a.innerText.trim().replace(/\s+/g, ' '), href: a.href }))
      .filter(l => l.text && l.href);
  });

  console.log('\n[NAV] Navigation links:');
  navLinks.forEach(l => console.log(`  "${l.text}" → ${l.href}`));

  // ── Try candidate URLs for submissions ────────────────────────────────────
  const candidates = [
    '/conversions',
    '/conversion_submissions',
    '/clone_requests',
    '/clones',
    '/submissions',
    '/reports/conversions',
    '/reports/submissions',
    '/utility_switches',
    '/moves',
    '/referrals',
  ];

  // Also add any links from navigation that look submission-related
  navLinks.forEach(l => {
    const text = l.text.toLowerCase();
    if (text.includes('conversion') || text.includes('submission') || text.includes('clone') ||
        text.includes('report') || text.includes('move') || text.includes('referral')) {
      const urlPath = l.href.replace(CANOPY_URL, '');
      if (urlPath && !candidates.includes(urlPath)) candidates.push(urlPath);
    }
  });

  console.log('\n[SEARCH] Testing candidate URLs...');
  let foundPages = [];

  for (const candidate of candidates) {
    try {
      await page.goto(`${CANOPY_URL}${candidate}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const url = page.url();
      const title = await page.title();
      const hasTable = await page.evaluate(() => document.querySelectorAll('table').length > 0);
      const rowCount = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
      const is404 = await page.evaluate(() => document.body.innerText.includes("doesn't exist") || document.body.innerText.includes('404'));

      if (!is404) {
        console.log(`  ✓ ${candidate} → "${title}" | tables: ${hasTable} | rows: ${rowCount}`);
        if (hasTable || rowCount > 0) {
          foundPages.push({ path: candidate, url, title, rowCount });
        }
      }
    } catch (e) {
      // skip
    }
  }

  if (foundPages.length === 0) {
    console.log('\n[INFO] No tables found. Checking dashboard content for data...');
    await page.goto(CANOPY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\nDashboard content:\n' + bodyText.substring(0, 2000));
    await browser.close();
    return;
  }

  // ── Extract submissions from found pages ──────────────────────────────────
  console.log('\n[EXTRACT] Processing found pages...');
  for (const found of foundPages) {
    await page.goto(found.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/canopy_${found.path.replace(/\//g, '_')}.png`, fullPage: true });

    const tableData = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('table thead th, table th')).map(h => h.innerText.trim());
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return {
        headers,
        rows: rows.map(row => Array.from(row.querySelectorAll('td')).map(c => c.innerText.trim()))
      };
    });

    console.log(`\n  Page: ${found.path}`);
    console.log(`  Headers: ${tableData.headers.join(' | ')}`);
    console.log(`  Total rows: ${tableData.rows.length}`);

    // Filter for yesterday
    const yesterdayVariants = [YESTERDAY, '16/03/2026', '16 Mar 2026', 'Mar 16, 2026', '16-03-2026'];
    const matchingRows = tableData.rows.filter(row =>
      yesterdayVariants.some(d => row.join(' ').includes(d))
    );

    console.log(`  Rows matching ${YESTERDAY}: ${matchingRows.length}`);
    if (matchingRows.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log(` RESULTS: Clone Submissions for ${YESTERDAY}`);
      console.log('═══════════════════════════════════════════════════════');
      console.log(` Headers: ${tableData.headers.join(' | ')}`);
      matchingRows.forEach((row, i) => {
        console.log(` [${i+1}] ${row.join(' | ')}`);
      });
      console.log('═══════════════════════════════════════════════════════');
    } else {
      // Show all rows with dates to help diagnose
      console.log('  Sample rows (first 5):');
      tableData.rows.slice(0, 5).forEach((row, i) => {
        console.log(`    Row ${i+1}: ${row.join(' | ')}`);
      });
    }
  }

  await browser.close();
})();
