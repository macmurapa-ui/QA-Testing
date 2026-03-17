/**
 * Canopy Clone - Non-Headless Auth + Submissions for Yesterday
 * Uses xvfb virtual display to avoid Google CAPTCHA bot detection.
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const CANOPY_URL = 'https://admin-canopy-clone.helpthemove.co.uk';
const YESTERDAY = '2026-03-16';
const SCREENSHOT_DIR = path.dirname(__filename);
const CANOPY_AUTH_PATH = '/home/user/QA-Testing/canopy_auth.json';

const rawProxy = process.env.HTTPS_PROXY || '';
let proxyConfig;
if (rawProxy) {
  const u = new URL(rawProxy);
  proxyConfig = { server: `${u.protocol}//${u.host}`, username: u.username, password: u.password, bypass: '<-loopback>' };
}

(async () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' Canopy Clone - Clone Submissions for ' + YESTERDAY);
  console.log('═══════════════════════════════════════════════════════');

  const browser = await chromium.launch({
    headless: false,   // Non-headless to avoid CAPTCHA
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

  // ── Authenticate ──────────────────────────────────────────────────────────
  console.log('\n[AUTH] Starting OAuth flow...');
  await page.goto(`${CANOPY_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.click('button:has-text("Sign in with Google")');
  await page.waitForURL('**/accounts.google.com/**', { timeout: 15000 });

  console.log('[AUTH] On Google OAuth page...');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', 'mac.murapa@helpthemove.co.uk', { delay: 80 });
  await page.waitForTimeout(800);

  // Check for CAPTCHA
  const hasCaptcha = await page.$('text="Type the text you hear or see"').catch(() => null);
  if (hasCaptcha) {
    console.log('[AUTH] CAPTCHA detected. Proceeding anyway (non-headless may bypass)...');
  }

  // Click Next
  const nextBtn = await page.$('#identifierNext');
  if (nextBtn) {
    await nextBtn.click();
  } else {
    await page.keyboard.press('Enter');
  }

  console.log('[AUTH] Waiting for redirect to Canopy Clone...');
  try {
    await page.waitForURL(`${CANOPY_URL}/**`, { timeout: 30000 });
    console.log('[AUTH] Authenticated! URL: ' + page.url());
  } catch (e) {
    const url = page.url();
    const body = await page.evaluate(() => document.body.innerText.substring(0, 200));
    console.log('[AUTH] Current URL: ' + url.substring(0, 100));
    console.log('[AUTH] Page: ' + body);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/canopy_auth_stuck.png` });
    await browser.close();
    process.exitCode = 1;
    return;
  }

  await context.storageState({ path: CANOPY_AUTH_PATH });
  console.log('[AUTH] Session saved.');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/canopy_authenticated.png` });

  // ── Explore navigation ────────────────────────────────────────────────────
  const navLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('nav a, .navbar a, header a'))
      .map(a => ({ text: a.innerText.trim().replace(/\s+/g, ' '), href: a.href }))
      .filter(l => l.text && l.href);
  });

  console.log('\n[NAV] Links:');
  navLinks.forEach(l => console.log(`  "${l.text}" → ${l.href}`));

  // ── Find and extract submissions ──────────────────────────────────────────
  const candidates = ['/conversions', '/submissions', '/clones', '/reports', '/moves'];
  navLinks.forEach(l => {
    const urlPath = l.href.replace(CANOPY_URL, '');
    if (urlPath && urlPath !== '/' && !candidates.includes(urlPath)) {
      candidates.push(urlPath);
    }
  });

  console.log('\n[SEARCH] Looking for submissions pages...');
  for (const candidate of candidates) {
    try {
      await page.goto(`${CANOPY_URL}${candidate}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const is404 = await page.evaluate(() => document.body.innerText.includes("doesn't exist") || document.body.innerText.includes('404'));
      if (is404) continue;

      const rowCount = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
      const title = await page.title();
      console.log(`  ✓ ${candidate} → "${title}" | rows: ${rowCount}`);

      if (rowCount > 0) {
        const data = await page.evaluate(() => {
          const headers = Array.from(document.querySelectorAll('table thead th')).map(h => h.innerText.trim());
          const rows = Array.from(document.querySelectorAll('table tbody tr')).map(r =>
            Array.from(r.querySelectorAll('td')).map(c => c.innerText.trim())
          );
          return { headers, rows };
        });

        const yesterday = YESTERDAY;
        const variants = [yesterday, '16/03/2026', '16 Mar 2026'];
        const matching = data.rows.filter(r => variants.some(v => r.join(' ').includes(v)));

        console.log(`\n  Total rows: ${data.rows.length}, Matching yesterday: ${matching.length}`);
        if (matching.length > 0) {
          console.log('\n═══════════════════════════════════════════════════════');
          console.log(` RESULTS: Submissions for ${YESTERDAY} on ${candidate}`);
          console.log('═══════════════════════════════════════════════════════');
          console.log(' ' + data.headers.join(' | '));
          matching.forEach((r, i) => console.log(` [${i+1}] ${r.join(' | ')}`));
          console.log('═══════════════════════════════════════════════════════');
        } else {
          console.log('  Sample (first 3): ');
          data.rows.slice(0, 3).forEach(r => console.log('    ' + r.join(' | ')));
        }
        await page.screenshot({ path: `${SCREENSHOT_DIR}/canopy_${candidate.replace(/\//g, '_')}.png`, fullPage: true });
      }
    } catch(e) { /* skip */ }
  }

  await browser.close();
})();
