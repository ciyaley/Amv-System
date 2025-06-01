import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './auth';
import { autoLogin } from './api/auto-login';
import { devKVManager } from './api/dev-kv-manager';
import { directoryManager } from './api/directory-manager';
import type { Env } from './config/env';

const app = new Hono<{ Bindings: Env }>()

// CORS設定
app.use('*', cors({
  origin: (origin) => origin || 'http://localhost:3000',
  credentials: true,
}))

app.route('/api/autologin', autoLogin);
app.route('/api/auth', auth);
app.route('/api/dev/kv', devKVManager);
app.route('/api/directory', directoryManager);

// ヘルスチェック
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: 'development' // Cloudflare Workersでは環境変数はc.env経由でアクセス
  });
});

export default app
