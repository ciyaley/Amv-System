// tests/e2e/auth-basic-flow.spec.ts - Basic Authentication Flow Tests
import { test, expect } from '@playwright/test';
import { navigateToAuthForm, setupAuthAPIMocks, TEST_USER, EXISTING_USER } from './auth-helpers';

test.describe('Basic Authentication Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAPIMocks(page);
  });

  test('should complete full registration flow', async ({ page }) => {
    await navigateToAuthForm(page);
    
    // Switch to register mode
    const registerTab = page.locator('[data-testid="register-tab"]');
    await expect(registerTab).toBeVisible();
    await registerTab.click();
    
    // Fill registration form
    await page.fill('[data-testid="email-input"]', TEST_USER.email);
    await page.fill('[data-testid="password-input"]', TEST_USER.password);
    await page.fill('[data-testid="confirm-password-input"]', TEST_USER.password);
    
    // Submit registration
    const registerButton = page.locator('[data-testid="register-button"]');
    await expect(registerButton).toBeVisible();
    await registerButton.click();
    
    // Wait for loading to complete
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible({ timeout: 10000 });
    
    // Should redirect to workspace
    await page.waitForURL('**/workspace**', { timeout: 15000 });
    await expect(page.locator('[data-testid="workspace-canvas"]')).toBeVisible({ timeout: 10000 });
  });

  test('should reject registration with weak password', async ({ page }) => {
    await navigateToAuthForm(page);
    
    // Switch to register mode
    const registerTab = page.locator('[data-testid="register-tab"]');
    await registerTab.click();
    
    // Fill form with weak password
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'weak');
    await page.fill('[data-testid="confirm-password-input"]', 'weak');
    
    // Submit registration
    const registerButton = page.locator('[data-testid="register-button"]');
    await registerButton.click();
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Password must be at least 12 characters');
    
    // Should stay on auth form
    await expect(page.locator('[data-testid="auth-form"]')).toBeVisible();
  });

  test('should handle duplicate email registration', async ({ page }) => {
    await navigateToAuthForm(page);
    
    // Switch to register mode
    const registerTab = page.locator('[data-testid="register-tab"]');
    await registerTab.click();
    
    // Try to register with existing email
    await page.fill('[data-testid="email-input"]', EXISTING_USER.email);
    await page.fill('[data-testid="password-input"]', 'newpassword123456');
    await page.fill('[data-testid="confirm-password-input"]', 'newpassword123456');
    
    const registerButton = page.locator('[data-testid="register-button"]');
    await registerButton.click();
    
    // Should show duplicate email error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Email already exists');
  });

  test('should complete full login flow', async ({ page }) => {
    await navigateToAuthForm(page);
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', EXISTING_USER.email);
    await page.fill('[data-testid="password-input"]', EXISTING_USER.password);
    
    // Submit login
    const loginButton = page.locator('[data-testid="login-button"]');
    await expect(loginButton).toBeVisible();
    await loginButton.click();
    
    // Should show loading state
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    
    // Should redirect to workspace after successful login
    await page.waitForURL('**/workspace**', { timeout: 15000 });
    await expect(page.locator('[data-testid="workspace-canvas"]')).toBeVisible({ timeout: 10000 });
    
    // Verify authenticated workspace features
    const settingsButton = page.locator('[data-testid="settings-button"]');
    await expect(settingsButton).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await navigateToAuthForm(page);
    
    // Fill with invalid credentials
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrong-password');
    
    // Submit login
    const loginButton = page.locator('[data-testid="login-button"]');
    await loginButton.click();
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
    
    // Should stay on auth form
    await expect(page.locator('[data-testid="auth-form"]')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await navigateToAuthForm(page);
    
    // Add network error header
    await page.setExtraHTTPHeaders({ 'x-test-scenario': 'network-error' });
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', EXISTING_USER.email);
    await page.fill('[data-testid="password-input"]', EXISTING_USER.password);
    
    // Submit login
    const loginButton = page.locator('[data-testid="login-button"]');
    await loginButton.click();
    
    // Should show network error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/network|connection|fetch/i);
  });

  test('should complete logout flow', async ({ page }) => {
    // First login
    await navigateToAuthForm(page);
    await page.fill('[data-testid="email-input"]', EXISTING_USER.email);
    await page.fill('[data-testid="password-input"]', EXISTING_USER.password);
    await page.locator('[data-testid="login-button"]').click();
    
    // Wait for workspace to load
    await page.waitForURL('**/workspace**', { timeout: 15000 });
    await expect(page.locator('[data-testid="workspace-canvas"]')).toBeVisible();
    
    // Open settings
    const settingsButton = page.locator('[data-testid="settings-button"]');
    await settingsButton.click();
    
    // Click account tab
    const accountTab = page.locator('[data-testid="account-settings-tab"]');
    await accountTab.click();
    
    // Logout
    const logoutButton = page.locator('[data-testid="logout-button"]');
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();
    
    // Should show auth form again
    await expect(page.locator('[data-testid="auth-form"]')).toBeVisible({ timeout: 10000 });
    
    // Verify logout success
    const emailInput = page.locator('[data-testid="email-input"]');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveValue(''); // Should be cleared
  });
});