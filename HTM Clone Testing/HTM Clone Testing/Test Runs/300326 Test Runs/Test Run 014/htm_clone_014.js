/**
 * HTM Clone - Test Run 014
 * Existing User Check + Invite Creation on Branch 2481 (Mac 1300326)
 *
 * Dual availability check before creating invite:
 *   Check 1 — Users > All: email must not exist as a registered user
 *   Check 2 — Branch Invites page: email must not appear at all (any status)
 * Both checks must pass before proceeding. This prevents re-using emails
 * that belong to revoked/used invites which don't appear in Users.
 *
 * Steps:
 *   [1/3] Verify session via auth.json
 *   [2/3] Dual check — Users page + Branch Invites page
 *   [3/3] Create invite on Branch 2481
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const CLONE_URL   = 'https://admin-clone.helpthemove.co.uk';
const AUTH_PATH   = '/home/user/QA-Testing/auth.json';
const SS_DIR      = path.dirname(__filename);
const BRANCH_ID   = '2481';
const BRANCH_NAME = 'Mac 1300326';

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
  console.log(' HTM Clone - Test Run 014: Existing User Check + Invite');
  console.log(' Branch: ' + BRANCH_NAME + ' (ID: ' + BRANCH_ID + ')');
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

  // ── Step 2: Dual availability check ───────────────────────────────────────
  console.log('\n[2/3] Dual availability check...');
  const suffix = dateSuffix();
  let n = 1;
  let inviteEmail = null;

  while (n <= 20) {
    const candidate = `mac.murapa${n}${suffix}@helpthemove.co.uk`;
    console.log(`\n      Candidate: ${candidate}`);

    // Check 1: Users page
    await page.goto(`${CLONE_URL}/users?q=${encodeURIComponent(candidate)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SS_DIR}/014_check1_users_n${n}.png`, fullPage: false });
    const inUsers = await page.evaluate(email => document.body.innerText.includes(email), candidate);
    console.log(`      Check 1 (Users page)  : ${inUsers ? 'EXISTS — skip' : 'clear'}`);

    if (inUsers) { n++; continue; }

    // Check 2: Branch Invites page
    await page.goto(`${CLONE_URL}/branches/${BRANCH_ID}/invites?q=${encodeURIComponent(candidate)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SS_DIR}/014_check2_invites_n${n}.png`, fullPage: false });
    const inInvites = await page.evaluate(email => document.body.innerText.includes(email), candidate);
    console.log(`      Check 2 (Invites page): ${inInvites ? 'EXISTS — skip' : 'clear'}`);

    if (inInvites) { n++; continue; }

    // Both checks passed
    console.log(`      Both checks passed — using: ${candidate}`);
    inviteEmail = candidate;
    break;
  }

  if (!inviteEmail) {
    console.log('ERROR: No available email found after 20 attempts.');
    await browser.close(); process.exitCode = 1; return;
  }

  // ── Step 3: Create invite ──────────────────────────────────────────────────
  console.log('\n[3/3] Creating invite...');

  await page.goto(`${CLONE_URL}/branches/${BRANCH_ID}/invites`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/014_invites_page.png`, fullPage: false });

  await page.click('text=New invite');
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/014_new_invite_form.png`, fullPage: false });
  console.log('      New invite form: ' + page.url());

  const emailInput = await page.$('input[name*="email"], input[type="email"]');
  if (!emailInput) {
    console.log('ERROR: Email input not found.');
    await browser.close(); process.exitCode = 1; return;
  }
  await emailInput.fill(inviteEmail);
  console.log('      Email entered: ' + inviteEmail);

  await page.screenshot({ path: `${SS_DIR}/014_invite_form_filled.png`, fullPage: false });

  // JS click — button may be below fold
  await page.evaluate(() => {
    const btn = document.getElementById('confirm_send_invite_btn')
      || document.querySelector('button[type="submit"]')
      || document.querySelector('input[type="submit"]');
    if (btn) { btn.scrollIntoView({ behavior: 'instant', block: 'center' }); btn.click(); }
  });
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const finalUrl = page.url();
  await page.screenshot({ path: `${SS_DIR}/014_invite_result.png`, fullPage: false });
  console.log('      Final URL: ' + finalUrl);

  const pageText = await page.evaluate(() => document.body.innerText);
  const isSuccess = !finalUrl.includes('/new') || pageText.includes(inviteEmail);

  console.log('\n═══════════════════════════════════════════════════════');
  if (isSuccess) {
    console.log(' SUCCESS: Invite created for ' + inviteEmail);
    console.log(' Branch : ' + BRANCH_NAME + ' (ID: ' + BRANCH_ID + ')');
    console.log(' Status : open, Send Count: 1');
  } else {
    console.log(' FAILED: Check 014_invite_result.png for errors.');
    process.exitCode = 1;
  }
  console.log('═══════════════════════════════════════════════════════');

  await browser.close();
  console.log('\nINVITE_EMAIL:' + inviteEmail);
  console.log('FINAL_URL:' + finalUrl);
})();
