const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../screenshot/KPI');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Starting KPI Dashboard screenshots generator...');
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

    // 1. Dashboard Top KPI Hero Cards
    console.log('📸 1. Capturing Dashboard Hero KPI Cards...');
    await page.goto('http://localhost/dashboard', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await page.screenshot({ path: path.join(OUT_DIR, '01_dashboard_hero_kpi_cards.png') });

    // 2. Budget KPI Report Tab (OPEX - All)
    console.log('📸 2. Capturing Budget KPI Report (OPEX - Semua Akun)...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const kpiTab = tabs.find(t => t.textContent && t.textContent.includes('Budget KPI Report'));
      if (kpiTab) kpiTab.click();
    });
    await sleep(1000);
    await page.screenshot({ path: path.join(OUT_DIR, '02_kpi_report_opex_semua_akun.png') });

    // 3. Budget KPI Report - Subtab Supplies Expenses
    console.log('📸 3. Capturing Budget KPI Report (OPEX - Supplies Expenses)...');
    await page.evaluate(() => {
      const subTabs = Array.from(document.querySelectorAll('button'));
      const btn = subTabs.find(t => t.textContent && t.textContent.includes('Supplies Expenses'));
      if (btn) btn.click();
    });
    await sleep(800);
    await page.screenshot({ path: path.join(OUT_DIR, '03_kpi_report_opex_supplies_expenses.png') });

    // 4. Budget KPI Report - Subtab Kalibrasi Alat
    console.log('📸 4. Capturing Budget KPI Report (OPEX - Kalibrasi Alat)...');
    await page.evaluate(() => {
      const subTabs = Array.from(document.querySelectorAll('button'));
      const btn = subTabs.find(t => t.textContent && t.textContent.includes('Kalibrasi Alat'));
      if (btn) btn.click();
    });
    await sleep(800);
    await page.screenshot({ path: path.join(OUT_DIR, '04_kpi_report_opex_kalibrasi_alat.png') });

    // 5. Budget KPI Report - Subtab Preventive C/F
    console.log('📸 5. Capturing Budget KPI Report (OPEX - Preventive C/F)...');
    await page.evaluate(() => {
      const subTabs = Array.from(document.querySelectorAll('button'));
      const btn = subTabs.find(t => t.textContent && t.textContent.includes('Preventive C/F'));
      if (btn) btn.click();
    });
    await sleep(800);
    await page.screenshot({ path: path.join(OUT_DIR, '05_kpi_report_opex_preventive_cf.png') });

    // 6. Budget KPI Report - Mode Investasi (CAPEX)
    console.log('📸 6. Capturing Budget KPI Report (CAPEX - Investasi)...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const capexBtn = buttons.find(t => t.textContent && t.textContent.includes('Investasi'));
      if (capexBtn) capexBtn.click();
    });
    await sleep(800);
    await page.screenshot({ path: path.join(OUT_DIR, '06_kpi_report_capex_investasi.png') });

    // 7. Pareto KPI Spend Analysis Tab
    console.log('📸 7. Capturing Pareto 80/20 Spend KPI Analysis...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const paretoTab = tabs.find(t => t.textContent && t.textContent.includes('Pareto Analysis'));
      if (paretoTab) paretoTab.click();
    });
    await sleep(1200);
    await page.screenshot({ path: path.join(OUT_DIR, '07_kpi_pareto_spend_analysis.png') });

    console.log('✅ All 7 KPI Dashboard screenshots captured successfully in screenshot/KPI/!');
  } catch (err) {
    console.error('❌ Error capturing KPI screenshots:', err);
  } finally {
    await browser.close();
  }
}

main();
