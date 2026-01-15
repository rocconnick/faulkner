/**
 * EncryptionService - Client-side encryption/decryption using Web Crypto API
 * 
 * Implements AES-256-GCM encryption with PBKDF2 key derivation for secure
 * client-side data protection. All data is encrypted before storage.
 */

export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly PBKDF2_ITERATIONS = 100000;
  private static readonly SALT_LENGTH = 16; // 128 bits
  private static readonly IV_LENGTH = 12;   // 96 bits for GCM

  /**
   * Derives a cryptographic key from a password using PBKDF2
   * @param password - User password
   * @param salt - Random salt for key derivation
   * @returns Promise<CryptoKey> - Derived encryption key
   */
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    // Import the password as a key for PBKDF2
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    // Derive the actual encryption key using PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: EncryptionService.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      passwordKey,
      { 
        name: EncryptionService.ALGORITHM, 
        length: EncryptionService.KEY_LENGTH 
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts data using AES-256-GCM
   * @param data - Plain text data to encrypt
   * @param password - User password for key derivation
   * @returns Promise<string> - Base64 encoded encrypted data (salt + iv + ciphertext)
   */
  async encrypt(data: string, password: string): Promise<string> {
    if (!data) {
      throw new Error('Data cannot be empty');
    }
    
    if (!password) {
      throw new Error('Password cannot be empty');
    }

    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(EncryptionService.SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(EncryptionService.IV_LENGTH));
    
    // Derive encryption key
    const key = await this.deriveKey(password, salt);
    
    // Encrypt the data
    const encodedData = new TextEncoder().encode(data);
    const encrypted = await crypto.subtle.encrypt(
      { 
        name: EncryptionService.ALGORITHM, 
        iv: iv 
      },
      key,
      encodedData
    );
    
    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    // Return as base64 string
    return this.arrayBufferToBase64(combined);
  }

  /**
   * Decrypts data using AES-256-GCM
   * @param encryptedData - Base64 encoded encrypted data
   * @param password - User password for key derivation
   * @returns Promise<string> - Decrypted plain text data
   */
  async decrypt(encryptedData: string, password: string): Promise<string> {
    if (!encryptedData) {
      throw new Error('Encrypted data cannot be empty');
    }
    
    if (!password) {
      throw new Error('Password cannot be empty');
    }

    try {
      // Decode from base64
      const combined = this.base64ToArrayBuffer(encryptedData);
      
      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, EncryptionService.SALT_LENGTH);
      const iv = combined.slice(
        EncryptionService.SALT_LENGTH, 
        EncryptionService.SALT_LENGTH + EncryptionService.IV_LENGTH
      );
      const encrypted = combined.slice(EncryptionService.SALT_LENGTH + EncryptionService.IV_LENGTH);
      
      // Derive decryption key
      const key = await this.deriveKey(password, salt);
      
      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        { 
          name: EncryptionService.ALGORITHM, 
          iv: iv 
        },
        key,
        encrypted
      );
      
      // Return as string
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      // Re-throw with more specific error message
      if (error instanceof Error && error.name === 'OperationError') {
        throw new Error('Decryption failed: Invalid password or corrupted data');
      }
      throw error;
    }
  }

  /**
   * Converts ArrayBuffer to base64 string
   * @param buffer - ArrayBuffer to convert
   * @returns string - Base64 encoded string
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Converts base64 string to ArrayBuffer
   * @param base64 - Base64 encoded string
   * @returns Uint8Array - Decoded array buffer
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Generates a random salt for key derivation
   * @returns Uint8Array - Random salt
   */
  generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(EncryptionService.SALT_LENGTH));
  }

  /**
   * Generates a random IV for encryption
   * @returns Uint8Array - Random IV
   */
  generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(EncryptionService.IV_LENGTH));
  }
}