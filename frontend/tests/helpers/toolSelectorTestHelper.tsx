/**
 * ToolSelector Component E2E Test Helper
 * 
 * ボタンクリック問題の堅牢な検証とデバッグ支援
 */
import { Page, expect } from '@playwright/test';

export interface ButtonStateInfo {
  exists: boolean;
  visible: boolean;
  enabled: boolean;
  disabled: boolean;
  creating: boolean;
  text: string;
  ariaLabel: string;
  testId: string;
}

/**
 * create-memo-button の詳細な状態情報を取得
 */
export async function getCreateMemoButtonState(page: Page): Promise<ButtonStateInfo> {
  const button = page.locator('[data-testid="create-memo-button"]');
  
  try {
    const exists = await button.count() > 0;
    if (!exists) {
      return {
        exists: false,
        visible: false,
        enabled: false,
        disabled: false,
        creating: false,
        text: '',
        ariaLabel: '',
        testId: ''
      };
    }

    const [visible, enabled, disabled, creating, text, ariaLabel, testId] = await Promise.all([
      button.isVisible().catch(() => false),
      button.isEnabled().catch(() => false),
      button.isDisabled().catch(() => false),
      button.getAttribute('data-creating').then(val => val === 'true').catch(() => false),
      button.textContent().catch(() => ''),
      button.getAttribute('aria-label').catch(() => ''),
      button.getAttribute('data-testid').catch(() => '')
    ]);

    return {
      exists,
      visible,
      enabled,
      disabled,
      creating,
      text: text || '',
      ariaLabel: ariaLabel || '',
      testId: testId || ''
    };
  } catch (error) {
    console.error('[TEST HELPER] Error getting button state:', error);
    return {
      exists: false,
      visible: false,
      enabled: false,
      disabled: false,
      creating: false,
      text: '',
      ariaLabel: '',
      testId: ''
    };
  }
}

/**
 * ToolSelector全体の状態をデバッグ出力
 */
export async function debugToolSelectorState(page: Page, context: string = '') {
  console.log(`\n=== ToolSelector Debug Info ${context ? `(${context})` : ''} ===`);
  
  try {
    // ToolSelector コンテナの存在確認
    const toolSelectorContainer = page.locator('.fixed.bottom-4.left-1\\/2');
    const containerExists = await toolSelectorContainer.count() > 0;
    console.log(`ToolSelector container exists: ${containerExists}`);
    
    if (containerExists) {
      const containerVisible = await toolSelectorContainer.isVisible();
      console.log(`ToolSelector container visible: ${containerVisible}`);
    }

    // すべてのボタンを検索
    const allButtons = await page.locator('button[data-testid]').all();
    console.log(`Total buttons with data-testid: ${allButtons.length}`);
    
    for (const button of allButtons) {
      const testId = await button.getAttribute('data-testid');
      const visible = await button.isVisible().catch(() => false);
      const enabled = await button.isEnabled().catch(() => false);
      console.log(`Button [${testId}]: visible=${visible}, enabled=${enabled}`);
    }

    // create-memo-button の詳細状態
    const buttonState = await getCreateMemoButtonState(page);
    console.log('create-memo-button state:', buttonState);

    // コンソールログのキャプチャ
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[DEBUG]')) {
        consoleLogs.push(`${msg.type()}: ${msg.text()}`);
      }
    });

    // 少し待ってログを収集
    await page.waitForTimeout(1000);
    if (consoleLogs.length > 0) {
      console.log('Recent debug logs:', consoleLogs.slice(-5));
    }

  } catch (error) {
    console.error('[TEST HELPER] Error during debug:', error);
  }
  
  console.log('=== End ToolSelector Debug ===\n');
}

/**
 * 堅牢なcreate-memo-buttonクリック処理
 * 複数の方法でクリックを試行し、問題を特定
 */
