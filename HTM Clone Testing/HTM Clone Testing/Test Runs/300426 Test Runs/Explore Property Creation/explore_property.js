/**
 * Exploratory: Property Creation in Dashboard
 * - Impersonate today's last branch
 * - Navigate to Landlords, click last created landlord
 * - Click Add Property, enter postcode, look up, inspect form
 * - DO NOT submit — exploration only
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const CLONE_URL     = 'https://admin-clone.helpthemove.co.uk';
const DASHBOARD_URL = 'https://dashboard-clone.helpthemove.co.uk';
const AUTH_PATH     = '/home/user/QA-Testing/auth.json';
const SS_DIR        = path.dirname(__filename);

function dateSuffix() {
  const now = new Date();
  const dd  = String(now.getDate()).padStart(2, '0');
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const yy  = String(now.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context  = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 }, storageState: AUTH_PATH });
  const page     = await context.newPage();

  // ── Find today's last branch and impersonate ───────────────────────────────
  const suffix = dateSuffix();
  await page.goto(`${CLONE_URL}/branches?q=${encodeURIComponent(suffix)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(600);

  const branches = await page.evaluate((sfx) => {
    const pattern = new RegExp('^Mac \\d+' + sfx + '$');
    return Array.from(document.querySelectorAll('a[href*="/branches/"]'))
      .filter(a => pattern.test(a.innerText.trim()))
      .map(a => ({ name: a.innerText.trim(), href: a.href }));
  }, suffix);

  const lastBranch = branches[branches.length - 1];
  const branchId   = (lastBranch.href.match(/\/branches\/(\d+)/) || [])[1];
  console.log('Branch: ' + lastBranch.name + ' (ID: ' + branchId + ')');

  await page.goto(`${CLONE_URL}/branches/${branchId}/impersonation`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const acceptBtn = await page.$('button[type="submit"]:has-text("Accept"), button:has-text("Accept")');
  if (acceptBtn) { await acceptBtn.click(); await page.waitForTimeout(500); }
  console.log('Impersonating: ' + page.url());
  await page.screenshot({ path: `${SS_DIR}/explore_01_dashboard.png`, fullPage: false });

  // ── Navigate to Landlords page ─────────────────────────────────────────────
  await page.goto(`${DASHBOARD_URL}/landlords`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/explore_02_landlords.png`, fullPage: false });
  console.log('Landlords page: ' + page.url());

  // Capture landlord list to find last created
  const landlords = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="/landlords/"]'))
      .filter(a => /\/landlords\/\d+/.test(a.href))
      .map(a => ({ text: a.innerText.trim(), href: a.href }));
  });
  console.log('\nLandlords found: ' + JSON.stringify(landlords, null, 2));

  // ── Click the last created landlord ───────────────────────────────────────
  // Last created = highest ID in the list
  const landlordLinks = landlords.filter(l => /\/landlords\/\d+$/.test(l.href));
  const lastLandlord  = landlordLinks.sort((a, b) => {
    const idA = parseInt(a.href.match(/\/landlords\/(\d+)/)[1]);
    const idB = parseInt(b.href.match(/\/landlords\/(\d+)/)[1]);
    return idB - idA;
  })[0];

  console.log('\nLast landlord: ' + JSON.stringify(lastLandlord));
  if (!lastLandlord) {
    console.log('ERROR: No landlord found.'); await browser.close(); return;
  }

  await page.goto(lastLandlord.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SS_DIR}/explore_03_landlord_page.png`, fullPage: false });
  console.log('Landlord page: ' + page.url());

  // ── Click Add Property ─────────────────────────────────────────────────────
  await page.screenshot({ path: `${SS_DIR}/explore_04_landlord_full.png`, fullPage: true });

  // Find Add Property button
  const addPropBtn = await page.$('a:has-text("Add Property"), button:has-text("Add Property")');
  console.log('\nAdd Property button found: ' + !!addPropBtn);

  if (addPropBtn) {
    await addPropBtn.click();
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SS_DIR}/explore_05_add_property_form.png`, fullPage: false });
    console.log('Add Property form: ' + page.url());

    // Capture all form fields
    const fields = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, select, textarea'))
        .map(el => ({ tag: el.tagName, type: el.type, name: el.name, id: el.id, placeholder: el.placeholder, value: el.value }));
    });
    console.log('\nForm fields: ' + JSON.stringify(fields, null, 2));

    // Full form screenshot
    await page.screenshot({ path: `${SS_DIR}/explore_06_form_full.png`, fullPage: true });

    // ── Test postcode lookup ─────────────────────────────────────────────────
    const postcodeInput = await page.$('input[name*="post_code"], input[placeholder*="ostcode" i], input[id*="post_code"]');
    if (postcodeInput) {
      await postcodeInput.fill('M1 1AE');
      console.log('\nPostcode entered: M1 1AE');

      // Find lookup button
      const lookupBtn = await page.$('button:has-text("Look up"), input[value*="Look"], a:has-text("Look up"), button:has-text("Lookup")');
      console.log('Lookup button found: ' + !!lookupBtn);
      if (lookupBtn) {
        await lookupBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SS_DIR}/explore_07_postcode_results.png`, fullPage: false });
        console.log('Post lookup screenshot taken');

        // Capture dropdown/list of addresses — target #address-options specifically
        const addresses = await page.evaluate(() => {
          const opts = Array.from(document.querySelectorAll('#address-options option'))
            .map(el => ({ value: el.value, text: el.innerText.trim() }))
            .filter(o => o.text.length > 0);
          return opts;
        });
        console.log('\nAddress options in #address-options: ' + JSON.stringify(addresses, null, 2));

        // Also capture any other visible address result elements
        const otherResults = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('.address-result, [class*="address"], [id*="address"]'))
            .map(el => ({ id: el.id, className: el.className, text: el.innerText.trim().slice(0, 100) }))
            .filter(o => o.text.length > 0);
        });
        console.log('\nOther address elements: ' + JSON.stringify(otherResults.slice(0, 10), null, 2));

        // Full page after lookup
        await page.screenshot({ path: `${SS_DIR}/explore_08_post_lookup_full.png`, fullPage: true });
      }
    }
  }

  await browser.close();
  console.log('\nExploration complete — no property created.');
})();
