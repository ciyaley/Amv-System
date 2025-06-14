# TDD-First実装計画書 - Clean Architecture移行

## 🎯 **実装戦略概要**

### **TDD原則**
```
Red → Green → Refactor
失敗テスト作成 → 最小実装 → 品質向上
```

### **Clean Architecture適用**
```
Interface → Test → Implementation → Integration
インターフェース → テスト → 実装 → 統合
```

---

## 📋 **Phase 1: IGuestModeService実装 (TDD)**

### **Day 1: 基本メモ操作のTDD**

#### **Step 1.1: saveGuestMemo - Red Phase**
```typescript
// app/services/__tests__/GuestModeService.test.ts
describe('GuestModeService', () => {
  describe('saveGuestMemo', () => {
    it('should save memo as plain text file', async () => {
      // Given: ゲストモードサービスとメモデータ
      const service = container.resolve<IGuestModeService>('guestMode');
      const memo: MemoData = createTestMemo({
        id: 'memo-1',
        title: 'Test Memo',
        content: 'Test content'
      });

      // When: saveGuestMemo実行
      await service.saveGuestMemo(memo);

      // Then: ファイルが平文で保存される
      const savedContent = await mockFileSystem.readFile('memos/memo-1.json');
      const parsedMemo = JSON.parse(savedContent);
      expect(parsedMemo).toEqual(memo);
      expect(mockEncryption.encrypt).not.toHaveBeenCalled(); // 暗号化されない
    });

    it('should throw error when directory not selected', async () => {
      // Given: ディレクトリが選択されていない状態
      const service = container.resolve<IGuestModeService>('guestMode');
      mockFileSystem.setDirectoryHandle(null);

      // When & Then: エラーが投げられる
      await expect(service.saveGuestMemo(createTestMemo()))
        .rejects.toThrow('ディレクトリが選択されていません');
    });
  });
});
```

#### **Step 1.2: saveGuestMemo - Green Phase (最小実装)**
```typescript
// app/services/implementations/GuestModeService.ts
export class GuestModeService implements IGuestModeService {
  constructor(
    private fileSystem: IFileSystemRepository,
    private storage: IStorageRepository
  ) {}

  async saveGuestMemo(memo: MemoData): Promise<void> {
    // 最小実装: テストが通る最低限のコード
    const dirHandle = await this.fileSystem.getDirectoryHandle();
    if (!dirHandle) {
      throw new Error('ディレクトリが選択されていません');
    }

    const fileName = `${memo.id}.json`;
    const content = JSON.stringify(memo);
    await this.fileSystem.writeFile(`memos/${fileName}`, content);
  }

  // 他のメソッドは一旦NotImplementedError
  async loadGuestMemos(): Promise<MemoData[]> {
    throw new Error('Not implemented');
  }
  // ...
}
```

#### **Step 1.3: Refactor Phase**
```typescript
// リファクタリング: エラーハンドリング、バリデーション追加
async saveGuestMemo(memo: MemoData): Promise<void> {
  // バリデーション
  const validation = this.validateMemoData(memo);
  if (!validation.isValid) {
    throw new Error(`Invalid memo data: ${validation.errors.join(', ')}`);
  }

  // ディレクトリ確認
  const dirHandle = await this.ensureGuestDirectory();
  
  // ファイル名サニタイズ
  const fileName = this.sanitizeFileName(`${memo.id}.json`);
  
  // 保存処理
  try {
    const content = JSON.stringify(memo, null, 2);
    await this.fileSystem.writeFile(`memos/${fileName}`, content);
  } catch (error) {
    throw new Error(`Failed to save memo: ${error.message}`);
  }
}
```

### **Day 2: ディレクトリ記憶機能のTDD**

#### **Step 2.1: ディレクトリ記憶 - Red Phase**
```typescript
describe('isCurrentDirectorySameAsGuest', () => {
  it('should return true when same directory is selected', async () => {
    // Given: 以前にディレクトリ情報を保存
    const service = container.resolve<IGuestModeService>('guestMode');
    const testDir = createMockDirectoryHandle('test-workspace');
    await service.saveGuestDirectoryInfo(testDir);

    // When: 同じディレクトリを再選択
    mockFileSystem.setCurrentDirectory(testDir);
    
    // Then: 同じディレクトリと判定される
    const isSame = await service.isCurrentDirectorySameAsGuest();
    expect(isSame).toBe(true);
  });

  it('should return false when different directory is selected', async () => {
    // Given: 異なるディレクトリが選択されている
    const service = container.resolve<IGuestModeService>('guestMode');
    await service.saveGuestDirectoryInfo(createMockDirectoryHandle('old-dir'));
    mockFileSystem.setCurrentDirectory(createMockDirectoryHandle('new-dir'));

    // When & Then: 異なるディレクトリと判定される
    const isSame = await service.isCurrentDirectorySameAsGuest();
    expect(isSame).toBe(false);
  });
});
```

