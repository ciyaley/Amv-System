import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { createJWTUtil } from "../utils/jwt";
import { decryptJSON } from "../utils/crypto";
import type { Env } from "../config/env";
import { ERROR_CODES, createAPIError, createResponse } from "../types/errors";

export const autoLogin = new Hono<{ Bindings: Env }>();

autoLogin.get("/", async (c) => {
  // ① JWT_SECRET が無い ⇒ 500
  if (!c.env.JWT_SECRET) {
    const error = createAPIError(ERROR_CODES.A006, { details: "JWT_SECRET not set" });
    return createResponse(false, null, error);
  }

  const token = getCookie(c, "token");

  // ② Cookie が無い ⇒ 401
  if (!token) {
    const error = createAPIError(ERROR_CODES.A002, { details: "No token" });
    return createResponse(false, null, error);
  }

  try {
    const jwt = createJWTUtil(c.env.JWT_SECRET);
    const payload = await jwt.verify(token);

    // ③ 署名不正 or 期限切れ ⇒ 401
    if (!payload) {
      const error = createAPIError(ERROR_CODES.A002, { details: "Invalid token" });
      return createResponse(false, null, error);
    }

    // ④ ユーザーデータを取得してパスワードも復号して返す
    try {
      const kv = c.env.KV_NAMESPACE_AUTH;
      const userData = await kv.get(payload.email);
      
      console.log('🔑 [AUTO-LOGIN] Retrieved user data for:', payload.email);
      console.log('🔑 [AUTO-LOGIN] Has userData:', !!userData);
      
      if (userData) {
        const parsedData = JSON.parse(userData);
        
        console.log('🔑 [AUTO-LOGIN] Parsed user data:', {
          hasEncryptedPassword: !!parsedData.encryptedPassword,
          encryptedPasswordType: typeof parsedData.encryptedPassword,
          encryptedPasswordLength: parsedData.encryptedPassword?.length,
          encryptedPasswordIsArray: Array.isArray(parsedData.encryptedPassword),
          uuid: parsedData.uuid
        });
        
        // 暗号化されたパスワードを復号
        let decryptedPassword = null;
        if (parsedData.encryptedPassword) {
          try {
            console.log('🔑 [AUTO-LOGIN] Attempting password decryption...');
            const encryptedBytes = new Uint8Array(parsedData.encryptedPassword);
            console.log('🔑 [AUTO-LOGIN] Created Uint8Array with length:', encryptedBytes.length);
            decryptedPassword = await decryptJSON(encryptedBytes, c.env.JWT_SECRET);
            console.log('✅ [AUTO-LOGIN] Password decryption successful, length:', decryptedPassword?.length);
          } catch (decryptError) {
            console.error("❌ [AUTO-LOGIN] Password decryption failed:", decryptError);
            console.error("❌ [AUTO-LOGIN] Decryption error details:", {
              errorName: decryptError.name,
              errorMessage: decryptError.message,
              errorStack: decryptError.stack
            });
            
            // 🆕 フォールバック: auto-loginではパスワード無しで返す（再ログインを促す）
            console.log('⚠️ [AUTO-LOGIN] Password decryption failed - user should re-login');
            decryptedPassword = null;
          }
        } else {
          console.log('⚠️ [AUTO-LOGIN] No encrypted password found in user data - user should re-login');
          decryptedPassword = null;
        }
        
        console.log('🔑 [AUTO-LOGIN] Returning response with password:', !!decryptedPassword);
        
        return createResponse(true, { 
          uuid: payload.uuid, 
          email: payload.email,
          password: decryptedPassword // クライアントサイド暗号化用
        });
      } else {
        console.log('⚠️ [AUTO-LOGIN] No user data found for email:', payload.email);
      }
    } catch (kvError) {
      console.error("❌ [AUTO-LOGIN] Failed to fetch user data from KV:", kvError);
    }
    
    // フォールバック: パスワードなしで返す
    return createResponse(true, { uuid: payload.uuid, email: payload.email });
  } catch (err) {
    console.error("auto-login error", err);
    const error = createAPIError(ERROR_CODES.A006, { error: err.message });
    return createResponse(false, null, error);
  }
});