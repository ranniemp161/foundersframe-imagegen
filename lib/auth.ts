import { NextRequest } from "next/server";

// Token shape produced by /api/auth: timestamp (digits) followed by '.' and 64 hex chars (HMAC-SHA256 signature).
export const TOKEN_RE = /^\d+\.[a-f0-9]{64}$/;

async function getSigningKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

/**
 * Sign a token using HMAC-SHA256 with the app password as secret.
 */
export async function signToken(expiryMs: number, secret: string): Promise<string> {
  const data = expiryMs.toString();
  const key = await getSigningKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );

  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = signatureArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${data}.${signatureHex}`;
}

/**
 * Verify if the presented token is valid and unexpired.
 */
export async function verifyToken(token: string, secret: string): Promise<boolean> {
  if (!TOKEN_RE.test(token)) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [expiryStr] = parts;
  const expiryMs = Number(expiryStr);
  if (isNaN(expiryMs) || expiryMs < Date.now()) {
    return false; // Expired
  }

  const expectedToken = await signToken(expiryMs, secret);
  return token === expectedToken;
}

/**
 * Lightweight request guard. Verifies that the caller presents a cryptographically
 * signed token matching our APP_PASSWORD secret.
 */
export async function isAuthorized(req: NextRequest): Promise<boolean> {
  const token = req.headers.get("x-ff-token");
  if (!token) return false;

  const secret = process.env.APP_PASSWORD;
  if (!secret) return false;

  return verifyToken(token, secret);
}

