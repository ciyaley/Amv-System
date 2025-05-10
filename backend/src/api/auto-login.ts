import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { createJWTUtil } from "../utils/jwt";
import type { Env } from "../../config/env";

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

    // ④ 成功 ⇒ 200
    return c.json({ uuid: payload.uuid, email: payload.email }, 200);
  } catch (err) {
    console.error("auto-login error", err);
    return c.json({ status: "error", code: 3001, message: "Internal server error" }, 500);
  }
});