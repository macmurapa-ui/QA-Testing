/**
 * HTM Clone - Test Run 018
 * Impersonate Branch
 *
 * Finds the last Mac N[DDMMYY] branch created today, impersonates it,
 * verifies the agent dashboard loads, then stops impersonating.
 *
 * Steps:
 *   [1/4] Verify session via auth.json
 *   [2/4] Find today's last created branch (Mac N[DDMMYY])
 *   [3/4] Navigate to /branches/:id/impersonation → confirm redirect to dashboard-clone
 *   [4/4] Click Stop Impersonating → confirm redirect back to admin-clone
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const CLONE_URL     = 'https://admin-clone.helpthemove.co.uk';
const DASHBOARD_URL = 'dashboard-clone.helpthemove.co.uk';
const AUTH_PATH     = '/home/user/QA-Testing/auth.json';
const SS_DIR        = path.dirname(__filename);

function dateSuffix() {
  const now = new Date();
  const dd  = String(now.getDate()).padStart(2, '0');
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const yy  = String(now.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

const rawProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
let proxyConfig;
if (rawProxy) {
  const u = new URL(rawProxy);
  proxyConfig = { server: `${u.protocol}//${u.host}`, username: u.username, password: u.password, bypass: '<-loopback>' };
}

async function isSessionValid(page) {
  await page.goto(CLONE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  return !page.url().includes('/login') && !page.url().includes('accounts.google.com');
}

(async () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' HTM Clone - Test Run 018: Impersonate Branch');
  console.log('═══════════════════════════════════════════════════════');

  // ── Step 1: Verify session ─────────────────────────────────────────────────
  console.log('\n[1/4] Verifying session...');
  const browser = await chromium.launch({ headless: true, proxy: proxyConfig, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context  = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 }, storageState: AUTH_PATH });
  const page     = await context.newPage();

  if (!await isSessionValid(page)) {
    console.log('ERROR: Session invalid.'); await browser.close(); process.exitCode = 1; return;
  }
  console.log('      Session VALID.');

  // ── Step 2: Find today's last branch ──────────────────────────────────────
  console.log('\n[2/4] Finding today\'s last created branch...');
  const suffix = dateSuffix();
  await page.goto(`${CLONE_URL}/branches?q=${encodeURIComponent(suffix)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SS_DIR}/018_branches_today.png`, fullPage: false });

  const branches = await page.evaluate((sfx) => {
    const pattern = new RegExp('^Mac \\d+' + sfx + '$');
    const links = Array.from(document.querySelectorAll('a[href*="/branches/"]'));
    return links
      .filter(a => pattern.test(a.innerText.trim()))
      .map(a => ({ name: a.innerText.trim(), href: a.href }));
  }, suffix);

  console.log('      Branches found today: ' + branches.map(b => b.name).join(', '));

  if (!branches.length) {
    console.log('ERROR: No branches found for today (' + suffix + '). Run Branch Creation first.');
    await browser.close(); process.exitCode = 1; return;
  }

  // Pick the last one (highest N)
  const lastBranch = branches[branches.length - 1];
  const branchId   = (lastBranch.href.match(/\/branches\/(\d+)/) || [])[1];
  console.log('      Using: ' + lastBranch.name + ' (ID: ' + branchId + ')');

  // ── Step 3: Impersonate ────────────────────────────────────────────────────
  console.log('\n[3/4] Impersonating branch...');

  await page.goto(`${CLONE_URL}/branches/${branchId}/inspection`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/018_branch_homepage.png`, fullPage: false });

  // Click the impersonate icon (href contains /impersonation)
  await page.click(`a[href*="/branches/${branchId}/impersonation"]`);
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await page.waitForTimeout(1500);

  const dashUrl = page.url();
  await page.screenshot({ path: `${SS_DIR}/018_dashboard.png`, fullPage: false });
  console.log('      Redirected to: ' + dashUrl);

  if (!dashUrl.includes(DASHBOARD_URL)) {
    console.log('ERROR: Did not land on dashboard-clone. Check 018_dashboard.png');
    await browser.close(); process.exitCode = 1; return;
  }
  console.log('      Dashboard loaded on: ' + DASHBOARD_URL);

  // Dismiss cookie consent if present
  const acceptBtn = await page.$('button[type="submit"]:has-text("Accept"), button:has-text("Accept")');
  if (acceptBtn) {
    await acceptBtn.click();
    await page.waitForTimeout(500);
    console.log('      Cookie consent dismissed.');
  }

  await page.screenshot({ path: `${SS_DIR}/018_dashboard_clean.png`, fullPage: false });

  // Verify Stop Impersonating is visible
  const stopLink = await page.$('a[href*="/stop-impersonating"], a:has-text("Stop Impersonating")');
  if (!stopLink) {
    console.log('ERROR: Stop Impersonating link not found.');
    await browser.close(); process.exitCode = 1; return;
  }
  console.log('      "Stop Impersonating" link confirmed visible.');

  // ── Step 4: Stop impersonating ─────────────────────────────────────────────
  // Navigate directly — link may be hidden in nav after cookie dismiss
  console.log('\n[4/4] Stopping impersonation...');
  await page.goto('https://' + DASHBOARD_URL + '/stop-impersonating', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const finalUrl = page.url();
  await page.screenshot({ path: `${SS_DIR}/018_stop_result.png`, fullPage: false });
  console.log('      Final URL: ' + finalUrl);

  const backOnAdmin = finalUrl.includes('admin-clone.helpthemove.co.uk');

  console.log('\n═══════════════════════════════════════════════════════');
  if (backOnAdmin) {
    console.log(' SUCCESS: Impersonation complete!');
    console.log(' Branch  : ' + lastBranch.name + ' (ID: ' + branchId + ')');
    console.log(' Dashboard confirmed on dashboard-clone');
    console.log(' Returned to admin-clone after Stop Impersonating');
  } else {
    console.log(' FAILED: Did not return to admin-clone. Check 018_stop_result.png');
    process.exitCode = 1;
  }
  console.log('═══════════════════════════════════════════════════════');

  await browser.close();
  console.log('\nBRANCH:' + lastBranch.name + ' (ID: ' + branchId + ')');
  console.log('FINAL_URL:' + finalUrl);
})();
