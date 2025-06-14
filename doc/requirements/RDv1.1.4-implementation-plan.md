# Amv-System v1.1.4 実装計画

## 📋 変更概要

RDv1.1.3をベースに、ユーザー指示により以下の機能を追加・修正：

1. **ログアウト時のデータ管理強化**
2. **保存UI/UXの最適化** 
3. **メモ表示制御機能の追加**

## 🎯 実装タスク

### Phase 1: ログアウト時データ管理 (優先度: 高)

#### Task 1.1: ログアウト後の画面更新とファイル読み取り停止
- **場所**: `useAuth.ts:logout()`, `useMemos.ts`, `useLoadAfterLogin.ts`
- **内容**:
  - ログアウト時にメモデータを完全クリア
  - ファイルシステムからの自動読み込みを停止
  - 画面を未ログイン状態に完全リセット
- **実装方法**:
  ```typescript
  // useAuth.ts - logout関数拡張
  logout: async () => {
    // 既存のログアウト処理
    await fetch(`${API_BASE_URL}/api/auth/logout`, ...)
    
    // 新規: ファイル読み込み停止フラグ設定
    set({ isLoggedIn: false, uuid: null, email: null })
    useEncryptionStore.setState({ password: null })
    
    // 新規: 完全なデータクリア
    clearFileSystemCache()
    const { useMemos } = await import('./useMemos')
    useMemos.getState().clearAllMemos()
    
    // 新規: ファイル自動読み込み停止
    const { useLoadAfterLogin } = await import('./useLoadAfterLogin')
    // 読み込み処理の無効化
  }
  ```

#### Task 1.2: 未ログイン時のファイル読み込み制御
- **場所**: `useLoadAfterLogin.ts`, `useMemos.ts:loadMemosFromDisk()`
- **内容**:
  - ログイン状態チェックを全ファイル読み込み処理に追加
  - 未ログイン時は自動読み込みを完全に停止

### Phase 2: 保存UI/UX最適化 (優先度: 高)

#### Task 2.1: ログイン時の手動保存機能削除
- **場所**: `workspace/page.tsx`, `GeneralSettings.tsx`
- **内容**:
  - 右上の一括保存ボタンをログイン時は非表示
  - ログイン時は自動保存のみに統一
- **UI変更**:
  ```typescript
  // workspace/page.tsx
  {!isLoggedIn && (
    <button onClick={handleManualSave}>一括保存</button>
  )}
  // ログイン時は表示しない
  ```

#### Task 2.2: メモ個別保存ボタンの削除
- **場所**: `Memowindow.tsx` (メモ個別コンポーネント)
- **調査対象**: メモウィンドウ内の保存ボタンの存在確認
- **内容**: 
  - メモ個別の保存ボタンを完全削除
  - 自動保存のみに統一

### Phase 3: メモ表示制御機能 (優先度: 中)

#### Task 3.1: メモ表示/非表示機能
- **場所**: `useMemos.ts`, `WorkspaceCanvas.tsx`
- **内容**:
  - メモデータに`visible: boolean`プロパティ追加
  - キャンバス上でのメモ表示/非表示切り替え
- **データ構造変更**:
  ```typescript
  interface MemoData {
    // 既存プロパティ
    id: string;
    title: string;
    // ...
    
    // 新規追加
    visible: boolean;  // 画面表示制御
  }
  ```

#### Task 3.2: サイドバーからのメモ呼び出し機能
- **場所**: `AdaptiveSidebar.tsx`, `SidebarItem.tsx`
- **内容**:
  - サイドバーのメモアイテムクリックで表示切り替え
  - 非表示メモの視覚的区別（グレーアウト等）
- **UI仕様**:
  ```typescript
  // サイドバーアイテムの拡張
  <SidebarItem 
    memo={memo}
    isVisible={memo.visible}
    onToggleVisibility={handleToggleVisibility}
    onFocusOnCanvas={handleFocusOnCanvas}
  />
  ```

#### Task 3.3: メモコンテキストメニュー
- **場所**: `Memowindow.tsx`
- **内容**:
  - 右クリックで「画面から隠す」オプション追加
  - メモウィンドウのヘッダーに表示/非表示トグルボタン

### Phase 4: 状態管理とUI統合 (優先度: 中)

#### Task 4.1: メモ表示状態の管理
- **場所**: `useMemos.ts`
- **内容**:
  - `toggleMemoVisibility(id: string)` 関数追加
  - `focusMemoOnCanvas(id: string)` 関数追加
  - 表示状態変更時の自動保存

#### Task 4.2: キャンバス表示フィルタリング
- **場所**: `WorkspaceCanvas.tsx`
- **内容**:
  - `visible: true`のメモのみレンダリング
  - 非表示メモの位置情報は保持

#### Task 4.3: サイドバー視覚フィードバック
- **場所**: `AdaptiveSidebar.tsx`, `SidebarItem.tsx`
- **内容**:
  - 非表示メモのスタイル調整（透明度、アイコン変更等）
  - 表示/非表示状態の明確な区別

## 🔧 技術仕様

### データ構造変更
```typescript
// MemoData インターフェース拡張
interface MemoData {
  // 既存フィールド
  id: string;
  type: 'memo';
  title: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  tags?: string[];
  created: string;
  updated: string;
  
  // 新規追加
  visible: boolean;  // デフォルト: true
}
```

### 新規フック
```typescript
// useMemoVisibility.ts
interface MemoVisibilityState {
  toggleVisibility: (id: string) => void;
  focusOnCanvas: (id: string) => void;
  getVisibleMemos: () => MemoData[];
  getHiddenMemos: () => MemoData[];
}
```

### UI コンポーネント拡張
```typescript
// MemoWindow に追加
interface MemoWindowProps {
  // 既存props
  memo: MemoData;
  
  // 新規追加
  onToggleVisibility?: (id: string) => void;
}

// SidebarItem に追加  
interface SidebarItemProps {
  // 既存props
  memo: MemoData;
  
  // 新規追加
  isVisible: boolean;
  onToggleVisibility?: (id: string) => void;
  onFocusOnCanvas?: (id: string) => void;
}
```

## 📝 実装順序

1. **Phase 1** (Task 1.1, 1.2): ログアウト時データ管理 - 2-3時間
2. **Phase 2** (Task 2.1, 2.2): 保存UI最適化 - 1-2時間  
3. **Phase 3** (Task 3.1, 3.2, 3.3): メモ表示制御 - 3-4時間
4. **Phase 4** (Task 4.1, 4.2, 4.3): 状態管理統合 - 2-3時間

**総実装時間**: 8-12時間

## ✅ 完了基準

- [ ] ログアウト後にファイル読み込みが完全停止する
- [ ] ログイン時は自動保存のみ、手動保存ボタンなし
- [ ] 未ログイン時は右上の一括保存ボタンのみ表示
- [ ] メモを画面から隠す/表示する機能が動作する
- [ ] サイドバーからメモを呼び出せる
- [ ] 全機能でテストが通過する

## 🚀 RDv1.1.3からの進化点

1. **データライフサイクル管理の強化**: ログアウト時の完全なデータクリア
2. **保存UXの統一**: ログイン状態に応じた保存UI最適化  
3. **情報管理の柔軟性向上**: メモ表示制御によるワークスペース管理機能
4. **適応的UI対応**: サイドバーとキャンバスの連携強化

この実装により、RDv1.1.3の「適応的情報管理システム」がより実用的で直感的なものに進化します。