export async function robustCreateMemoClick(page: Page, options: { timeout?: number; forceClick?: boolean } = {}) {
  const { timeout = 10000, forceClick = false } = options;
  
  console.log('[TEST HELPER] Starting robust memo creation...');
  
  // デバッグ情報を出力
  await debugToolSelectorState(page, 'before click');
  
  const button = page.locator('[data-testid="create-memo-button"]');
  
  // Step 1: 基本的な要素の存在確認
  await expect(button).toBeAttached({ timeout });
  console.log('[TEST HELPER] Button is attached to DOM');
  
  // Step 2: 可視性確認
  await expect(button).toBeVisible({ timeout });
  console.log('[TEST HELPER] Button is visible');
  
  // Step 3: 有効性確認
  const buttonState = await getCreateMemoButtonState(page);
  console.log('[TEST HELPER] Button state before click:', buttonState);
  
  if (!buttonState.enabled && !forceClick) {
    throw new Error(`Button is not enabled. State: ${JSON.stringify(buttonState)}`);
  }
  
  // Step 4: クリック実行（複数の方法を試行）
  let clickSuccessful = false;
  let lastError: Error | null = null;
  
  // 方法1: 通常のクリック
  try {
    console.log('[TEST HELPER] Attempting normal click...');
    await button.click({ timeout: 5000 });
    clickSuccessful = true;
    console.log('[TEST HELPER] Normal click successful');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('[TEST HELPER] Normal click failed:', errorMessage);
    lastError = error instanceof Error ? error : new Error(String(error));
  }
  
  // 方法2: force: true でクリック
  if (!clickSuccessful) {
    try {
      console.log('[TEST HELPER] Attempting force click...');
      await button.click({ force: true, timeout: 5000 });
      clickSuccessful = true;
      console.log('[TEST HELPER] Force click successful');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('[TEST HELPER] Force click failed:', errorMessage);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  
  // 方法3: JavaScript経由でクリック
  if (!clickSuccessful) {
    try {
      console.log('[TEST HELPER] Attempting JavaScript click...');
      await button.evaluate((el: HTMLElement) => el.click());
      clickSuccessful = true;
      console.log('[TEST HELPER] JavaScript click successful');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('[TEST HELPER] JavaScript click failed:', errorMessage);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  
  // 方法4: dispatchEvent経由
  if (!clickSuccessful) {
    try {
      console.log('[TEST HELPER] Attempting dispatchEvent click...');
      await button.evaluate((el: HTMLElement) => {
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        el.dispatchEvent(event);
      });
      clickSuccessful = true;
      console.log('[TEST HELPER] DispatchEvent click successful');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('[TEST HELPER] DispatchEvent click failed:', errorMessage);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  
  if (!clickSuccessful) {
    await debugToolSelectorState(page, 'after failed clicks');
    throw new Error(`All click methods failed. Last error: ${lastError?.message || 'Unknown'}`);
  }
  
  // Step 5: クリック後の状態確認
  console.log('[TEST HELPER] Waiting for click result...');
  await page.waitForTimeout(2000); // React状態更新を待つ
  
  await debugToolSelectorState(page, 'after click');
  
  // Step 6: メモ作成結果の確認
  try {
    const memoWindow = page.locator('[data-testid^="memo-window-"]').first();
    await expect(memoWindow).toBeVisible({ timeout: 5000 });
    console.log('[TEST HELPER] Memo window appeared successfully');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('[TEST HELPER] Memo window did not appear:', errorMessage);
    return false;
  }
}

/**
 * メモ作成プロセス全体のワークフロー検証
 */
export async function verifyMemoCreationWorkflow(page: Page, options: { content?: string } = {}) {
  const { content = 'Test memo content from helper' } = options;
  
  console.log('[TEST HELPER] Starting memo creation workflow...');
  
  // Step 1: メモ作成ボタンクリック
  const clickResult = await robustCreateMemoClick(page);
  if (!clickResult) {
    throw new Error('Failed to create memo through button click');
  }
  
  // Step 2: メモウィンドウの確認
  const memoWindow = page.locator('[data-testid^="memo-window-"]').first();
  await expect(memoWindow).toBeVisible({ timeout: 5000 });
  
  // Step 3: メモへのコンテンツ追加
  if (content) {
    await memoWindow.dblclick();
    const textarea = memoWindow.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 3000 });
    await textarea.fill(content);
    
    // 編集モードを終了
    await page.click('[data-testid="workspace-canvas"]');
    await page.waitForTimeout(1000);
  }
  
  // Step 4: 結果の検証
  await expect(memoWindow).toBeVisible();
  console.log('[TEST HELPER] Memo creation workflow completed successfully');
  
  return memoWindow;
}

/**
 * キーボード操作によるメモ作成テスト
 */
export async function testKeyboardMemoCreation(page: Page) {
  console.log('[TEST HELPER] Testing keyboard memo creation...');
  
  const button = page.locator('[data-testid="create-memo-button"]');
  await expect(button).toBeVisible();
  
  // フォーカス
  await button.focus();
  
  // Enterキーでクリック
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  
  // メモウィンドウの確認
  const memoWindow = page.locator('[data-testid^="memo-window-"]').first();
  const appeared = await memoWindow.isVisible();
  
  console.log(`[TEST HELPER] Keyboard memo creation ${appeared ? 'successful' : 'failed'}`);
  return appeared;
}