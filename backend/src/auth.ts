import { Hono } from "hono";
import { createJWTUtil } from "./utils/jwt";
import { getCookie, setCookie } from "hono/cookie";
import { encryptJSON, decryptJSON } from "./utils/crypto";
import type { Env } from "./config/env";
import { hash, compare } from "bcryptjs";

const auth = new Hono<{ Bindings: Env }>();

// ユーティリティ：dev なら secure=false
const setJwtCookie = (c: any, token: string) => {
  const isProd = c.env.SITE_URL?.startsWith("https");
  setCookie(c, "token", token, {
    path: "/",
    httpOnly: true,
    sameSite: "Strict",
    secure: isProd,
  });
};

/** ─────────────  REGISTER  ───────────── **/
auth.post("/register", async (c) => {
  const { email, password } = await c.req.json();
  const kv = c.env.KV_NAMESPACE_AUTH;         // ← KV バインディング名

  // 重複チェック
  if (await kv.get(email)) {
    return c.json({ status: "error", code: 1002, message: "User already exists" }, 400);
  }

  // 保存
  const passwordHash = await hash(password, 8);
  const uuid = crypto.randomUUID();
  
  // パスワードをサーバーサイド暗号化して保存
  const encryptedPassword = await encryptJSON(password, c.env.JWT_SECRET);
  const userData = {
    uuid,
    passwordHash, // 認証用ハッシュ
    encryptedPassword: Array.from(encryptedPassword) // クライアント暗号化用の平文パスワード（暗号化済み）
  };
  
  await kv.put(email, JSON.stringify(userData));

  // JWT 発行 + Cookie
  const jwt = createJWTUtil(c.env.JWT_SECRET);
  const token = await jwt.sign({ uuid, email });
  setJwtCookie(c, token);

  // 🔑 登録時もクライアントサイド暗号化用のパスワードを返す
  return c.json({ 
    message: "Registered successfully", 
    uuid, 
    email,
    password: password // 登録時は平文パスワードをそのまま返す
  }, 200);
});

/** ─────────────  LOGIN  ───────────── **/
auth.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  const kv = c.env.KV_NAMESPACE_AUTH;

  const stored = await kv.get(email);
  if (!stored) {
    return c.json({ status: "error", code: 1001, message: "Invalid credentials" }, 401);
  }

  const userData = JSON.parse(stored);
  if (!(await compare(password, userData.passwordHash))) {
    return c.json({ status: "error", code: 1001, message: "Invalid credentials" }, 401);
  }

  // JWT 再発行 + Cookie
  const jwt = createJWTUtil(c.env.JWT_SECRET);
  const token = await jwt.sign({ uuid: userData.uuid, email });
  setJwtCookie(c, token);

  // 🔑 クライアントサイド暗号化用のパスワードを復号して返す
  let decryptedPassword = null;
  if (userData.encryptedPassword) {
    try {
      const encryptedBytes = new Uint8Array(userData.encryptedPassword);
      decryptedPassword = await decryptJSON(encryptedBytes, c.env.JWT_SECRET);
    } catch (decryptError) {
      console.error("Password decryption failed during login:", decryptError);
    }
  }

  return c.json({ 
    message: "Logged in successfully", 
    uuid: userData.uuid, 
    email,
    password: decryptedPassword // クライアントサイド暗号化用
  }, 200);
});

/** ─────────────  LOGOUT  ───────────── **/
auth.post("/logout", async (c) => {
  // Cookieを削除
  setCookie(c, "token", "", {
    path: "/",
    httpOnly: true,
    sameSite: "Strict",
    secure: c.env.SITE_URL?.startsWith("https"),
    maxAge: 0, // 即座に期限切れ
  });
  
  return c.json({ message: "Logged out successfully" }, 200);
});

/** ─────────────  DELETE ACCOUNT  ───────────── **/
auth.delete("/delete", async (c) => {
  const token = getCookie(c, "token");
  
  if (!token) {
    return c.json({ status: "error", code: 1004, message: "Not authenticated" }, 401);
  }

  try {
    const jwt = createJWTUtil(c.env.JWT_SECRET);
    const payload = await jwt.verify(token);
    
    if (!payload) {
      return c.json({ status: "error", code: 1003, message: "Invalid token" }, 401);
    }

    const kv = c.env.KV_NAMESPACE_AUTH;
    
    // ユーザーデータをKVから削除
    await kv.delete(payload.email);
    
    // Cookieも削除
    setCookie(c, "token", "", {
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
      secure: c.env.SITE_URL?.startsWith("https"),
      maxAge: 0,
    });
    
    return c.json({ message: "Account deleted successfully" }, 200);
  } catch (error) {
    console.error("Delete account error:", error);
    return c.json({ status: "error", code: 3001, message: "Internal server error" }, 500);
  }
});

export default auth;