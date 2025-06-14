#!/usr/bin/env node

/**
 * 高速テスト実行スクリプト
 * テストを小さなバッチに分割してメモリリークと競合状態を防ぐ
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

interface TestGroup {
  name: string;
  patterns?: string[];
  timeout: number;
}

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  output?: string;
  error?: string;
}

interface TestReport {
  timestamp: string;
  totalTime: number;
  successful: number;
  failed: number;
  results: TestResult[];
}

// テストグループの定義
const testGroups: TestGroup[] = [
  {
    name: 'Unit Tests - Hooks Basic',
    patterns: ['app/hooks/__tests__/useMemos.test.ts', 'app/hooks/__tests__/useAuth.test.ts', 'app/hooks/__tests__/useSettings.test.ts'],
    timeout: 30000
  },
  {
    name: 'Unit Tests - Hooks Integration',
    patterns: ['app/hooks/__tests__/*.integration.test.ts'],
    timeout: 45000
  },
  {
    name: 'Unit Tests - Components',
    patterns: ['app/components/__tests__/SidebarSearch.test.tsx', 'app/components/__tests__/SidebarItem.test.tsx'],
    timeout: 30000
  },
  {
    name: 'Utils Tests',
    patterns: ['utils/__tests__/fileAccess.test.ts', 'utils/__tests__/encryption.test.ts'],
    timeout: 30000
  },
  {
    name: 'Comprehensive Tests',
    patterns: ['app/components/__tests__/MemoWindowComprehensive.test.tsx'],
    timeout: 60000
  }
];

/**
 * テストグループを実行
 */
async function runTestGroup(group: TestGroup): Promise<TestResult> {
  console.log(`\n🧪 Running ${group.name}...`);
  
  try {
    const startTime = Date.now();
    
    let command = 'npx vitest --run';
    
    if (group.patterns) {
      command += ` ${group.patterns.join(' ')}`;
    }
    
    // メモリ制限とタイムアウト設定
    command += ' --reporter=verbose --bail=3';
    
    console.log(`Command: ${command}`);
    
    const result = execSync(command, {
      encoding: 'utf8',
      timeout: group.timeout,
      stdio: 'pipe'
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ ${group.name} completed in ${duration}ms`);
    
    return {
      name: group.name,
      success: true,
      duration,
      output: result
    };
    
  } catch (error: any) {
    const duration = Date.now() - Date.now();
    console.log(`❌ ${group.name} failed: ${error.message || 'Unknown error'}`);
    
    return {
      name: group.name,
      success: false,
      duration,
      error: error.message || 'Unknown error',
      output: error.stdout || error.stderr || ''
    };
  }
}

/**
 * メイン実行関数
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Fast Test Execution');
  console.log('='.repeat(50));
  
  const results: TestResult[] = [];
  let totalTime = 0;
  
  for (const group of testGroups) {
    const result = await runTestGroup(group);
    results.push(result);
    totalTime += result.duration;
    
    // メモリクリア
    if (typeof global.gc === 'function') {
      global.gc();
    }
    
    // グループ間で短い休憩
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 結果サマリー
  console.log('\n📊 Test Results Summary');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`⏱️  Total Time: ${totalTime}ms`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    failed.forEach(test => {
      console.log(`  - ${test.name}: ${test.error}`);
    });
  }
  
  // 詳細レポート
  const reportPath = path.join(process.cwd(), 'test-results.json');
  const report: TestReport = {
    timestamp: new Date().toISOString(),
    totalTime,
    successful: successful.length,
    failed: failed.length,
    results
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // 失敗があった場合は非ゼロで終了
  if (failed.length > 0) {
    process.exit(1);
  }
  
  console.log('\n🎉 All tests passed!');
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// 実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { main, runTestGroup, testGroups };