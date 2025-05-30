import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './auth';
import { autoLogin } from './api/auto-login';
import type { Env } from './config/env';

const app = new Hono<{ Bindings: Env }>()

// CORS設定
app.use('*', cors({
  origin: (origin) => origin || 'http://localhost:3000',
  credentials: true,
}))

app.route('/api/autologin', autoLogin);

app.route('/api/auth', auth);


export default app
