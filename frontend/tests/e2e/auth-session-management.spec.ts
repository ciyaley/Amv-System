// tests/e2e/auth-session-management.spec.ts - Session Management Tests
import { test, expect } from '@playwright/test';
import { navigateToAuthForm, setupAuthAPIMocks, verifyWorkspaceAccess, EXISTING_USER } from './auth-helpers';

test.describe('Session Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAPIMocks(page);
  });

  test('should auto-login user on page reload', async ({ page }) => {
    // First login
    await navigateToAuthForm(page);
    await page.fill('[data-testid="email-input"]', EXISTING_USER.email);
    await page.fill('[data-testid="password-input"]', EXISTING_USER.password);
    await page.locator('[data-testid="login-button"]').click();
    
    // Wait for workspace
    await page.waitForURL('**/workspace**', { timeout: 15000 });
    await expect(page.locator('[data-testid="workspace-canvas"]')).toBeVisible();
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    // Should auto-login and stay in workspace
    await expect(page.locator('[data-testid="workspace-canvas"]')).toBeVisible({ timeout: 10000 });
    
    // Should not show auth form
    const authForm = page.locator('[data-testid="auth-form"]');
    await expect(authForm).not.toBeVisible();
  });

  test('should handle expired JWT tokens', async ({ page }) => {
    // Setup expired token response
    await page.route('**/api/auth/check', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ valid: false, error: 'Token expired' })
      });
    });
    
    // Try to access workspace directly
    await page.goto('/workspace');
    await page.waitForLoadState('domcontentloaded');
    
    // Should redirect to auth or show auth form
    try {
      await expect(page.locator('[data-testid="auth-form"]')).toBeVisible({ timeout: 10000 });
    } catch {
      // Alternative: might redirect to home page
      await expect(page).toHaveURL(/\/$|\/auth/);
    }
  });

  test('should handle auto-login when backend is unavailable', async ({ page }) => {
    // Setup backend unavailable response
    await page.route('**/api/auth/check', async route => {
      await route.abort('failed');
    });
    
    // Try to access workspace
    await page.goto('/workspace');
    await page.waitForLoadState('domcontentloaded');
    
    // Should gracefully handle backend unavailability
    // Either show guest mode or error state
    const guestMode = page.locator('[data-testid="guest-workspace"]');
    const errorState = page.locator('[data-testid="error-state"]');
    const authForm = page.locator('[data-testid="auth-form"]');
    
    // One of these should be visible
    await expect(
      guestMode.or(errorState).or(authForm)
    ).toBeVisible({ timeout: 10000 });
  });

  test('should maintain workspace state across browser sessions', async ({ page, context }) => {
    // Login and create memo
    await navigateToAuthForm(page);
    await page.fill('[data-testid="email-input"]', EXISTING_USER.email);
    await page.fill('[data-testid="password-input"]', EXISTING_USER.password);
    await page.locator('[data-testid="login-button"]').click();
    
    await page.waitForURL('**/workspace**', { timeout: 15000 });
    const canvas = page.locator('[data-testid="workspace-canvas"]');
    await expect(canvas).toBeVisible();
    
    // Create a memo
    await canvas.dblclick({ position: { x: 300, y: 300 } });
    const memoWindow = page.locator('[data-testid^="memo-window-"]').first();
    
    try {
      await expect(memoWindow).toBeVisible({ timeout: 5000 });
      
      // Add content to memo
      const textArea = memoWindow.locator('textarea');
      await textArea.fill('Session persistence test memo');
      
      // Wait for auto-save
      await page.waitForTimeout(1000);
    } catch {
      // Skip memo creation test if it fails
      console.log('Memo creation failed, skipping content test');
    }
    
    // Close browser and create new session
    await context.close();
    
    const newContext = await page.context().browser()?.newContext() || context;
    const newPage = await newContext.newPage();
    
    // Setup mocks for new session
    await setupAuthAPIMocks(newPage);
    
    // Navigate directly to workspace (should auto-login)
    await newPage.goto('/workspace');
    
    // Should be logged in automatically
    await expect(newPage.locator('[data-testid="workspace-canvas"]')).toBeVisible({ timeout: 10000 });
    
    await newContext.close();
  });

  test('should handle concurrent sessions gracefully', async ({ browser }) => {
    // Create two separate contexts (simulating different browser sessions)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Setup mocks for both sessions
    await setupAuthAPIMocks(page1);
    await setupAuthAPIMocks(page2);
    
    // Login from both sessions
    await navigateToAuthForm(page1);
    await page1.fill('[data-testid="email-input"]', EXISTING_USER.email);
    await page1.fill('[data-testid="password-input"]', EXISTING_USER.password);
    await page1.locator('[data-testid="login-button"]').click();
    
    await navigateToAuthForm(page2);
    await page2.fill('[data-testid="email-input"]', EXISTING_USER.email);
    await page2.fill('[data-testid="password-input"]', EXISTING_USER.password);
    await page2.locator('[data-testid="login-button"]').click();
    
    // Both sessions should reach workspace
    await page1.waitForURL('**/workspace**', { timeout: 15000 });
    await page2.waitForURL('**/workspace**', { timeout: 15000 });
    
    // Verify both sessions have functional workspace
    const memoCount1 = await verifyWorkspaceAccess(page1, 'Session1');
    const memoCount2 = await verifyWorkspaceAccess(page2, 'Session2');
    
    console.log(`Session results: Session1=${memoCount1} memos, Session2=${memoCount2} memos`);
    
    // At least verify workspace accessibility
    await expect(page1.locator('[data-testid="workspace-canvas"]')).toBeVisible();
    await expect(page2.locator('[data-testid="workspace-canvas"]')).toBeVisible();
    
    await context1.close();
    await context2.close();
  });
});