# AMV-System ドキュメント

**更新日**: 2025-01-14  
**バージョン**: v1.1.6+

Amv-Systemは、xy座標による自由配置でデータの保管・取り出しを最適化するローカルファーストワークスペースアプリケーションです。

---

## 📚 ドキュメント構成

### 🚀 [ユーザーガイド](./user-guide/)
- **[はじめに](./user-guide/getting-started.md)** - 基本操作とセットアップ
- アプリケーションの使い方、基本機能の説明

### 🏗️ [アーキテクチャ](./architecture/)
- **[アーキテクチャ決定書](./architecture/ARCHITECTURE_DECISION.md)** - 設計方針と決定根拠
- Simple Layered Architecture + Functional Services採用理由

### 📋 [要件仕様](./requirements/)
- **[RDv1.1.3.md](./requirements/RDv1.1.3.md)** - 基本機能仕様
- **[RDv1.1.4-implementation-plan.md](./requirements/RDv1.1.4-implementation-plan.md)** - 実装計画
- **[RDv1.1.5.1.md](./requirements/RDv1.1.5.1.md)** - 詳細機能仕様
- **[RDv1.1.6.md](./requirements/RDv1.1.6.md)** - 修正完了記録

### 🔧 [開発ガイド](./development/)
- **[CLAUDE.md](./development/CLAUDE.md)** - 開発ガイドライン
- **[TDD-implementation-plan.md](./development/TDD-implementation-plan.md)** - TDD実装計画
- **[COMPONENT_REQUIREMENTS_MAPPING.md](./development/COMPONENT_REQUIREMENTS_MAPPING.md)** - コンポーネント要件マッピング

### 🌐 [API仕様](./api/)
- **[エンドポイント仕様](./api/endpoints.md)** - REST API詳細仕様
- 認証、ディレクトリ管理、ヘルスチェック等

### 🔧 [技術仕様](./technical/)
- **[アーキテクチャ概要](./technical/architecture-overview.md)** - 技術スタックと設計
- **[フロントエンド仕様](./technical/frontend-readme.md)** - Next.js関連
- **[バックエンド仕様](./technical/backend-readme.md)** - Cloudflare Workers関連
- **[監査レポート](./technical/COMPREHENSIVE_AUDIT_REPORT.md)** - 品質監査結果

---

## 🎯 プロジェクト概要

### コアコンセプト
**「xy座標による自由配置でデータ保管・取り出しの手軽さを最適化する」**

### 主要機能
- ✨ **直感的配置**: ドラッグ&ドロップによる自由なメモ配置
- 🔒 **ローカルファースト**: File System Access APIによる完全なデータ主権
- 🔄 **段階的認証**: ゲストモード → 認証モードへの自然な移行
- 🔍 **高度検索**: TinySegmenter + TF-IDF による日本語最適化検索
- 🛠️ **拡張性**: Extensible Toolbar Architectureによる機能追加容易性

### 技術的特徴
- **品質目標**: 9.2/10 (業界トップクラス)
- **UI応答性**: 200ms以下
- **データ整合性**: 99.9%保証
- **アクセシビリティ**: WCAG 2.1 AA準拠

---

## 🚀 クイックスタート

### 開発環境セットアップ
```bash
# フロントエンド
cd frontend
npm install
npm run dev

# バックエンド  
cd backend
npm install
npm run dev
```

### 基本的な使い方
1. **ゲストモード**: ブラウザでhttp://localhost:3000にアクセス
2. **認証モード**: アカウント作成してローカルディレクトリ連携
3. **メモ作成**: 下部ツールバーから「＋メモ」をクリック
4. **自由配置**: ドラッグ&ドロップで直感的に整理

---

## 📊 プロジェクト品質状況

### ✅ 完了済み改善項目
- **Priority 1**: コンソール文除去、基本動作修正、競合状態修正、脆弱性修正
- **Priority 2**: 全ファイルの300行制限対応、any型を58個→2個に削減
- **アーキテクチャ**: Clean Architecture→Simple Services移行完了
- **テスト**: 成功率5%→90%以上に大幅改善

### 🎯 品質指標達成状況
- ✅ **ファイルサイズ**: 全ファイル300行以下
- ✅ **型安全性**: any型2個まで削減（外部API由来のみ）
- ✅ **テスト品質**: E2E/Unit/Integration テスト安定化
- ✅ **セキュリティ**: npm audit脆弱性0件

---

## 🔗 関連リンク

### 開発・運用
- **リポジトリ**: [GitHub](./COMPONENT_REQUIREMENTS_MAPPING.md#開発環境)
- **品質ダッシュボード**: [技術監査レポート](./technical/COMPREHENSIVE_AUDIT_REPORT.md)
- **API仕様**: [Swagger/OpenAPI](./api/endpoints.md)

### コミュニティ
- **バグ報告**: GitHub Issues
- **機能要望**: GitHub Discussions  
- **開発者ガイド**: [CLAUDE.md](./development/CLAUDE.md)

---

## 📝 更新履歴

- **v1.1.6** (2025-01-14): ドキュメント整理、品質改善完了
- **v1.1.5.1** (2025-01-13): 詳細機能仕様確定
- **v1.1.4** (2025-01-12): 実装計画策定
- **v1.1.3** (2025-01-11): 基本仕様確定

---

**ドキュメント管理者**: AMV-System開発チーム  
**最終更新**: 2025-01-14