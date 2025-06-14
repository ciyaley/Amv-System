import { Hono } from "hono";
import { createJWTUtil } from "./utils/jwt";
import { getCookie, setCookie } from "hono/cookie";
import { encryptJSON, decryptJSON } from "./utils/crypto";
import type { Env } from "./config/env";
import { hash, compare } from "bcryptjs";
import { ERROR_CODES, createAPIError, createResponse } from "./types/errors";

const auth = new Hono<{ Bindings: Env }>();

// 🔧 JWT Cookie設定の統一化（RDv1.1.6対応）
const setJwtCookie = (c: any, token: string) => {
  const isProd = c.env.SITE_URL?.startsWith("https");
  
  // 🔧 修正：開発環境とCORSを考慮した設定
  const cookieOptions = {
    path: "/",
    httpOnly: true,
    secure: isProd,
    maxAge: 90 * 24 * 60 * 60, // 90日（秒単位）
    // 🔧 修正：クロスサイト対応のため Lax に統一
    sameSite: "Lax" as const,
    // 🔧 修正：ドメイン設定を明示的に制御
    domain: isProd ? undefined : undefined, // 開発時はdomainを設定しない
  };
  
  console.log('🍪 Setting JWT cookie:', {
    tokenLength: token?.length,
    isProd,
    siteUrl: c.env.SITE_URL,
    options: cookieOptions
  });
  
  // 🔧 修正：Hono標準のsetCookieを使用
  try {
    setCookie(c, "token", token, cookieOptions);
    console.log('✅ JWT cookie set successfully');
  } catch (error) {
    console.error('❌ Failed to set JWT cookie:', error);
    
    // フォールバック：手動でヘッダー設定
    const cookieString = `token=${token}; Path=${cookieOptions.path}; Max-Age=${cookieOptions.maxAge}; SameSite=${cookieOptions.sameSite}${cookieOptions.httpOnly ? '; HttpOnly' : ''}${cookieOptions.secure ? '; Secure' : ''}`;
    c.header('Set-Cookie', cookieString);
    console.log('🔄 Manual cookie header fallback set');
  }
};

/** ─────────────  REGISTER  ───────────── **/
auth.post("/register", async (c) => {
  const { email, password } = await c.req.json();
  const kv = c.env.KV_NAMESPACE_AUTH;         // ← KV バインディング名

  // 重複チェック
  if (await kv.get(email)) {
    const error = createAPIError(ERROR_CODES.A005, { email });
    return createResponse(false, null, error);
  }

  // 保存
  const passwordHash = await hash(password, 8);
  const uuid = crypto.randomUUID();
  
  // パスワードをサーバーサイド暗号化して保存
  console.log('🔑 [REGISTER] Starting password encryption...');
  const encryptedPassword = await encryptJSON(password, c.env.JWT_SECRET);
  console.log('🔑 [REGISTER] Encrypted password length:', encryptedPassword.length);
  
  const encryptedArray = Array.from(encryptedPassword);
  console.log('🔑 [REGISTER] Converted to array length:', encryptedArray.length);
  
  const userData = {
    uuid,
    passwordHash, // 認証用ハッシュ
    encryptedPassword: encryptedArray // クライアント暗号化用の平文パスワード（暗号化済み）
  };
  
  console.log('🔑 [REGISTER] UserData structure:', {
    uuid: userData.uuid,
    hasPasswordHash: !!userData.passwordHash,
    hasEncryptedPassword: !!userData.encryptedPassword,
    encryptedPasswordLength: userData.encryptedPassword?.length,
    encryptedPasswordType: typeof userData.encryptedPassword
  });
  
  const userDataString = JSON.stringify(userData);
  console.log('🔑 [REGISTER] JSON string length:', userDataString.length);
  
  await kv.put(email, userDataString);
  console.log('🔑 [REGISTER] User data saved to KV for email:', email);

  // JWT 発行 + Cookie
  const jwt = createJWTUtil(c.env.JWT_SECRET);
  const token = await jwt.sign({ uuid, email });
  
  // 🔧 修正：レスポンス作成前にクッキーを設定
  setJwtCookie(c, token);
  
  // 🔑 登録時もクライアントサイド暗号化用のパスワードを返す
  const response = createResponse(true, { 
    message: "Registered successfully", 
    uuid, 
    email,
    password: password, // 登録時は平文パスワードをそのまま返す
    token: token // 🆕 JWTトークンをレスポンスに含める（フォールバック）
  });
  
  return response;
});

