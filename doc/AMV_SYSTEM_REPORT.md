# Amv-System 総合報告書

**作成日**: 2025-01-13  
**対象**: Amv-System ローカルファーストワークスペースアプリケーション  
**目的**: 機能概要・実装方針・設計思想の包括的報告

---

## 🎯 **システム概要**

### **コアコンセプト**
Amv-Systemは**「xy座標による自由配置でデータ保管・取り出しの手軽さを最適化する」**ワークスペースアプリケーションです。

### **根本的な設計思想**
- **UI最適化ファースト**: ドラッグ&ドロップによる直感的な情報配置
- **ローカルファースト**: File System Access APIによる完全なデータ主権
- **段階的認証**: ゲストモード → 認証モードへの自然な移行

---

## 🔧 **主要機能と実装**

### **1. 空間的メモ管理システム**

#### **機能概要**
- **xy座標による自由配置**: メモを任意の座標に配置
- **ドラッグ&ドロップ**: 直感的な移動・整理
- **動的サイズ調整**: リサイズハンドルによる柔軟な表示

#### **実装方式**
```typescript
// 座標値は直接操作（Value Object化しない）
interface MemoData {
  id: string;
  title: string;
  content: string;
  x: number;        // ドラッグ座標
  y: number;        // UI配置最適化
  w: number;        // 幅調整
  h: number;        // 高さ調整
}

// React.memo + useCallback によるレンダリング最適化
const MemoWindow = React.memo<MemoProps>(({ memo, onUpdate }) => {
  const handleDrag = useCallback((x: number, y: number) => {
    onUpdate({ ...memo, x, y });
  }, [memo, onUpdate]);
}, (prev, next) => prev.memo.updated === next.memo.updated);
```

### **2. ハイブリッド認証システム**

#### **機能概要**
- **ゲストモード**: 即座に試用可能、手動保存
- **認証モード**: JWT + Cookie、自動保存
- **段階的移行**: データを失わずアカウント登録

#### **実装方式**
```typescript
// 認証状態による条件分岐
const useAuth = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  uuid: null,
  
  login: async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'  // JWT Cookie受信
    });
    // 自動ディレクトリ復元機能
  },
  
  logout: async () => {
    // データクリア + 画面リセット
  }
}));
```

### **3. File System Access API統合**

#### **機能概要**
- **ローカルディレクトリ管理**: ユーザー指定フォルダへの保存
- **既存データ検出**: AMV-system構造の自動認識
- **暗号化保存**: AES-GCM による完全データ保護

#### **実装方式**
```typescript
// File System Access API直接操作
const saveToFileSystem = async (memos: MemoData[]) => {
  // ディレクトリハンドル取得
  const dirHandle = await window.showDirectoryPicker();
  
  // 既存構造チェック
  const isExistingAmvSystem = await checkAmvStructure(dirHandle);
  
  // 暗号化保存
  for (const memo of memos) {
    const encrypted = await encryptData(memo, password);
    await saveJsonFile(dirHandle, `memos/${memo.id}.json`, encrypted);
  }
};
```

### **4. 自動保存システム**

#### **機能概要**
- **デバウンス処理**: 500ms間隔での重複防止
- **認証状態連動**: ログイン時のみ自動保存
- **エラーハンドリング**: 失敗時のリトライ機構

#### **実装方式**
```typescript
// Zustand + デバウンス
const useMemos = create<MemoState>((set, get) => ({
  memos: [],
  
  updateMemo: (updatedMemo: MemoData) => {
    set(state => ({
      memos: state.memos.map(memo => 
        memo.id === updatedMemo.id ? updatedMemo : memo
      )
    }));
    
    // 認証時のみ自動保存
    if (useAuth.getState().isLoggedIn) {
      debouncedSave(updatedMemo);
    }
  }
}));

// 500ms デバウンス
const debouncedSave = debounce(async (memo: MemoData) => {
  await persistMemo(memo);
}, 500);
```

---

## 🏗️ **アーキテクチャ決定**

### **選択アーキテクチャ**: Simple Layered Architecture + Functional Services

#### **判定根拠**
- **ドメイン複雑性スコア**: 4/10 (Technical Utility Domain)
- **UI最適化特化**: xy座標操作が価値の中核
- **小規模チーム**: オーバーエンジニアリング回避

#### **推奨構造**
```
src/
├── components/           # React Components
│   ├── memo/            # メモ関連UI
│   ├── workspace/       # ワークスペースUI
│   └── auth/            # 認証UI
├── hooks/               # Custom Hooks（状態管理）
├── services/            # Feature Services（5個以内）
│   ├── fileSystemService.ts    # ファイル操作
│   ├── encryptionService.ts    # 暗号化処理
│   ├── authService.ts          # 認証処理
│   ├── searchService.ts        # 検索機能
│   └── uiStateService.ts       # UI状態管理
├── utils/               # Pure Functions
└── types/               # Type Definitions
```

