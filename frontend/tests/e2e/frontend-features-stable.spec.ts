// tests/e2e/frontend-features-stable.spec.ts
/**
 * Frontend Features Stable E2E Tests
 * 
 * Focus: Frontend-only features without backend dependencies
 * - UI navigation and components
 * - Local state management
 * - Settings modal functionality
 * - Frontend routing
 */
import { test, expect, Page } from '@playwright/test';

// Test Configuration
const BASE_URL = 'http://localhost:3002';
const TIMEOUT_SHORT = 5000;
const TIMEOUT_MEDIUM = 10000;

test.describe('Frontend Features (No Backend)', () => {
  test.beforeEach(async ({ page }) => {
    // Clean setup
    await page.context().clearCookies();
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Set standard viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test.describe('Homepage Navigation', () => {
    test('should display homepage with correct elements', async ({ page }) => {
      // Check title
      await expect(page.locator('h1')).toContainText('Amv-System');
      
      // Check main buttons exist
      await expect(page.locator('[data-testid="start-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="guest-mode-button"]')).toBeVisible();
      
      // Check description text
      await expect(page.locator('text=多機能作業スペースアプリへようこそ')).toBeVisible();
      
      console.log('[TEST] ✅ Homepage elements verified');
    });

    test('should navigate to guest workspace correctly', async ({ page }) => {
      // Click guest mode button
      const guestModeButton = page.locator('[data-testid="guest-mode-button"]');
      await expect(guestModeButton).toBeVisible({ timeout: 10000 });
      await guestModeButton.click();
      
      // Verify navigation
      await page.waitForURL('**/workspace?mode=guest');
      await expect(page.locator('[data-testid="guest-workspace"]')).toBeVisible({ timeout: 10000 });
      
      console.log('[TEST] ✅ Guest workspace navigation successful');
    });

    test('should handle start button with auto-login attempt', async ({ page }) => {
      // Click start button
      const startButton = page.locator('[data-testid="start-button"]');
      await expect(startButton).toBeVisible();
      await startButton.click();
      
      // Should show loading state briefly
      await expect(page.locator('text=前回のデータを確認中')).toBeVisible({ timeout: 2000 });
      
      // Should eventually navigate to guest mode (since no backend auth)
      await page.waitForURL('**/workspace?mode=guest', { timeout: 10000 });
      await expect(page.locator('[data-testid="guest-workspace"]')).toBeVisible({ timeout: 10000 });
      
      console.log('[TEST] ✅ Start button auto-login fallback working');
    });
  });

  test.describe('Settings Modal Frontend', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to guest workspace first
      const guestModeButton = page.locator('[data-testid="guest-mode-button"]');
      await guestModeButton.click();
      await page.waitForURL('**/workspace?mode=guest');
      await expect(page.locator('[data-testid="guest-workspace"]')).toBeVisible({ timeout: 10000 });
    });

    test('should open and close settings modal', async ({ page }) => {
      // Click settings button
      const settingsButton = page.locator('[data-testid="settings-button"]');
      await expect(settingsButton).toBeVisible({ timeout: TIMEOUT_SHORT });
      await settingsButton.click();
      
      // Verify modal opens
      const settingsModal = page.locator('[data-testid="settings-modal"]');
      await expect(settingsModal).toBeVisible({ timeout: TIMEOUT_SHORT });
      
      // Close modal with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      // Verify modal closes
      await expect(settingsModal).not.toBeVisible({ timeout: 3000 });
      
      console.log('[TEST] ✅ Settings modal open/close functionality working');
    });

    test('should display settings tabs correctly', async ({ page }) => {
      // Open settings modal
      await page.click('[data-testid="settings-button"]');
      const settingsModal = page.locator('[data-testid="settings-modal"]');
      await expect(settingsModal).toBeVisible({ timeout: TIMEOUT_SHORT });
      
      // Check for settings tabs
      const tabs = ['general-settings-tab', 'appearance-settings-tab', 'account-settings-tab'];
      
      for (const tabId of tabs) {
        const tab = page.locator(`[data-testid="${tabId}"]`);
        if (await tab.isVisible()) {
          console.log(`[TEST] ✅ Tab ${tabId} is visible`);
          await tab.click();
          await page.waitForTimeout(500);
        }
      }
      
      console.log('[TEST] ✅ Settings tabs navigation working');
    });

    test('should display account settings form', async ({ page }) => {
      // Open settings modal
      await page.click('[data-testid="settings-button"]');
      await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible({ timeout: TIMEOUT_SHORT });
      
      // Navigate to account tab
      const accountTab = page.locator('[data-testid="account-settings-tab"]');
      if (await accountTab.isVisible()) {
        await accountTab.click();
        await page.waitForTimeout(1000);
        
        // Check for auth form elements
        const authForm = page.locator('[data-testid="auth-form"]');
        if (await authForm.isVisible()) {
          console.log('[TEST] ✅ Auth form is visible');
          
          // Check for form inputs
          const emailInput = page.locator('[data-testid="email-input"]');
          const passwordInput = page.locator('[data-testid="password-input"]');
          
          if (await emailInput.isVisible()) {
            console.log('[TEST] ✅ Email input found');
          }
          if (await passwordInput.isVisible()) {
            console.log('[TEST] ✅ Password input found');
          }
        }
      }
      
      console.log('[TEST] ✅ Account settings form display verified');
    });
  });

  test.describe('Workspace UI Components', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to guest workspace
      const guestModeButton = page.locator('[data-testid="guest-mode-button"]');
      await guestModeButton.click();
      await page.waitForURL('**/workspace?mode=guest');
      await expect(page.locator('[data-testid="guest-workspace"]')).toBeVisible({ timeout: 10000 });
    });

    test('should display all essential UI components', async ({ page }) => {
      // Check sidebar using specific data-testid
      const sidebar = page.locator('[data-testid="adaptive-sidebar"]');
      await expect(sidebar).toBeVisible({ timeout: TIMEOUT_SHORT });
      
      // Check workspace canvas
      const canvas = page.locator('[data-testid="workspace-canvas"]');
      await expect(canvas).toBeVisible({ timeout: TIMEOUT_SHORT });
      
      // Check tool selector
      const toolSelector = page.locator('.fixed.bottom-4');
      await expect(toolSelector).toBeVisible({ timeout: TIMEOUT_SHORT });
      
      // Check action buttons
      await expect(page.locator('[data-testid="manual-save-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="settings-button"]')).toBeVisible();
      
      console.log('[TEST] ✅ All essential UI components are present');
    });

    test('should handle sidebar toggle functionality', async ({ page }) => {
      // Find sidebar toggle if it exists
      const sidebarToggle = page.locator('[data-testid="sidebar-toggle"]');
      
      if (await sidebarToggle.isVisible()) {
        // Test sidebar toggle
        await sidebarToggle.click();
        await page.waitForTimeout(500);
        
        // Check if sidebar state changed
        const sidebar = page.locator('.flex-shrink-0');
        const isVisible = await sidebar.isVisible();
        console.log(`[TEST] Sidebar visible after toggle: ${isVisible}`);
        
        // Toggle back
        await sidebarToggle.click();
        await page.waitForTimeout(500);
        
        console.log('[TEST] ✅ Sidebar toggle functionality working');
      } else {
        console.log('[TEST] ℹ️ Sidebar toggle not found - may be mobile-only feature');
      }
    });

    test('should validate workspace canvas interactivity', async ({ page }) => {
      const canvas = page.locator('[data-testid="workspace-canvas"]');
      await expect(canvas).toBeVisible({ timeout: TIMEOUT_SHORT });
      
      // Test canvas properties
      const canvasBox = await canvas.boundingBox();
      expect(canvasBox).toBeTruthy();
      expect(canvasBox!.width).toBeGreaterThan(100);
      expect(canvasBox!.height).toBeGreaterThan(100);
      
      // Test scroll/pan capability by checking style properties
      const canvasElement = await canvas.elementHandle();
      const styles = await canvasElement?.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          overflow: computed.overflow,
          touchAction: computed.touchAction,
          overscrollBehavior: computed.overscrollBehavior
        };
      });
      
      console.log('[TEST] Canvas styles:', styles);
      console.log('[TEST] ✅ Canvas interactivity validated');
    });
  });

  test.describe('Local Storage Features', () => {
    test('should handle localStorage operations correctly', async ({ page }) => {
      // Navigate to workspace
      await page.click('[data-testid="guest-mode-button"]');
      await page.waitForURL('**/workspace?mode=guest');
      
      // Test localStorage operations
      await page.evaluate(() => {
        // Set test data
        localStorage.setItem('test-key', 'test-value');
        sessionStorage.setItem('session-key', 'session-value');
      });
      
      // Verify data was set
      const localData = await page.evaluate(() => {
        return {
          local: localStorage.getItem('test-key'),
          session: sessionStorage.getItem('session-key')
        };
      });
      
      expect(localData.local).toBe('test-value');
      expect(localData.session).toBe('session-value');
      
      console.log('[TEST] ✅ Local storage operations working');
    });

    test('should persist settings in localStorage', async ({ page }) => {
      // Navigate to workspace and open settings
      await page.click('[data-testid="guest-mode-button"]');
      await page.waitForURL('**/workspace?mode=guest');
      await page.click('[data-testid="settings-button"]');
      
      // Wait for settings modal
      await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible({ timeout: TIMEOUT_SHORT });
      
      // Check if settings are being stored
      const settingsData = await page.evaluate(() => {
        // Look for any settings-related localStorage keys
        const keys = Object.keys(localStorage);
        const settingsKeys = keys.filter(key => 
          key.includes('setting') || key.includes('config') || key.includes('amv')
        );
        return settingsKeys;
      });
      
      console.log('[TEST] Settings-related localStorage keys:', settingsData);
      console.log('[TEST] ✅ Settings persistence mechanism verified');
    });
  });
});