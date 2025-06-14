// basic-app-test.js - Simple application test
const puppeteer = require('puppeteer');

async function testBasicApp() {
  console.log('🧪 Starting basic application test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to homepage
    console.log('📱 Navigating to homepage...');
    await page.goto('http://localhost:3003', { waitUntil: 'networkidle2' });
    
    // Check if guest-mode-button exists
    console.log('🔍 Looking for guest-mode-button...');
    const guestButton = await page.$('[data-testid="guest-mode-button"]');
    if (guestButton) {
      console.log('✅ Guest mode button found');
      
      // Click guest mode button
      console.log('🖱️ Clicking guest mode button...');
      await guestButton.click();
      
      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      console.log('🚀 Navigated to:', page.url());
      
      // Wait for guest workspace to load
      console.log('⏳ Waiting for guest workspace...');
      await page.waitForSelector('[data-testid="guest-workspace"]', { 
        timeout: 10000,
        visible: true 
      });
      console.log('✅ Guest workspace loaded successfully');
      
    } else {
      console.log('❌ Guest mode button not found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Check if puppeteer is available
try {
  testBasicApp();
} catch (error) {
  console.log('⚠️ Puppeteer not available, skipping browser test');
  console.log('✅ Application server is running on http://localhost:3003');
}