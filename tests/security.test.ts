import { afterEach, describe, it, expect, vi } from 'vitest';
import { encryptSecret, decryptSecret, maskSecret } from '../src/lib/encryption';
import { hashPassword, comparePassword, getFailedLoginState, hashSessionToken, ROLE_PERMISSIONS } from '../src/lib/auth';

describe('Credential Encryption (AES-256-GCM)', () => {
  afterEach(() => vi.unstubAllEnvs());
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

  it('should refuse the development fallback key in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CREDENTIAL_ENCRYPTION_KEY', '');

    expect(() => encryptSecret('segredo')).toThrow('CREDENTIAL_ENCRYPTION_KEY');
  });
});

describe('Authentication & Password Hashing (bcrypt)', () => {
  it('stores only a deterministic hash of the session token', () => {
    const token = 'raw-session-token';
    const hashed = hashSessionToken(token);

    expect(hashed).not.toBe(token);
    expect(hashed).toHaveLength(64);
    expect(hashSessionToken(token)).toBe(hashed);
  });

  it('locks login after five consecutive failures', () => {
    const now = new Date('2026-08-29T12:00:00.000Z');

    expect(getFailedLoginState(3, now)).toEqual({
      failed_login_attempts: 4,
      locked_until: null,
    });
    expect(getFailedLoginState(4, now)).toEqual({
      failed_login_attempts: 0,
      locked_until: new Date('2026-08-29T12:15:00.000Z'),
    });
  });

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
