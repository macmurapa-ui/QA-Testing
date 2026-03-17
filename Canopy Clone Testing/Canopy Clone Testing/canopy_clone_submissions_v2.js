/**
 * Canopy Clone - Clone Submissions Report v2
 * Lists all clone submissions with submitted_at for yesterday (2026-03-16)
 * Uses saved canopy_auth.json session.
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const CANOPY_URL = 'https://admin-canopy-clone.helpthemove.co.uk';
const YESTERDAY = '2026-03-16';
const YESTERDAY_DISPLAY = ['16/03/2026', '16 Mar 2026', 'Mar 16', '2026-03-16', '16-03-2026'];
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

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 900 },
    storageState: CANOPY_AUTH_PATH
  });

  const page = await context.newPage();

  // ── Step 1: Navigate to /clones ───────────────────────────────────────────
  console.log('\n[1] Navigating to /clones...');
  await page.goto(`${CANOPY_URL}/clones`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  let landedUrl = page.url();
  console.log('    URL: ' + landedUrl);

  if (landedUrl.includes('/login') || landedUrl.includes('accounts.google.com')) {
    console.log('ERROR: Session expired. Please delete canopy_auth.json and retry.');
    await browser.close();
    process.exitCode = 1;
    return;
  }

  await page.screenshot({ path: `${SCREENSHOT_DIR}/canopy_clones_page.png`, fullPage: true });
  console.log('    Screenshot: canopy_clones_page.png');

  // ── Step 2: Inspect page structure ────────────────────────────────────────
  console.log('\n[2] Inspecting page structure...');

  const pageTitle = await page.title();
  console.log('    Title: ' + pageTitle);

  // Get all links and filters on the page
  const pageInfo = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.innerText.trim(),
      href: a.href
    })).filter(l => l.text && l.href);

    const forms = Array.from(document.querySelectorAll('form')).map(f => ({
      action: f.action,
      method: f.method,
      inputs: Array.from(f.querySelectorAll('input, select')).map(i => ({
        name: i.name,
        type: i.type,
        value: i.value
      }))
    }));

    const tableHeaders = Array.from(document.querySelectorAll('table th, thead th')).map(h => h.innerText.trim());
    const tableRowCount = document.querySelectorAll('table tbody tr').length;

    return { links: links.slice(0, 30), forms, tableHeaders, tableRowCount };
  });

  console.log('    Table headers: ' + pageInfo.tableHeaders.join(' | '));
  console.log('    Table rows: ' + pageInfo.tableRowCount);
  if (pageInfo.forms.length > 0) {
    console.log('    Forms found: ' + pageInfo.forms.length);
    pageInfo.forms.forEach((f, i) => {
      console.log(`      Form ${i+1}: action=${f.action}, inputs=${f.inputs.map(i=>i.name).join(',')}`);
    });
  }

  // ── Step 3: Try to filter by yesterday's date ─────────────────────────────
  console.log('\n[3] Attempting to filter by date ' + YESTERDAY + '...');

  // Try common Ransack/Rails date filter patterns
  const dateFilterUrls = [
    `${CANOPY_URL}/clones?q[submitted_at_gteq]=${YESTERDAY}&q[submitted_at_lteq]=${YESTERDAY}`,
    `${CANOPY_URL}/clones?q[created_at_gteq]=${YESTERDAY}&q[created_at_lteq]=${YESTERDAY}`,
    `${CANOPY_URL}/clones?submitted_at=${YESTERDAY}`,
    `${CANOPY_URL}/clones?date=${YESTERDAY}`,
    `${CANOPY_URL}/clones?q[submitted_at_cont]=${YESTERDAY}`,
  ];

  let filteredData = [];
  let successUrl = '';

  for (const filterUrl of dateFilterUrls) {
    await page.goto(filterUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const currentUrl = page.url();

    if (currentUrl.includes('404') || !(await page.title()).includes('Helpthemove')) continue;

    const rowCount = await page.evaluate(() =>
      document.querySelectorAll('table tbody tr').length
    );

    console.log(`    ${filterUrl.split(CANOPY_URL)[1]} → ${rowCount} rows`);

    if (rowCount > 0) {
      successUrl = currentUrl;
      break;
    }
  }

  // ── Step 4: Get all submissions and filter by date ─────────────────────────
  console.log('\n[4] Fetching all clones and filtering by date...');

  // Go back to the main /clones page and get all data
  await page.goto(`${CANOPY_URL}/clones`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Check for pagination and get all pages
  let allSubmissions = [];
  let pageNum = 1;
  let hasNextPage = true;

  while (hasNextPage && pageNum <= 20) {
    const pageData = await page.evaluate((yesterday, yesterdayDisplays) => {
      const headers = Array.from(document.querySelectorAll('table thead th, table th')).map(h => h.innerText.trim());
      const rows = Array.from(document.querySelectorAll('table tbody tr'));

      const allRows = rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        const rowObj = {};
        cells.forEach((cell, i) => {
          rowObj[`col_${i}`] = cell.innerText.trim();
          if (headers[i]) rowObj[headers[i]] = cell.innerText.trim();
        });
        rowObj._raw = cells.map(c => c.innerText.trim()).join(' | ');
        return rowObj;
      });

      // Filter rows containing yesterday's date in any format
      const filtered = allRows.filter(row => {
        const rowStr = row._raw.toLowerCase();
        return yesterdayDisplays.some(d => rowStr.includes(d.toLowerCase())) ||
               rowStr.includes(yesterday);
      });

      return { headers, totalRows: allRows.length, filtered, allRows };
    }, YESTERDAY, YESTERDAY_DISPLAY);

    console.log(`    Page ${pageNum}: ${pageData.totalRows} total rows, ${pageData.filtered.length} matching`);
    allSubmissions = allSubmissions.concat(pageData.filtered);

    // Check for next page link
    const nextLink = await page.$('a[rel="next"], a:has-text("Next"), .pagination .next a, nav[aria-label="pagination"] a:last-child');
    if (nextLink && pageNum < 20) {
      await nextLink.click();
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
      pageNum++;
    } else {
      hasNextPage = false;
    }
  }

  await page.screenshot({ path: `${SCREENSHOT_DIR}/canopy_clones_result.png`, fullPage: true });

  // ── Step 5: Output results ─────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(` RESULTS: Clone Submissions for ${YESTERDAY} (Yesterday)`);
  console.log('═══════════════════════════════════════════════════════');

  if (allSubmissions.length === 0) {
    // Show sample of all data to help diagnose
    await page.goto(`${CANOPY_URL}/clones`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const sampleData = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('table thead th, table th')).map(h => h.innerText.trim());
      const rows = Array.from(document.querySelectorAll('table tbody tr')).slice(0, 5);
      return {
        headers,
        rows: rows.map(r => Array.from(r.querySelectorAll('td')).map(c => c.innerText.trim()))
      };
    });

    console.log('\n No submissions found for ' + YESTERDAY);
    console.log('\n Sample of available data (first 5 rows):');
    console.log(' Headers: ' + sampleData.headers.join(' | '));
    sampleData.rows.forEach((row, i) => {
      console.log(` Row ${i+1}: ` + row.join(' | '));
    });
  } else {
    console.log(`\n Found ${allSubmissions.length} submission(s) for ${YESTERDAY}:\n`);
    allSubmissions.forEach((row, i) => {
      console.log(` [${i + 1}] ${row._raw}`);
    });
  }

  console.log('\n Screenshots: canopy_clones_page.png, canopy_clones_result.png');
  console.log('═══════════════════════════════════════════════════════');

  await browser.close();
})();
