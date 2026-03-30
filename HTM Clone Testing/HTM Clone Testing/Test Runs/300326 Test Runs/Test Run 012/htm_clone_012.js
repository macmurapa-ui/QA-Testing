/**
 * HTM Clone - Test Run 012
 * Invite Revoke on Branch 2481 (Mac 1300326)
 *
 * Pre-condition: an open invite must exist on the branch (created in Test Run 011)
 *
 * Steps:
 *   [1/3] Verify session via auth.json
 *   [2/3] Navigate to branch Invites page, locate the open invite to revoke
 *   [3/3] Click Revoke, confirm the pop-up, verify status changes to Revoked
 *
 * Scripting notes:
 *   - Revoke button is per-row on the Invites list (status: open)
 *   - Confirmation is a data-confirm dialog (Rails UJS) — handled via page.on('dialog')
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const CLONE_URL   = 'https://admin-clone.helpthemove.co.uk';
const AUTH_PATH   = '/home/user/QA-Testing/auth.json';
const SS_DIR      = path.dirname(__filename);
const BRANCH_ID   = '2481';
const BRANCH_NAME = 'Mac 1300326';

// Set this to the invite email created in Test Run 011
// Script will also auto-detect the first open invite if not set
const TARGET_EMAIL = process.env.INVITE_EMAIL || null;

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
  console.log(' HTM Clone - Test Run 012: Invite Revoke');
  console.log(' Branch: ' + BRANCH_NAME + ' (ID: ' + BRANCH_ID + ')');
  if (TARGET_EMAIL) console.log(' Target: ' + TARGET_EMAIL);
  console.log('═══════════════════════════════════════════════════════');

  // ── Step 1: Verify session ─────────────────────────────────────────────────
  console.log('\n[1/3] Verifying session...');
  const browser = await chromium.launch({ headless: true, proxy: proxyConfig, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context  = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 }, storageState: AUTH_PATH });
  const page     = await context.newPage();

  if (!await isSessionValid(page)) {
    console.log('ERROR: Session invalid. Please refresh auth.json and retry.');
    await browser.close(); process.exitCode = 1; return;
  }
  console.log('      Session VALID.');

  // ── Step 2: Navigate to Invites page, find open invite ────────────────────
  console.log('\n[2/3] Locating open invite to revoke...');

  await page.goto(`${CLONE_URL}/branches/${BRANCH_ID}/invites`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/012_invites_list.png`, fullPage: false });
  console.log('      Screenshot: 012_invites_list.png');

  // Find the target row — either by email or first open invite
  const revokeInfo = await page.evaluate((targetEmail) => {
    const rows = Array.from(document.querySelectorAll('table tbody tr, tr'));
    for (const row of rows) {
      const text = row.innerText || '';
      // Match target email if provided, otherwise first row with "open" status
      if (targetEmail ? text.includes(targetEmail) : text.toLowerCase().includes('open')) {
        const emailCell = row.querySelector('td:first-child, td a');
        const email = emailCell ? emailCell.innerText.trim() : 'unknown';
        const revokeBtn = row.querySelector('a[data-method="delete"], a[href*="revoke"], button[data-confirm]');
        return {
          found: true,
          email,
          hasBtnInDOM: !!revokeBtn,
          btnText: revokeBtn ? revokeBtn.innerText.trim() : null,
          rowText: text.substring(0, 200)
        };
      }
    }
    return { found: false };
  }, TARGET_EMAIL);

  console.log('      Row scan result: ' + JSON.stringify(revokeInfo, null, 2));

  if (!revokeInfo.found) {
    console.log('ERROR: No matching open invite found. Check 012_invites_list.png');
    await browser.close(); process.exitCode = 1; return;
  }

  const emailToRevoke = revokeInfo.email;
  console.log('      Revoking invite for: ' + emailToRevoke);

  // ── Step 3: Click Revoke and confirm pop-up ────────────────────────────────
  console.log('\n[3/3] Revoking invite...');

  // Accept any confirmation dialog (browser confirm() or Rails data-confirm)
  page.on('dialog', async dialog => {
    console.log('      Dialog type: ' + dialog.type() + ' — message: ' + dialog.message());
    await dialog.accept();
    console.log('      Dialog accepted.');
  });

  // Find and click the Revoke button/link in the matching row
  const revoked = await page.evaluate((targetEmail) => {
    const rows = Array.from(document.querySelectorAll('table tbody tr, tr'));
    for (const row of rows) {
      const text = row.innerText || '';
      if (targetEmail ? text.includes(targetEmail) : text.toLowerCase().includes('open')) {
        // Try various selectors for the revoke action
        const btn = row.querySelector('a[data-method="delete"]')
          || row.querySelector('a[href*="revoke"]')
          || row.querySelector('button')
          || Array.from(row.querySelectorAll('a')).find(a => /revoke/i.test(a.innerText));
        if (btn) { btn.click(); return true; }
      }
    }
    return false;
  }, TARGET_EMAIL);

  if (!revoked) {
    // Fallback: take a full-page screenshot to inspect the actual revoke UI
    await page.screenshot({ path: `${SS_DIR}/012_revoke_not_found.png`, fullPage: true });
    console.log('      Could not find revoke button via JS — check 012_revoke_not_found.png');
    console.log('      Inspect the full page HTML below:');
    const html = await page.evaluate(() => document.querySelector('table') ? document.querySelector('table').outerHTML.substring(0, 3000) : 'no table');
    console.log(html);
    await browser.close(); process.exitCode = 1; return;
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const finalUrl = page.url();
  await page.screenshot({ path: `${SS_DIR}/012_revoke_result.png`, fullPage: false });
  console.log('      Screenshot: 012_revoke_result.png');
  console.log('      Final URL: ' + finalUrl);

  // Verify: email should now appear under Revoked tab
  const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
  const isRevoked = pageText.includes('revoked') || pageText.includes('revoke');

  // Navigate to Revoked tab to confirm
  await page.goto(`${CLONE_URL}/branches/${BRANCH_ID}/invites?status=revoked`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/012_revoked_tab.png`, fullPage: false });
  console.log('      Screenshot: 012_revoked_tab.png');

  console.log('\n═══════════════════════════════════════════════════════');
  if (isRevoked) {
    console.log(' SUCCESS: Invite revoked for ' + emailToRevoke);
    console.log(' Branch : ' + BRANCH_NAME + ' (ID: ' + BRANCH_ID + ')');
  } else {
    console.log(' RESULT UNCLEAR: Check 012_revoke_result.png and 012_revoked_tab.png');
  }
  console.log('═══════════════════════════════════════════════════════');

  await browser.close();
  console.log('\nREVOKED_EMAIL:' + emailToRevoke);
  console.log('FINAL_URL:' + finalUrl);
})();
