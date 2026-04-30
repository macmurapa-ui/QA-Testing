/**
 * HTM Clone - Test Run 010
 * Existing User Check + Invite Creation on Branch 2481 (Mac 1300326)
 *
 * Steps:
 *   [1/3] Verify session via auth.json
 *   [2/3] Existing User Check — Users > All, search for mac.murapa[N][DDMMYY]@helpthemove.co.uk
 *         Increment N until an unused email is found
 *   [3/3] Create invite on Branch 2481 via Other > Invites > New invite
 *
 * Invite email convention: mac.murapa[N][DDMMYY]@helpthemove.co.uk
 *   N = sequential count; determined by Existing User Check
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const CLONE_URL  = 'https://admin-clone.helpthemove.co.uk';
const AUTH_PATH  = '/home/user/QA-Testing/auth.json';
const SS_DIR     = path.dirname(__filename);
const BRANCH_ID  = '2481';
const BRANCH_NAME = 'Mac 1300326';

// ── Date suffix helper: DDMMYY ─────────────────────────────────────────────────
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
  const url = page.url();
  return !url.includes('/login') && !url.includes('accounts.google.com');
}

// ── Main ───────────────────────────────────────────────────────────────────────

(async () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' HTM Clone - Test Run 010: Existing User Check + Invite');
  console.log(' Branch: ' + BRANCH_NAME + ' (ID: ' + BRANCH_ID + ')');
  console.log('═══════════════════════════════════════════════════════');

  // ── Step 1: Verify session ─────────────────────────────────────────────────
  console.log('\n[1/3] Verifying session...');
  const browser = await chromium.launch({ headless: true, proxy: proxyConfig, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context  = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 }, storageState: AUTH_PATH });
  const page     = await context.newPage();

  const sessionOk = await isSessionValid(page);
  if (!sessionOk) {
    console.log('ERROR: Session invalid. Please refresh auth.json and retry.');
    await browser.close(); process.exitCode = 1; return;
  }
  console.log('      Session VALID.');

  // ── Step 2: Existing User Check ────────────────────────────────────────────
  // Navigate to Users > All and search for mac.murapa[N][DDMMYY]@helpthemove.co.uk
  // Increment N until an unused email is found.
  console.log('\n[2/3] Existing User Check...');
  const suffix = dateSuffix();
  let n = 1;
  let inviteEmail = null;

  while (true) {
    const candidate = `mac.murapa${n}${suffix}@helpthemove.co.uk`;
    console.log(`      Checking: ${candidate}`);

    await page.goto(`${CLONE_URL}/users?q=${encodeURIComponent(candidate)}`, {
      waitUntil: 'domcontentloaded', timeout: 30000
    });
    await page.waitForTimeout(600);

    if (n === 1) {
      await page.screenshot({ path: `${SS_DIR}/010_user_check_n${n}.png`, fullPage: false });
      console.log(`      Screenshot: 010_user_check_n${n}.png`);
    }

    const found = await page.evaluate((email) => {
      return document.body.innerText.includes(email);
    }, candidate);

    if (found) {
      console.log(`      FOUND — ${candidate} already exists. Incrementing N.`);
      n++;
    } else {
      console.log(`      NOT FOUND — ${candidate} is available.`);
      inviteEmail = candidate;
      await page.screenshot({ path: `${SS_DIR}/010_user_check_available.png`, fullPage: false });
      console.log(`      Screenshot: 010_user_check_available.png`);
      break;
    }

    if (n > 20) {
      console.log('ERROR: Could not find available invite email after 20 attempts.');
      await browser.close(); process.exitCode = 1; return;
    }
  }

  console.log(`      Invite email confirmed: ${inviteEmail}`);

  // ── Step 3: Create invite ──────────────────────────────────────────────────
  console.log('\n[3/3] Creating invite on branch ' + BRANCH_ID + '...');

  // Navigate directly to branch invites page
  await page.goto(`${CLONE_URL}/branches/${BRANCH_ID}/invites`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/010_invites_page.png`, fullPage: false });
  console.log('      Invites page: ' + page.url());
  console.log('      Screenshot: 010_invites_page.png');

  await page.click('text=New invite');
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/010_new_invite_form.png`, fullPage: false });
  console.log('      New invite form: ' + page.url());
  console.log('      Screenshot: 010_new_invite_form.png');

  // Fill email
  const emailInput = await page.$('input[name*="email"], input[type="email"]');
  if (!emailInput) {
    await page.screenshot({ path: `${SS_DIR}/010_invite_no_email_field.png`, fullPage: true });
    console.log('ERROR: Email input not found. Check 010_invite_no_email_field.png');
    await browser.close(); process.exitCode = 1; return;
  }

  await emailInput.fill(inviteEmail);
  console.log('      Email entered: ' + inviteEmail);

  await page.screenshot({ path: `${SS_DIR}/010_invite_form_filled.png`, fullPage: false });
  console.log('      Screenshot: 010_invite_form_filled.png');

  // Scroll to and click the Send Invite button (may be below fold)
  await page.evaluate(() => {
    const btn = document.getElementById('confirm_send_invite_btn')
      || document.querySelector('button[type="submit"]')
      || document.querySelector('input[type="submit"]');
    if (btn) btn.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SS_DIR}/010_invite_form_scrolled.png`, fullPage: false });
  console.log('      Screenshot: 010_invite_form_scrolled.png');

  await page.evaluate(() => {
    const btn = document.getElementById('confirm_send_invite_btn')
      || document.querySelector('button[type="submit"]')
      || document.querySelector('input[type="submit"]');
    if (btn) btn.click();
  });
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(1500);

  // Wait for redirect to settle then re-check URL
  await page.waitForTimeout(2000);
  const finalUrl = page.url();
  await page.screenshot({ path: `${SS_DIR}/010_invite_result.png`, fullPage: false });
  console.log('      Screenshot: 010_invite_result.png');
  console.log('      Final URL: ' + finalUrl);

  // Success: redirected away from /new, OR invite email appears in page content
  const pageText = await page.evaluate(() => document.body.innerText);
  const isSuccess = !finalUrl.includes('/new') || pageText.includes(inviteEmail);

  console.log('\n═══════════════════════════════════════════════════════');
  if (isSuccess) {
    console.log(' SUCCESS: Invite created for ' + inviteEmail);
    console.log(' Branch : ' + BRANCH_NAME + ' (ID: ' + BRANCH_ID + ')');
    console.log(' URL    : ' + finalUrl);
  } else {
    console.log(' FAILED: Invite not confirmed — check 010_invite_result.png for errors.');
    process.exitCode = 1;
  }
  console.log('═══════════════════════════════════════════════════════');

  await browser.close();
  console.log('\nINVITE_EMAIL:' + inviteEmail);
  console.log('FINAL_URL:' + finalUrl);
})();