### **Day 3: データマージ機能のTDD**

#### **Step 3.1: データマージ - Red Phase**
```typescript
describe('mergeWithExistingData', () => {
  it('should merge new memos with existing ones', async () => {
    // Given: 既存メモと新規メモ
    const service = container.resolve<IGuestModeService>('guestMode');
    const existingMemos = [createTestMemo({ id: 'existing-1' })];
    const newMemos = [
      createTestMemo({ id: 'new-1' }),
      createTestMemo({ id: 'existing-1', title: 'Updated' }) // 重複
    ];
    
    mockFileSystem.setExistingMemos(existingMemos);

    // When: マージ実行
    const result = await service.mergeWithExistingData(newMemos);

    // Then: 適切にマージされる
    expect(result.mergedMemos).toHaveLength(2);
    expect(result.duplicatesResolved).toBe(1);
    expect(result.newMemosAdded).toBe(1);
    expect(result.existingMemosUpdated).toBe(1);
  });
});
```

---

## 📋 **Phase 2: IAuthenticatedModeService実装 (TDD)**

### **Day 4-5: 暗号化メモ操作のTDD**

#### **Step 4.1: 暗号化保存 - Red Phase**
```typescript
describe('AuthenticatedModeService', () => {
  describe('saveAuthenticatedMemo', () => {
    it('should save memo with AES-GCM encryption', async () => {
      // Given: 認証済みサービスとメモ、パスワード
      const service = container.resolve<IAuthenticatedModeService>('authMode');
      const memo = createTestMemo({ id: 'secure-memo' });
      const password = 'test-password-123';

      // When: 暗号化保存実行
      await service.saveAuthenticatedMemo(memo, password);

      // Then: 暗号化されてファイル保存される
      const savedContent = await mockFileSystem.readFile('memos/secure-memo.json');
      expect(mockEncryption.encrypt).toHaveBeenCalledWith(
        JSON.stringify(memo),
        password
      );
      expect(savedContent).not.toContain('Test content'); // 平文でない
    });

    it('should throw error on encryption failure', async () => {
      // Given: 暗号化が失敗する設定
      const service = container.resolve<IAuthenticatedModeService>('authMode');
      mockEncryption.encrypt.mockRejectedValue(new Error('Crypto error'));

      // When & Then: 暗号化エラーが伝播される
      await expect(service.saveAuthenticatedMemo(createTestMemo(), 'password'))
        .rejects.toThrow('Failed to encrypt memo');
    });
  });
});
```

### **Day 6: アカウント関連付けのTDD**

#### **Step 6.1: アカウント関連付け - Red Phase**
```typescript
describe('saveAccountAssociation', () => {
  it('should save association to backend and localStorage', async () => {
    // Given: アカウントUUIDとディレクトリパス
    const service = container.resolve<IAuthenticatedModeService>('authMode');
    const accountUuid = 'test-account-uuid';
    const dirPath = '/test/directory/path';

    // When: 関連付け保存実行
    await service.saveAccountAssociation(accountUuid, dirPath);

    // Then: バックエンドAPIとlocalStorageに保存される
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/directory/associate', {
      accountUuid,
      directoryPath: dirPath,
      lastAccessTime: expect.any(String)
    });
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      `account-dir-${accountUuid}`,
      expect.stringContaining(dirPath)
    );
  });
});
```

---

## 📋 **Phase 3: ServiceContainer統合 (TDD)**

### **Day 7: DI Container拡張**

#### **Step 7.1: サービス登録 - Red Phase**
```typescript
// app/services/__tests__/ServiceContainer.integration.test.ts
describe('ServiceContainer Integration', () => {
  it('should resolve IGuestModeService correctly', () => {
    // Given: ServiceContainerが設定済み
    const container = ServiceContainer.getInstance();

    // When: IGuestModeServiceを解決
    const guestService = container.resolve<IGuestModeService>('guestMode');

    // Then: 正しいインスタンスが返される
    expect(guestService).toBeInstanceOf(GuestModeService);
    expect(guestService.isGuestModeAvailable()).toBe(true);
  });

  it('should inject dependencies correctly', () => {
    // Given: 依存関係が登録済み
    const container = ServiceContainer.getInstance();
    
    // When: サービスを解決
    const guestService = container.resolve<IGuestModeService>('guestMode');
    
    // Then: 依存関係が正しく注入される
    expect(guestService).toHaveProperty('fileSystem');
    expect(guestService).toHaveProperty('storage');
  });
});
```

