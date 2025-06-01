# CLAUDE.md - Amv-System開発プロンプトガイド

## 🎯 プロジェクト概要

**Amv-System**: ローカルファーストの多機能ワークスペースアプリケーション
- **フロントエンド**: Next.js 14 + TypeScript + Zustand + Tailwind CSS
- **バックエンド**: Cloudflare Workers + Hono + KV
- **アーキテクチャ**: Test-Driven Development (TDD) + Clean Architecture

## 📋 開発フロー: TDD-First アプローチ

### **Phase 1: テスト設計**
```
要件定義 → テストケース作成 → 型定義 → 実装 → リファクタリング
```

### **Phase 2: 実装サイクル**
```
Red (失敗テスト) → Green (最小実装) → Refactor (品質向上)
```

---

## 🧪 テストファースト開発プロンプトテンプレート

### **Step 1: テスト設計プロンプト**

```markdown
# テスト設計: [機能名]

あなたは経験豊富なTest-Driven Development専門家です。Amv-Systemの[機能名]について、包括的なテストスイートを設計してください。

## 📋 機能要件
[定義書の該当セクションを貼り付け]

## 🎯 テスト戦略
- **Unit Tests**: 個別関数・フック・ユーティリティ
- **Integration Tests**: コンポーネント間連携
- **E2E Tests**: ユーザージャーニー全体
- **Contract Tests**: API境界

## 🔧 技術スタック
- **Unit/Integration**: Vitest + @testing-library/react + jsdom
- **E2E**: Playwright
- **Mocking**: MSW (Mock Service Worker)
- **Coverage**: c8 (85%以上目標)

## 📐 テスト設計原則
- **AAA Pattern**: Arrange, Act, Assert
- **F.I.R.S.T**: Fast, Independent, Repeatable, Self-validating, Timely
- **Given-When-Then**: BDD スタイル
- **Test Doubles**: Mock, Stub, Spy の適切な使い分け

## 🚫 避けるべきアンチパターン
- 実装詳細のテスト
- 脆弱なセレクター (className依存)
- 非決定的テスト
- 過度なモック

## 📤 出力要件
1. **テストケース一覧** (優先度付き)
2. **テストファイル構造**
3. **モック戦略**
4. **テストデータ設計**
5. **カバレッジ目標**

例:
```typescript
// tests/[feature]/[component].test.tsx
describe('[Component名]', () => {
  describe('基本動作', () => {
    it('should render correctly with default props', () => {
      // Given
      // When  
      // Then
    });
  });
  
  describe('ユーザーインタラクション', () => {
    // ...
  });
  
  describe('エラーハンドリング', () => {
    // ...
  });
});
```
```

### **Step 2: テスト実装プロンプト**

```markdown
# テスト実装: [機能名]

以下のテスト設計に基づき、実行可能なテストコードを実装してください。

## 🎯 実装品質基準
- **可読性**: テスト名がspec文書として機能
- **保守性**: DRYなテストヘルパー関数
- **信頼性**: flaky testの回避
- **実行速度**: 並列実行可能な設計

## 📋 必須実装パターン

### **1. テストヘルパー関数**
```typescript
// tests/helpers/render.tsx
export const renderWithProviders = (ui: React.ReactElement, options?: {
  initialState?: Partial<AppState>;
  route?: string;
}) => {
  // Zustand + Router プロバイダーでラップ
};

// tests/helpers/factories.ts
export const createMockMemo = (overrides?: Partial<MemoData>): MemoData => {
  // テストデータファクトリー
};
```

### **2. カスタムマッチャー**
```typescript
// tests/matchers.ts
expect.extend({
  toHaveValidMemoStructure(received: MemoData) {
    // カスタムアサーション
  }
});
```

### **3. Mock実装**
```typescript
// tests/mocks/fileSystem.ts
export const mockFileSystemAPI = {
  showDirectoryPicker: vi.fn(),
  // File System Access API モック
};
```

## 🔧 テストケース実装要件

### **Unit Tests**
- 各関数の境界値テスト
- エラーケースの網羅
- 副作用の検証

### **Integration Tests**
- コンポーネント連携
- 状態変更の伝播
- API通信のモック

### **E2E Tests**
- ユーザーストーリーベース
- クリティカルパスの保証
- クロスブラウザ対応

## 📤 出力形式
1. **テストファイル** (実行可能)
2. **テストヘルパー** (再利用可能)
3. **モック実装** (リアルな挙動)
4. **実行コマンド** (package.json scripts)
```

### **Step 3: 最小実装プロンプト**

```markdown
# 最小実装: [機能名]

先ほど作成したテストを**すべて通す最小限の実装**を作成してください。

## 🎯 最小実装原則
- **YAGNI**: You Aren't Gonna Need It
- **最小限のコード**: テストが通る最低限の実装
- **技術的負債は後回し**: まずは動作する実装

## 📐 実装制約
- テストで要求されていない機能は実装しない
- 最適化は後のリファクタリングフェーズで
- ハードコードも許容 (テストが通れば良い)

## 🚫 このフェーズで避けること
- 過度な抽象化
- パフォーマンス最適化
- エラーハンドリングの詳細化
- UI の美化

## 📤 出力要件
- **最小実装コード** (全テスト通過)
- **技術的負債リスト** (後で改善する項目)
- **次のリファクタリング方針**
```

### **Step 4: リファクタリングプロンプト**

