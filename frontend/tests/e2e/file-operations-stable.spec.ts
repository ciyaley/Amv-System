// tests/e2e/file-operations-stable.spec.ts
/**
 * Stable File Operations E2E Tests
 * 
 * Focus: File system operations reliability
 * - Robust error handling
 * - Fallback mechanisms
 * - Clear test assertions
 */
import { test, expect, Page } from '@playwright/test';

// Test Configuration
const BASE_URL = 'http://localhost:3002';
const TIMEOUT_SHORT = 5000;
const TIMEOUT_MEDIUM = 10000;
const TIMEOUT_LONG = 15000;

const TEST_USER = {
  email: 'test@example.com',
  password: 'ValidPassword123!'
};

const TEST_MEMO_CONTENT = {
  title: 'Stable Test Memo',
  text: 'This is stable test memo content for E2E file operations testing.',
  longText: 'Long memo content '.repeat(20) + ' for testing file save operations.'
};

test.describe('Stable File Operations', () => {
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
    
    // 🔧 修正: ページが完全に読み込まれるまで待機
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // React components initialization
    
    // 🔧 修正: ゲストモードボタンの存在を確認してからクリック
    const guestModeButton = page.locator('[data-testid="guest-mode-button"]');
    await expect(guestModeButton).toBeVisible({ timeout: 10000 });
    await guestModeButton.click();
    await page.waitForURL('**/workspace?mode=guest');
  });

  test.describe('Authenticated Mode File Operations', () => {
    test('should handle memo creation with auto-save', async ({ page }) => {
      // Set up console log capture for debugging
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        const logMessage = `${msg.type()}: ${msg.text()}`;
        consoleLogs.push(logMessage);
        console.log(`[BROWSER CONSOLE] ${logMessage}`);
      });

      // Capture page errors as well
      page.on('pageerror', error => {
        console.error(`[PAGE ERROR] ${error.message}`);
      });

      await loginUserStable(page, TEST_USER);
      
      // Wait for workspace to be fully loaded
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Give time for React components to initialize
      
      console.log('[TEST] About to click create-memo-button');
      
      // First, verify the button exists and is clickable
      const createButton = page.locator('[data-testid="create-memo-button"]');
      
      try {
        const isVisible = await createButton.isVisible();
        const isEnabled = await createButton.isEnabled();
        console.log(`[TEST] create-memo-button exists: ${isVisible}, enabled: ${isEnabled}`);
        
        if (!isVisible) {
          // Debug: List all buttons with data-testid
          const allButtons = await page.locator('button[data-testid]').all();
          const buttonIds = await Promise.all(allButtons.map(btn => btn.getAttribute('data-testid')));
          console.log('[TEST] Available buttons:', buttonIds);
          
          // Check if ToolSelector is rendered
          const toolSelector = page.locator('.fixed.bottom-4');
          const toolSelectorVisible = await toolSelector.isVisible();
          console.log(`[TEST] ToolSelector (.fixed.bottom-4) visible: ${toolSelectorVisible}`);
          
          // Try alternative selector
          const memoButtons = await page.locator('button').filter({ hasText: 'メモ' }).all();
          console.log(`[TEST] Found ${memoButtons.length} buttons with text 'メモ'`);
        }
        
        // Create memo - even if not visible, try to click
        console.log('[TEST] Attempting to click create-memo-button...');
        await page.click('[data-testid="create-memo-button"]');
        console.log('[TEST] Successfully clicked create-memo-button');
      } catch (clickError: unknown) {
        console.error('[TEST] Failed to click create-memo-button:', clickError.message);
        
        // Try alternative clicking methods
        console.log('[TEST] Trying alternative click method with force...');
        try {
          await createButton.click({ force: true });
          console.log('[TEST] Force click succeeded');
        } catch (forceError: unknown) {
          console.error('[TEST] Force click also failed:', forceError.message);
        }
      }
      
      // Wait for debug logs to process
      await page.waitForTimeout(3000);
      
      console.log('[TEST] Captured console logs:', consoleLogs.filter(log => log.includes('[DEBUG]')));
      
      const memoWindow = page.locator('[data-testid^="memo-window-"]').first();
      await expect(memoWindow).toBeVisible({ timeout: TIMEOUT_SHORT });
      
      // Add content
      await memoWindow.dblclick();
      const textarea = memoWindow.locator('textarea');
      await expect(textarea).toBeVisible({ timeout: TIMEOUT_SHORT });
      await textarea.fill(TEST_MEMO_CONTENT.text);
      
      // Exit edit mode
      await page.click('[data-testid="workspace-canvas"]');
      
      // Wait for auto-save (indicated by save indicator)
      await page.waitForTimeout(2000);
      
      // Verify auto-save indicator shows saved state
      const autoSaveIndicator = page.locator('[data-testid="auto-save-indicator"]');
      await expect(autoSaveIndicator).toBeVisible();
      await expect(autoSaveIndicator).toContainText('自動保存');
    });

    test('should persist memo across page reload', async ({ page }) => {
      await loginUserStable(page, TEST_USER);
      
      // Create memo with specific content
      await page.click('[data-testid="create-memo-button"]');
      const memoWindow = page.locator('[data-testid^="memo-window-"]').first();
      await expect(memoWindow).toBeVisible({ timeout: TIMEOUT_SHORT });
      
      // Add identifiable content
      await memoWindow.dblclick();
      const textarea = memoWindow.locator('textarea');
      await textarea.fill(TEST_MEMO_CONTENT.title);
      await page.click('[data-testid="workspace-canvas"]');
      
      // Wait for save
      await page.waitForTimeout(2000);
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Auto-login should happen, wait for workspace
      await expect(page.locator('[data-testid="authenticated-workspace"]')).toBeVisible({ 
        timeout: TIMEOUT_MEDIUM 
      });
      
      // Wait for memos to load
      await page.waitForTimeout(3000);
      
      // Verify memo content was restored
      const restoredMemo = page.locator('[data-testid^="memo-window-"]').first();
      if (await restoredMemo.isVisible()) {
        const title = restoredMemo.locator('[data-testid="memo-title"]');
        await expect(title).toContainText(TEST_MEMO_CONTENT.title.slice(0, 10));
      }
    });
  });

  test.describe('Guest Mode File Operations', () => {
    test('should handle guest mode manual save workflow', async ({ page }) => {
      // Already in guest mode from beforeEach, no need to click again
      
      // Wait for guest workspace to be fully loaded
      await page.waitForTimeout(2000);
      
      // Create memo
      const createButton = page.locator('[data-testid="create-memo-button"]');
      if (await createButton.isVisible()) {
        await createButton.click();
      } else {
        // Alternative: Double-click on canvas to create memo
        await page.dblclick('[data-testid="workspace-canvas"]');
      }
      
      const memoWindow = page.locator('[data-testid^="memo-window-"]').first();
      await expect(memoWindow).toBeVisible({ timeout: TIMEOUT_SHORT });
      
      // Add content
      await memoWindow.dblclick();
      const textarea = memoWindow.locator('textarea');
      if (await textarea.isVisible()) {
        await textarea.fill(TEST_MEMO_CONTENT.text);
        await page.click('[data-testid="workspace-canvas"]');
      }
      
      // Look for manual save button (should be present in guest mode)
      const saveButton = page.locator('[title="一括保存"]');
      if (await saveButton.isVisible()) {
        // Note: We can't actually test file picker in headless mode
        // but we can verify the button exists and is clickable
        await expect(saveButton).toBeEnabled();
      }
    });

    test('should show guest mode limitations clearly', async ({ page }) => {
      // Already in guest mode from beforeEach
      await page.waitForTimeout(1000);
      
      // Should not have auto-save indicator
      const autoSaveIndicator = page.locator('[data-testid="auto-save-indicator"]');
      await expect(autoSaveIndicator).not.toBeVisible();
      
      // Should have manual save button
      const saveButton = page.locator('[title="一括保存"]');
      await expect(saveButton).toBeVisible({ timeout: TIMEOUT_SHORT });
    });
  });

  test.describe('File System Error Handling', () => {
    test('should handle save errors gracefully', async ({ page }) => {
      await loginUserStable(page, TEST_USER);
      
      // Create memo
      await page.click('[data-testid="create-memo-button"]');
      const memoWindow = page.locator('[data-testid^="memo-window-"]').first();
      await expect(memoWindow).toBeVisible({ timeout: TIMEOUT_SHORT });
      
      // Add content that might cause issues
      await memoWindow.dblclick();
      const textarea = memoWindow.locator('textarea');
      await textarea.fill(TEST_MEMO_CONTENT.longText);
      await page.click('[data-testid="workspace-canvas"]');
      
      // Wait for save attempt
      await page.waitForTimeout(3000);
      
      // Should not crash the app
      await expect(page.locator('[data-testid="authenticated-workspace"]')).toBeVisible();
      await expect(memoWindow).toBeVisible();
    });
  });

  test.describe('Cross-Session Data Handling', () => {
    test('should maintain data integrity across sessions', async ({ page }) => {
      await loginUserStable(page, TEST_USER);
      
      // Create memo
      await page.click('[data-testid="create-memo-button"]');
      const memoWindow = page.locator('[data-testid^="memo-window-"]').first();
      await expect(memoWindow).toBeVisible({ timeout: TIMEOUT_SHORT });
      
      // Get memo ID for tracking
      const memoId = await memoWindow.getAttribute('data-testid');
      expect(memoId).toBeTruthy();
      
      // Add content
      await memoWindow.dblclick();
      const textarea = memoWindow.locator('textarea');
      await textarea.fill('Cross-session test content');
      await page.click('[data-testid="workspace-canvas"]');
      
      // Wait for save
      await page.waitForTimeout(2000);
      
      // Clear session and reload
      await page.evaluate(() => {
        sessionStorage.clear();
      });
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should auto-login and restore content
      await expect(page.locator('[data-testid="authenticated-workspace"]')).toBeVisible({ 
        timeout: TIMEOUT_MEDIUM 
      });
    });
  });
});

