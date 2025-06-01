import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import type { Env } from '../config/env';

const directoryManager = new Hono<{ Bindings: Env }>();

interface DirectoryMapping {
  accountUuid: string;
  directoryPath: string;
  lastAccessTime: string;
}

// アカウントとディレクトリの関連付けを保存
directoryManager.post('/associate', async (c) => {
  try {
    // JWTトークンの検証
    const token = getCookie(c, 'token');
    if (!token) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    const payload = await verify(token, c.env.JWT_SECRET);
    const accountUuid = payload.uuid as string;

    const body = await c.req.json();
    const { directoryPath } = body;

    if (!directoryPath) {
      return c.json({ message: 'Directory path is required' }, 400);
    }

    // ディレクトリ関連付けデータ
    const directoryMapping: DirectoryMapping = {
      accountUuid,
      directoryPath,
      lastAccessTime: new Date().toISOString()
    };

    // KVに保存（キー: directory:{accountUuid}）
    const kvKey = `directory:${accountUuid}`;
    await c.env.KV_NAMESPACE_AUTH.put(kvKey, JSON.stringify(directoryMapping));

    return c.json({ 
      message: 'Directory association saved successfully',
      directoryPath,
      lastAccessTime: directoryMapping.lastAccessTime
    });

  } catch (error) {
    console.error('Directory association error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// アカウントに関連付けられたディレクトリを取得
directoryManager.get('/get/:accountUuid', async (c) => {
  try {
    // JWTトークンの検証
    const token = getCookie(c, 'token');
    if (!token) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    const payload = await verify(token, c.env.JWT_SECRET);
    const requestingAccountUuid = payload.uuid as string;
    const targetAccountUuid = c.req.param('accountUuid');

    // 自分のアカウントのみアクセス可能
    if (requestingAccountUuid !== targetAccountUuid) {
      return c.json({ message: 'Forbidden: Can only access own directory mapping' }, 403);
    }

    // KVから取得
    const kvKey = `directory:${targetAccountUuid}`;
    const data = await c.env.KV_NAMESPACE_AUTH.get(kvKey);

    if (!data) {
      return c.json({ message: 'No directory mapping found' }, 404);
    }

    const directoryMapping: DirectoryMapping = JSON.parse(data);

    return c.json({
      directoryPath: directoryMapping.directoryPath,
      lastAccessTime: directoryMapping.lastAccessTime
    });

  } catch (error) {
    console.error('Directory retrieval error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// 現在ログイン中のアカウントのディレクトリを取得（簡易版）
directoryManager.get('/current', async (c) => {
  try {
    // JWTトークンの検証
    const token = getCookie(c, 'token');
    if (!token) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    const payload = await verify(token, c.env.JWT_SECRET);
    const accountUuid = payload.uuid as string;

    // KVから取得
    const kvKey = `directory:${accountUuid}`;
    const data = await c.env.KV_NAMESPACE_AUTH.get(kvKey);

    if (!data) {
      return c.json({ message: 'No directory mapping found' }, 404);
    }

    const directoryMapping: DirectoryMapping = JSON.parse(data);

    return c.json({
      directoryPath: directoryMapping.directoryPath,
      lastAccessTime: directoryMapping.lastAccessTime
    });

  } catch (error) {
    console.error('Current directory retrieval error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// ディレクトリ関連付けを削除
directoryManager.delete('/remove', async (c) => {
  try {
    // JWTトークンの検証
    const token = getCookie(c, 'token');
    if (!token) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    const payload = await verify(token, c.env.JWT_SECRET);
    const accountUuid = payload.uuid as string;

    // KVから削除
    const kvKey = `directory:${accountUuid}`;
    await c.env.KV_NAMESPACE_AUTH.delete(kvKey);

    return c.json({ message: 'Directory association removed successfully' });

  } catch (error) {
    console.error('Directory removal error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

export { directoryManager };