// tests/e2e/auth-helpers.ts - Authentication E2E Test Helpers
import { Page, expect } from '@playwright/test';

// Test Users
export const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'e2e-test-password123'
};

export const EXISTING_USER = {
  email: 'existing-user@example.com',
  password: 'existing-password123'
};

// Helper function to navigate to auth form
export async function navigateToAuthForm(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  
  // Check if auth form is already visible
  const authForm = page.locator('[data-testid="auth-form"]');
  try {
    await expect(authForm).toBeVisible({ timeout: 5000 });
    return;
  } catch {
    // Need to navigate through new flow
  }
  
  // Use guest mode button to avoid auto-login complications
  const guestButton = page.locator('[data-testid="guest-mode-button"]');
  await expect(guestButton).toBeVisible({ timeout: 10000 });
  await guestButton.click();
  
  // Wait for workspace to load (guest mode)
  await page.waitForURL('**/workspace**');
  await page.waitForLoadState('domcontentloaded');
  
  // Click settings button to open settings modal
  const settingsButton = page.locator('[data-testid="settings-button"]');
  await expect(settingsButton).toBeVisible({ timeout: 10000 });
  await settingsButton.click();
  
  // Click account settings tab
  const accountTab = page.locator('[data-testid="account-settings-tab"]');
  await expect(accountTab).toBeVisible({ timeout: 5000 });
  await accountTab.click();
  
  // Check if user is already logged in and logout if needed
  const logoutButton = page.locator('[data-testid="logout-button"]');
  try {
    await expect(logoutButton).toBeVisible({ timeout: 2000 });
    await logoutButton.click();
    await expect(page.locator('[data-testid="auth-form"]')).toBeVisible({ timeout: 5000 });
  } catch {
    await expect(page.locator('[data-testid="auth-form"]')).toBeVisible({ timeout: 5000 });
  }
}

// API Route Mocking Setup
export async function setupAuthAPIMocks(page: Page) {
  // Login API
  await page.route('**/api/auth/login', async route => {
    const request = route.request();
    const postData = request.postDataJSON();
    
    // Invalid credentials
    if (postData?.email === 'wrong@example.com' && postData?.password === 'wrong-password') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ 
          status: 'error', 
          error: { code: 1001, message: 'Invalid credentials' } 
        })
      });
      return;
    }
    
    // Network error simulation
    if (request.headers()['x-test-scenario'] === 'network-error') {
      throw new Error('Failed to fetch');
    }
    
    // Success response
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ 
        message: 'Logged in successfully', 
        uuid: 'test-uuid-123', 
        email: postData?.email || 'existing-user@example.com'
      })
    });
    
    // Cookie setting
    setTimeout(async () => {
      await route.request().frame()?.page()?.context().addCookies([{
        name: 'token',
        value: 'test-jwt-token',
        domain: 'localhost',
        path: '/'
      }]);
    }, 100);
  });
  
  // Register API
  await page.route('**/api/auth/register', async route => {
    const request = route.request();
    const postData = request.postDataJSON();
    
    // Weak password
    if (postData?.password && postData.password.length < 12) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ 
          status: 'error', 
          error: { code: 1003, message: 'Password must be at least 12 characters' } 
        })
      });
      return;
    }
    
    // Duplicate user
    if (postData?.email === 'existing-user@example.com') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ 
          status: 'error', 
          error: { code: 1002, message: 'Email already exists' } 
        })
      });
      return;
    }
    
    // Success response
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ 
        message: 'Registration successful',
        uuid: 'new-test-uuid-456',
        email: postData?.email
      })
    });
  });

  // Auth check API
  await page.route('**/api/auth/check', async route => {
    const cookies = await route.request().frame()?.page()?.context().cookies();
    const hasToken = cookies?.some(cookie => cookie.name === 'token');
    
    if (hasToken) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          valid: true,
          uuid: 'test-uuid-123',
          email: 'existing-user@example.com'
        })
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ valid: false })
      });
    }
  });
  
  // Logout API
  await page.route('**/api/auth/logout', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Logged out successfully' })
    });
  });
}

// Helper for workspace verification
export async function verifyWorkspaceAccess(page: Page, sessionName: string = 'Session'): Promise<number> {
  await page.waitForURL('**/workspace**', { timeout: 15000 });
  await page.waitForLoadState('domcontentloaded');
  
  const canvas = page.locator('[data-testid="workspace-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 10000 });
  
  // Try to create memo using double-click
  await canvas.dblclick({ position: { x: 250 + Math.random() * 100, y: 250 + Math.random() * 100 } });
  
  try {
    await expect(page.locator('[data-testid^="memo-window-"]').first()).toBeVisible({ timeout: 5000 });
    console.log(`${sessionName}: Memo creation successful via double-click`);
    return 1;
  } catch {
    // Try button method if double-click doesn't work
    const createButtons = page.locator('[data-testid="create-memo-button"]');
    const buttonCount = await createButtons.count();
    
    if (buttonCount > 0) {
      try {
        await createButtons.first().click();
        await expect(page.locator('[data-testid^="memo-window-"]').first()).toBeVisible({ timeout: 5000 });
        console.log(`${sessionName}: Memo creation successful via button`);
        return 1;
      } catch {
        console.log(`${sessionName}: Button method failed`);
      }
    }
    
    console.log(`${sessionName}: Session accessible but memo creation failed`);
    return 0;
  }
}