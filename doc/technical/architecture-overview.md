# AMV-System 技術アーキテクチャ概要

## 🏗️ アーキテクチャ概要

### 採用アーキテクチャ
**Simple Layered Architecture + Functional Services**

ドメイン複雑性スコア 4/10 (Technical Utility Domain) に基づく最適選択

---

## 🎯 設計原則

### 1. Extensible Toolbar Architecture
```
app/
├── components/           # UI コンポーネント
├── tools/               # 拡張可能ツールシステム
│   ├── registry/        # ツール登録管理
│   ├── core/            # コアツール
│   └── plugins/         # プラグイン拡張
├── hooks/               # カスタムフック
├── services/            # 機能サービス
└── types/              # 型定義
```

### 2. モジュラー設計
- **150行以内**/ファイル制限
- **複雑度8以下**/関数制限
- **疎結合**: モジュール間依存最小化
- **型安全性**: TypeScriptで開発時エラー検出

---

## 🔧 技術スタック

### フロントエンド
- **Framework**: Next.js 14 (App Router)
- **言語**: TypeScript 5.x
- **状態管理**: Zustand
- **スタイリング**: Tailwind CSS
- **UI Library**: Headless UI
- **アイコン**: Heroicons, Lucide React
- **ドラッグ&ドロップ**: React DnD Kit

### バックエンド
- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **認証**: JWT + HTTPOnly Cookie
- **データベース**: Cloudflare KV (Key-Value)
- **暗号化**: Web Crypto API + bcrypt

### 開発・テスト
- **テスト**: Vitest (Unit) + Playwright (E2E)
- **型チェック**: TypeScript Compiler
- **リンター**: ESLint
- **コード品質**: 自動化された品質ゲート

---

## 📁 ディレクトリ構造

### フロントエンド構造
```
frontend/
├── app/                     # Next.js App Router
│   ├── components/          # UIコンポーネント
│   │   ├── AuthForm.tsx     # 認証フォーム
│   │   ├── MemoWindow.tsx   # メモウィンドウ
│   │   └── __tests__/       # コンポーネントテスト
│   ├── hooks/               # カスタムフック
│   │   ├── useAuth.ts       # 認証状態管理
│   │   ├── useMemos.ts      # メモ管理
│   │   └── __tests__/       # フックテスト
│   ├── tools/               # ツールシステム
│   │   ├── registry/        # ツール登録
│   │   ├── core/            # コアツール
│   │   └── plugins/         # プラグイン
│   └── types/               # 型定義
├── utils/                   # ユーティリティ
│   ├── fileSystem/          # File System Access API
│   ├── search/              # 検索エンジン
│   └── messageSystem/       # メッセージシステム
└── tests/                   # テスト
    ├── e2e/                 # E2Eテスト
    ├── helpers/             # テストヘルパー
    └── mocks/               # モック
```

### バックエンド構造
```
backend/
├── src/
│   ├── api/                 # APIエンドポイント
│   │   ├── auth.ts          # 認証API
│   │   ├── auto-login.ts    # 自動ログイン
│   │   └── directory-manager.ts # ディレクトリ管理
│   ├── utils/               # ユーティリティ
│   │   ├── crypto.ts        # 暗号化
│   │   └── jwt.ts          # JWT処理
│   └── types/               # 型定義
└── wrangler.jsonc           # Cloudflare設定
```

---

## 🔄 データフロー

### 認証フロー
1. **ゲストモード**: LocalStorage使用
2. **認証モード**: JWT Cookie + KV Storage
3. **自動ログイン**: Cookie検証 → 状態復元

### メモ管理フロー
1. **作成**: ツールバー → Zustand → 自動保存
2. **編集**: リアルタイム更新 → デバウンス保存
3. **検索**: TinySegmenter + TF-IDF検索

### ファイルシステム連携
1. **ディレクトリ選択**: File System Access API
2. **AMV構造作成**: memos/, urls/, assets/, exports/
3. **自動保存**: 500ms間隔でローカルファイル更新

---

## 🚀 パフォーマンス最適化

### フロントエンド最適化
- **Code Splitting**: Dynamic imports
- **React Memo**: 高コストコンポーネント最適化
- **Virtual Scrolling**: 大量データ対応
- **Lazy Loading**: 必要時読み込み

### レンダリング最適化
- **UI応答性**: 200ms以下目標
- **ドラッグ操作**: 16ms以下フレーム維持
- **メモリ使用量**: 50MB以下維持

### 検索性能
- **日本語解析**: TinySegmenter
- **ベクトル化**: TF-IDF
- **インデックス**: メモリ内キャッシュ
- **結果表示**: ページネーション

---

## 🔒 セキュリティ設計

### 認証セキュリティ
- **JWT**: RS256アルゴリズム
- **Cookie**: HTTPOnly, Secure, SameSite
- **トークンローテーション**: 自動リフレッシュ
- **セッション管理**: 7日間有効期限

### データセキュリティ
- **ローカルファースト**: データ主権確保
- **暗号化**: AES-256-GCM (オプション)
- **権限管理**: ディレクトリアクセス制御
- **CORS**: 厳格なオリジン制御

### XSS/CSRF対策
- **CSP**: Content Security Policy
- **サニタイゼーション**: 入力値検証
- **トークン検証**: CSRF保護
- **型安全性**: TypeScript活用

---

## 📊 品質保証

### テスト戦略
- **Unit Test**: 90%以上カバレッジ
- **Integration Test**: 主要フロー検証
- **E2E Test**: クリティカルパス (5-7シナリオ)
- **Performance Test**: ベンチマーク測定

### 品質指標
- **総合品質**: 9.2/10目標
- **UI応答性**: 200ms以下
- **データ整合性**: 99.9%保証
- **アクセシビリティ**: WCAG 2.1 AA

### 継続的品質改善
- **静的解析**: ESLint + TypeScript
- **コード複雑度**: 自動監視
- **パフォーマンス**: 継続的モニタリング
- **セキュリティ**: 依存関係脆弱性チェック

---

## 🔄 開発フロー

### TDD品質ファースト
1. **品質目標設定** → 競合ベンチマーク
2. **欠陥検出テスト** → 事前品質保証
3. **最小実装** → 必要十分な機能
4. **品質最適化** → 継続的改善

### CI/CD パイプライン
1. **コード品質チェック** → ESLint + TypeScript
2. **テスト実行** → Unit + Integration + E2E
3. **セキュリティスキャン** → 依存関係チェック
4. **デプロイ** → Cloudflare Workers

---

## 🎯 今後の拡張性

### ツール拡張
- **1ファイル追加**: 新ツール自動登録
- **プラグインAPI**: サードパーティ拡張
- **ホットロード**: 開発時即座反映

### 機能拡張計画
- **AI統合**: メモ分析・提案機能
- **リアルタイム協調**: WebSocket協調編集
- **モバイル対応**: PWA化
- **クラウド同期**: オプション機能