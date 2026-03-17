/**
 * Canopy Clone - Clone Submissions Report
 * Lists all clone submissions with submitted_at for yesterday (2026-03-16)
 *
 * Uses Google OAuth authentication.
 * URL: https://admin-canopy-clone.helpthemove.co.uk
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const CANOPY_URL = 'https://admin-canopy-clone.helpthemove.co.uk';
const YESTERDAY = '2026-03-16';
const SCREENSHOT_DIR = path.dirname(__filename);
const CANOPY_AUTH_PATH = '/home/user/QA-Testing/canopy_auth.json';

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

const fs = require('fs');

(async () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' Canopy Clone - Clone Submissions for ' + YESTERDAY);
  console.log('═══════════════════════════════════════════════════════');

  const browser = await chromium.launch({
    headless: true,
    proxy: proxyConfig,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  // Try to load saved Canopy auth if available
  let contextOptions = {
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 900 }
  };

  if (fs.existsSync(CANOPY_AUTH_PATH)) {
    console.log('[INFO] Using saved Canopy auth session.');
    contextOptions.storageState = CANOPY_AUTH_PATH;
  } else {
    console.log('[INFO] No saved Canopy auth found. Will attempt Google OAuth.');
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  // ── Step 1: Navigate to Canopy Clone ──────────────────────────────────────
  console.log('\n[1] Navigating to Canopy Clone admin...');
  await page.goto(CANOPY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  let landedUrl = page.url();
  console.log('    Landed on: ' + landedUrl);

  // Handle Google OAuth if redirected to login
  if (landedUrl.includes('accounts.google.com') || landedUrl.includes('/login')) {
    console.log('\n[AUTH] Google OAuth required. Attempting login...');

    // If on the app login page, click "Sign in with Google"
    if (landedUrl.includes('/login') && !landedUrl.includes('accounts.google.com')) {
      await page.waitForSelector('a[href*="google"], button:has-text("Google"), a:has-text("Google")', { timeout: 10000 });
      await page.click('a[href*="google"], button:has-text("Google"), a:has-text("Google")');
      await page.waitForURL('**/accounts.google.com/**', { timeout: 15000 });
    }

    // Handle Google account selection
    landedUrl = page.url();
    if (landedUrl.includes('accounts.google.com')) {
      console.log('    On Google OAuth page.');
      await page.screenshot({ path: `${SCREENSHOT_DIR}/canopy_oauth_step.png` });

      // Try clicking the existing account first
      const hasAccountPicker = await page.$('[data-email], [data-identifier], div[data-authuser]').catch(() => null);

      if (hasAccountPicker) {
        try {
          const accountEl = await page.$('[data-email*="mac.murapa"], [data-identifier*="mac.murapa"]');
          if (accountEl) {
            await accountEl.click();
            console.log('    Clicked mac.murapa account.');
          } else {
            const firstAccount = await page.$('div[data-authuser="0"], li[data-authuser]');
            if (firstAccount) await firstAccount.click();
          }
          await page.waitForURL(`${CANOPY_URL}/**`, { timeout: 20000 });
        } catch (e) {
          console.log('    Account picker click failed: ' + e.message);
        }
      } else {
        // Email entry form — type email and submit, SSO may handle the rest
        try {
          console.log('    Entering email for SSO flow...');
          await page.waitForSelector('input[type="email"], input[name="identifier"]', { timeout: 8000 });
          await page.fill('input[type="email"], input[name="identifier"]', 'mac.murapa@helpthemove.co.uk');
          await page.keyboard.press('Enter');
          console.log('    Email entered. Waiting for SSO redirect...');

          // Wait — could redirect to company SSO or stay on Google
          await page.waitForTimeout(3000);
          landedUrl = page.url();
          console.log('    After email: ' + landedUrl);
          await page.screenshot({ path: `${SCREENSHOT_DIR}/canopy_oauth_after_email.png` });

          // If redirected to the app, we're done
          if (landedUrl.includes(CANOPY_URL.replace('https://', ''))) {
            console.log('    SSO login successful!');
          } else {
            // May need password — cannot proceed without it
            console.log('    SSO did not auto-login. Manual session required.');
            await browser.close();
            process.exitCode = 1;
            return;
          }
        } catch (e) {
          console.log('    Email entry failed: ' + e.message);
          await page.screenshot({ path: `${SCREENSHOT_DIR}/canopy_oauth_blocked.png` });
          await browser.close();
          process.exitCode = 1;
          return;
        }
      }
    }

    // Save session for future runs
    await context.storageState({ path: CANOPY_AUTH_PATH });
    console.log('    Session saved to canopy_auth.json');
  }

  landedUrl = page.url();
  console.log('\n[2] Authenticated. Current URL: ' + landedUrl);

  // ── Step 2: Navigate to Clone Submissions ─────────────────────────────────
  console.log('\n[3] Looking for Clone Submissions...');

  // Try common admin paths for submissions/clones
  const submissionPaths = [
    '/clones',
    '/conversions',
    '/submissions',
    '/clone_submissions',
    '/admin/clones',
    '/reports/clones',
  ];

  let foundSubmissionsPage = false;
  for (const p of submissionPaths) {
    try {
      await page.goto(`${CANOPY_URL}${p}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const url = page.url();
      const title = await page.title();
      console.log(`    Trying ${p} → ${url} (${title})`);

      // Check if we got a valid page (not redirected to root or 404)
      if (!url.endsWith('/') && !url.includes('404') && url.includes(p.replace('/', ''))) {
        foundSubmissionsPage = true;
        console.log(`    ✓ Found submissions page at: ${p}`);
        break;
      }

      // Also check page content for clues
      const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 200) || '');
      if (bodyText.toLowerCase().includes('clone') || bodyText.toLowerCase().includes('submission')) {
        foundSubmissionsPage = true;
        console.log(`    ✓ Found relevant page at: ${p}`);
        break;
      }
    } catch (e) {
      console.log(`    Error trying ${p}: ${e.message}`);
    }
  }

  // ── Step 3: Inspect the navigation to find the right path ─────────────────
  if (!foundSubmissionsPage) {
    console.log('\n[4] Scanning admin navigation for clone/submission links...');
    await page.goto(CANOPY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/canopy_dashboard.png`, fullPage: true });

    const navLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('nav a, header a, .sidebar a, .menu a, .navbar a'));
      return links.map(a => ({ text: a.innerText.trim(), href: a.href })).filter(l => l.text);
    });

    console.log('\n    Navigation links found:');
    navLinks.forEach(l => console.log(`      - "${l.text}" → ${l.href}`));

    // Find clone/conversion/submission links
    const cloneLink = navLinks.find(l =>
      l.text.toLowerCase().includes('clone') ||
      l.text.toLowerCase().includes('conversion') ||
      l.text.toLowerCase().includes('submission')
    );

    if (cloneLink) {
      console.log(`\n    Found relevant link: "${cloneLink.text}" → ${cloneLink.href}`);
      await page.goto(cloneLink.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      foundSubmissionsPage = true;
    }
  }

  await page.screenshot({ path: `${SCREENSHOT_DIR}/canopy_submissions_page.png`, fullPage: true });
  console.log('\n    Screenshot: canopy_submissions_page.png');

  // ── Step 4: Extract submissions for yesterday ──────────────────────────────
  console.log('\n[5] Extracting submissions for ' + YESTERDAY + '...');

  // Try to find a date filter or search
  const currentUrl = page.url();
  const pageContent = await page.evaluate(() => document.body?.innerText || '');

  // Check for date filtering options
  const hasDateFilter = await page.$('input[type="date"], input[name*="date"], select[name*="date"], input[placeholder*="date"]');
  if (hasDateFilter) {
    console.log('    Date filter found. Applying...');
    await page.fill('input[type="date"]', YESTERDAY).catch(() => {});
  }

  // Try URL-based date filter
  const dateFilterUrl = `${currentUrl}?date=${YESTERDAY}&submitted_at=${YESTERDAY}&q[submitted_at_eq]=${YESTERDAY}`;
  await page.goto(dateFilterUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Extract table data
  const tableData = await page.evaluate((yesterday) => {
    const rows = Array.from(document.querySelectorAll('table tbody tr, .table tbody tr'));
    const results = [];

    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      const rowText = cells.map(c => c.innerText.trim()).join(' | ');

      // Filter rows that contain yesterday's date
      if (rowText.includes(yesterday) || rowText.includes('16/03/2026') || rowText.includes('16 Mar 2026') || rowText.includes('Mar 16')) {
        const rowData = {};
        cells.forEach((cell, i) => {
          rowData[`col_${i}`] = cell.innerText.trim();
        });
        rowData.full_row = rowText;
        results.push(rowData);
      }
    });

    return results;
  }, YESTERDAY);

  // Also get all table headers
  const tableHeaders = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('table thead th, .table thead th'));
    return headers.map(h => h.innerText.trim());
  });

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' RESULTS: Clone Submissions for ' + YESTERDAY);
  console.log('═══════════════════════════════════════════════════════');
  console.log(' Page URL: ' + page.url());

  if (tableHeaders.length > 0) {
    console.log('\n Table Headers: ' + tableHeaders.join(' | '));
  }

  if (tableData.length > 0) {
    console.log(`\n Found ${tableData.length} submission(s) for ${YESTERDAY}:\n`);
    tableData.forEach((row, i) => {
      console.log(` [${i + 1}] ${row.full_row}`);
    });
  } else {
    console.log('\n No submissions found matching ' + YESTERDAY);
    console.log(' Page content preview:');
    console.log(pageContent.substring(0, 500));
  }

  console.log('═══════════════════════════════════════════════════════');

  await page.screenshot({ path: `${SCREENSHOT_DIR}/canopy_submissions_result.png`, fullPage: true });
  console.log('\n Final screenshot: canopy_submissions_result.png');

  await browser.close();
})();
