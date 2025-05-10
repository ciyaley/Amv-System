// backend/src/utils/jwt.ts

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// TextEncoder は1回だけ生成
const encoder = new TextEncoder();

// JWTユーティリティを生成する関数
export function createJWTUtil(secretKey: string) {
  const secret = encoder.encode(secretKey);

  return {
    /**
     * サイン（署名生成）
     * payloadには最低限 { uuid: string, email: string } を期待
     */
    async sign(payload: { uuid: string; email: string }): Promise<string> {
      return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("90d")
        .sign(secret);
    },

    /**
     * 検証（verify）
     * 成功したら payload を返す、失敗したら null
     */
    async verify(token: string): Promise<{ uuid: string; email: string } | null> {
      try {
        const { payload } = await jwtVerify(token, secret);
        if (typeof payload.uuid === "string" && typeof payload.email === "string") {
          return {
            uuid: payload.uuid,
            email: payload.email,
          };
        }
        return null;
      } catch (err) {
        return null;
      }
    },
  };
}