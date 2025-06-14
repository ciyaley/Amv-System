// tests/setup/global-teardown.ts
import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Starting E2E Test Global Teardown...');
  
  // Launch browser for cleanup operations
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to app for cleanup (graceful failure)
    try {
      await page.goto('http://localhost:3000', { timeout: 5000 });
    } catch (error) {
      console.warn('⚠️  Could not access frontend for cleanup, skipping web cleanup');
      return; // Skip web cleanup if frontend not accessible
    }
    
    // Clean up test data
    console.log('🗑️  Cleaning up test data...');
    await page.evaluate(() => {
      // Clear all localStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear IndexedDB test databases
      if ('indexedDB' in window) {
        const databases = ['amv-system-test', 'amv-system-e2e'];
        databases.forEach(dbName => {
          indexedDB.deleteDatabase(dbName);
        });
      }
    });
    
    // Clean up any test files if needed
    // (In a real environment, you might want to clean up test directories)
    
    // Clear browser cookies
    await context.clearCookies();
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('⚠️  Global teardown encountered errors:', error);
    // Don't throw error in teardown to avoid masking test failures
  } finally {
    await context.close();
    await browser.close();
  }
  
  console.log('🏁 E2E Test Suite Completed');
}

export default globalTeardown;