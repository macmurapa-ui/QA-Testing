/**
 * HTM Clone - Test Run 021
 * Property Creation in Dashboard — TENANTED
 *
 * Steps:
 *   [1/6] Verify session via auth.json
 *   [2/6] Find today's last Mac N[DDMMYY] branch and impersonate it
 *   [3/6] Navigate to dashboard Landlords page, find last created landlord
 *   [4/6] Click Add Property
 *   [5/6] Fill form: postcode M1 1AE → lookup → select Apartment 2 → status: Tenanted
 *   [6/6] Submit and verify successful creation
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const CLONE_URL     = 'https://admin-clone.helpthemove.co.uk';
const DASHBOARD_URL = 'https://dashboard-clone.helpthemove.co.uk';
const AUTH_PATH     = '/home/user/QA-Testing/auth.json';
const SS_DIR        = path.dirname(__filename);

const TEST_POSTCODE = 'M1 1AE';
const TEST_ADDRESS  = 'Apartment 2, 113 Newton Street, Manchester, M1 1AE';
const STATUS        = 'tenanted';

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
  console.log(' HTM Clone - Test Run 021: Property Creation (Tenanted)');
  console.log(' Address: ' + TEST_ADDRESS);
  console.log(' Status : Tenanted');
  console.log('═══════════════════════════════════════════════════════');

  // ── Step 1: Verify session ─────────────────────────────────────────────────
  console.log('\n[1/6] Verifying session...');
  const browser = await chromium.launch({ headless: true, proxy: proxyConfig, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context  = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 }, storageState: AUTH_PATH });
  const page     = await context.newPage();

  if (!await isSessionValid(page)) {
    console.log('ERROR: Session invalid.'); await browser.close(); process.exitCode = 1; return;
  }
  console.log('      Session VALID.');

  // ── Step 2: Find today's last branch and impersonate ──────────────────────
  console.log('\n[2/6] Finding today\'s last branch and impersonating...');
  const suffix = dateSuffix();
  await page.goto(`${CLONE_URL}/branches?q=${encodeURIComponent(suffix)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(600);

  const branches = await page.evaluate((sfx) => {
    const pattern = new RegExp('^Mac \\d+' + sfx + '$');
    return Array.from(document.querySelectorAll('a[href*="/branches/"]'))
      .filter(a => pattern.test(a.innerText.trim()))
      .map(a => ({ name: a.innerText.trim(), href: a.href }));
  }, suffix);

  if (!branches.length) {
    console.log('ERROR: No branches found for today (' + suffix + '). Run Branch Creation first.');
    await browser.close(); process.exitCode = 1; return;
  }

  const lastBranch = branches[branches.length - 1];
  const branchId   = (lastBranch.href.match(/\/branches\/(\d+)/) || [])[1];
  console.log('      Branch: ' + lastBranch.name + ' (ID: ' + branchId + ')');

  await page.goto(`${CLONE_URL}/branches/${branchId}/impersonation`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  if (!page.url().includes('dashboard-clone')) {
    console.log('ERROR: Impersonation failed.'); await browser.close(); process.exitCode = 1; return;
  }
  console.log('      Impersonating on: ' + page.url());

  const acceptBtn = await page.$('button[type="submit"]:has-text("Accept"), button:has-text("Accept")');
  if (acceptBtn) { await acceptBtn.click(); await page.waitForTimeout(500); console.log('      Cookie consent dismissed.'); }

  await page.screenshot({ path: `${SS_DIR}/021_dashboard.png`, fullPage: false });

  // ── Step 3: Find last created landlord ────────────────────────────────────
  console.log('\n[3/6] Finding last created landlord...');
  await page.goto(`${DASHBOARD_URL}/landlords`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/021_landlords.png`, fullPage: false });

  const landlords = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="/landlords/"]'))
      .filter(a => /\/landlords\/\d+$/.test(a.href))
      .map(a => ({ href: a.href }));
  });

  const lastLandlord = landlords.sort((a, b) => {
    const idA = parseInt(a.href.match(/\/landlords\/(\d+)/)[1]);
    const idB = parseInt(b.href.match(/\/landlords\/(\d+)/)[1]);
    return idB - idA;
  })[0];

  if (!lastLandlord) {
    console.log('ERROR: No landlord found.'); await browser.close(); process.exitCode = 1; return;
  }

  const landlordId = lastLandlord.href.match(/\/landlords\/(\d+)/)[1];
  console.log('      Landlord ID: ' + landlordId);

  // ── Step 4: Click Add Property ─────────────────────────────────────────────
  console.log('\n[4/6] Navigating to Add Property form...');
  await page.goto(`${DASHBOARD_URL}/landlords/${landlordId}/properties`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/021_landlord_page.png`, fullPage: false });

  const addPropBtn = await page.$('a:has-text("Add Property"), button:has-text("Add Property")');
  if (!addPropBtn) {
    console.log('ERROR: Add Property button not found.'); await browser.close(); process.exitCode = 1; return;
  }
  await addPropBtn.click();
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/021_property_form.png`, fullPage: false });
  console.log('      Form URL: ' + page.url());

  // ── Step 5: Fill the form ──────────────────────────────────────────────────
  console.log('\n[5/6] Filling property form...');

  // Postcode
  await page.locator('input[name="property[address_attributes][post_code]"]').fill(TEST_POSTCODE);
  console.log('      Postcode: ' + TEST_POSTCODE);

  // Click lookup
  const lookupBtn = await page.$('button:has-text("Look up"), input[value*="Look"], a:has-text("Look up"), button:has-text("Lookup"), button:has-text("Look Up")');
  if (!lookupBtn) {
    console.log('ERROR: Lookup button not found.'); await browser.close(); process.exitCode = 1; return;
  }
  await lookupBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SS_DIR}/021_postcode_results.png`, fullPage: false });

  // Confirm options populated
  const optionCount = await page.locator('#address-options option').count();
  console.log('      Address options found: ' + optionCount);
  if (optionCount === 0) {
    console.log('ERROR: No address options returned from lookup.'); await browser.close(); process.exitCode = 1; return;
  }

  // Select Apartment 2
  await page.locator('#address-options').selectOption({ label: TEST_ADDRESS });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/021_address_selected.png`, fullPage: false });
  console.log('      Address selected: ' + TEST_ADDRESS);

  // Verify address fields populated
  const addr1 = await page.locator('input[name="property[address_attributes][address_1]"]').inputValue();
  const town  = await page.locator('input[name="property[address_attributes][town]"]').inputValue();
  console.log('      Address Line 1: ' + addr1);
  console.log('      Town: ' + town);

  // Status: Tenanted — radio is visually hidden by fancy-radio CSS; use JS click
  await page.evaluate(() => {
    const el = document.querySelector('#property_create_status_tenanted');
    if (el) el.click();
  });
  console.log('      Status: Tenanted');

  // Landlord reference: leave blank
  console.log('      Landlord reference: blank (default)');

  await page.screenshot({ path: `${SS_DIR}/021_form_filled.png`, fullPage: true });

  // ── Step 6: Submit ─────────────────────────────────────────────────────────
  console.log('\n[6/6] Submitting...');
  await page.locator('input[type="submit"][name="commit"]').click();
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const finalUrl = page.url();
  await page.screenshot({ path: `${SS_DIR}/021_result.png`, fullPage: false });
  console.log('      Final URL: ' + finalUrl);

  const isSuccess = !finalUrl.includes('/new');

  console.log('\n═══════════════════════════════════════════════════════');
  if (isSuccess) {
    console.log(' SUCCESS: Tenanted property created in Dashboard!');
    console.log(' Address : ' + TEST_ADDRESS);
    console.log(' Status  : Tenanted');
    console.log(' Landlord: ' + landlordId);
    console.log(' Branch  : ' + lastBranch.name + ' (ID: ' + branchId + ')');
    console.log(' URL     : ' + finalUrl);
  } else {
    console.log(' FAILED: Still on /new — check 021_result.png for errors.');
    process.exitCode = 1;
  }
  console.log('═══════════════════════════════════════════════════════');

  await browser.close();
  console.log('\nFINAL_URL:' + finalUrl);
  console.log('LANDLORD_ID:' + landlordId);
})();
