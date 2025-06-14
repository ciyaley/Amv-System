import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './auth';
import { autoLogin } from './api/auto-login';
import { devKVManager } from './api/dev-kv-manager';
import { directoryManager } from './api/directory-manager';
import { passwordReset } from './api/password-reset';
import { refreshToken } from './api/refresh-token';
import { userMigration } from './api/user-migration';
import type { Env } from './config/env';

const app = new Hono<{ Bindings: Env }>()

// CORS設定 - JWT Cookie用に拡張
app.use('*', cors({
  origin: (origin) => {
    // 開発環境でのオリジン確認
    console.log('CORS origin check:', origin);
    return origin || 'http://localhost:3000';
  },
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // 追加: Set-Cookieヘッダーを許可
  exposeHeaders: ['Set-Cookie', 'Set-Cookie-Debug'],
  maxAge: 86400 // プリフライトリクエストのキャッシュ時間
}))

app.route('/api/autologin', autoLogin);
app.route('/api/auth', auth);
app.route('/api/auth', passwordReset);
app.route('/api/auth/refresh-token', refreshToken);
app.route('/api/dev/kv', devKVManager);
app.route('/api/directory', directoryManager);
app.route('/api/migration', userMigration);

// ヘルスチェック
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: 'development' // Cloudflare Workersでは環境変数はc.env経由でアクセス
  });
});

export default app
