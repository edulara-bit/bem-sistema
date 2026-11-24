import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET_STRING = process.env.ENCRYPTION_KEY || 'bem_super_secret_jwt_key_fallback_at_least_32_characters_long_12345';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING.padEnd(32, '0').slice(0, 32));

export interface AuthSessionPayload {
  userId: string;
  tenantId: string;
  tenantSlug: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Gera hash seguro de senha utilizando PBKDF2 (padrão nativo do Node.js, sem dependências externas compiladas).
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifica se a senha em texto puro corresponde ao hash armazenado.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  
  // Suporte a migração / seed inicial caso seja texto simples temporário
  if (!storedHash.includes(':')) {
    return password === storedHash;
  }

  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;

  const hashToVerify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hashToVerify, 'hex'), Buffer.from(originalHash, 'hex'));
}

/**
 * Cria token JWT assinado para a sessão do consultório (validade: 7 dias)
 */
export async function createSessionToken(payload: AuthSessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Valida e decodifica o token JWT da sessão
 */
export async function verifySessionToken(token: string): Promise<AuthSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthSessionPayload;
  } catch {
    return null;
  }
}
