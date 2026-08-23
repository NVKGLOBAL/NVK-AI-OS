const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(5000); // Wait for boot
  const err = await page.evaluate(() => {
    const el = document.getElementById('debug-error');
    return el ? el.innerText : 'NO ERROR FOUND';
  });
  console.log("RESULT:", err);
  await browser.close();
})();
