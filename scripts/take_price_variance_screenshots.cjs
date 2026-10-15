const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../screenshot/PriceVariance');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Starting Price Variance page screenshots generator...');
  console.log(`📁 Target directory: ${OUT_DIR}`);

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1600,1100',
    ],
    defaultViewport: {
      width: 1600,
      height: 1100,
      deviceScaleFactor: 2, // HiDPI Retina quality
    },
  });

  const page = await browser.newPage();

  try {
    // Login
    console.log('🔑 Logging in to system...');
    await page.goto('http://localhost/login', { waitUntil: 'networkidle2' });
    await sleep(600);
    await page.type('#login-username', 'admin');
    await page.type('#login-password', 'admin123');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
    ]);
    await sleep(1500);

    // 1. Dedicated Price Variance Page (Overview)
    console.log('📸 1. Capturing Price Variance Overview...');
    await page.goto('http://localhost/price-variance', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.screenshot({
      path: path.join(OUT_DIR, '01_price_variance_overview.png'),
    });

    // 2. Filter Cost Saving items
    console.log('📸 2. Capturing Cost Saving Filter...');
    const savingBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('Cost Saving'));
    });
    if (savingBtn && savingBtn.click) {
      await savingBtn.click();
      await sleep(1000);
      await page.screenshot({
        path: path.join(OUT_DIR, '02_price_variance_cost_saving.png'),
      });
    }

    // 3. Filter Over Budget items
    console.log('📸 3. Capturing Over Budget Filter...');
    const overBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('Over Budget'));
    });
    if (overBtn && overBtn.click) {
      await overBtn.click();
      await sleep(1000);
      await page.screenshot({
        path: path.join(OUT_DIR, '03_price_variance_over_budget.png'),
      });
    }

    // 4. Reset to all status and filter Sub-Kategori Kalibrasi
    console.log('📸 4. Capturing Kalibrasi Alat Filter...');
    const allBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.trim() === 'Semua Status');
    });
    if (allBtn && allBtn.click) await allBtn.click();
    await sleep(600);

    const kalibrasiPill = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('Kalibrasi Alat'));
    });
    if (kalibrasiPill && kalibrasiPill.click) {
      await kalibrasiPill.click();
      await sleep(1000);
      await page.screenshot({
        path: path.join(OUT_DIR, '04_price_variance_kalibrasi.png'),
      });
    }

    // 5. Planning Page with Perbandingan Harga tab
    console.log('📸 5. Capturing Planning Page Tab Perbandingan Harga...');
    await page.goto('http://localhost/planning?tab=variance', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.screenshot({
      path: path.join(OUT_DIR, '05_planning_tab_variance.png'),
    });

    console.log('✨ All 5 Price Variance screenshots generated successfully!');
  } catch (err) {
    console.error('❌ Screenshot error:', err);
  } finally {
    await browser.close();
  }
}

main();
