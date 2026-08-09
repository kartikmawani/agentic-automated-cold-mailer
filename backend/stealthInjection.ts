import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

// 1. Initialize the base stealth hooks
chromium.use(stealthPlugin());

async function runAdvancedScraper() {
  console.log(' Launching hardened stealth scraper...');

  const browser = await chromium.launch({
    headless: true,  
    // Pass core flags to Chromium to disable debugging paths
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  // 2. Fix Screen, Viewport, and Header Mismatches
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    screen: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'Asia/Kolkata',
  });

  // Customize standard HTTP header signatures explicitly
  await context.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
  });

  const page = await context.newPage();

  //  Humanized Behavioral Interaction Helpers
  const humanClick = async (selector: string) => {
    const element = await page.waitForSelector(selector);
    const box = await element.boundingBox();
    
    if (box) {
      // Calculate a randomized coordinate point within the button boundaries
      const x = box.x + box.width / 2 + (Math.random() * 10 - 5);
      const y = box.y + box.height / 2 + (Math.random() * 10 - 5);
      
      // Move the mouse smoothly to the target destination
      await page.mouse.move(x, y, { steps: 25 }); 
      await page.waitForTimeout(Math.random() * 200 + 100); // Small human hesitation
      await page.mouse.down();
      await page.waitForTimeout(Math.random() * 100 + 50);  // Click hold duration
      await page.mouse.up();
    }
  };

  try {
    // Navigate safely to the target jobs endpoint
    await page.goto('https://www.ycombinator.com/companies', { 
      waitUntil: 'networkidle', 
      timeout: 60000 
    });

     //wait for a random time between 2 and 5 seconds
    await page.waitForTimeout(Math.random() * 3000 + 2000);
    await humanClick('button')

    // Simulate natural human vertical scrolling patterns down the page
    //scroll down the page 3 times
    for (let i = 0; i < 3; i++) {
      const scrollY = 300 + Math.floor(Math.random() * 400);
      await page.evaluate((y) => window.scrollBy(0, y), scrollY);
      await page.waitForTimeout(Math.random() * 1500 + 1000);
    }

    console.log('  Page processed cleanly without triggering automated bot locks.');

  } catch (error) {
    console.error('  Anti-bot system intercepted the execution run:', error);
  } finally {
    await browser.close();
  }
}

runAdvancedScraper();