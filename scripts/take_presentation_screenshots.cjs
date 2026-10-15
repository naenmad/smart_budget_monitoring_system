const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../screenshot');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Starting presentation screenshots generator...');
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
    // 1. Login Page
    console.log('📸 1. Capturing Login Page...');
    await page.goto('http://localhost/login', { waitUntil: 'networkidle2' });
    await sleep(800);
    await page.screenshot({ path: path.join(OUT_DIR, '01_login_page.png') });

    // Login process
    console.log('🔑 Performing login...');
    await page.type('#login-username', 'admin');
    await page.type('#login-password', 'admin123');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
    ]);
    await sleep(1500);

    // 2. Dashboard Top (KPI & Cost Centers)
    console.log('📸 2. Capturing Dashboard Overview & Cost Centers...');
    await page.goto('http://localhost/dashboard', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '02_dashboard_kpi_dan_cost_center.png') });

    // 3. Dashboard Monthly Chart Section
    console.log('📸 3. Capturing Dashboard Monthly Monitoring...');
    await page.evaluate(() => {
      window.scrollTo({ top: 380, behavior: 'instant' });
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUT_DIR, '03_dashboard_monitoring_bulanan.png') });

    // 4. Dashboard PIC & Account Realization Charts
    console.log('📸 4. Capturing PIC & Account Realization...');
    await page.evaluate(() => {
      window.scrollTo({ top: 920, behavior: 'instant' });
    });
    await sleep(600);
    await page.screenshot({ path: path.join(OUT_DIR, '04_dashboard_pic_dan_distribusi_akun.png') });

    // 5. Dashboard Preventive C/F Spotlight Section
    console.log('📸 5. Capturing Dashboard Preventive C/F Spotlight...');
    await page.evaluate(() => {
      window.scrollTo({ top: 1420, behavior: 'instant' });
    });
    await sleep(800);
    await page.screenshot({ path: path.join(OUT_DIR, '05_dashboard_preventive_cf_spotlight.png') });

    // 6. Monthly Item Detail Modal (Februari)
    console.log('📸 6. Opening & Capturing Monthly Detail Modal (Feb)...');
    await page.evaluate(() => {
      window.scrollTo({ top: 380, behavior: 'instant' });
    });
    await sleep(400);

    // Click Feb month button in monthly chart table
    const clickedFeb = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const febBtn = btns.find((b) => b.textContent && b.textContent.trim().startsWith('Feb'));
      if (febBtn) {
        febBtn.click();
        return true;
      }
      return false;
    });

    if (clickedFeb) {
      await sleep(1000);
      await page.screenshot({ path: path.join(OUT_DIR, '06_modal_rincian_bulanan_plan.png') });

      // 7. Click Over Budget Tab in Modal
      console.log('📸 7. Capturing Over Budget tab in Modal...');
      await page.evaluate(() => {
        const modalBtns = Array.from(document.querySelectorAll('button'));
        const overBtn = modalBtns.find((b) => b.textContent && b.textContent.includes('Over Budget'));
        if (overBtn) overBtn.click();
      });
      await sleep(500);
      await page.screenshot({ path: path.join(OUT_DIR, '07_modal_rincian_bulanan_overbudget.png') });

      // 8. Click Out of Plan Tab in Modal
      console.log('📸 8. Capturing Out of Plan tab in Modal...');
      await page.evaluate(() => {
        const modalBtns = Array.from(document.querySelectorAll('button'));
        const oopBtn = modalBtns.find((b) => b.textContent && b.textContent.includes('Out of Plan'));
        if (oopBtn) oopBtn.click();
      });
      await sleep(500);
      await page.screenshot({ path: path.join(OUT_DIR, '08_modal_rincian_bulanan_out_of_plan.png') });

      // Close modal
      await page.evaluate(() => {
        const closeBtn = document.querySelector('button[aria-label="Tutup modal"]');
        if (closeBtn) closeBtn.click();
      });
      await sleep(400);
    }

    // 9. Dedicated Preventive C/F Page
    console.log('📸 9. Capturing Dedicated Preventive C/F Page...');
    await page.goto('http://localhost/preventive-cf', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '09_dedicated_preventive_cf.png') });

    // 10. Dedicated Out of Plan Page
    console.log('📸 10. Capturing Dedicated Out of Plan Page...');
    await page.goto('http://localhost/out-of-plan', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '10_dedicated_out_of_plan.png') });

    // 11. Master Planning Page
    console.log('📸 11. Capturing Master Planning Page...');
    await page.goto('http://localhost/planning', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '11_master_planning.png') });

    // 12. Entertainment Cost / E-6 Page
    console.log('📸 12. Capturing Entertainment Cost (E-6) Page...');
    await page.goto('http://localhost/entertaint-cost', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '12_entertainment_budget.png') });

    console.log('✅ All 12 presentation screenshots captured successfully!');
  } catch (err) {
    console.error('❌ Error capturing screenshots:', err);
  } finally {
    await browser.close();
  }
}

main();
