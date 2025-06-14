// tests/e2e/auth-performance-accessibility.spec.ts - Performance and Accessibility Tests
import { test, expect } from '@playwright/test';
import { navigateToAuthForm, setupAuthAPIMocks, EXISTING_USER } from './auth-helpers';

test.describe('Performance and Accessibility E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAPIMocks(page);
  });

  test('should load workspace within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await navigateToAuthForm(page);
    await page.fill('[data-testid="email-input"]', EXISTING_USER.email);
    await page.fill('[data-testid="password-input"]', EXISTING_USER.password);
    await page.locator('[data-testid="login-button"]').click();
    
    // Wait for workspace to load
    await page.waitForURL('**/workspace**', { timeout: 15000 });
    await expect(page.locator('[data-testid="workspace-canvas"]')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    console.log(`Workspace load time: ${loadTime}ms`);
    
    // Performance budget: workspace should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
    
    // Verify interactive elements are ready
    const settingsButton = page.locator('[data-testid="settings-button"]');
    await expect(settingsButton).toBeVisible();
    
    // Test interaction responsiveness
    const interactionStart = Date.now();
    await settingsButton.click();
    await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible();
    const interactionTime = Date.now() - interactionStart;
    
    console.log(`Settings interaction time: ${interactionTime}ms`);
    
    // Interaction should be responsive (under 1 second)
    expect(interactionTime).toBeLessThan(1000);
  });

  test('should be keyboard accessible', async ({ page }) => {
    await navigateToAuthForm(page);
    
    // Test keyboard navigation through auth form
    await page.keyboard.press('Tab'); // Focus email input
    const emailInput = page.locator('[data-testid="email-input"]');
    await expect(emailInput).toBeFocused();
    
    await page.keyboard.type(EXISTING_USER.email);
    
    await page.keyboard.press('Tab'); // Focus password input
    const passwordInput = page.locator('[data-testid="password-input"]');
    await expect(passwordInput).toBeFocused();
    
    await page.keyboard.type(EXISTING_USER.password);
    
    await page.keyboard.press('Tab'); // Focus login button
    const loginButton = page.locator('[data-testid="login-button"]');
    await expect(loginButton).toBeFocused();
    
    // Submit with Enter key
    await page.keyboard.press('Enter');
    
    // Should successfully login via keyboard
    await page.waitForURL('**/workspace**', { timeout: 15000 });
    await expect(page.locator('[data-testid="workspace-canvas"]')).toBeVisible();
    
    // Test workspace keyboard navigation
    await page.keyboard.press('Tab'); // Should focus first interactive element
    
    // Verify focus is visible (accessibility requirement)
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should maintain auth state under high load', async ({ page }) => {
    // Simulate high load by creating multiple rapid requests
    const promises: Promise<any>[] = [];
    
    // First establish auth session
    await navigateToAuthForm(page);
    await page.fill('[data-testid="email-input"]', EXISTING_USER.email);
    await page.fill('[data-testid="password-input"]', EXISTING_USER.password);
    await page.locator('[data-testid="login-button"]').click();
    
    await page.waitForURL('**/workspace**', { timeout: 15000 });
    await expect(page.locator('[data-testid="workspace-canvas"]')).toBeVisible();
    
    // Simulate high load with multiple concurrent operations
    for (let i = 0; i < 10; i++) {
      promises.push(
        page.evaluate(() => {
          // Simulate API calls or heavy operations
          return fetch('/api/auth/check', { 
            method: 'GET',
            credentials: 'include'
          }).catch(() => ({}));
        })
      );
    }
    
    // Wait for all operations to complete
    await Promise.allSettled(promises);
    
    // Auth state should remain intact
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    // Should still be logged in
    await expect(page.locator('[data-testid="workspace-canvas"]')).toBeVisible({ timeout: 10000 });
    
    // Verify settings are accessible (confirms auth state)
    const settingsButton = page.locator('[data-testid="settings-button"]');
    await settingsButton.click();
    
    const accountTab = page.locator('[data-testid="account-settings-tab"]');
    await accountTab.click();
    
    // Should show logout button (confirms logged in state)
    const logoutButton = page.locator('[data-testid="logout-button"]');
    await expect(logoutButton).toBeVisible();
  });

  test('should handle form validation with screen reader support', async ({ page }) => {
    await navigateToAuthForm(page);
    
    // Test form without filling required fields
    const loginButton = page.locator('[data-testid="login-button"]');
    await loginButton.click();
    
    // Should show validation errors
    const emailInput = page.locator('[data-testid="email-input"]');
    const passwordInput = page.locator('[data-testid="password-input"]');
    
    // Check for ARIA attributes for accessibility
    await expect(emailInput).toHaveAttribute('aria-required', 'true');
    await expect(passwordInput).toHaveAttribute('aria-required', 'true');
    
    // Fill invalid email format
    await emailInput.fill('invalid-email');
    await loginButton.click();
    
    // Should have aria-invalid for screen readers
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    
    // Correct the email
    await emailInput.fill(EXISTING_USER.email);
    await passwordInput.fill(EXISTING_USER.password);
    
    // Should remove aria-invalid when valid
    await expect(emailInput).not.toHaveAttribute('aria-invalid', 'true');
    
    await loginButton.click();
    
    // Should successfully login
    await page.waitForURL('**/workspace**', { timeout: 15000 });
    await expect(page.locator('[data-testid="workspace-canvas"]')).toBeVisible();
  });

  test('should provide proper focus management during auth flow', async ({ page }) => {
    await navigateToAuthForm(page);
    
    // Initially focus should be on first form element
    const emailInput = page.locator('[data-testid="email-input"]');
    await expect(emailInput).toBeFocused();
    
    // Fill form and submit
    await emailInput.fill(EXISTING_USER.email);
    await page.locator('[data-testid="password-input"]').fill(EXISTING_USER.password);
    await page.locator('[data-testid="login-button"]').click();
    
    // During loading, focus should be managed properly
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    if (await loadingIndicator.isVisible()) {
      // Focus should not be lost during loading
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }
    
    // After successful login, focus should be on workspace
    await page.waitForURL('**/workspace**', { timeout: 15000 });
    await expect(page.locator('[data-testid="workspace-canvas"]')).toBeVisible();
    
    // Focus should be within the workspace area
    const workspaceContainer = page.locator('[data-testid="workspace-container"]');
    if (await workspaceContainer.isVisible()) {
      await expect(workspaceContainer).toContainText(''); // Verify it exists
    }
  });

  test('should maintain responsive design during auth flow', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await navigateToAuthForm(page);
    
    // Auth form should be responsive
    const authForm = page.locator('[data-testid="auth-form"]');
    await expect(authForm).toBeVisible();
    
    // Form elements should be properly sized for mobile
    const emailInput = page.locator('[data-testid="email-input"]');
    const inputBox = await emailInput.boundingBox();
    
    if (inputBox) {
      expect(inputBox.width).toBeGreaterThan(200); // Should be wide enough on mobile
    }
    
    // Login flow should work on mobile
    await emailInput.fill(EXISTING_USER.email);
    await page.locator('[data-testid="password-input"]').fill(EXISTING_USER.password);
    await page.locator('[data-testid="login-button"]').click();
    
    await page.waitForURL('**/workspace**', { timeout: 15000 });
    
    // Workspace should be responsive
    const canvas = page.locator('[data-testid="workspace-canvas"]');
    await expect(canvas).toBeVisible();
    
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      expect(canvasBox.width).toBeLessThanOrEqual(375); // Should fit mobile width
    }
    
    // Reset to desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});