// client/src/utils/cryptoUtils.js

// --- AES Encryption ---
export const encryptMessage = async (message, key) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv, tagLength: 128 },
    key,
    data
  );
  return {
    ciphertext: Array.from(new Uint8Array(encrypted)),
    iv: Array.from(iv)
  };
};

export const decryptMessage = async (encryptedData, key) => {
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(encryptedData.iv), tagLength: 128 },
      key,
      new Uint8Array(encryptedData.ciphertext)
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (err) {
    console.error("Decryption error:", err);
    return "[Decryption failed]";
  }
};

// --- AES Key Generation ---
export const generateRandomKey = async () => {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

// --- PBKDF2 Key Derivation ---
export const deriveKey = async (passphrase, salt, iterations = 100000) => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return key;
};

// --- Import AES Key from Base64 ---
// CRITICAL FIX: This should only be used for AES keys, NOT RSA keys
export const importKey = async (base64Key) => {
  try {
    const keyData = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
    
    // Validate key length (must be 128 or 256 bits = 16 or 32 bytes)
    if (keyData.length !== 16 && keyData.length !== 32) {
      throw new Error(`Invalid AES key length: ${keyData.length} bytes. Must be 16 or 32 bytes.`);
    }
    
    return crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM", length: keyData.length * 8 },
      true,
      ["encrypt", "decrypt"]
    );
  } catch (err) {
    console.error("Error importing AES key:", err);
    throw new Error("Failed to import AES key. Make sure it's a valid base64-encoded AES key.");
  }
};

// --- Export AES Key to Base64 ---
export const exportKey = async (key) => {
  const exported = await crypto.subtle.exportKey("raw", key);
  const exportedKeyBuffer = new Uint8Array(exported);
  return btoa(String.fromCharCode(...exportedKeyBuffer));
};

// --- Generate Random Salt ---
export const generateSalt = (length = 16) => {
  const salt = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};