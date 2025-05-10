import { Hono } from "hono";
import { createJWTUtil } from "./utils/jwt";
import { getCookie, setCookie } from "hono/cookie";
import type { Env } from "../config/env";
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
  const kv = c.env.AMV_SPACE_KEY;             // ← KV バインディング名

  // 重複チェック
  if (await kv.get(email)) {
    return c.json({ status: "error", code: 1002, message: "User already exists" }, 400);
  }

  // 保存
  const passwordHash = await hash(password, 8);
  const uuid = crypto.randomUUID();
  await kv.put(email, JSON.stringify({ uuid, password: passwordHash }));

  // JWT 発行 + Cookie
  const jwt = createJWTUtil(c.env.JWT_SECRET);
  const token = await jwt.sign({ uuid, email });
  setJwtCookie(c, token);

  return c.json({ message: "Registered successfully", uuid, email }, 200);
});

/** ─────────────  LOGIN  ───────────── **/
auth.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  const kv = c.env.AMV_SPACE_KEY;

  const stored = await kv.get(email);
  if (!stored) {
    return c.json({ status: "error", code: 1001, message: "Invalid credentials" }, 401);
  }

  const { uuid, password: storedPassword } = JSON.parse(stored);
  if (!(await compare(password, storedPassword))) {
    return c.json({ status: "error", code: 1001, message: "Invalid credentials" }, 401);
  }

  // JWT 再発行 + Cookie
  const jwt = createJWTUtil(c.env.JWT_SECRET);
  const token = await jwt.sign({ uuid, email });
  setJwtCookie(c, token);

  return c.json({ message: "Logged in successfully", uuid, email }, 200);
});

export default auth;