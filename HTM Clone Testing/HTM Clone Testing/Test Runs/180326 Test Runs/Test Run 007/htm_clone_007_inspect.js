/**
 * HTM Clone - Test Run 007 (Inspection Run)
 * Landlord Creation Form Inspector
 *
 * Phase 1: Auth check
 *   - If auth.json session is valid → proceed headlessly
 *   - If session expired → launch headed browser, wait for manual login,
 *     save session to auth.json, then continue headlessly
 *
 * Phase 2: Find or create branch "Mac DDMMYY" (today's date)
 *
 * Phase 3: Inspect Landlord creation form within the branch
 *   - Navigate to the branch
 *   - Find the Landlords section
 *   - Extract all form fields from the landlord creation form
 *   - Screenshot at each step
 *
 * Branch naming convention: Mac DDMMYY (e.g. Mac 180326 = 18th Mar 2026)
 * NOTE: Inspection run only — not committed until full test passes.
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

// ── Branch name: Mac + today's date in DDMMYY ─────────────────────────────────
function todaysBranchName() {
  const now = new Date();
  const dd  = String(now.getDate()).padStart(2, '0');
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const yy  = String(now.getFullYear()).slice(-2);
  return `Mac ${dd}${mm}${yy}`;
}

const CLONE_URL   = 'https://admin-clone.helpthemove.co.uk';
const BRANCH_NAME = todaysBranchName();
const AUTH_PATH   = '/home/user/QA-Testing/auth.json';
const SS_DIR      = path.dirname(__filename);

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

// ── Helpers ────────────────────────────────────────────────────────────────────

async function checkSession(page) {
  await page.goto(CLONE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const url = page.url();
  return !url.includes('/login') && !url.includes('accounts.google.com');
}

/**
 * AUTH STRATEGY
 *
 * Manual login (best — user avoids CAPTCHA):
 *   Run with a visible display:
 *     - Local machine:  node htm_clone_007_inspect.js
 *     - This server:    DISPLAY= is unset so xvfb-run is required, but
 *                       xvfb is a virtual framebuffer (not user-visible).
 *                       For true manual login, run the script on a local machine
 *                       where you have a display, then copy auth.json back here.
 *
 * Automated login fallback (used here when no display):
 *   Headed browser on xvfb virtual display with anti-detection flags.
 *   Run with: xvfb-run node htm_clone_007_inspect.js
 *   Google OAuth is automated — may still hit CAPTCHA but less likely than pure headless.
 *
 * Auth mode is controlled via env var MANUAL_LOGIN:
 *   MANUAL_LOGIN=1 node script.js              → headed + manual login (local machine with display)
 *   xvfb-run node script.js                    → headed on virtual display + automated Google OAuth
 *   node script.js                             → headless + automated Google OAuth (pure headless)
 */
