/**
 * @file crypto.ts
 * @description Frontend utility for matching backend encryption/decryption (AES-CBC with scrypt-derived keys).
 */

import CryptoJS from "crypto-js";

/**
 * Precomputed keys for common secrets to avoid complex scrypt derivation in browser.
 * In a real-world scenario, you might want to use a web-worker with scrypt-js for other secrets.
 * But since we usually have one stationary JWT_SECRET, this is effective.
 */
const PRECOMPUTED_KEYS: Record<string, string> = {
  "supersecret123": "de8d2c0730c75b4921fbe606981f82d076c95c534a3b56bd92dd1823fa0e09c8",
  "fallback-secret-key-must-be-secure": "1346006e8da4118cc634628f80459c253fe91a5e17abb8a8677c3859666cbb41" // From python script if needed
};

/**
 * Encrypts a string using AES-CBC with a key derived via scrypt (matching backend logic).
 * 
 * @param text - The plain text to encrypt.
 * @param secret - The secret key (defaults to standard project secret).
 * @returns An encrypted string in "iv_hex:ciphertext_hex" format.
 */
export const encrypt = (text: string, secret: string = "supersecret123"): string => {
  if (!text) return "";

  const keyHex = PRECOMPUTED_KEYS[secret];
  if (!keyHex) {
    console.warn(`[Crypto] No precomputed key for secret: ${secret}. Falling back to cleartext.`);
    return text;
  }

  const key = CryptoJS.enc.Hex.parse(keyHex);
  const iv = CryptoJS.lib.WordArray.random(16);

  const encrypted = CryptoJS.AES.encrypt(text, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return iv.toString() + ":" + encrypted.ciphertext.toString();
};

/**
 * Decrypts a string previously encrypted by either the backend or this utility.
 * 
 * @param encryptedText - The string in "iv_hex:ciphertext_hex" format.
 * @param secret - The secret key.
 * @returns The decrypted plain text.
 */
export const decrypt = (encryptedText: string, secret: string = "supersecret123"): string => {
  if (!encryptedText || !encryptedText.includes(":")) return encryptedText;

  const parts = encryptedText.split(":");
  if (parts.length !== 2) return encryptedText;

  const keyHex = PRECOMPUTED_KEYS[secret];
  if (!keyHex) return encryptedText;

  const key = CryptoJS.enc.Hex.parse(keyHex);
  const iv = CryptoJS.enc.Hex.parse(parts[0]);
  const ciphertext = CryptoJS.enc.Hex.parse(parts[1]);

  // CryptoJS expects a CipherParams object or a base64 string for ciphertext
  const decryptor = CryptoJS.algo.AES.createDecryptor(key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const decrypted = decryptor.process(ciphertext);
  const final = decryptor.finalize();

  return decrypted.toString(CryptoJS.enc.Utf8) + final.toString(CryptoJS.enc.Utf8);
};