/** ─────────────  LOGIN  ───────────── **/
auth.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  const kv = c.env.KV_NAMESPACE_AUTH;

  const stored = await kv.get(email);
  if (!stored) {
    const error = createAPIError(ERROR_CODES.A002);
    return createResponse(false, null, error);
  }

  const userData = JSON.parse(stored);
  if (!(await compare(password, userData.passwordHash))) {
    const error = createAPIError(ERROR_CODES.A002);
    return createResponse(false, null, error);
  }

  // JWT 再発行 + Cookie
  const jwt = createJWTUtil(c.env.JWT_SECRET);
  const token = await jwt.sign({ uuid: userData.uuid, email });

  // 🔑 クライアントサイド暗号化用のパスワードを復号して返す
  let decryptedPassword = null;
  console.log('🔑 Checking stored user data:', { 
    hasEncryptedPassword: !!userData.encryptedPassword,
    encryptedPasswordType: typeof userData.encryptedPassword,
    encryptedPasswordLength: userData.encryptedPassword?.length,
    isArray: Array.isArray(userData.encryptedPassword)
  });
  
  if (userData.encryptedPassword) {
    try {
      const encryptedBytes = new Uint8Array(userData.encryptedPassword);
      console.log('🔑 Attempting password decryption...');
      console.log('🔑 Uint8Array length:', encryptedBytes.length);
      decryptedPassword = await decryptJSON(encryptedBytes, c.env.JWT_SECRET);
      console.log('✅ Password decryption successful, length:', decryptedPassword?.length);
    } catch (decryptError: unknown) {
      console.error("❌ Password decryption failed during login:", decryptError);
      console.error("❌ Decryption error details:", {
        errorName: decryptError instanceof Error ? decryptError.name : 'Unknown',
        errorMessage: decryptError instanceof Error ? decryptError.message : String(decryptError)
      });
      
      // 🆕 フォールバック: 復号失敗時は新しい暗号化データを生成
      console.log('🔄 Attempting to re-encrypt password as fallback...');
      try {
        const newEncryptedPassword = await encryptJSON(password, c.env.JWT_SECRET);
        const newEncryptedArray = Array.from(newEncryptedPassword);
        
        // ユーザーデータを更新
        const updatedUserData = {
          ...userData,
          encryptedPassword: newEncryptedArray
        };
        
        await kv.put(email, JSON.stringify(updatedUserData));
        decryptedPassword = password; // フォールバックとして平文パスワードを使用
        
        console.log('✅ Password re-encrypted and saved successfully');
      } catch (reEncryptError) {
        console.error("❌ Re-encryption also failed:", reEncryptError);
        // 最後のフォールバック: 平文パスワードを返す
        decryptedPassword = password;
        console.log('⚠️ Using plain password as final fallback');
      }
    }
  } else {
    console.log('⚠️ No encrypted password found in user data - creating new encryption');
    
    // 🆕 フォールバック: encryptedPasswordが存在しない場合は新規作成
    try {
      const newEncryptedPassword = await encryptJSON(password, c.env.JWT_SECRET);
      const newEncryptedArray = Array.from(newEncryptedPassword);
      
      // ユーザーデータを更新
      const updatedUserData = {
        ...userData,
        encryptedPassword: newEncryptedArray
      };
      
      await kv.put(email, JSON.stringify(updatedUserData));
      decryptedPassword = password;
      
      console.log('✅ Created new encrypted password for existing user');
    } catch (newEncryptError) {
      console.error("❌ Failed to create encrypted password:", newEncryptError);
      decryptedPassword = password; // 最後のフォールバック
      console.log('⚠️ Using plain password as fallback');
    }
  }

  // 🔧 修正：レスポンス作成前にクッキーを設定
  setJwtCookie(c, token);
  
  const response = createResponse(true, { 
    message: "Logged in successfully", 
    uuid: userData.uuid, 
    email,
    password: decryptedPassword, // クライアントサイド暗号化用
    token: token // 🆕 JWTトークンをレスポンスに含める（フォールバック）
  });
  
  return response;
});

/** ─────────────  LOGOUT  ───────────── **/
auth.post("/logout", async (c) => {
  console.log('🚪 Starting logout - clearing JWT cookie');
  
  // 🔧 修正：クッキー削除の確実な実行
  const isProd = c.env.SITE_URL?.startsWith("https");
  
  try {
    // 標準的なクッキー削除
    setCookie(c, "token", "", {
      path: "/",
      httpOnly: true,
      sameSite: "Lax" as const,
      secure: isProd,
      maxAge: 0, // 即座に期限切れ
    });
    
    // 追加：期限切れでも削除
    setCookie(c, "token", "", {
      path: "/",
      httpOnly: true,
      sameSite: "Lax" as const,
      secure: isProd,
      expires: new Date(0), // 1970年1月1日（確実に過去）
    });
    
    console.log('✅ JWT cookie cleared successfully');
  } catch (error) {
    console.error('❌ Failed to clear JWT cookie:', error);
    
    // フォールバック：手動でヘッダー設定
    c.header('Set-Cookie', `token=; Path=/; Max-Age=0; SameSite=Lax${isProd ? '; Secure' : ''}; HttpOnly`);
    c.header('Set-Cookie', `token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax${isProd ? '; Secure' : ''}; HttpOnly`);
    console.log('🔄 Manual cookie clearing fallback executed');
  }
  
  return createResponse(true, { message: "Logged out successfully" });
});

/** ─────────────  DELETE ACCOUNT  ───────────── **/
auth.delete("/delete", async (c) => {
  const token = getCookie(c, "token");
  
  if (!token) {
    const error = createAPIError(ERROR_CODES.A002);
    return createResponse(false, null, error);
  }

  try {
    const jwt = createJWTUtil(c.env.JWT_SECRET);
    const payload = await jwt.verify(token);
    
    if (!payload) {
      const error = createAPIError(ERROR_CODES.A002);
      return createResponse(false, null, error);
    }

    const kv = c.env.KV_NAMESPACE_AUTH;
    
    // ユーザーデータをKVから削除
    await kv.delete(payload.email);
    
    // 🔧 修正：アカウント削除時のクッキー削除を統一
    const isProd = c.env.SITE_URL?.startsWith("https");
    setCookie(c, "token", "", {
      path: "/",
      httpOnly: true,
      sameSite: "Lax" as const,
      secure: isProd,
      maxAge: 0,
    });
    
    // 確実にクッキーを削除
    setCookie(c, "token", "", {
      path: "/",
      httpOnly: true,
      sameSite: "Lax" as const,
      secure: isProd,
      expires: new Date(0),
    });
    
    return createResponse(true, { message: "Account deleted successfully" });
  } catch (error: unknown) {
    console.error("Delete account error:", error);
    const apiError = createAPIError(ERROR_CODES.A006, { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return createResponse(false, null, apiError);
  }
});

export default auth;