import { describe, it, expect, vi } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto";

describe("crypto utilities", () => {
  describe("encrypt", () => {
    it("returns empty string for empty input", () => {
      expect(encrypt("")).toBe("");
    });

    it("encrypts text using default secret", () => {
      const encrypted = encrypt("hello world");
      expect(encrypted).toBeTruthy();
      expect(encrypted).toContain(":"); // format is iv:ciphertext
      const parts = encrypted.split(":");
      expect(parts).toHaveLength(2);
      expect(parts[0].length).toBe(32); // 16 bytes = 32 hex chars
    });

    it("produces different ciphertext each time (random IV)", () => {
      const enc1 = encrypt("test");
      const enc2 = encrypt("test");
      // IVs should differ
      expect(enc1).not.toBe(enc2);
    });

    it("returns cleartext when secret has no precomputed key", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = encrypt("hello", "unknown-secret");
      expect(result).toBe("hello");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("No precomputed key"),
      );
      consoleSpy.mockRestore();
    });
  });

  describe("decrypt", () => {
    it("returns input for empty string", () => {
      expect(decrypt("")).toBe("");
    });

    it("returns input if no colon separator", () => {
      expect(decrypt("nocolon")).toBe("nocolon");
    });

    it("returns input if more than 2 parts", () => {
      expect(decrypt("a:b:c")).toBe("a:b:c");
    });

    it("returns input when secret has no precomputed key", () => {
      expect(decrypt("abc:def", "unknown-secret")).toBe("abc:def");
    });

    it("decrypts text encrypted with default secret", () => {
      const plaintext = "hello world 123";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("roundtrips special characters", () => {
      const plaintext = "đặc biệt @#$%^&*()_+";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("roundtrips JSON strings", () => {
      const plaintext = JSON.stringify({ host: "localhost", port: 5432 });
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });
});