```markdown
# リファクタリング: [機能名]

テストが通っている状態で、以下の品質向上を実施してください。

## 🎯 リファクタリング目標
- **SOLID原則**: 特に単一責任原則
- **DRY原則**: 重複コードの排除
- **Clean Code**: 可読性とメンテナンス性
- **パフォーマンス**: 不要な再レンダリング防止

## 📋 リファクタリングチェックリスト
- [ ] 関数は20行以内か
- [ ] コンポーネントは単一責任か
- [ ] Custom Hookでロジック分離されているか
- [ ] 型安全性が保たれているか
- [ ] メモ化が適切に使用されているか
- [ ] エラーハンドリングが適切か

## 🔧 適用パターン
- **Extract Function**: 長い関数の分割
- **Extract Custom Hook**: 状態ロジックの分離
- **Replace Magic Numbers**: 定数化
- **Introduce Parameter Object**: 引数の構造化

## 📤 出力要件
- **リファクタリング済みコード**
- **変更理由の説明**
- **改善されたメトリクス**
- **テスト結果** (全て通過していること)
```

---

## 🏗️ アーキテクチャ ガイドライン

### **ディレクトリ構造**
```
frontend/
├── app/
│   ├── __tests__/          # E2E tests
│   ├── components/
│   │   ├── __tests__/      # Component tests
│   │   └── ui/             # Reusable UI components
│   ├── hooks/
│   │   └── __tests__/      # Custom hook tests
│   ├── utils/
│   │   └── __tests__/      # Utility function tests
│   └── stores/
│       └── __tests__/      # Store tests
├── tests/
│   ├── helpers/            # Test utilities
│   ├── mocks/              # Mock implementations
│   ├── fixtures/           # Test data
│   └── setup.ts            # Test configuration
└── playwright/             # E2E test configurations
```

### **命名規則**
```typescript
// ファイル命名
[component].test.tsx         // Unit/Integration tests
[feature].e2e.spec.ts       // E2E tests
[utility].test.ts           // Utility tests

// テスト命名
describe('MemoWindow', () => {
  describe('when user drags memo', () => {
    it('should update position coordinates', () => {
      // ...
    });
  });
});
```

---

## 📊 品質基準

### **コードカバレッジ目標**
- **Unit Tests**: 90%以上
- **Integration Tests**: 85%以上
- **E2E Tests**: クリティカルパス100%

### **パフォーマンス目標**
- **テスト実行時間**: 全体で5分以内
- **Unit Tests**: 2秒以内
- **E2E Tests**: 3分以内

### **品質メトリクス**
- **Cyclomatic Complexity**: 10以下
- **Function Length**: 20行以内
- **File Length**: 200行以内

---

## 🔧 技術仕様

### **テスト環境構成**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html', 'lcov'],
      threshold: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    }
  }
});
```

### **Mock Strategy**
```typescript
// MSW for API mocking
// Zustand store mocking  
// File System Access API mocking
// LocalStorage/IndexedDB mocking
```

---

## 🎯 機能別実装優先順位

### **Phase 1: Core Features (MVP)**
1. **認証システム** (JWT + Cookie)
2. **メモ機能** (CRUD操作)
3. **ファイル保存** (File System Access API)
4. **基本レイアウト** (キャンバス + サイドバー)

### **Phase 2: Advanced Features**
1. **検索機能** (TinySegmenter + TF-IDF)
2. **適応的UI** (情報量別表示切り替え)
3. **URL管理機能**
4. **テーマ設定**

### **Phase 3: Premium Features**
1. **MCP対応** (AI連携)
2. **PWA対応**
3. **データ移行機能**
4. **パフォーマンス最適化**

---

## 🚫 開発時の禁止事項

### **コード品質**
- `any` 型の使用
- 200行を超える関数/コンポーネント
- useEffect内での複雑なロジック
- 直接的なDOM操作
- グローバル変数の使用

### **テスト品質**
- 実装詳細のテスト
- 非決定的テスト
- テストでのsetTimeout使用
- 外部サービスへの実際の通信

---

## ✅ チェックリスト

### **実装前**
- [ ] テストケースが網羅的か
- [ ] モック戦略が適切か
- [ ] テストデータが十分か

### **実装後**
- [ ] 全テストが通過しているか
- [ ] カバレッジ目標を達成しているか
- [ ] 型エラーがないか
- [ ] ESLintエラーがないか

### **リファクタリング後**
- [ ] コード品質が向上しているか
- [ ] テストが継続して通過しているか
- [ ] パフォーマンスが劣化していないか

---

## 📝 使用例

### **メモ機能の実装例**
```markdown
# Step 1: テスト設計
「MemoWindowコンポーネントのテストスイートを設計してください。
ドラッグ&ドロップ、リサイズ、編集機能を含みます。」

# Step 2: テスト実装  
「設計したテストケースを実装してください。
@testing-library/react と user-event を使用してください。」

# Step 3: 最小実装
「作成したテストを全て通す最小限のMemoWindowコンポーネントを実装してください。」

# Step 4: リファクタリング
「テストを維持しながら、SOLID原則に従ってリファクタリングしてください。」
```

---

このガイドラインに従うことで、テストファーストで高品質なAmv-Systemを構築できます。各フェーズで品質を段階的に向上させ、保守性の高いコードベースを実現しましょう。
エラーやタイムアウトが起きている場合、テスト静甲と判断することはなく失敗した原因を追究し改善計画を立てるためにソースコードを調査し、実際に修繕してから再度テストを行う必要があります。

####　最後に
開発方針上でユーザーの決定が必要なことがあれば必ず確認すること。特にユーザー権限、操作の不可欠なAPIキーや外部からのダウンロードなどの操作が必要になればユーザーに指示、提案すること。
