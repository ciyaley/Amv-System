# AMV-System API エンドポイント仕様

## 🌐 ベースURL
- **開発環境**: `http://localhost:8787`
- **本番環境**: `https://amv-system.cloudflare.com` (予定)

## 🔐 認証システム

### JWT Cookie認証
- **方式**: HTTPOnly Cookie + JWT Token
- **有効期限**: 7日間
- **リフレッシュ**: 自動リフレッシュ機能搭載

---

## 📋 エンドポイント一覧

### 🔑 認証関連

#### `POST /api/auth/login`
ユーザーログイン

**リクエスト**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**レスポンス**:
```json
{
  "success": true,
  "user": {
    "uuid": "user-uuid-123",
    "email": "user@example.com"
  }
}
```

#### `POST /api/auth/register`
ユーザー登録

**リクエスト**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### `POST /api/auth/logout`
ログアウト（Cookie削除）

#### `GET /api/autologin`
自動ログイン検証

**レスポンス**:
```json
{
  "success": true,
  "user": {
    "uuid": "user-uuid-123",
    "email": "user@example.com"
  }
}
```

#### `POST /api/auth/refresh-token`
トークンリフレッシュ

#### `POST /api/auth/password-reset`
パスワードリセット

#### `DELETE /api/auth/delete-account`
アカウント削除

---

### 📁 ディレクトリ管理

#### `POST /api/directory/associate`
ディレクトリの関連付け

**リクエスト**:
```json
{
  "directoryName": "MyWorkspace",
  "directoryPath": "/path/to/directory"
}
```

#### `GET /api/directory/info`
関連付けられたディレクトリ情報取得

---

### 👤 ユーザー管理

#### `POST /api/migration/migrate-user`
ユーザーデータ移行

---

### 🔧 開発・管理

#### `GET /api/dev/kv`
KVストレージ状態確認（開発専用）

#### `POST /api/dev/kv/clear`
KVストレージクリア（開発専用）

#### `GET /api/health`
ヘルスチェック

**レスポンス**:
```json
{
  "status": "ok",
  "timestamp": "2025-01-13T10:30:00.000Z",
  "environment": "development"
}
```

---

## 🔒 セキュリティ

### CORS設定
- **認証情報**: 有効（credentials: true）
- **許可オリジン**: 環境に応じて動的設定
- **許可メソッド**: GET, POST, PUT, DELETE, OPTIONS
- **許可ヘッダー**: Content-Type, Authorization, Cookie

### 暗号化
- **パスワード**: bcryptでハッシュ化
- **JWT**: RS256アルゴリズム使用
- **Cookie**: HTTPOnly, Secure, SameSite設定

---

## 📝 エラーレスポンス

### 標準エラー形式
```json
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "認証に失敗しました",
    "details": "詳細なエラー情報"
  }
}
```

### エラーコード一覧
- **AUTH_001**: 認証失敗
- **AUTH_002**: トークン無効
- **AUTH_003**: 権限不足
- **DATA_001**: データ保存失敗
- **DATA_002**: データ読み込み失敗
- **SYSTEM_001**: システムエラー