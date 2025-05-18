// frontend/app/utils/encryption.ts
/** UTF-8 のエンコード／デコード */
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Base64 ⇔ Uint8Array */
function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function fromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

/** PBKDF2 で AES-GCM 用 CryptoKey を派生 */
export async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 250_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** 任意オブジェクトを AES-GCM で暗号化 */
export async function encryptData<T>(data: T, password: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveAesKey(password, salt);
  const plain = encoder.encode(JSON.stringify(data));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plain
  );
  return {
    iv: toBase64(iv.buffer),
    salt: toBase64(salt.buffer),
    ciphertext: toBase64(cipher),
  };
}

/** AES-GCM 暗号テキストを復号してオブジェクトに戻す */
export async function decryptData<V>(
  encrypted: { iv: string; salt: string; ciphertext: string },
  password: string
): Promise<V> {
  const iv = fromBase64(encrypted.iv);
  const salt = fromBase64(encrypted.salt);
  const cipher = fromBase64(encrypted.ciphertext);
  const key = await deriveAesKey(password, salt);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipher
  );
  const text = decoder.decode(plainBuf);
  return JSON.parse(text) as V;
}