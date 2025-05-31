import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { createJWTUtil } from "../utils/jwt";
import { decryptJSON } from "../utils/crypto";
import type { Env } from "../config/env";

export const autoLogin = new Hono<{ Bindings: Env }>();

autoLogin.get("/", async (c) => {
  // ① JWT_SECRET が無い ⇒ 500
  if (!c.env.JWT_SECRET) {
    return c.json({ status: "error", code: 3001, message: "JWT_SECRET not set" }, 500);
  }

  const token = getCookie(c, "token");

  // ② Cookie が無い ⇒ 401
  if (!token) {
    return c.json({ status: "error", code: 1004, message: "No token" }, 401);
  }

  try {
    const jwt = createJWTUtil(c.env.JWT_SECRET);
    const payload = await jwt.verify(token);

    // ③ 署名不正 or 期限切れ ⇒ 401
    if (!payload) {
      return c.json({ status: "error", code: 1003, message: "Invalid token" }, 401);
    }

    // ④ ユーザーデータを取得してパスワードも復号して返す
    try {
      const kv = c.env.KV_NAMESPACE_AUTH;
      const userData = await kv.get(payload.email);
      
      if (userData) {
        const parsedData = JSON.parse(userData);
        
        // 暗号化されたパスワードを復号
        let decryptedPassword = null;
        if (parsedData.encryptedPassword) {
          try {
            const encryptedBytes = new Uint8Array(parsedData.encryptedPassword);
            decryptedPassword = await decryptJSON(encryptedBytes, c.env.JWT_SECRET);
          } catch (decryptError) {
            console.error("Password decryption failed:", decryptError);
          }
        }
        
        return c.json({ 
          uuid: payload.uuid, 
          email: payload.email,
          password: decryptedPassword // クライアントサイド暗号化用
        }, 200);
      }
    } catch (kvError) {
      console.error("Failed to fetch user data from KV:", kvError);
    }
    
    // フォールバック: パスワードなしで返す
    return c.json({ uuid: payload.uuid, email: payload.email }, 200);
  } catch (err) {
    console.error("auto-login error", err);
    return c.json({ status: "error", code: 3001, message: "Internal server error" }, 500);
  }
});