#### **Clean Architecture不採用理由**
```typescript
// ❌ 過度な抽象化例（採用しない）
class Position extends ValueObject {
  constructor(private readonly x: number, private readonly y: number) {}
  // xy座標にValue Objectは過剰
}

// ✅ UI最適化に適したシンプル設計
interface MemoPosition {
  x: number;  // ドラッグ操作用
  y: number;  // UI配置最適化用
}
```

---

## 🔧 **技術実装詳細**

### **フロントエンド技術スタック**
- **フレームワーク**: Next.js 14 + TypeScript
- **状態管理**: Zustand（軽量・シンプル）
- **スタイリング**: Tailwind CSS（ユーティリティファースト）
- **テスト**: Vitest + Testing Library + Playwright

### **バックエンド技術スタック**
- **実行環境**: Cloudflare Workers（エッジコンピューティング）
- **フレームワーク**: Hono（高速・軽量）
- **データベース**: Cloudflare KV（認証情報のみ）
- **認証**: JWT + bcryptjs

### **セキュリティ実装**
- **暗号化**: AES-GCM による client-side encryption
- **認証**: JWT + HttpOnly Cookie
- **データ保護**: ローカルファーストによる完全なデータ主権

---

## 📊 **品質保証と開発プロセス**

### **厳格化された品質基準**
- **ファイルサイズ**: 150行以内（旧200行から厳格化）
- **複雑度**: Cyclomatic Complexity 8以下（旧10から厳格化）
- **テスト成功率**: 90%以上（旧80%から向上）
- **any型使用**: 20箇所以内（ライブラリ由来除く）

### **UI最適化特化の開発プロセス**
```typescript
// 開発時の優先順位
1. xy座標操作の手軽さ確保
2. ドラッグ&ドロップ性能最適化
3. レンダリング効率の向上
4. ファイルI/O速度の最適化
```

### **TDD実装サイクル**
```
Test → 実装 → リファクタリング
↓
座標操作テスト → 最小実装 → パフォーマンス最適化
```

---

## 📚 **コンテキスト整理成果**

### **CLAUDE.md整理結果**
- **Before**: 700行以上の冗長なガイドライン
- **After**: 簡潔なUI最適化特化ガイド（約30行）
- **削除項目**: 重複するTDDテンプレート、過度な抽象化ガイド

### **RDシリーズ整理結果**
- **RDv1.1.3.md**: 基本仕様書（保持）
- **RDv1.1.4-implementation-plan.md**: 実装計画書（要検討）
- **RDv1.1.5.1.md**: 詳細仕様書（保持）
- **RDv1.1.6.md**: 修正記録（50行→15行に簡素化）

### **効果的なドキュメント構成**
```
基本概念: RDv1.1.3.md (Why & What)
↓
詳細仕様: RDv1.1.5.1.md (How)
↓
開発ガイド: CLAUDE.md (Principles & Quality)
↓
アーキテクチャ決定: ARCHITECTURE_DECISION.md (Decision Record)
```

---

## 🚀 **将来展望**

### **短期計画（1-3ヶ月）**
1. **Clean Architecture除去**: 過度な抽象化の削除
2. **パフォーマンス最適化**: React.memo、useCallback強化
3. **UI最適化**: ドラッグ操作の更なる改善

### **中期計画（3-6ヶ月）**
1. **高度検索機能**: TinySegmenter + TF-IDF
2. **MCP対応**: AI連携機能
3. **PWA化**: オフライン機能強化

### **長期計画（6ヶ月以上）**
1. **拡張エコシステム**: モジュラープラグイン
2. **多言語対応**: i18n実装
3. **クラウド同期**: オプショナル機能

---

## 📋 **総括**

### **Amv-Systemの本質**
Amv-Systemは**「xy座標による自由配置」を通じてデータ保管・取り出しの手軽さを最大化する**Technical Utility Domainアプリケーションです。

### **成功要因**
1. **UI最適化特化**: ドメイン特性に適したアーキテクチャ選択
2. **段階的体験**: ゲスト→認証モードの自然な移行
3. **ローカルファースト**: 完全なデータ主権による安心感

### **技術的優位性**
- **シンプル設計**: 過度な抽象化を排除した保守しやすいコード
- **高性能**: xy座標操作に特化した最適化
- **拡張性**: モジュラー設計による将来の機能追加容易性

**Amv-Systemは、UI最適化という明確な価値提案に基づき、適切なアーキテクチャ選択と厳格な品質管理によって、持続可能で高品質なワークスペースアプリケーションとして進化を続けています。**