async function refreshAuth() {
  const manualLogin = !!process.env.MANUAL_LOGIN;
  const hasDisplay  = !!process.env.DISPLAY;
  // Use headed if explicitly manual OR if we have a virtual display via xvfb-run
  const headed = manualLogin || hasDisplay;
  const mode = manualLogin ? 'HEADED (manual — waiting for user)'
             : hasDisplay  ? 'HEADED on virtual display (automated Google OAuth via xvfb-run)'
             :                'HEADLESS (automated Google OAuth, anti-detection)';
  console.log(`\n[AUTH] Session expired. Auth mode: ${mode}`);

  const browser = await chromium.launch({
    headless: !headed,
    proxy: proxyConfig,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,900'
    ]
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();
  await page.goto(`${CLONE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  if (manualLogin) {
    // Manual: user completes Google login in the visible browser window
    console.log('[AUTH] Browser is open. Please sign in manually.');
    console.log('[AUTH] Waiting up to 3 minutes for successful login...');
    try {
      await page.waitForURL(
        url => !url.includes('/login') && !url.includes('accounts.google.com'),
        { timeout: 180000 }
      );
      console.log('[AUTH] Login detected! URL: ' + page.url());
    } catch (e) {
      console.log('[AUTH] ERROR: Login not completed within 3 minutes.');
      await browser.close();
      process.exitCode = 1;
      return null;
    }
  } else {
    // Automated: type credentials and submit — may hit CAPTCHA in headless
    console.log('[AUTH] Automating Google OAuth flow...');
    console.log('[AUTH] TIP: Run with xvfb-run for better CAPTCHA bypass, or');
    console.log('[AUTH]      run on a local machine with DISPLAY set for manual login.');
    try {
      await page.click('button:has-text("Sign in with Google")');
      await page.waitForURL('**/accounts.google.com/**', { timeout: 15000 });
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await page.type('input[type="email"]', 'mac.murapa@helpthemove.co.uk', { delay: 80 });
      await page.waitForTimeout(800);
      const nextBtn = await page.$('#identifierNext');
      if (nextBtn) { await nextBtn.click(); } else { await page.keyboard.press('Enter'); }

      console.log('[AUTH] Waiting for redirect back to HTM Clone...');
      await page.waitForURL(`${CLONE_URL}/**`, { timeout: 60000 });
      console.log('[AUTH] Authenticated! URL: ' + page.url());
    } catch (e) {
      const currentUrl = page.url();
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 300)).catch(() => '');
      console.log('[AUTH] ERROR: Automated login failed.');
      console.log('[AUTH] Current URL: ' + currentUrl.substring(0, 120));
      console.log('[AUTH] Page text: ' + bodyText);
      await page.screenshot({ path: `${SS_DIR}/007_auth_failed.png` });
      console.log('[AUTH] Screenshot: 007_auth_failed.png');
      console.log('[AUTH] ACTION REQUIRED: Run with xvfb-run OR update auth.json manually.');
      await browser.close();
      process.exitCode = 1;
      return null;
    }
  }

  await context.storageState({ path: AUTH_PATH });
  console.log('[AUTH] Session saved to auth.json');
  await browser.close();
  return true;
}

// ── Main ───────────────────────────────────────────────────────────────────────

(async () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' HTM Clone - Test Run 007: Inspection Run');
  console.log(' Branch: ' + BRANCH_NAME);
  console.log('═══════════════════════════════════════════════════════');

  // ── Step 1: Check existing session ────────────────────────────────────────
  console.log('\n[1/5] Checking existing auth.json session...');

  const checkBrowser = await chromium.launch({
    headless: true,
    proxy: proxyConfig,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const checkContext = await checkBrowser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 900 },
    storageState: AUTH_PATH
  });
  const checkPage = await checkContext.newPage();
  const sessionValid = await checkSession(checkPage);
  await checkBrowser.close();

  if (sessionValid) {
    console.log('      Session VALID — proceeding headlessly.');
  } else {
    console.log('      Session EXPIRED — headed manual login required.');
    const loginResult = await refreshAuth();
    if (!loginResult) {
      console.log('FATAL: Could not authenticate. Exiting.');
      process.exitCode = 1;
      return;
    }
  }

  // ── Step 2: Launch headless browser with valid session ─────────────────────
  console.log('\n[2/5] Launching headless browser with saved session...');
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

  // Final session sanity check
  const valid = await checkSession(page);
  if (!valid) {
    console.log('ERROR: Session still invalid after login. Exiting.');
    await browser.close();
    process.exitCode = 1;
    return;
  }
  console.log('      Headless session confirmed.');

  // ── Step 3: Find or create branch (check-before-create) ───────────────────
  // Convention: branch name = Mac DDMMYY — one per day, reused across runs.
  // Always search first to avoid creating duplicates.
  console.log('\n[3/5] Checking if branch "' + BRANCH_NAME + '" already exists...');

  await page.goto(`${CLONE_URL}/branches?q=${encodeURIComponent(BRANCH_NAME)}`, {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  await page.waitForTimeout(800);

  let existingInspectUrl = await page.evaluate((name) => {
    const rows = Array.from(document.querySelectorAll('table tbody tr, tr'));
    for (const row of rows) {
      if (row.innerText.includes(name)) {
        const a = row.querySelector('a[href*="/branches/"]');
        if (a) return a.href;
      }
    }
    const links = Array.from(document.querySelectorAll('a[href*="/branches/"]'));
    const match = links.find(a => a.innerText.trim() === name);
    return match ? match.href : null;
  }, BRANCH_NAME);

  if (existingInspectUrl) {
    console.log('      Branch already exists — skipping creation.');
    console.log('      URL: ' + existingInspectUrl);
  } else {
    console.log('      Not found — creating...');
    await page.goto(`${CLONE_URL}/branches/new`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SS_DIR}/007_inspect_branch_form.png`, fullPage: true });
    console.log('      Screenshot: 007_inspect_branch_form.png');

    await page.locator('input[name="branch[name]"]').fill(BRANCH_NAME);
    await page.locator('select[name="branch[business_type]"]').selectOption({ label: 'Letting Agent' });
    await page.locator('input[name="branch[phone_number]"]').fill('07561834920');
    await page.locator('input[name="branch[address_attributes][address_1]"]').fill('123 Test Street');
    await page.locator('input[name="branch[address_attributes][town]"]').fill('Manchester');
    await page.locator('input[name="branch[address_attributes][post_code]"]').fill('M13 9GS');
    await page.locator('input[name="branch[address_attributes][county]"]').fill('Lancashire');

    await page.locator('input[type="submit"]').click();
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    await page.waitForTimeout(1500);
    // App redirects to /admins/:user_id on success — not the branch page
    console.log('      Branch submitted. Redirect: ' + page.url());
  }

  const branchUrl = existingInspectUrl || page.url();

  // ── Step 4: Find the created branch in /branches list ────────────────────────
  // Note: post-creation redirects to /admins/:user_id (the logged-in user page),
  // not the branch page. We must search for the branch by name.
  console.log('\n[4/5] Finding branch "' + BRANCH_NAME + '" in /branches...');

  await page.goto(`${CLONE_URL}/branches?q=${encodeURIComponent(BRANCH_NAME)}`, {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/007_inspect_branch_search.png`, fullPage: true });
  console.log('      Screenshot: 007_inspect_branch_search.png');

  // Find the branch link in the results table
  const branchRowLink = await page.evaluate((name) => {
    const links = Array.from(document.querySelectorAll('a'));
    const match = links.find(a => a.innerText.trim() === name || a.href.includes('/branches/'));
    // Also look for any row containing the branch name
    const rows = Array.from(document.querySelectorAll('table tbody tr, tr'));
    for (const row of rows) {
      if (row.innerText.includes(name)) {
        const a = row.querySelector('a[href*="/branches/"]');
        if (a) return { text: a.innerText.trim(), href: a.href };
      }
    }
    // Fallback: first /branches/:id link on page
    const branchLink = links.find(a => a.href.match(/\/branches\/\d+/));
    return branchLink ? { text: branchLink.innerText.trim(), href: branchLink.href } : null;
  }, BRANCH_NAME);

  console.log('      Branch link found: ' + JSON.stringify(branchRowLink));

  // Also dump all page links containing /branches/ for debug
  const allBranchLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a'))
      .map(a => ({ text: a.innerText.trim().replace(/\s+/g, ' '), href: a.href }))
      .filter(l => l.href.includes('/branches/'))
  );
  console.log('      All /branches/ links on search page:');
  allBranchLinks.slice(0, 10).forEach(l => console.log(`        "${l.text}" → ${l.href}`));

  let actualBranchUrl = branchRowLink ? branchRowLink.href : null;
  let branchId = null;

  if (actualBranchUrl) {
    const m = actualBranchUrl.match(/\/branches\/(\d+)/);
    branchId = m ? m[1] : null;
    console.log('      Actual branch URL: ' + actualBranchUrl);
    console.log('      Branch ID: ' + branchId);

    // Navigate to the branch show page
    await page.goto(actualBranchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SS_DIR}/007_inspect_branch_page.png`, fullPage: true });
    console.log('      Screenshot: 007_inspect_branch_page.png');

    // Dump all links on branch page for analysis
    const branchPageLinks = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a'))
        .map(a => ({ text: a.innerText.trim().replace(/\s+/g, ' '), href: a.href }))
        .filter(l => l.text && l.href && (
          l.href.includes('landlord') || l.text.toLowerCase().includes('landlord') ||
          l.href.includes('/new') || l.text.toLowerCase().includes('new')
        ))
    );
    console.log('      New/Landlord links on branch page:');
    branchPageLinks.forEach(l => console.log(`        "${l.text}" → ${l.href}`));
  } else {
    console.log('      WARNING: Could not locate branch in search results.');
  }

  // ── Step 5: Navigate to Landlord creation form and inspect fields ──────────
  console.log('\n[5/5] Navigating to Landlord creation form...');

  // Try URL candidates in priority order
  const landlordCandidates = [
    branchId ? `${CLONE_URL}/branches/${branchId}/landlords/new` : null,
    `${CLONE_URL}/landlords/new`,
  ].filter(Boolean);

  // Also check /landlords index for a "New" button
  console.log('      Checking /landlords index...');
  await page.goto(`${CLONE_URL}/landlords`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SS_DIR}/007_inspect_landlords_index.png`, fullPage: true });

  const indexPageText = await page.evaluate(() => document.body.innerText.substring(0, 300));
  console.log('      /landlords page preview:\n' + indexPageText);

  const indexNewLink = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const found = links.find(a =>
      a.href.includes('/landlords/new') ||
      a.innerText.trim().toLowerCase().includes('new landlord') ||
      a.innerText.trim().toLowerCase() === 'new'
    );
    return found ? { text: found.innerText.trim(), href: found.href } : null;
  });

  if (indexNewLink) {
    console.log('      Found new landlord link on index: ' + JSON.stringify(indexNewLink));
    landlordCandidates.unshift(indexNewLink.href);
  }

  let landlordFormUrl = null;
  for (const url of landlordCandidates) {
    console.log('      Trying: ' + url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(500);
    const is404 = await page.evaluate(() =>
      document.body.innerText.includes("doesn't exist") ||
      document.body.innerText.includes('404') ||
      document.body.innerText.includes('No route matches')
    );
    if (!is404) {
      landlordFormUrl = url;
      console.log('      ✓ Form found at: ' + url);
      break;
    }
    console.log('      ✗ Not found: ' + url);
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SS_DIR}/007_inspect_landlord_form.png`, fullPage: true });
  console.log('      Screenshot: 007_inspect_landlord_form.png');

  // Extract all form fields
  const formFields = await page.evaluate(() => {
    const fields = [];

    // Inputs
    document.querySelectorAll('input:not([type="hidden"]):not([type="submit"])').forEach(el => {
      fields.push({
        type: 'input',
        inputType: el.type || 'text',
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        required: el.required,
        label: (() => {
          const lbl = document.querySelector(`label[for="${el.id}"]`);
          return lbl ? lbl.innerText.trim() : null;
        })()
      });
    });

    // Selects
    document.querySelectorAll('select').forEach(el => {
      const options = Array.from(el.options).map(o => ({ value: o.value, text: o.text }));
      fields.push({
        type: 'select',
        name: el.name,
        id: el.id,
        required: el.required,
        options: options,
        label: (() => {
          const lbl = document.querySelector(`label[for="${el.id}"]`);
          return lbl ? lbl.innerText.trim() : null;
        })()
      });
    });

    // Textareas
    document.querySelectorAll('textarea').forEach(el => {
      fields.push({
        type: 'textarea',
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        required: el.required,
        label: (() => {
          const lbl = document.querySelector(`label[for="${el.id}"]`);
          return lbl ? lbl.innerText.trim() : null;
        })()
      });
    });

    return fields;
  });

  console.log('\n      ── Landlord Form Fields ──────────────────────────');
  if (formFields.length === 0) {
    console.log('      WARNING: No form fields found. Check screenshot.');
    const pageContent = await page.evaluate(() => document.body.innerText.substring(0, 1000));
    console.log('\n      Page content:\n' + pageContent);
  } else {
    formFields.forEach((f, i) => {
      if (f.type === 'select') {
        console.log(`\n      [${i+1}] SELECT  name="${f.name}" label="${f.label}"`);
        f.options.slice(0, 10).forEach(o => console.log(`              option: value="${o.value}" text="${o.text}"`));
        if (f.options.length > 10) console.log(`              ... (${f.options.length} total options)`);
      } else {
        console.log(`      [${i+1}] ${f.type.toUpperCase().padEnd(8)} name="${f.name}" label="${f.label}" placeholder="${f.placeholder}" required=${f.required}`);
      }
    });
  }

  // Also get current URL
  console.log('\n      Final URL: ' + page.url());
  console.log('      Branch ID: ' + branchId);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' INSPECTION COMPLETE');
  console.log(' Branch created: ' + BRANCH_NAME + ' (ID: ' + branchId + ')');
  console.log(' Review screenshots and form fields above.');
  console.log(' Next step: Build full Test Run 007 from this data.');
  console.log('═══════════════════════════════════════════════════════');

  await browser.close();
})();
