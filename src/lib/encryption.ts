import crypto from 'crypto';

// Ensure 32-byte (256-bit) key derived from env or fallback for dev/test
const DEFAULT_DEV_KEY = 'themuno_secret_credential_encryption_key_32bytes!';

function getEncryptionKey(): Buffer {
  const envKey = process.env.CREDENTIAL_ENCRYPTION_KEY || DEFAULT_DEV_KEY;
  return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Encrypts cleartext using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return '';
  // If already encrypted, return as is
  if (plainText.startsWith('enc:v1:')) return plainText;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag().toString('hex');
  const ivHex = iv.toString('hex');

  return `enc:v1:${ivHex}:${tag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM ciphertext.
 * Falls back safely if text is legacy/plainText.
 */
export function decryptSecret(cipherText: string): string {
  if (!cipherText) return '';
  if (!cipherText.startsWith('enc:v1:')) {
    // Legacy unencrypted secret - return as is for migration safety
    return cipherText;
  }

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 5) return cipherText;

    const [, , ivHex, tagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);

    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt credential secret:', error);
    return '***[ERRO AO DESCRIPTOGRAFAR SEGREDO]***';
  }
}

/**
 * Mask secret string for UI list views (e.g. "••••••••••••")
 */
export function maskSecret(plainOrCipher: string): string {
  if (!plainOrCipher) return '';
  return '••••••••••••';
}
