export async function deriveKey(pass: string, salt: Uint8Array) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(pass), { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 250_000 },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptJSON(data: unknown, pass: string) {
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key  = await deriveKey(pass, salt);
  const enc  = new TextEncoder().encode(JSON.stringify(data));
  const cipher = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, enc
  ));
  // salt | iv | cipher
  return new Uint8Array([...salt, ...iv, ...cipher]);
}

export async function decryptJSON(buf: Uint8Array, pass: string) {
  const salt   = buf.slice(0, 16);
  const iv     = buf.slice(16, 28);
  const cipher = buf.slice(28);
  const key = await deriveKey(pass, salt);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv }, key, cipher
  );
  return JSON.parse(new TextDecoder().decode(plain));
}