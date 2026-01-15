/**
 * Property-based tests for EncryptionService
 * Feature: journal-notes, Property 15: Encryption Round-Trip
 * Validates: Requirements 16.4, 16.7
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { EncryptionService } from './EncryptionService';

describe('Feature: journal-notes, Property 15: Encryption Round-Trip', () => {
  const encryptionService = new EncryptionService();

  it('should encrypt and decrypt data correctly for any valid input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 10000 }), // Data to encrypt
        fc.string({ minLength: 8, maxLength: 100 }),   // Password
        async (data, password) => {
          // Property: For any data and password, encrypting then decrypting should produce the original data
          const encrypted = await encryptionService.encrypt(data, password);
          const decrypted = await encryptionService.decrypt(encrypted, password);
          
          expect(decrypted).toBe(data);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce different encrypted outputs for the same data with different passwords', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }),
        fc.string({ minLength: 8, maxLength: 50 }),
        fc.string({ minLength: 8, maxLength: 50 }),
        async (data, password1, password2) => {
          // Skip if passwords are the same
          fc.pre(password1 !== password2);
          
          // Property: For any data, different passwords should produce different encrypted outputs
          const encrypted1 = await encryptionService.encrypt(data, password1);
          const encrypted2 = await encryptionService.encrypt(data, password2);
          
          expect(encrypted1).not.toBe(encrypted2);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should produce different encrypted outputs for the same data and password (due to random IV)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }),
        fc.string({ minLength: 8, maxLength: 50 }),
        async (data, password) => {
          // Property: For any data and password, multiple encryptions should produce different outputs (due to random IV)
          const encrypted1 = await encryptionService.encrypt(data, password);
          const encrypted2 = await encryptionService.encrypt(data, password);
          
          expect(encrypted1).not.toBe(encrypted2);
          
          // But both should decrypt to the same original data
          const decrypted1 = await encryptionService.decrypt(encrypted1, password);
          const decrypted2 = await encryptionService.decrypt(encrypted2, password);
          
          expect(decrypted1).toBe(data);
          expect(decrypted2).toBe(data);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle various character encodings correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.string(), // Regular ASCII
          fc.string({ minLength: 1, maxLength: 100 }), // Regular string
          fc.string().map(s => s + '🔒🗝️📝'), // Mixed with emojis
          fc.string().map(s => JSON.stringify({ text: s, special: '特殊字符' })) // JSON with special chars
        ),
        fc.string({ minLength: 8, maxLength: 50 }),
        async (data, password) => {
          // Skip empty data
          fc.pre(data.length > 0);
          
          // Property: For any Unicode data, encryption round-trip should preserve all characters
          const encrypted = await encryptionService.encrypt(data, password);
          const decrypted = await encryptionService.decrypt(encrypted, password);
          
          expect(decrypted).toBe(data);
          expect(decrypted.length).toBe(data.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle large data correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10000, maxLength: 50000 }), // Large data
        fc.string({ minLength: 8, maxLength: 50 }),
        async (data, password) => {
          // Property: For any large data, encryption round-trip should work correctly
          const encrypted = await encryptionService.encrypt(data, password);
          const decrypted = await encryptionService.decrypt(encrypted, password);
          
          expect(decrypted).toBe(data);
          expect(decrypted.length).toBe(data.length);
        }
      ),
      { numRuns: 10 } // Fewer runs for large data to avoid timeout
    );
  });
});

describe('EncryptionService Unit Tests - Edge Cases', () => {
  const encryptionService = new EncryptionService();

  describe('Wrong password rejection', () => {
    it('should reject decryption with wrong password', async () => {
      const data = 'sensitive note content';
      const correctPassword = 'correct-password-123';
      const wrongPassword = 'wrong-password-456';
      
      const encrypted = await encryptionService.encrypt(data, correctPassword);
      
      await expect(
        encryptionService.decrypt(encrypted, wrongPassword)
      ).rejects.toThrow('Decryption failed: Invalid password or corrupted data');
    });

    it('should reject decryption with empty password', async () => {
      const data = 'test data';
      const password = 'valid-password';
      
      const encrypted = await encryptionService.encrypt(data, password);
      
      await expect(
        encryptionService.decrypt(encrypted, '')
      ).rejects.toThrow('Password cannot be empty');
    });

    it('should reject decryption with slightly different password', async () => {
      const data = 'test data';
      const password = 'MyPassword123';
      const similarPassword = 'myPassword123'; // Different case
      
      const encrypted = await encryptionService.encrypt(data, password);
      
      await expect(
        encryptionService.decrypt(encrypted, similarPassword)
      ).rejects.toThrow('Decryption failed: Invalid password or corrupted data');
    });
  });

  describe('Empty data handling', () => {
    it('should reject encryption of empty string', async () => {
      const password = 'valid-password';
      
      await expect(
        encryptionService.encrypt('', password)
      ).rejects.toThrow('Data cannot be empty');
    });

    it('should reject encryption with empty password', async () => {
      const data = 'test data';
      
      await expect(
        encryptionService.encrypt(data, '')
      ).rejects.toThrow('Password cannot be empty');
    });

    it('should reject decryption of empty encrypted data', async () => {
      const password = 'valid-password';
      
      await expect(
        encryptionService.decrypt('', password)
      ).rejects.toThrow('Encrypted data cannot be empty');
    });

    it('should handle whitespace-only data correctly', async () => {
      const data = '   \n\t  '; // Whitespace-only data
      const password = 'valid-password';
      
      const encrypted = await encryptionService.encrypt(data, password);
      const decrypted = await encryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toBe(data);
    });
  });

  describe('Large data encryption', () => {
    it('should handle very large text data (100KB)', async () => {
      // Generate ~100KB of text data
      const largeData = 'A'.repeat(100 * 1024);
      const password = 'test-password-123';
      
      const encrypted = await encryptionService.encrypt(largeData, password);
      const decrypted = await encryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toBe(largeData);
      expect(decrypted.length).toBe(largeData.length);
    });

    it('should handle large JSON data', async () => {
      // Create a large JSON object
      const largeObject = {
        notes: Array.from({ length: 1000 }, (_, i) => ({
          id: `note-${i}`,
          title: `Note ${i}`,
          content: `This is the content of note ${i}. `.repeat(50), // ~50 chars * 50 = 2.5KB per note
          createdAt: new Date().toISOString(),
          tags: [`tag-${i % 10}`, `category-${i % 5}`]
        }))
      };
      
      const largeData = JSON.stringify(largeObject);
      const password = 'test-password-456';
      
      expect(largeData.length).toBeGreaterThan(1024 * 1024); // Should be > 1MB
      
      const encrypted = await encryptionService.encrypt(largeData, password);
      const decrypted = await encryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toBe(largeData);
      
      // Verify the JSON can be parsed back correctly
      const parsedObject = JSON.parse(decrypted);
      expect(parsedObject.notes).toHaveLength(1000);
      expect(parsedObject.notes[0].id).toBe('note-0');
      expect(parsedObject.notes[999].id).toBe('note-999');
    });

    it('should handle large data with special characters', async () => {
      // Generate large data with Unicode characters
      const unicodeChars = '🔒🗝️📝💾🔐🛡️⚡🌟💫🎯';
      const largeData = unicodeChars.repeat(10000); // ~300KB with Unicode
      const password = 'unicode-password-789';
      
      const encrypted = await encryptionService.encrypt(largeData, password);
      const decrypted = await encryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toBe(largeData);
      expect(decrypted.length).toBe(largeData.length);
    });

    it('should handle performance with large data within reasonable time', async () => {
      const largeData = 'X'.repeat(50 * 1024); // 50KB
      const password = 'performance-test';
      
      const startTime = Date.now();
      
      const encrypted = await encryptionService.encrypt(largeData, password);
      const decrypted = await encryptionService.decrypt(encrypted, password);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(decrypted).toBe(largeData);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Corrupted data handling', () => {
    it('should reject corrupted encrypted data', async () => {
      const data = 'test data';
      const password = 'test-password';
      
      const encrypted = await encryptionService.encrypt(data, password);
      
      // Corrupt the encrypted data by changing a character
      const corrupted = encrypted.slice(0, -5) + 'XXXXX';
      
      await expect(
        encryptionService.decrypt(corrupted, password)
      ).rejects.toThrow();
    });

    it('should reject invalid base64 data', async () => {
      const password = 'test-password';
      const invalidBase64 = 'this-is-not-valid-base64!@#$%';
      
      await expect(
        encryptionService.decrypt(invalidBase64, password)
      ).rejects.toThrow();
    });

    it('should reject data that is too short to contain salt and IV', async () => {
      const password = 'test-password';
      const tooShortData = 'dGVzdA=='; // "test" in base64, too short for salt+IV+data
      
      await expect(
        encryptionService.decrypt(tooShortData, password)
      ).rejects.toThrow();
    });
  });
});