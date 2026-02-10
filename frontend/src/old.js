// cryptoUtils.js - AES-256-GCM Encryption Utilities for Frontend

/**
 * Encrypts a message using AES-256-GCM
 * @param {string} message - The plaintext message to encrypt
 * @param {CryptoKey} key - The AES encryption key
 * @returns {Promise<Object>} - Object containing ciphertext and IV
 */
export const encryptMessage = async (message, key) => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    // Generate random initialization vector (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128 // Authentication tag length
      },
      key,
      data
    );
    
    return {
      ciphertext: Array.from(new Uint8Array(encryptedData)),
      iv: Array.from(iv)
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
};

/**
 * Decrypts a message using AES-256-GCM
 * @param {Object} encryptedData - Object containing ciphertext and IV
 * @param {CryptoKey} key - The AES decryption key
 * @returns {Promise<string>} - The decrypted plaintext message
 */
export const decryptMessage = async (encryptedData, key) => {
  try {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(encryptedData.iv),
        tagLength: 128
      },
      key,
      new Uint8Array(encryptedData.ciphertext)
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return '[Decryption failed - Invalid key or corrupted data]';
  }
};

/**
 * Derives an AES key from a passphrase using PBKDF2
 * @param {string} passphrase - The user's passphrase
 * @param {string} salt - Salt for key derivation (should be consistent for same room)
 * @param {number} iterations - Number of PBKDF2 iterations (default: 100000)
 * @returns {Promise<CryptoKey>} - The derived AES-256 key
 */
export const deriveKey = async (passphrase, salt, iterations = 100000) => {
  try {
    const encoder = new TextEncoder();
    
    // Import the passphrase as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // Derive the actual encryption key
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256 // 256-bit key
      },
      false,
      ['encrypt', 'decrypt']
    );
    
    return key;
  } catch (error) {
    console.error('Key derivation error:', error);
    throw new Error('Failed to derive encryption key');
  }
};

/**
 * Generates a random encryption key (for testing or temporary keys)
 * @returns {Promise<CryptoKey>} - A random AES-256 key
 */
export const generateRandomKey = async () => {
  try {
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
    return key;
  } catch (error) {
    console.error('Key generation error:', error);
    throw new Error('Failed to generate random key');
  }
};

/**
 * Exports a CryptoKey to a portable format (for storage or sharing)
 * @param {CryptoKey} key - The key to export
 * @returns {Promise<string>} - Base64 encoded key
 */
export const exportKey = async (key) => {
  try {
    const exported = await crypto.subtle.exportKey('raw', key);
    const exportedKeyBuffer = new Uint8Array(exported);
    const base64Key = btoa(String.fromCharCode(...exportedKeyBuffer));
    return base64Key;
  } catch (error) {
    console.error('Key export error:', error);
    throw new Error('Failed to export key');
  }
};

/**
 * Imports a key from base64 format
 * @param {string} base64Key - Base64 encoded key
 * @returns {Promise<CryptoKey>} - The imported CryptoKey
 */
export const importKey = async (base64Key) => {
  try {
    const keyData = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
    return key;
  } catch (error) {
    console.error('Key import error:', error);
    throw new Error('Failed to import key');
  }
};

/**
 * Generates a cryptographically secure random salt
 * @param {number} length - Length of salt in bytes
 * @returns {string} - Hex encoded salt
 */
export const generateSalt = (length = 32) => {
  const salt = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(salt)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Hashes data using SHA-256 (for verification, not encryption)
 * @param {string} data - Data to hash
 * @returns {Promise<string>} - Hex encoded hash
 */
export const hashData = async (data) => {
  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error('Hashing error:', error);
    throw new Error('Failed to hash data');
  }
};

/**
 * Validates if a string is a valid encryption passphrase
 * @param {string} passphrase - Passphrase to validate
 * @returns {Object} - Validation result with isValid and message
 */
export const validatePassphrase = (passphrase) => {
  if (!passphrase || passphrase.length < 8) {
    return {
      isValid: false,
      message: 'Passphrase must be at least 8 characters long'
    };
  }
  
  if (passphrase.length > 128) {
    return {
      isValid: false,
      message: 'Passphrase must be less than 128 characters'
    };
  }
  
  // Check for minimum complexity
  const hasUpperCase = /[A-Z]/.test(passphrase);
  const hasLowerCase = /[a-z]/.test(passphrase);
  const hasNumbers = /\d/.test(passphrase);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passphrase);
  
  const complexityScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChars]
    .filter(Boolean).length;
  
  if (complexityScore < 2) {
    return {
      isValid: false,
      message: 'Passphrase should contain at least 2 of: uppercase, lowercase, numbers, special characters'
    };
  }
  
  return {
    isValid: true,
    message: 'Strong passphrase'
  };
};

// Export all functions as default object
export default {
  encryptMessage,
  decryptMessage,
  deriveKey,
  generateRandomKey,
  exportKey,
  importKey,
  generateSalt,
  hashData,
  validatePassphrase
};