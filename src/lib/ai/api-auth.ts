import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decryptText } from '@/lib/crypto';
import { ensureAiTables } from '@/lib/ai/init-db';

/**
 * Valida a chave X-BEM-API-Key (ou Authorization: Bearer bem_sk_...) enviada pelo n8n / integrações.
 */
export async function authenticateAiApiRequest(request: NextRequest) {
  await ensureAiTables();

  const headerKey =
    request.headers.get('x-bem-api-key') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    '';

  const cleanKey = headerKey.trim();
  if (!cleanKey) {
    return { error: 'Cabeçalho X-BEM-API-Key ausente.', status: 401 as const, tenant: null };
  }

  const tenant = await prisma.tenant.findFirst({
    where: { aiApiKey: cleanKey },
  });

  if (!tenant) {
    return { error: 'Chave X-BEM-API-Key inválida.', status: 403 as const, tenant: null };
  }

  await ensureAiTables(tenant.id);
  return { error: null, status: 200 as const, tenant };
}

/**
 * Localiza um paciente pelo ID direto OU pelo número de telefone/WhatsApp (ex: remoteJid da Evolution API no n8n).
 */
export async function resolvePatientForApi(
  tenantId: string,
  opts: { patientId?: string | null; patientPhone?: string | null }
) {
  if (opts.patientId) {
    return await prisma.patient.findFirst({
      where: { id: opts.patientId, tenantId },
    });
  }

  if (opts.patientPhone) {
    const cleanTarget = opts.patientPhone.replace(/@.*$/, '').replace(/\D/g, '');
    if (cleanTarget.length >= 8) {
      const suffix8 = cleanTarget.slice(-8);
      const candidates = await prisma.patient.findMany({
        where: { tenantId },
      });
      for (const p of candidates) {
        try {
          const decPhone = decryptText(p.phoneEnc).replace(/\D/g, '');
          if (decPhone.endsWith(suffix8)) {
            return p;
          }
        } catch {
          // Ignora falha de leitura individual
        }
      }
    }
  }

  return null;
}
