import { Hono } from "hono";
import { hash, compare } from "bcryptjs";
import { createJWTUtil } from "../utils/jwt";
import { encryptJSON } from "../utils/crypto";
import { setCookie } from "hono/cookie";
import type { Env } from "../config/env";
import { ERROR_CODES, createAPIError, createResponse } from "../types/errors";

export const passwordReset = new Hono<{ Bindings: Env }>();

// パスワードリセット要求
passwordReset.post("/request-reset", async (c) => {
  const { email } = await c.req.json();
  const kv = c.env.KV_NAMESPACE_AUTH;
  
  // ユーザー存在チェック
  const userData = await kv.get(email);
  if (!userData) {
    // セキュリティ上、存在しないメールアドレスでも成功レスポンスを返す
    return createResponse(true, { 
      message: "パスワードリセットリンクを送信しました（メールアドレスが存在する場合）" 
    });
  }
  
  // リセットトークン生成（24時間有効）
  const resetToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  // リセットデータを一時保存（KVの別ネームスペースまたは同じKVにプリフィックス付き）
  const resetData = {
    email,
    token: resetToken,
    expiresAt,
    createdAt: new Date().toISOString()
  };
  
  await kv.put(`reset:${resetToken}`, JSON.stringify(resetData), {
    expirationTtl: 24 * 60 * 60 // 24時間後に自動削除
  });
  
  // TODO: 実際のメール送信実装
  // 現在は開発用としてトークンをレスポンスに含める
  const isDev = (c.env.SITE_URL || "").includes("localhost");
  
  if (isDev) {
    return createResponse(true, { 
      message: "パスワードリセットリンクを送信しました",
      resetToken, // 開発環境でのみ返す
      resetUrl: `${c.env.SITE_URL}/reset-password?token=${resetToken}`
    });
  }
  
  return createResponse(true, { 
    message: "パスワードリセットリンクを送信しました" 
  });
});

// パスワードリセット実行
passwordReset.post("/reset-password", async (c) => {
  const { token, newPassword } = await c.req.json();
  const kv = c.env.KV_NAMESPACE_AUTH;
  
  // パスワード強度チェック
  if (!newPassword || newPassword.length < 12) {
    const error = createAPIError(ERROR_CODES.A001, { 
      details: "パスワードは12文字以上である必要があります" 
    });
    return createResponse(false, null, error);
  }
  
  if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    const error = createAPIError(ERROR_CODES.A001, { 
      details: "パスワードには英字と数字を含める必要があります" 
    });
    return createResponse(false, null, error);
  }
  
  // リセットトークン検証
  const resetDataStr = await kv.get(`reset:${token}`);
  if (!resetDataStr) {
    const error = createAPIError(ERROR_CODES.A002, { 
      details: "無効または期限切れのリセットトークンです" 
    });
    return createResponse(false, null, error);
  }
  
  const resetData = JSON.parse(resetDataStr);
  
  // 期限チェック
  if (new Date() > new Date(resetData.expiresAt)) {
    // 期限切れトークンを削除
    await kv.delete(`reset:${token}`);
    const error = createAPIError(ERROR_CODES.A002, { 
      details: "リセットトークンの有効期限が切れています" 
    });
    return createResponse(false, null, error);
  }
  
  // ユーザーデータ取得
  const userDataStr = await kv.get(resetData.email);
  if (!userDataStr) {
    const error = createAPIError(ERROR_CODES.A004, { 
      details: "ユーザーが見つかりません" 
    });
    return createResponse(false, null, error);
  }
  
  const userData = JSON.parse(userDataStr);
  
  // 新しいパスワードでユーザーデータを更新
  const newPasswordHash = await hash(newPassword, 8);
  const encryptedPassword = await encryptJSON(newPassword, c.env.JWT_SECRET);
  
  const updatedUserData = {
    ...userData,
    passwordHash: newPasswordHash,
    encryptedPassword: Array.from(encryptedPassword),
    passwordResetAt: new Date().toISOString()
  };
  
  await kv.put(resetData.email, JSON.stringify(updatedUserData));
  
  // リセットトークンを削除
  await kv.delete(`reset:${token}`);
  
  // 新しいJWTトークンを発行
  const jwt = createJWTUtil(c.env.JWT_SECRET);
  const jwtToken = await jwt.sign({ 
    uuid: userData.uuid, 
    email: resetData.email 
  });
  
  // Cookieに設定
  const isProd = c.env.SITE_URL?.startsWith("https");
  setCookie(c, "token", jwtToken, {
    path: "/",
    httpOnly: true,
    sameSite: "Strict",
    secure: isProd,
  });
  
  return createResponse(true, { 
    message: "パスワードが正常にリセットされました",
    uuid: userData.uuid,
    email: resetData.email,
    password: newPassword // クライアントサイド暗号化用
  });
});