import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { createJWTUtil } from "../utils/jwt";
import { encryptJSON } from "../utils/crypto";
import type { Env } from "../config/env";
import { ERROR_CODES, createAPIError, createResponse } from "../types/errors";
import { hash } from "bcryptjs";

export const userMigration = new Hono<{ Bindings: Env }>();

// 既存ユーザーのパスワードデータを新形式に移行
userMigration.post("/migrate-user", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      const error = createAPIError(ERROR_CODES.A001, { details: "Email and password required" });
      return createResponse(false, null, error);
    }
    
    const kv = c.env.KV_NAMESPACE_AUTH;
    
    // 既存ユーザーデータを取得
    const existingData = await kv.get(email);
    if (!existingData) {
      const error = createAPIError(ERROR_CODES.A002, { details: "User not found" });
      return createResponse(false, null, error);
    }
    
    const userData = JSON.parse(existingData);
    console.log('🔄 [MIGRATION] Existing user data:', {
      email,
      uuid: userData.uuid,
      hasPasswordHash: !!userData.passwordHash,
      hasEncryptedPassword: !!userData.encryptedPassword,
      encryptedPasswordType: typeof userData.encryptedPassword
    });
    
    // パスワードハッシュを検証
    const bcrypt = await import("bcryptjs");
    if (!(await bcrypt.compare(password, userData.passwordHash))) {
      const error = createAPIError(ERROR_CODES.A002, { details: "Invalid password" });
      return createResponse(false, null, error);
    }
    
    // 新しい形式でパスワードを暗号化
    console.log('🔄 [MIGRATION] Encrypting password with new format...');
    const encryptedPassword = await encryptJSON(password, c.env.JWT_SECRET);
    const encryptedArray = Array.from(encryptedPassword);
    
    // ユーザーデータを更新
    const updatedUserData = {
      ...userData,
      encryptedPassword: encryptedArray
    };
    
    console.log('🔄 [MIGRATION] Updated user data structure:', {
      uuid: updatedUserData.uuid,
      hasPasswordHash: !!updatedUserData.passwordHash,
      hasEncryptedPassword: !!updatedUserData.encryptedPassword,
      encryptedPasswordLength: updatedUserData.encryptedPassword?.length,
      encryptedPasswordType: typeof updatedUserData.encryptedPassword
    });
    
    // KVに保存
    await kv.put(email, JSON.stringify(updatedUserData));
    console.log('✅ [MIGRATION] User data migrated successfully for:', email);
    
    return createResponse(true, { 
      message: "User data migrated successfully",
      uuid: userData.uuid,
      email 
    });
    
  } catch (error) {
    console.error('❌ [MIGRATION] Migration failed:', error);
    const apiError = createAPIError(ERROR_CODES.A006, { error: error.message });
    return createResponse(false, null, apiError);
  }
});

// 全ユーザーのデータ構造をチェック
userMigration.get("/check-users", async (c) => {
  try {
    const kv = c.env.KV_NAMESPACE_AUTH;
    
    // KVの全キーを取得
    const { keys } = await kv.list();
    const userDataSummary = [];
    
    for (const key of keys) {
      try {
        const userData = await kv.get(key.name);
        if (userData) {
          const parsedData = JSON.parse(userData);
          userDataSummary.push({
            email: key.name,
            uuid: parsedData.uuid,
            hasPasswordHash: !!parsedData.passwordHash,
            hasEncryptedPassword: !!parsedData.encryptedPassword,
            encryptedPasswordType: typeof parsedData.encryptedPassword,
            encryptedPasswordLength: parsedData.encryptedPassword?.length
          });
        }
      } catch (parseError) {
        console.error(`Failed to parse user data for ${key.name}:`, parseError);
      }
    }
    
    return createResponse(true, { 
      totalUsers: userDataSummary.length,
      users: userDataSummary
    });
    
  } catch (error) {
    console.error('❌ [CHECK] Failed to check users:', error);
    const apiError = createAPIError(ERROR_CODES.A006, { error: error.message });
    return createResponse(false, null, apiError);
  }
});

export default userMigration;