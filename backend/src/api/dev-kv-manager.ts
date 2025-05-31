import { Hono } from "hono";
import type { Env } from "../config/env";

export const devKVManager = new Hono<{ Bindings: Env }>();

// 開発環境でのみ利用可能なKV管理エンドポイント
const isDev = () => true; // 開発環境として常に有効（本番デプロイ時は別途制御）

// KV内の全ユーザー一覧を取得
devKVManager.get("/users", async (c) => {
  if (!isDev()) {
    return c.json({ error: "Not available in production" }, 403);
  }

  try {
    const kv = c.env.KV_NAMESPACE_AUTH;
    const keys = await kv.list();
    
    const users = [];
    for (const key of keys.keys) {
      const userData = await kv.get(key.name);
      if (userData) {
        const parsed = JSON.parse(userData);
        users.push({
          email: key.name,
          uuid: parsed.uuid,
          created: (key.metadata as any)?.created || 'unknown'
        });
      }
    }
    
    return c.json({ 
      count: users.length,
      users: users 
    });
  } catch (error) {
    console.error("Failed to list users:", error);
    return c.json({ error: "Failed to list users" }, 500);
  }
});

// 特定ユーザーの詳細情報を取得
devKVManager.get("/users/:email", async (c) => {
  if (!isDev()) {
    return c.json({ error: "Not available in production" }, 403);
  }

  try {
    const email = c.req.param('email');
    const kv = c.env.KV_NAMESPACE_AUTH;
    const userData = await kv.get(email);
    
    if (!userData) {
      return c.json({ error: "User not found" }, 404);
    }
    
    const parsed = JSON.parse(userData);
    return c.json({
      email: email,
      uuid: parsed.uuid,
      hasPassword: !!parsed.password,
      passwordHash: parsed.password?.substring(0, 20) + "..." // セキュリティのため一部のみ表示
    });
  } catch (error) {
    console.error("Failed to get user:", error);
    return c.json({ error: "Failed to get user" }, 500);
  }
});

// 特定ユーザーを削除
devKVManager.delete("/users/:email", async (c) => {
  if (!isDev()) {
    return c.json({ error: "Not available in production" }, 403);
  }

  try {
    const email = c.req.param('email');
    const kv = c.env.KV_NAMESPACE_AUTH;
    
    const existing = await kv.get(email);
    if (!existing) {
      return c.json({ error: "User not found" }, 404);
    }
    
    await kv.delete(email);
    return c.json({ message: `User ${email} deleted successfully` });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return c.json({ error: "Failed to delete user" }, 500);
  }
});

// 全ユーザーデータを削除（開発用）
devKVManager.delete("/users", async (c) => {
  if (!isDev()) {
    return c.json({ error: "Not available in production" }, 403);
  }

  try {
    const kv = c.env.KV_NAMESPACE_AUTH;
    const keys = await kv.list();
    
    let deletedCount = 0;
    for (const key of keys.keys) {
      await kv.delete(key.name);
      deletedCount++;
    }
    
    return c.json({ 
      message: `Deleted ${deletedCount} users`,
      deletedCount: deletedCount
    });
  } catch (error) {
    console.error("Failed to delete all users:", error);
    return c.json({ error: "Failed to delete all users" }, 500);
  }
});

// KV接続テスト
devKVManager.get("/test", async (c) => {
  try {
    const kv = c.env.KV_NAMESPACE_AUTH;
    
    // テストデータを書き込み
    const testKey = `test_${Date.now()}`;
    await kv.put(testKey, "test_value");
    
    // 書き込んだデータを読み込み
    const value = await kv.get(testKey);
    
    // テストデータを削除
    await kv.delete(testKey);
    
    return c.json({
      message: "KV connection test successful",
      testWrite: "OK",
      testRead: value === "test_value" ? "OK" : "FAILED",
      testDelete: "OK"
    });
  } catch (error) {
    console.error("KV test failed:", error);
    return c.json({ 
      error: "KV connection test failed",
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});