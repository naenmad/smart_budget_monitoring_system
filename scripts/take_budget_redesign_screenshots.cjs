const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const BUDGET_DIR = path.resolve(__dirname, '../screenshot/Budget');
const KALIBRASI_DIR = path.resolve(__dirname, '../screenshot/Kalibrasi');

if (!fs.existsSync(BUDGET_DIR)) fs.mkdirSync(BUDGET_DIR, { recursive: true });
if (!fs.existsSync(KALIBRASI_DIR)) fs.mkdirSync(KALIBRASI_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Starting Budget & Kalibrasi empty state screenshot generator...');

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

    // 1. Redesigned Budget Page (Table view)
    console.log('📸 1. Capturing Redesigned Budget Setup Overview...');
    await page.goto('http://localhost/budget', { waitUntil: 'networkidle2' });
    await sleep(1800);
    await page.screenshot({
      path: path.join(BUDGET_DIR, '01_budget_redesign_overview.png'),
    });

    // 2. Budget Upload Tab
    console.log('📸 2. Capturing Budget Upload Tab...');
    const uploadTabBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('Upload & Sinkronisasi Excel'));
    });
    if (uploadTabBtn && uploadTabBtn.click) {
      await uploadTabBtn.click();
      await sleep(1000);
      await page.screenshot({
        path: path.join(BUDGET_DIR, '02_budget_upload_tab.png'),
      });
    }

    // 3. Budget History Tab
    console.log('📸 3. Capturing Budget History Tab...');
    const historyTabBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('Riwayat Perubahan'));
    });
    if (historyTabBtn && historyTabBtn.click) {
      await historyTabBtn.click();
      await sleep(1000);
      await page.screenshot({
        path: path.join(BUDGET_DIR, '03_budget_history_tab.png'),
      });
    }

    // 4. Verify Empty State fix on Kalibrasi (search for non-existent keyword)
    console.log('📸 4. Capturing Kalibrasi Empty State Fix (Centered across full table width)...');
    await page.goto('http://localhost/kalibrasi', { waitUntil: 'networkidle2' });
    await sleep(1500);
    const searchInput = await page.$('input[placeholder*="Cari nama alat"]');
    if (searchInput) {
      await searchInput.type('Z999NONEXISTENT');
      await sleep(1200);
      await page.screenshot({
        path: path.join(KALIBRASI_DIR, '06_kalibrasi_empty_state_fixed.png'),
      });
    }

    console.log('✨ All screenshots completed successfully!');
  } catch (err) {
    console.error('❌ Error during screenshots:', err);
  } finally {
    await browser.close();
  }
}

main();
