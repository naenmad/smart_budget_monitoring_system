const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../screenshot/OOP');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Starting OOP screenshots generator...');
  console.log(`📁 Target directory: ${OUT_DIR}`);

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1600,1050',
    ],
    defaultViewport: {
      width: 1600,
      height: 1050,
      deviceScaleFactor: 2, // HiDPI Retina quality for presentations
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

    // 1. OOP Overview All
    console.log('📸 1. Capturing OOP Page Overview (All Data)...');
    await page.goto('http://localhost/out-of-plan', { waitUntil: 'networkidle2' });
    await sleep(1200);
    await page.screenshot({ path: path.join(OUT_DIR, '01_oop_page_overview_all.png') });

    // 2. Filter Account: SUPPLIES EXPENSES (50032902)
    console.log('📸 2. Capturing OOP Filter: SUPPLIES EXPENSES (50032902)...');
    await page.evaluate(() => {
      const select = document.querySelector('select');
      if (select) {
        select.value = '50032902';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUT_DIR, '02_oop_filter_supplies_expenses_50032902.png') });

    // 3. Filter Account: MARKETING EXPENSES (60290100)
    console.log('📸 3. Capturing OOP Filter: MARKETING EXPENSES (60290100)...');
    await page.evaluate(() => {
      const select = document.querySelector('select');
      if (select) {
        select.value = '60290100';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUT_DIR, '03_oop_filter_marketing_expenses_60290100.png') });

    // 4. Filter Account: TRANSPORTATION OVERSEA (60290600)
    console.log('📸 4. Capturing OOP Filter: TRANSPORTATION OVERSEA (60290600)...');
    await page.evaluate(() => {
      const select = document.querySelector('select');
      if (select) {
        select.value = '60290600';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUT_DIR, '04_oop_filter_transportation_oversea_60290600.png') });

    // Reset account filter to ALL
    await page.evaluate(() => {
      const select = document.querySelector('select');
      if (select) {
        select.value = 'ALL';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await sleep(400);

    // 5. Filter Bulan Januari
    console.log('📸 5. Capturing OOP Filter: Bulan Januari...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const janBtn = buttons.find(b => b.textContent && b.textContent.trim() === 'Jan');
      if (janBtn) janBtn.click();
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUT_DIR, '05_oop_filter_bulan_januari.png') });

    // 6. Filter Bulan Februari
    console.log('📸 6. Capturing OOP Filter: Bulan Februari...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const febBtn = buttons.find(b => b.textContent && b.textContent.trim() === 'Feb');
      if (febBtn) febBtn.click();
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUT_DIR, '06_oop_filter_bulan_februari.png') });

    // 7. Filter Bulan Maret
    console.log('📸 7. Capturing OOP Filter: Bulan Maret...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const marBtn = buttons.find(b => b.textContent && b.textContent.trim() === 'Mar');
      if (marBtn) marBtn.click();
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUT_DIR, '07_oop_filter_bulan_maret.png') });

    // 8. Filter Bulan April
    console.log('📸 8. Capturing OOP Filter: Bulan April...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const aprBtn = buttons.find(b => b.textContent && b.textContent.trim() === 'Apr');
      if (aprBtn) aprBtn.click();
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUT_DIR, '08_oop_filter_bulan_april.png') });

    // Reset month to ALL and capture scrolled table
    console.log('📸 9. Capturing OOP Table Scrolled Details...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const allBtn = buttons.find(b => b.textContent && b.textContent.includes('Semua Bulan'));
      if (allBtn) allBtn.click();
      window.scrollTo({ top: 350, behavior: 'instant' });
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUT_DIR, '09_oop_table_scrolled_rows.png') });

    // 10. Dashboard Budget Realization Status OOP
    console.log('📸 10. Capturing Dashboard OOP Status Card...');
    await page.goto('http://localhost/dashboard', { waitUntil: 'networkidle2' });
    await sleep(1000);

    // Switch to Procurement Status tab
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const procTab = tabs.find(t => t.textContent && t.textContent.includes('Status Pengadaan'));
      if (procTab) procTab.click();
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUT_DIR, '10_dashboard_budget_realization_status_oop.png') });

    // 11. Modal Monthly Detail (Februari OOP Tab)
    console.log('📸 11. Capturing Modal Monthly Detail (Februari OOP Tab)...');
    await page.goto('http://localhost/dashboard', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await page.evaluate(() => {
      window.scrollTo({ top: 380, behavior: 'instant' });
    });
    await sleep(400);

    // Click Feb in monthly chart table
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const febBtn = btns.find(b => b.textContent && b.textContent.trim().startsWith('Feb'));
      if (febBtn) febBtn.click();
    });
    await sleep(1000);

    // Click Out of Plan tab inside modal
    await page.evaluate(() => {
      const modalBtns = Array.from(document.querySelectorAll('button'));
      const oopBtn = modalBtns.find(b => b.textContent && b.textContent.includes('Out of Plan'));
      if (oopBtn) oopBtn.click();
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUT_DIR, '11_modal_monthly_detail_feb_oop.png') });

    // Close modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Tutup modal"]');
      if (closeBtn) closeBtn.click();
    });
    await sleep(400);

    // 12. Modal Monthly Detail (Januari OOP Tab)
    console.log('📸 12. Capturing Modal Monthly Detail (Januari OOP Tab)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const janBtn = btns.find(b => b.textContent && b.textContent.trim().startsWith('Jan'));
      if (janBtn) janBtn.click();
    });
    await sleep(1000);

    await page.evaluate(() => {
      const modalBtns = Array.from(document.querySelectorAll('button'));
      const oopBtn = modalBtns.find(b => b.textContent && b.textContent.includes('Out of Plan'));
      if (oopBtn) oopBtn.click();
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUT_DIR, '12_modal_monthly_detail_jan_oop.png') });

    console.log('✅ All 12 OOP screenshots generated successfully in screenshot/OOP/!');
  } catch (err) {
    console.error('❌ Error capturing OOP screenshots:', err);
  } finally {
    await browser.close();
  }
}

main();