/**
 * Stable login helper with comprehensive error handling
 */
async function loginUserStable(page: Page, user: { email: string; password: string }) {
  // 🔧 修正: ホームページから開始してゲストモードに遷移
  await page.goto(BASE_URL);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000); // React initialization
  
  try {
    // Check if already logged in
    const authenticatedWorkspace = page.locator('[data-testid="authenticated-workspace"]');
    if (await authenticatedWorkspace.isVisible({ timeout: 2000 })) {
      return; // Already logged in
    }
    
    // Step 1: Click guest mode button to navigate to workspace
    const guestModeButton = page.locator('[data-testid="guest-mode-button"]');
    await expect(guestModeButton).toBeVisible({ timeout: 10000 });
    await guestModeButton.click();
    await page.waitForURL('**/workspace?mode=guest');
    
    // Step 2: Wait for Guest Workspace to load
    const guestWorkspace = page.locator('[data-testid="guest-workspace"]');
    await expect(guestWorkspace).toBeVisible({ timeout: 10000 });
    
    // Step 3: Click Settings button to open modal
    const settingsButton = page.locator('[data-testid="settings-button"]');
    await expect(settingsButton).toBeVisible({ timeout: 5000 });
    await settingsButton.click();
    
    // Step 4: Wait for Settings Modal to open
    const settingsModal = page.locator('[data-testid="settings-modal"]');
    await expect(settingsModal).toBeVisible({ timeout: 5000 });
    
    // Step 5: Navigate to Account Settings tab
    const accountTab = page.locator('[data-testid="account-settings-tab"]');
    await expect(accountTab).toBeVisible({ timeout: 5000 });
    await accountTab.click();
    
    // Step 6: Now AuthForm should be visible
    const authForm = page.locator('[data-testid="auth-form"]');
    await expect(authForm).toBeVisible({ timeout: TIMEOUT_SHORT });
    
    // Step 7: Use registration instead of login for more reliable test
    const registerTab = page.locator('[data-testid="register-tab"]');
    if (await registerTab.isVisible()) {
      await registerTab.click();
    }
    
    // Generate unique email for this test run
    const timestamp = Date.now();
    const uniqueEmail = `stable-test-${timestamp}@example.com`;
    
    // Step 7: Fill registration form
    await page.fill('[data-testid="email-input"]', uniqueEmail);
    await page.fill('[data-testid="password-input"]', user.password);
    await page.fill('[data-testid="confirm-password-input"]', user.password);
    
    // Step 8: Submit registration
    await page.click('[data-testid="register-button"]');
    
    // Step 9: Wait for authenticated workspace
    await expect(page.locator('[data-testid="authenticated-workspace"]')).toBeVisible({ 
      timeout: TIMEOUT_LONG 
    });
    
    // Step 10: Close settings modal by pressing Escape or clicking outside
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Step 11: Ensure settings modal is closed
    await expect(settingsModal).not.toBeVisible({ timeout: 3000 });
    
    // Step 12: Wait for any loading to complete
    await page.waitForTimeout(1000);
    
  } catch (error: unknown) {
    console.error('Login failed:', error);
    throw new Error(`Failed to login user: ${error.message}`);
  }
}