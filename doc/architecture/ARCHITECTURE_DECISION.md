# Amv-System アーキテクチャ決定書

**決定日**: 2025-01-13  
**決定者**: ドメインエキスパート分析に基づく  
**対象**: Amv-System 全体アーキテクチャ

---

## 🎯 **最終アーキテクチャ決定**

### **採用アーキテクチャ**: Simple Layered Architecture + Functional Services

**根拠**: ドメイン複雑性スコア **4/10** - Technical Utility Domain

---

## 📋 **ドメイン特性分析結果**

### **コア機能**
- **データ保管と取り出しのUI的手軽さによる最適化**
- **xy座標で自由にツールを置けるUI**

### **ドメインタイプ**: Technical Utility Domain
- ビジネスドメインではなく、技術的価値中心
- UI/UX最適化が主要価値
- ドメインエキスパート不在

### **複雑性評価**
| 項目 | スコア | 評価理由 |
|------|--------|----------|
| ビジネスルール複雑性 | 1/3 | CRUD中心、特殊ワークフローなし |
| 状態管理複雑性 | 1/3 | 線形ライフサイクル |
| 外部統合度 | 1/2 | File System API程度 |
| 将来成長性 | 1/2 | UI最適化中心の安定ドメイン |
| **総合スコア** | **4/10** | Simple Domain |

---

## ❌ **Clean Architecture不採用理由**

### **1. ドメイン特性の不適合**
- **座標値のValue Object化**: xy座標は技術的実装詳細であり、ビジネスルールではない
- **過度な抽象化**: UI最適化ドメインに不適切
- **学習コスト**: 小規模チームに過剰な複雑性

### **2. 技術的問題**
- **循環依存リスク**: ServiceContainer + Legacy code
- **テスト複雑性**: モック設定の困難性増加
- **パフォーマンス劣化**: 不要な抽象化レイヤー

### **3. 実装コスト**
- **移行コスト**: 高（427ファイル中の大規模修正）
- **保守コスト**: 高（DIコンテナ、Domain層の継続保守）
- **ROI**: 低（UI最適化ドメインでは価値創出できない）

---

## ✅ **採用アーキテクチャ詳細**

### **推奨構造**
```
src/
├── components/           # React Components
│   ├── memo/            # メモ関連コンポーネント
│   ├── workspace/       # ワークスペースUI
│   └── ui/              # 共通UIコンポーネント
├── hooks/               # Custom Hooks（状態管理）
├── services/            # Feature Services（5個以内）
│   ├── fileSystemService.ts    # ファイル操作
│   ├── encryptionService.ts    # 暗号化
│   ├── authService.ts          # 認証
│   ├── searchService.ts        # 検索
│   └── uiStateService.ts       # UI状態管理
├── utils/               # Pure Functions
└── types/               # Type Definitions
```

### **サービス設計原則**
```typescript
// ✅ シンプルな関数型組み合わせ
export const fileSystemService = {
  saveMemo: (memo: MemoData) => Promise<void>,
  loadMemos: () => Promise<MemoData[]>,
  // 直接的で分かりやすいAPI
};

// ✅ UI最適化に特化した型定義
interface MemoPosition {
  x: number;  // ドラッグ&ドロップ座標
  y: number;  // UI配置最適化用
}
```

---

## 📈 **移行計画**

### **Phase 1: Clean Architecture除去（2週間）**
1. **ServiceContainer削除**: DI Container → 直接インポート
2. **Value Object削除**: Position, Dimensions等 → 基本型
3. **Repository削除**: Repository pattern → Service関数

### **Phase 2: Simple Services統合（1週間）**
1. **巨大ファイル分割**: useMemos.ts (718行) → 4つのService
2. **関数型組み合わせ**: 純粋関数 + カスタムフック
3. **テスト簡素化**: 複雑なモック → 軽量テスト

### **Phase 3: UI最適化特化（1週間）**
1. **座標操作最適化**: xy座標操作の高速化
2. **ドラッグ&ドロップ**: React.memo + useCallback
3. **レンダリング最適化**: 不要な再描画防止

---

## 📊 **期待効果**

### **定量的改善目標**
| メトリクス | 現在 | 目標 | 改善率 |
|------------|------|------|--------|
| ファイル数 | 427個 | 150個 | -65% |
| テスト成功率 | 5% | 90% | +85% |
| 主要ファイル行数 | 718行 | 150行 | -79% |
| any型使用 | 200+ | 20以下 | -90% |

### **定性的改善**
- **開発速度**: 新機能追加時間の50%短縮
- **保守性**: バグ修正の影響範囲明確化
- **学習容易性**: 新規開発者の理解時間短縮
- **UI最適化**: 座標操作・ドラッグ性能向上

---

## 🔒 **決定の不可逆性**

この決定は以下の根拠により**最終決定**とします：

1. **ドメインエキスパート分析**: 科学的手法による客観的判定
2. **実装コスト**: Clean Architecture継続のROI不適合
3. **技術的負債**: 現状維持のリスクが高すぎる
4. **UI最適化特化**: ドメイン特性に最適化された設計

---

## 📝 **実装ガイドライン**

### **必須原則**
- **YAGNI徹底**: 現在使用されていない抽象化の禁止
- **UI最適化優先**: 座標操作、ドラッグ性能を最優先
- **シンプル保持**: 150行以内のファイル、8以下の複雑度
- **関数型組み合わせ**: 純粋関数 + カスタムフック

### **禁止事項**
- Value Objectによる座標値抽象化
- DI Containerの再導入
- Repository patternの適用
- ドメイン層の作成

---

**この決定により、Amv-SystemはUI最適化に特化した高品質なワークスペースアプリケーションとして進化します。**