# AMV-System ファイル保存・読み込み仕様書 v2.0

## 概要
AMV-Systemは認証状態により保存動作が完全に異なる三つのモードを持つ。さらに、アカウント別ディレクトリ管理と自動復元機能を提供する。

---

## 🔄 **フロー1: ゲスト参加時（未ログイン）**

### 1.1 初期状態
- トップページから「ゲスト参加」を押下
- データなし、新規状態でワークスペース開始
- 右上に「保存」ボタンが表示される

### 1.2 メモ作成・編集
- メモを新規作成・編集可能
- **自動保存は一切行わない**
- メモはメモリ上にのみ存在

### 1.3 手動保存プロセス
```
1. 右上「保存」ボタンを押下
2. ファイル保存先選択ダイアログが表示
3. ユーザーがフォルダを指定
4. 指定フォルダ内の既存AMV-systemファイル構造をチェック
   - 既存データ検出時: 既存ファイルにマージ保存
   - 新規フォルダ時: 新規AMV-system構造を作成
5. 現在のメモを.jsonファイルとして保存
6. ✨NEW: 指定フォルダを記憶し、次回同フォルダ選択時にデータを自動復元
```

### 1.4 既存データ検出・復元時の動作
```
指定フォルダ/
├── memos/           ← 既存メモフォルダ検出
│   ├── memo1.json   ← 既存メモファイル
│   └── memo2.json
├── workspace.json   ← 既存ワークスペース設定
└── settings.json    ← 既存設定ファイル

→ 既存データをメモリに復元 + 新規データをマージ保存
```

### 1.5 ✨NEW: ゲストモード永続化
```
1. 同一フォルダを再選択した場合
   - 以前の保存データを自動検出
   - 既存メモをワークスペースに復元表示
   - 追加・編集したメモを既存データにマージ

2. データ継続性保証
   - フォルダパス記憶（localStorage）
   - 次回同フォルダ選択時の自動復元
   - 編集データの適切な永続化
```

---

## 🔐 **フロー2: ログイン時（認証済み）**

### 2.1 ログイン後の初期化
```
1. ログイン成功
2. ✨NEW: アカウント固有ディレクトリの自動復元を試行
   a) バックエンドから前回使用ディレクトリパスを取得
   b) ディレクトリアクセス可能性をチェック
   c) 可能な場合: 自動でディレクトリ設定＋データ復元
   d) 不可能な場合: 手動フォルダ選択へ進む

3. 手動フォルダ選択（自動復元失敗時）
   - 「データを読み込むためフォルダを指定してください」メッセージ表示
   - ファイル保存先選択ダイアログ自動表示
   - ユーザーがフォルダ指定

4. 指定フォルダ処理
   - ✨NEW: 選択ディレクトリがアカウントで以前使用済みかチェック
   - 既存データ検出時: 既存メモ・設定を自動読み込み
   - 新規ディレクトリ時: 新規AMV-system構造作成
   - ワークスペースに復元データを表示

5. ✨NEW: アカウント-ディレクトリ関連付け
   - アカウントUUIDとディレクトリパスをバックエンドに保存
   - 次回自動ログイン時の自動復元に使用
```

### 2.2 自動保存モード
- **メモ作成・編集・移動・リサイズ時に自動保存**
- 右上に保存ボタンは**表示されない**（自動保存のため不要）
- デバウンス: 500ms間隔で重複保存防止

### 2.3 ファイル構造管理
```
指定フォルダ/
├── memos/                    ← メモ専用フォルダ
│   ├── {memoId}.json        ← 個別メモファイル（暗号化）
│   ├── {memoId2}.json
│   └── .memo_metadata.json  ← ID-ファイル名対応表
├── workspace.json           ← キャンバス設定（暗号化）
├── settings.json           ← アプリ設定（暗号化）
└── ✨NEW: .amv_account.json ← アカウント関連付け情報
```

---

## 🚀 **フロー2.5: 自動ログイン時（NEW）**

### 2.5.1 自動ログイン検証プロセス
```
1. ページロード時に自動ログイン検証
2. 自動ログイン成功時:
   a) アカウントUUIDを取得
   b) バックエンドから関連付けディレクトリパスを取得
   c) ディレクトリハンドルの有効性をチェック
   d) 有効な場合: 自動でデータ復元
   e) 無効な場合: 手動フォルダ選択へ
```

