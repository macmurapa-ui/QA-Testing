const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const rawProxy = process.env.HTTPS_PROXY || '';
let proxyConfig;
if (rawProxy) {
  const u = new URL(rawProxy);
  proxyConfig = { server: `${u.protocol}//${u.host}`, username: u.username, password: u.password, bypass: '<-loopback>' };
}
(async () => {
  const browser = await chromium.launch({
    headless: true,
    proxy: proxyConfig,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
  });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });
  const page = await ctx.newPage();
  await page.goto('https://admin-canopy-clone.helpthemove.co.uk/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.click('button:has-text("Sign in with Google")');
  await page.waitForURL('**/accounts.google.com/**', { timeout: 15000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', 'mac.murapa@helpthemove.co.uk', { delay: 50 });
  await page.waitForTimeout(500);
  const nextBtn = await page.$('#identifierNext, [data-action="next"]');
  if (nextBtn) { await nextBtn.click(); } else { await page.keyboard.press('Enter'); }
  await page.waitForTimeout(8000);
  const url = page.url();
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 400));
  console.log('URL: ' + url.substring(0, 150));
  console.log('Body: ' + bodyText);
  await page.screenshot({ path: 'canopy_nobot.png' });
  await browser.close();
})();
