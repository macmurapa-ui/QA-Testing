const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const SCREENSHOT_PATH = "/home/user/QA-Testing/HTM Clone Testing/HTM Clone Testing/Test Runs/Test Run 001/Test Run 004/HTM_Clone_Screenshot_004.png";
const CLONE_URL = 'https://admin-clone.helpthemove.co.uk';

const rawProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
let proxyConfig;
if (rawProxy) {
  const u = new URL(rawProxy);
  proxyConfig = { server: `${u.protocol}//${u.host}`, username: u.username, password: u.password, bypass: '<-loopback>' };
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    proxy: proxyConfig,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 },
    storageState: '/home/user/QA-Testing/auth.json'
  });

  const page = await context.newPage();

  console.log('Navigating to HTM Clone with stored session...');
  await page.goto(CLONE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const url = page.url();
  console.log(`Landed on: ${url}`);

  const isLoginPage = url.includes('/login') || url.includes('accounts.google.com');
  if (isLoginPage) {
    console.log('ERROR: Session cookie did not authenticate - still on login page');
    process.exitCode = 1;
  } else {
    console.log('SUCCESS: Authenticated homepage loaded');
  }

  await page.waitForTimeout(800);
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
  await browser.close();

  console.log(`Screenshot saved: ${SCREENSHOT_PATH}`);
  console.log(`FINAL_URL:${url}`);
})();
