const { chromium } = require('/opt/node22/lib/node_modules/playwright');

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
    viewport: { width: 1280, height: 900 },
    storageState: '/home/user/QA-Testing/auth.json'
  });

  const page = await context.newPage();

  console.log('Navigating to new branch form...');
  await page.goto(`${CLONE_URL}/branches/new`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log(`Landed on: ${page.url()}`);

  // Find all required fields (required attribute or aria-required)
  const requiredFields = await page.evaluate(() => {
    const fields = [];
    const inputs = document.querySelectorAll('input[required], select[required], textarea[required], input[aria-required="true"], select[aria-required="true"]');
    inputs.forEach(el => {
      fields.push({
        tag: el.tagName,
        type: el.type || '',
        name: el.name || '',
        id: el.id || '',
        placeholder: el.placeholder || '',
        label: (() => {
          if (el.id) {
            const lbl = document.querySelector(`label[for="${el.id}"]`);
            if (lbl) return lbl.innerText.trim();
          }
          const closest = el.closest('label');
          if (closest) return closest.innerText.trim();
          return '';
        })()
      });
    });
    return fields;
  });

  console.log('\n=== REQUIRED FIELDS ===');
  console.log(JSON.stringify(requiredFields, null, 2));

  // Also dump all visible form fields for reference
  const allFields = await page.evaluate(() => {
    const fields = [];
    const inputs = document.querySelectorAll('input:not([type=hidden]), select, textarea');
    inputs.forEach(el => {
      fields.push({
        tag: el.tagName,
        type: el.type || '',
        name: el.name || '',
        id: el.id || '',
        required: el.required || el.getAttribute('aria-required') === 'true',
        label: (() => {
          if (el.id) {
            const lbl = document.querySelector(`label[for="${el.id}"]`);
            if (lbl) return lbl.innerText.trim();
          }
          const closest = el.closest('label');
          if (closest) return closest.innerText.trim();
          return '';
        })()
      });
    });
    return fields;
  });

  console.log('\n=== ALL FORM FIELDS ===');
  console.log(JSON.stringify(allFields, null, 2));

  await page.screenshot({ path: '/home/user/QA-Testing/branch_form_inspect.png', fullPage: true });
  console.log('\nScreenshot saved: branch_form_inspect.png');

  await browser.close();
})();
