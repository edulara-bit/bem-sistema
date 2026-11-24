import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey || hexKey.length !== 64) {
    // 32 bytes em hex = 64 caracteres
    throw new Error('ENCRYPTION_KEY inválida ou ausente. Deve ser uma chave hex de 32 bytes (64 caracteres).');
  }
  return Buffer.from(hexKey, 'hex');
}

/**
 * Criptografa texto puro usando AES-256-GCM para sigilo em repouso (LGPD/CFP).
 * Retorna formato padrão seguro: ivHex:authTagHex:encryptedHex
 */
export function encryptText(plainText: string): string {
  if (!plainText) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recomendado para GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Descriptografa texto protegido em AES-256-GCM.
 */
export function decryptText(payload: string): string {
  if (!payload) return '';
  const parts = payload.split(':');
  if (parts.length !== 3) {
    // Se o texto não estiver no formato criptografado, retorna o texto puro (compatibilidade)
    return payload;
  }
  
  const [ivHex, tagHex, dataHex] = parts;
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  
  let decrypted = decipher.update(dataHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

