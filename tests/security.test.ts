import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret, maskSecret } from '../src/lib/encryption';
import { hashPassword, comparePassword, ROLE_PERMISSIONS } from '../src/lib/auth';

describe('Credential Encryption (AES-256-GCM)', () => {
  it('should encrypt plainText with enc:v1: header', () => {
    const plain = 'MinhaSenhaSuperSecreta123!';
    const encrypted = encryptSecret(plain);

    expect(encrypted).not.toBe(plain);
    expect(encrypted.startsWith('enc:v1:')).toBe(true);
  });

  it('should decrypt encrypted text back to original plainText', () => {
    const plain = 'MinhaSenhaSuperSecreta123!';
    const encrypted = encryptSecret(plain);
    const decrypted = decryptSecret(encrypted);

    expect(decrypted).toBe(plain);
  });

  it('should mask secret string for UI listing', () => {
    const plain = 'MinhaSenhaSuperSecreta123!';
    const masked = maskSecret(plain);

    expect(masked).toBe('••••••••••••');
  });

  it('should handle unencrypted legacy text gracefully during fallback', () => {
    const legacyText = 'legacy_unencrypted_secret';
    const result = decryptSecret(legacyText);

    expect(result).toBe(legacyText);
  });
});

describe('Authentication & Password Hashing (bcrypt)', () => {
  it('should generate valid hash and verify correctly', async () => {
    const password = 'UserPassword2026#';
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);

    const isMatch = await comparePassword(password, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await comparePassword('WrongPassword', hash);
    expect(isWrongMatch).toBe(false);
  });

  it('should enforce Role-Based Access Control (RBAC) hierarchy', () => {
    expect(ROLE_PERMISSIONS.ADMIN).toContain('reveal_credential');
    expect(ROLE_PERMISSIONS.DIRETORIA).toContain('reveal_credential');
    expect(ROLE_PERMISSIONS.FINANCEIRO).not.toContain('reveal_credential');
    expect(ROLE_PERMISSIONS.CONSULTA).toEqual(['view']);
  });
});