#### **Step 7.2: ServiceContainer拡張 - Green Phase**
```typescript
// app/services/ServiceContainer.ts (拡張)
export class ServiceContainer {
  // 既存コード...

  private registerServices(): void {
    // 既存のサービス登録...

    // 新規サービス登録
    this.register<IGuestModeService>('guestMode', () => {
      return new GuestModeService(
        this.resolve<IFileSystemRepository>('fileSystem'),
        this.resolve<IStorageRepository>('storage')
      );
    }, 'singleton');

    this.register<IAuthenticatedModeService>('authMode', () => {
      return new AuthenticatedModeService(
        this.resolve<IFileSystemRepository>('fileSystem'),
        this.resolve<IEncryptionService>('encryption'),
        this.resolve<IStorageRepository>('storage')
      );
    }, 'singleton');
  }
}
```

---

## 📋 **Phase 4: 既存Hook統合 (TDD)**

### **Day 8: useMemos Hook のDI化**

#### **Step 8.1: Hook統合 - Red Phase**
```typescript
// app/hooks/__tests__/useMemos.di.test.ts
describe('useMemos with DI', () => {
  it('should use GuestModeService when not logged in', async () => {
    // Given: 未ログイン状態
    const { result } = renderHook(() => useMemos());
    mockAuth.setState({ isLoggedIn: false });

    // When: メモ保存実行
    await act(async () => {
      await result.current.saveMemo(createTestMemo());
    });

    // Then: GuestModeServiceが使用される
    expect(mockGuestService.saveGuestMemo).toHaveBeenCalled();
    expect(mockAuthService.saveAuthenticatedMemo).not.toHaveBeenCalled();
  });

  it('should use AuthenticatedModeService when logged in', async () => {
    // Given: ログイン状態
    const { result } = renderHook(() => useMemos());
    mockAuth.setState({ isLoggedIn: true });
    mockEncryption.setState({ password: 'test-password' });

    // When: メモ保存実行
    await act(async () => {
      await result.current.saveMemo(createTestMemo());
    });

    // Then: AuthenticatedModeServiceが使用される
    expect(mockAuthService.saveAuthenticatedMemo).toHaveBeenCalledWith(
      expect.any(Object),
      'test-password'
    );
    expect(mockGuestService.saveGuestMemo).not.toHaveBeenCalled();
  });
});
```

#### **Step 8.2: Hook実装 - Green Phase**
```typescript
// app/hooks/useMemos.ts (DI対応版)
export const useMemos = () => {
  const container = ServiceContainer.getInstance();
  const guestService = container.resolve<IGuestModeService>('guestMode');
  const authService = container.resolve<IAuthenticatedModeService>('authMode');
  
  // 状態管理は既存のZustandそのまま
  const [memos, setMemos] = useState<MemoData[]>([]);
  
  const saveMemo = useCallback(async (memo: MemoData) => {
    const { isLoggedIn } = useAuth.getState();
    
    try {
      if (isLoggedIn) {
        const { password } = useEncryptionStore.getState();
        if (!password) throw new Error('パスワードが設定されていません');
        
        await authService.saveAuthenticatedMemo(memo, password);
      } else {
        await guestService.saveGuestMemo(memo);
      }
      
      // UI状態更新
      setMemos(prev => updateMemoInArray(prev, memo));
    } catch (error) {
      console.error('Failed to save memo:', error);
      throw error;
    }
  }, [guestService, authService]);

  // その他のメソッドも同様にDI対応
  return { memos, saveMemo, loadMemos, deleteMemo };
};
```

---

## 📋 **Phase 5: 統合テスト・リファクタリング**

### **Day 9: 統合テスト**

#### **Step 9.1: E2E統合テスト**
```typescript
// app/services/__tests__/integration/complete-workflow.test.ts
describe('Complete File Access Workflow', () => {
  it('should complete guest to authenticated migration', async () => {
    // Given: ゲストモードでメモ作成・保存
    const guestService = container.resolve<IGuestModeService>('guestMode');
    const authService = container.resolve<IAuthenticatedModeService>('authMode');
    
    const guestMemos = [createTestMemo({ title: 'Guest Memo' })];
    await guestService.saveGuestMemos(guestMemos);

    // When: 認証後にデータ移行
    const accountUuid = 'test-account';
    const password = 'migration-password';
    
    const result = await authService.migrateFromGuestMode(
      guestMemos,
      await guestService.loadGuestSettings(),
      accountUuid,
      password
    );

    // Then: データが正常に移行される
    expect(result.migratedMemos).toBe(1);
    expect(result.migratedSettings).toBe(true);
    expect(result.conflicts).toHaveLength(0);

    // And: 認証済みモードでデータが読み込める
    const migratedMemos = await authService.loadAuthenticatedMemos(password);
    expect(migratedMemos).toHaveLength(1);
    expect(migratedMemos[0].title).toBe('Guest Memo');
  });
});
```

