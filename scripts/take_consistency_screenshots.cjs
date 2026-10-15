const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../screenshot/Consistency');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Starting layout consistency verification screenshots...');

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
      deviceScaleFactor: 2,
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

    // 1. Preventive C/F (Full width, margins aligned with all other pages)
    console.log('📸 1. Capturing Preventive C/F (Full width, unified margins & table)...');
    await page.goto('http://localhost/preventive-cf', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.screenshot({
      path: path.join(OUT_DIR, '01_preventive_cf_full_width.png'),
    });

    // 2. Out of Plan (Unified table styling)
    console.log('📸 2. Capturing Out of Plan (Unified table styling)...');
    await page.goto('http://localhost/out-of-plan', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.screenshot({
      path: path.join(OUT_DIR, '02_out_of_plan_unified_table.png'),
    });

    // 3. Planning page (Normalized padding, unified list table)
    console.log('📸 3. Capturing Planning (Normalized padding & unified table)...');
    await page.goto('http://localhost/planning', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.screenshot({
      path: path.join(OUT_DIR, '03_planning_unified_table.png'),
    });

    // 4. Kalibrasi Alat (QC)
    console.log('📸 4. Capturing Kalibrasi (Unified table)...');
    await page.goto('http://localhost/kalibrasi', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.screenshot({
      path: path.join(OUT_DIR, '04_kalibrasi_unified_table.png'),
    });

    console.log('✨ All consistency screenshots captured successfully!');
  } catch (err) {
    console.error('❌ Error capturing consistency screenshots:', err);
  } finally {
    await browser.close();
  }
}

main();
