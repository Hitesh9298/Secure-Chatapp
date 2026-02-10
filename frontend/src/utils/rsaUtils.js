// client/src/utils/rsaUtils.js
// RSA utilities using Web Crypto for RSA-OAEP (encrypting AES keys)

export const generateRSAKeyPair = async () => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048, // Changed from 4096 for better performance
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  return keyPair;
};

export const exportPublicKey = async (key) => {
  const spki = await crypto.subtle.exportKey("spki", key);
  return btoa(String.fromCharCode(...new Uint8Array(spki)));
};

export const exportPrivateKey = async (key) => {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", key);
  return btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
};

export const importPublicKey = async (base64Key) => {
  try {
    const binary = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      "spki",
      binary.buffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"]
    );
  } catch (err) {
    console.error("Error importing public RSA key:", err);
    throw new Error("Failed to import RSA public key");
  }
};

export const importPrivateKey = async (base64Key) => {
  try {
    const binary = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      "pkcs8",
      binary.buffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["decrypt"]
    );
  } catch (err) {
    console.error("Error importing private RSA key:", err);
    throw new Error("Failed to import RSA private key");
  }
};

// Encrypt AES raw key (ArrayBuffer) with recipient public key -> returns Uint8Array
export const encryptAESKeyWithPublicKey = async (aesKeyCryptoKey, publicKeyCryptoKey) => {
  try {
    const raw = await crypto.subtle.exportKey("raw", aesKeyCryptoKey);
    const encrypted = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKeyCryptoKey,
      raw
    );
    return new Uint8Array(encrypted);
  } catch (err) {
    console.error("Error encrypting AES key with RSA public key:", err);
    throw new Error("Failed to encrypt AES key");
  }
};

// Decrypt encrypted AES raw (Uint8Array) with private RSA key -> returns imported AES CryptoKey
export const decryptAESKeyWithPrivateKey = async (encryptedUint8Array, privateKeyCryptoKey) => {
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKeyCryptoKey,
      encryptedUint8Array
    );
    
    // Import decrypted raw AES key back into CryptoKey
    const aesKey = await crypto.subtle.importKey(
      "raw",
      decrypted,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    return aesKey;
  } catch (err) {
    console.error("Error decrypting AES key with RSA private key:", err);
    throw new Error("Failed to decrypt AES key");
  }
};