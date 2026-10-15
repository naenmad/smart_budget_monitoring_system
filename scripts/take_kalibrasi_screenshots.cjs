const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../screenshot/Kalibrasi');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Starting Kalibrasi Alat Ukur screenshots generator...');
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

    // 1. Dedicated Kalibrasi Page (Actual Transactions & GR Overview)
    console.log('📸 1. Capturing Kalibrasi Actual Transactions Overview...');
    await page.goto('http://localhost/kalibrasi', { waitUntil: 'networkidle2' });
    await sleep(1800);
    await page.screenshot({
      path: path.join(OUT_DIR, '01_kalibrasi_actual_overview.png'),
    });

    // 2. Switch to Master Planning & Jadwal View
    console.log('📸 2. Capturing Master Planning & Jadwal Kalibrasi View...');
    const planModeBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('Master Planning & Jadwal'));
    });
    if (planModeBtn && planModeBtn.click) {
      await planModeBtn.click();
      await sleep(1200);
      await page.screenshot({
        path: path.join(OUT_DIR, '02_kalibrasi_planning_schedule.png'),
      });
    }

    // 3. Switch back to Actual, Filter by Category: 'Torsi & Gaya'
    console.log('📸 3. Capturing Category Filter (Torsi & Gaya)...');
    const actModeBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('Transaksi Aktual & GR'));
    });
    if (actModeBtn && actModeBtn.click) await actModeBtn.click();
    await sleep(600);

    const torsiPill = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('Torsi & Gaya'));
    });
    if (torsiPill && torsiPill.click) {
      await torsiPill.click();
      await sleep(1000);
      await page.screenshot({
        path: path.join(OUT_DIR, '03_kalibrasi_category_filter.png'),
      });
    }

    // 4. Reset Category, Filter Status Selesai (GR)
    console.log('📸 4. Capturing Status Filter Selesai (GR)...');
    const allCatPill = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('Semua Kategori'));
    });
    if (allCatPill && allCatPill.click) await allCatPill.click();
    await sleep(600);

    const selesaiBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('Selesai (GR)'));
    });
    if (selesaiBtn && selesaiBtn.click) {
      await selesaiBtn.click();
      await sleep(1000);
      await page.screenshot({
        path: path.join(OUT_DIR, '04_kalibrasi_status_selesai_gr.png'),
      });
    }

    // 5. Planning Tab Integration (/planning?tab=kalibrasi)
    console.log('📸 5. Capturing Planning Tab Integration...');
    await page.goto('http://localhost/planning?tab=kalibrasi', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.screenshot({
      path: path.join(OUT_DIR, '05_kalibrasi_planning_tab_integration.png'),
    });

    console.log('✨ All Kalibrasi screenshots taken successfully!');
  } catch (err) {
    console.error('❌ Error capturing screenshots:', err);
  } finally {
    await browser.close();
  }
}

main();
