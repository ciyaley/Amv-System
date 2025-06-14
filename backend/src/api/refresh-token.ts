import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { createJWTUtil } from "../utils/jwt";
import { decryptJSON } from "../utils/crypto";
import type { Env } from "../config/env";
import { ERROR_CODES, createAPIError, createResponse } from "../types/errors";

export const refreshToken = new Hono<{ Bindings: Env }>();

// JWTトークンリフレッシュ
refreshToken.post("/", async (c) => {
  const currentToken = getCookie(c, "token");
  
  if (!currentToken) {
    const error = createAPIError(ERROR_CODES.A002, { 
      details: "リフレッシュするトークンがありません" 
    });
    return createResponse(false, null, error);
  }
  
  // ブラックリストチェック
  const blacklistKV = c.env.KV_NAMESPACE_TOKEN_BLACKLIST;
  const isBlacklisted = await blacklistKV.get(currentToken);
  
  if (isBlacklisted) {
    const error = createAPIError(ERROR_CODES.A002, { 
      details: "無効化されたトークンです" 
    });
    return createResponse(false, null, error);
  }
  
  try {
    const jwt = createJWTUtil(c.env.JWT_SECRET);
    const payload = await jwt.verify(currentToken);
    
    if (!payload) {
      const error = createAPIError(ERROR_CODES.A002, { 
        details: "トークンが無効です" 
      });
      return createResponse(false, null, error);
    }
    
    // ユーザーデータの存在確認
    const kv = c.env.KV_NAMESPACE_AUTH;
    const userDataStr = await kv.get(payload.email);
    
    if (!userDataStr) {
      const error = createAPIError(ERROR_CODES.A004, { 
        details: "ユーザーが見つかりません" 
      });
      return createResponse(false, null, error);
    }
    
    const userData = JSON.parse(userDataStr);
    
    // 古いトークンをブラックリストに追加（24時間保持）
    await blacklistKV.put(currentToken, "blacklisted", {
      expirationTtl: 24 * 60 * 60 // 24時間
    });
    
    // 新しいJWTトークンを発行
    const newToken = await jwt.sign({ 
      uuid: payload.uuid, 
      email: payload.email 
    });
    
    // 新しいトークンをCookieに設定
    const isProd = c.env.SITE_URL?.startsWith("https");
    setCookie(c, "token", newToken, {
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
      secure: isProd,
    });
    
    // クライアントサイド暗号化用のパスワードを復号
    let decryptedPassword = null;
    if (userData.encryptedPassword) {
      try {
        const encryptedBytes = new Uint8Array(userData.encryptedPassword);
        decryptedPassword = await decryptJSON(encryptedBytes, c.env.JWT_SECRET);
      } catch (decryptError) {
        console.error("Password decryption failed during token refresh:", decryptError);
      }
    }
    
    return createResponse(true, { 
      message: "トークンが正常にリフレッシュされました",
      uuid: payload.uuid,
      email: payload.email,
      password: decryptedPassword,
      token: newToken // 必要に応じてレスポンスに含める
    });
    
  } catch (error) {
    console.error("Token refresh error:", error);
    const apiError = createAPIError(ERROR_CODES.A002, { 
      details: "トークンリフレッシュに失敗しました" 
    });
    return createResponse(false, null, apiError);
  }
});

// トークン無効化（ログアウト時）
refreshToken.post("/invalidate", async (c) => {
  const token = getCookie(c, "token");
  
  if (token) {
    const blacklistKV = c.env.KV_NAMESPACE_TOKEN_BLACKLIST;
    // トークンをブラックリストに追加
    await blacklistKV.put(token, "invalidated", {
      expirationTtl: 24 * 60 * 60 // 24時間保持
    });
  }
  
  // Cookieを削除
  setCookie(c, "token", "", {
    path: "/",
    httpOnly: true,
    sameSite: "Strict",
    secure: c.env.SITE_URL?.startsWith("https"),
    maxAge: 0,
  });
  
  return createResponse(true, { 
    message: "トークンが正常に無効化されました" 
  });
});