### **Day 10: 旧コード段階的削除**

#### **Step 10.1: 後方互換ラッパー作成**
```typescript
// utils/fileAccess.ts (移行期間用)
import { container } from '../app/services/ServiceContainer';
import type { IGuestModeService } from '../app/services/interfaces/IGuestModeService';

/**
 * @deprecated Use IGuestModeService.saveGuestMemo instead
 * 移行期間中の後方互換性のため維持
 */
export async function saveIndividualMemo(memo: MemoData): Promise<void> {
  console.warn('saveIndividualMemo is deprecated. Use IGuestModeService.saveGuestMemo instead');
  
  const guestService = container.resolve<IGuestModeService>('guestMode');
  return guestService.saveGuestMemo(memo);
}

// 段階的にdeprecated警告を追加
// 2週間後にエラーに変更
// 4週間後に完全削除
```

---

## 🧪 **テスト戦略詳細**

### **テストカテゴリ別方針**

#### **1. Unit Tests (各サービス単体)**
```typescript
- モック使用: 依存関係は全てモック
- カバレッジ: 95%以上
- 実行時間: 各テスト < 100ms
- 隔離性: テスト間の状態共有なし
```

#### **2. Integration Tests (サービス間連携)**
```typescript
- 実際のDI Container使用
- ファイルシステムのモック
- カバレッジ: 90%以上
- フロー検証: Guest → Auth移行等
```

#### **3. Contract Tests (インターフェース遵守)**
```typescript
- インターフェース仕様の遵守確認
- エラーハンドリングの検証
- 型安全性の確認
```

### **モック戦略**

#### **ファイルシステムモック**
```typescript
// tests/mocks/fileSystemMock.ts
export class FileSystemMock implements IFileSystemRepository {
  private files = new Map<string, string>();
  private currentDir: string | null = null;

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async readFile(path: string): Promise<string | null> {
    return this.files.get(path) || null;
  }

  setCurrentDirectory(dir: string): void {
    this.currentDir = dir;
  }

  reset(): void {
    this.files.clear();
    this.currentDir = null;
  }
}
```

### **パフォーマンステスト**

#### **大量データテスト**
```typescript
describe('Performance Tests', () => {
  it('should handle 1000 memos efficiently', async () => {
    const service = container.resolve<IGuestModeService>('guestMode');
    const memos = Array.from({ length: 1000 }, (_, i) => 
      createTestMemo({ id: `memo-${i}` })
    );

    const startTime = Date.now();
    await service.saveGuestMemos(memos);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(5000); // 5秒以内
  });
});
```

---

## 📊 **成功基準・品質メトリクス**

### **コード品質**
- ✅ テストカバレッジ 95%以上
- ✅ 循環的複雑度 10以下
- ✅ 関数行数 20行以内
- ✅ ファイル行数 200行以内

### **パフォーマンス**
- ✅ メモ保存 < 100ms
- ✅ 1000件読み込み < 2秒
- ✅ 暗号化処理 < 500ms

### **機能品質**
- ✅ 全既存機能動作
- ✅ データ整合性保持
- ✅ エラーハンドリング完全

### **実装進捗指標**
```typescript
Day 1: IGuestModeService 基本機能 (20%)
Day 2: IGuestModeService 完成 (40%)
Day 3: IAuthenticatedModeService 基本機能 (60%)
Day 4: IAuthenticatedModeService 完成 (80%)
Day 5: 統合・リファクタリング (100%)
```

---

## ⚠️ **リスク対策**

### **技術的リスク**
1. **既存テスト破綻**: 段階的移行で影響最小化
2. **DI複雑性**: 詳細ドキュメント作成
3. **パフォーマンス劣化**: ベンチマーク必須

### **実装リスク**
1. **スケジュール遅延**: 毎日の進捗確認
2. **品質低下**: コードレビュー必須
3. **機能破損**: 回帰テスト自動実行

### **ロールバック戦略**
- 各フェーズでcommit tag作成
- 機能フラグによる切り替え可能
- 旧実装の一時保持

---

**次のステップ**: Phase 1のDay 1から実装開始。IGuestModeServiceの基本メモ操作からTDD-Firstで実装します。