### 2.5.2 アカウント別ディレクトリ管理
```typescript
// バックエンド管理データ
interface AccountDirectoryMapping {
  accountUuid: string;
  lastUsedDirectoryPath: string;
  lastAccessTime: string;
  directoryHandle?: FileSystemDirectoryHandle; // フロントエンド保存
}
```

### 2.5.3 自動復元フロー
```
1. 関連付けディレクトリの権限確認
2. AMV-system構造の存在チェック
3. アカウント固有ファイルの検証
4. データ復号化・復元
5. ワークスペースへの表示
6. 「前回のワークスペースを復元しました」メッセージ
```

---

## 🚪 **フロー3: ログアウト時**

### 3.1 ログアウト処理
```
1. ログアウトボタン押下
2. ✨NEW: 現在のディレクトリパスをバックエンドに保存
3. 画面を完全リフレッシュ（window.location.reload()）
4. 未ログイン状態に復帰
5. 自動保存機能停止
6. メモリ上のデータクリア
```

### 3.2 ログアウト後の動作
- 再度「ゲスト参加」と同じ動作
- 右上に「保存」ボタン表示
- メモ作成・編集時は自動保存なし
- 保存には都度ファイル指定が必要

---

## 🔧 **技術実装詳細**

### 4.1 認証状態判定
```typescript
// ログイン状態で分岐
if (isLoggedIn) {
  // 自動保存モード
  - 保存ボタン非表示
  - メモ変更時に自動保存
  - データ暗号化
  - ✨NEW: アカウント別ディレクトリ管理
} else {
  // 手動保存モード  
  - 保存ボタン表示
  - 手動保存のみ
  - データ平文
  - ✨NEW: フォルダ記憶・復元機能
}
```

### 4.2 ✨NEW: アカウント-ディレクトリ関連付けAPI
```typescript
// バックエンドAPI
POST /api/directory/associate
{
  "accountUuid": "uuid",
  "directoryPath": "/path/to/directory",
  "lastAccessTime": "2024-01-01T00:00:00Z"
}

GET /api/directory/get/{accountUuid}
→ {
  "directoryPath": "/path/to/directory",
  "lastAccessTime": "2024-01-01T00:00:00Z"
}
```

### 4.3 ファイル保存ロジック（拡張）
```typescript
// 既存ファイルチェック→削除→新規作成
if (existingFile) {
  await removeEntry(existingFile)  // 重複防止
}
await createNewFile(memo)          // 新規作成
await updateMetadata(memoId, filename)  // メタデータ更新

// ✨NEW: アカウント関連付け保存
if (isLoggedIn) {
  await saveAccountAssociation(accountUuid, directoryPath);
}
```

### 4.4 ✨NEW: ディレクトリ復元ロジック
```typescript
async function restoreAccountDirectory(accountUuid: string): Promise<boolean> {
  try {
    // 1. バックエンドから関連付けディレクトリを取得
    const savedPath = await fetchAccountDirectory(accountUuid);
    if (!savedPath) return false;

    // 2. 保存済みハンドルの有効性確認
    const handle = await loadStoredDirectoryHandle(savedPath);
    if (!handle || !await validateHandle(handle)) return false;

    // 3. AMV-system構造とアカウント整合性確認
    if (!await validateAccountOwnership(handle, accountUuid)) return false;

    // 4. データ復元
    await restoreDataFromDirectory(handle);
    return true;
  } catch (error) {
    console.error('Directory restoration failed:', error);
    return false;
  }
}
```

### 4.5 重複防止システム（拡張）
```typescript
// 読み込み時の重複防止 + アカウント検証
const loadedIds = new Set<string>()
for (const memo of allMemos) {
  if (!loadedIds.has(memo.id) && await validateMemoOwnership(memo, accountUuid)) {
    memos.push(memo)
    loadedIds.add(memo.id)
  }
}
```

---

## 🎯 **UI/UX 要件（拡張）**

### 5.1 ボタン表示制御
- **ログイン時**: 保存ボタン非表示
- **未ログイン時**: 保存ボタン表示

### 5.2 メッセージ表示（拡張）
- 自動ログイン成功時: 「前回のワークスペースを復元しました（○個のメモ）」
- 自動復元失敗時: 「データを読み込むためフォルダを指定してください」
- 手動ログイン後: 「データを読み込むためフォルダを指定してください」
- 既存データ検出: 「○個の既存メモを検出しました」
- ゲストモード復元: 「前回保存したデータを復元しました（○個のメモ）」
- フォルダ再選択: 「保存フォルダを再選択しました」

