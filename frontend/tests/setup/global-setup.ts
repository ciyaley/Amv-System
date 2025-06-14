// tests/setup/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(_config: FullConfig) {
  console.log('🚀 Starting E2E Test Global Setup...');
  
  // Launch browser for setup operations
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Test that frontend is accessible (with graceful failure)
    console.log('📡 Testing frontend accessibility...');
    try {
      await page.goto('http://localhost:3002', { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 5000 });
      console.log('✅ Frontend is accessible');
    } catch (frontendError) {
      console.warn('⚠️  Frontend not accessible - tests may fail. Please ensure dev server is running with: npm run dev');
      console.warn('Frontend error:', frontendError instanceof Error ? frontendError.message : String(frontendError));
      // Don't throw error - let individual tests handle this
    }
    
    // Test backend accessibility (optional)
    console.log('📡 Testing backend accessibility...');
    try {
      const response = await page.request.get('http://localhost:8787/api/health', { timeout: 5000 });
      if (response.ok()) {
        console.log('✅ Backend is accessible');
      } else {
        console.warn('⚠️  Backend health check failed, continuing with frontend-only tests...');
      }
    } catch (error) {
      console.warn('⚠️  Backend not available, continuing with frontend-only tests...');
    }
    
    // Clear any existing test data
    console.log('🧹 Clearing existing test data...');
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn('Storage clear failed:', e);
      }
      
      // Clear IndexedDB if any
      if ('indexedDB' in window) {
        try {
          indexedDB.deleteDatabase('amv-system-test');
          indexedDB.deleteDatabase('amv-system');
        } catch (e) {
          console.warn('IndexedDB clear failed:', e);
        }
      }
    });
    
    // Set up test environment flags
    await page.evaluate(() => {
      try {
        localStorage.setItem('e2e-test-mode', 'true');
        localStorage.setItem('test-environment', 'playwright');
        localStorage.setItem('test-start-time', Date.now().toString());
      } catch (e) {
        console.warn('Failed to set test environment flags:', e);
      }
    });
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;