import { Hono } from 'hono'
import auth from './auth';
import{ autoLogin } from './api/auto-login';

const app = new Hono()

app.route('/api/autologin', autoLogin);

app.route('/api/auth', auth);


export default app