### 5.3 エラーハンドリング（拡張）
- フォルダアクセス権限エラー
- ファイル保存失敗
- データ読み込み失敗
- 暗号化/復号化エラー
- ✨NEW: アカウント関連付けエラー
- ✨NEW: ディレクトリ復元失敗
- ✨NEW: アカウント所有権検証エラー

---

## 🔒 **セキュリティ要件（拡張）**

### 6.1 データ暗号化
- **ログイン時**: 全データ暗号化保存
- **未ログイン時**: 平文保存

### 6.2 権限管理（拡張）
- ファイルシステムアクセス権限チェック
- ディレクトリ作成権限確認
- 既存ファイル上書き権限確認
- ✨NEW: アカウント所有権検証
- ✨NEW: ディレクトリ関連付け権限確認

### 6.3 ✨NEW: アカウント所有権検証
```typescript
// .amv_account.json による所有権確認
interface AccountOwnership {
  accountUuid: string;
  createdAt: string;
  lastAccessAt: string;
}

async function validateAccountOwnership(directory: FileSystemDirectoryHandle, accountUuid: string): Promise<boolean> {
  try {
    const accountFile = await directory.getFileHandle('.amv_account.json');
    const data = JSON.parse(await accountFile.getFile().text());
    return data.accountUuid === accountUuid;
  } catch {
    return false; // ファイルが存在しない、または形式が不正
  }
}
```

---

## 📁 **ファイル構造詳細（拡張）**

### 7.1 AMV-system標準構造
```
[ユーザー指定フォルダ]/
├── memos/
│   ├── memo_abc123.json      ← 個別メモ
│   ├── memo_def456.json
│   └── .memo_metadata.json   ← メタデータ
├── workspace.json            ← キャンバス設定
├── settings.json            ← アプリ設定
└── ✨NEW: .amv_account.json  ← アカウント関連付け情報
```

### 7.2 ✨NEW: アカウント関連付けファイル形式
```json
{
  "accountUuid": "user-uuid-here",
  "createdAt": "2024-01-01T00:00:00Z",
  "lastAccessAt": "2024-01-01T12:00:00Z",
  "directoryPath": "/Users/username/Documents/MyProject",
  "version": "2.0"
}
```

### 7.3 メタデータファイル形式（拡張）
```json
{
  "memo_abc123": "memo_abc123.json",
  "memo_def456": "memo_def456.json",
  "✨NEW": {
    "accountUuid": "user-uuid-here",
    "lastSync": "2024-01-01T12:00:00Z"
  }
}
```

---

## ⚡ **パフォーマンス要件（拡張）**

### 8.1 自動保存
- デバウンス: 500ms
- 同時保存制限: 1メモにつき1プロセス
- エラー時リトライ: なし（次回変更時に再試行）

### 8.2 読み込み最適化（拡張）
- 重複読み込み防止
- 無効座標修正
- メタデータクリーンアップ
- ✨NEW: アカウント関連付け検証キャッシュ
- ✨NEW: ディレクトリハンドル有効性キャッシュ

### 8.3 ✨NEW: 自動復元最適化
- ディレクトリアクセス権限事前チェック
- 部分的データ復元（失敗時のフォールバック）
- バックグラウンドでの段階的データ読み込み

---

## 🔄 **データフロー概要（全体）**

### 9.1 状態遷移図
```
[ページロード]
    ↓
[自動ログイン チェック]
    ↓
┌─[成功]─→[アカウントディレクトリ復元]─→[データ表示]
│              ↓[失敗]
│         [手動フォルダ選択]
└─[失敗]─→[ゲストモード]─→[手動保存必要]

[ログアウト]
    ↓
[ディレクトリ関連付け保存]
    ↓
[画面リフレッシュ]
    ↓
[ゲストモード]
```

### 9.2 データ整合性保証
- ファイル保存前の重複チェック
- 読み込み時のデータ検証
- アカウント所有権の確認
- バックアップ機能（将来拡張）

---

## 🧪 **テスト要件**

### 10.1 自動ログイン・復元テスト
- アカウント別ディレクトリ関連付け
- 無効ディレクトリでの適切なフォールバック
- 権限エラー時の処理

### 10.2 ゲストモード永続化テスト
- 同一フォルダ再選択時のデータ復元
- マージ処理の正確性
- データ競合の回避

### 10.3 セキュリティテスト
- 不正アカウント所有権の検出
- 暗号化データの整合性
- ファイルシステム権限エラー処理

---

この拡張仕様書に基づいて実装を行います。