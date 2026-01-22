/**
 * TabFlow – Client-Side Encryption
 *
 * Encrypts/decrypts session data before cloud sync.
 * Uses Web Crypto API with AES-GCM encryption.
 *
 * Security:
 * - All encryption happens client-side
 * - Server never sees plaintext data
 * - Key derived from user-controlled secret (for now, a static key)
 *
 * TODO: In production, derive key from user's Google account or passphrase.
 */

import { ENCRYPTION_SALT, ENCRYPTION_KEY_MATERIAL } from "@shared/constants";

// =============================================================================
// Constants
// =============================================================================

/**
 * Encryption algorithm configuration.
 * AES-GCM provides authenticated encryption.
 */
const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for AES-GCM

// Validate encryption key at module load
if (!ENCRYPTION_KEY_MATERIAL) {
  console.error("[Encryption] VITE_ENCRYPTION_KEY is not set!");
}

// =============================================================================
// Key Derivation
// =============================================================================

/**
 * Derive an encryption key from a passphrase.
 * Uses PBKDF2 for key derivation.
 *
 * @param passphrase - User passphrase or static key material
 * @returns Promise resolving to CryptoKey
 */
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();

  // Import passphrase as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Derive AES key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(ENCRYPTION_SALT),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

// Cache the derived key (avoid re-deriving for each operation)
let cachedKey: CryptoKey | null = null;

/**
 * Get or create the encryption key.
 * Uses the key material from environment variable.
 */
async function getKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    if (!ENCRYPTION_KEY_MATERIAL) {
      throw new Error("Encryption key not configured. Set VITE_ENCRYPTION_KEY.");
    }
    cachedKey = await deriveKey(ENCRYPTION_KEY_MATERIAL);
  }
  return cachedKey;
}

// =============================================================================
// Encryption / Decryption
// =============================================================================

/**
 * Encrypt data to base64 string.
 * Prepends IV to ciphertext for decryption.
 *
 * @param plaintext - String data to encrypt
 * @returns Promise resolving to base64-encoded encrypted data
 */
export async function encryptData(plaintext: string): Promise<string> {
  const key = await getKey();
  const encoder = new TextEncoder();

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    encoder.encode(plaintext)
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt base64 string to plaintext.
 * Extracts IV from beginning of data.
 *
 * @param encryptedBase64 - Base64-encoded encrypted data
 * @returns Promise resolving to decrypted string
 * @throws Error if decryption fails
 */
export async function decryptData(encryptedBase64: string): Promise<string> {
  const key = await getKey();

  // Decode base64
  const combined = new Uint8Array(
    atob(encryptedBase64)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  // Decrypt
  const plaintext = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    ciphertext
  );

  // Decode to string
  const decoder = new TextDecoder();
  return decoder.decode(plaintext);
}

/**
 * Test encryption/decryption.
 * Useful for verifying setup.
 */
export async function testEncryption(): Promise<boolean> {
  try {
    const testData = "TabFlow encryption test";
    const encrypted = await encryptData(testData);
    const decrypted = await decryptData(encrypted);
    return decrypted === testData;
  } catch {
    return false;
  }
}
