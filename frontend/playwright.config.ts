import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Stability-focused test execution */
  fullyParallel: false, // Disable parallel execution for stability
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Enhanced retry strategy for stability */
  retries: process.env.CI ? 3 : 1, // More retries for flaky tests
  
  /* Single worker for stability */
  workers: 1, // Sequential execution for better stability
  
  /* Comprehensive reporting */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'e2e-results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
    ['line'] // Progress feedback
  ],
  
  /* Stability-optimized settings */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3003',

    /* Enhanced debugging on failures */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    /* Conservative timeouts for stability */
    actionTimeout: 15000, // 15 seconds - more generous
    navigationTimeout: 20000, // 20 seconds - more generous
    
    /* Browser settings for stability */
    headless: process.env.CI ? true : false, // Show browser in development
    viewport: { width: 1280, height: 720 }, // Standard viewport
    ignoreHTTPSErrors: true,
    
    /* Reduce flakiness */
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
  },

  /* Single browser for stability */
  projects: [
    {
      name: 'chromium-stable',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional stability settings
        // channel: 'chrome', // Commented out - use installed Chromium instead
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
          ],
        },
      },
    },
  ],

  /* Conservative timeouts for complex operations */
  timeout: 60000, // 60 seconds - generous for complex operations
  
  /* Expect timeout for assertions */
  expect: {
    timeout: 10000, // 10 seconds - generous for slow assertions
  },

  /* Test output directory */
  outputDir: 'test-results/',
  
  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/setup/global-setup.ts'),
  globalTeardown: require.resolve('./tests/setup/global-teardown.ts'),
});