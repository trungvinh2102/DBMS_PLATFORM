import crypto from "crypto";
import { env } from "@dbms-platform/env/server";

// Ensure we have a key of correct length (32 bytes for AES-256)
// We'll derive it from JWT_SECRET or a specific ENCRYPTION_KEY if available
// For now, using a fallback derivation for demonstration
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

function getKey(): Buffer {
  // Use a fixed key derivation or environment variable
  const secret = env.JWT_SECRET || "fallback-secret-key-must-be-secure";
  return crypto.scryptSync(secret, "salt", 32);
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text: string): string {
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift()!, "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
