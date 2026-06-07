import crypto from "crypto";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "gem_coach_super_secure_fallback_secret_key_123456";

export interface UserSessionPayload {
  userId: string;
  email: string;
}

/**
 * Generates a PBKDF2 hash & salt for credentials security
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return { hash, salt };
}

/**
 * Verifies if the password matches the hash and salt
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === checkHash;
}

/**
 * Creates a signed JWT-style token
 */
export function encryptToken(payload: UserSessionPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
    
  return `${header}.${body}.${signature}`;
}

/**
 * Decodes and verifies a signed token
 */
export function decryptToken(token: string): UserSessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");
      
    if (signature !== expectedSignature) return null;
    
    const decodedBody = Buffer.from(body, "base64url").toString("utf8");
    return JSON.parse(decodedBody);
  } catch (err) {
    return null;
  }
}

/**
 * Retrieves the currently logged-in user from request cookies
 */
export async function getSessionUser(): Promise<UserSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("gem_auth_token");
    if (!tokenCookie || !tokenCookie.value) return null;
    
    return decryptToken(tokenCookie.value);
  } catch (error) {
    console.error("Authentication cookies reading error:", error);
    return null;
  }
}
